import {test,expect} from '@playwright/test';

async function signIn(page) {
    await page.addInitScript(() => {
        const base={credits:8,lastLogin:new Date().toDateString(),
          instruments:['piano'], tCoins:0,bCoins:0,unlockedSongs:0,
          scores:{coin:{easy:[],medium:[],hard:[],pro:[]},songs:{}}};
        localStorage.setItem('fsr_users_v2',JSON.stringify([
          {...base,name:'Reader A',avatar:'🐱',difficulty:'easy',startingComfort:'new'},
          {...base,name:'Reader B',avatar:'🦊',difficulty:'pro',startingComfort:'experienced'}
        ]));
    });
    await page.goto('/');
    await page.locator('#overlay-start button').click();
    await expect(page.locator('#screen-register.active')).toBeVisible();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
}

test('first concert renders fixed notation and grants provisional level after a harder challenge',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await signIn(page);
    await page.locator('#journey-btn').click();
    await expect(page.locator('#screen-audition.active')).toBeVisible();
    await expect(page.locator('#audition-level')).toHaveText('Discovery Level 1');
    const score=page.locator('#audition-score svg');
    await expect(score).toBeVisible();
    const original=await score.getAttribute('viewBox');
    await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {auditionExercise}=await import('/js/audition.js');
        const {auditionInput}=await import('/js/audition-ui.js');
        auditionExercise(1,'treble',0,state.currentUser.profileId).notes.forEach(auditionInput);
    });
    await expect(page.locator('#audition-actions')).toBeVisible();
    expect(await score.getAttribute('viewBox')).toBe(original);
    await page.locator('#audition-actions button').first().click();
    await expect(page.locator('#audition-level')).toHaveText('Discovery Level 2');
    await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {auditionExercise}=await import('/js/audition.js');
        const {auditionInput}=await import('/js/audition-ui.js');
        auditionExercise(2,'treble',1,state.currentUser.profileId).notes.forEach(auditionInput);
    });
    await page.locator('#audition-actions button').last().click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
    await expect(page.locator('#today-mission')).toContainText('Reading Level');
    expect(errors).toEqual([]);
});

test('separate learners keep their own clef, level and daily pass allocation',async({page})=>{
    await signIn(page);
    await page.evaluate(async()=>{
       const {state}=await import('/js/state.js');
       const {setDailyAllowance}=await import('/js/play-budget.js');
       const {saveCurrentUser}=await import('/js/storage.js');
       state.currentUser.placement={status:'provisional',level:2,confidence:'medium',results:[]};
       setDailyAllowance(state.currentUser,300);
       saveCurrentUser();
    });
    await page.locator('#clef-bass').click();
    await page.locator('#screen-landing button').filter({hasText:'Logout'}).click();
    await expect(page.locator('#screen-register.active')).toBeVisible();
    await page.locator('#screen-register .user-btn').nth(1).click();
    await expect(page.locator('#clef-treble')).toHaveClass(/selected/);
    const second=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return {name:state.currentUser.name,allowance:state.currentUser.playBudget.dailySeconds};
    });
    expect(second).toEqual({name:'Reader B',allowance:900});
    await page.locator('#journey-btn').click();
    await expect(page.locator('#audition-level')).toHaveText('Discovery Level 4');
    await page.locator('#screen-audition .top-bar button').first().click();
    await page.locator('#screen-landing button').filter({hasText:'Logout'}).click();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#clef-bass')).toHaveClass(/selected/);
    await expect(page.locator('#today-mission')).toContainText('Reading Level 2');
});

test('reading mode never scrolls or highlights a moving note target',async({page})=>{
    await signIn(page);
    await page.locator('#score-reader-btn').click();
    await expect(page.locator('#screen-audition.active')).toBeVisible();
    await expect(page.locator('#audition-heading')).toContainText('Independently');
    const text=await page.locator('#audition-score').innerHTML();
    expect(text).not.toMatch(/animate-scroll|translateX|note-head current/);
    await expect(page.locator('#audition-keys [data-note]').first()).toBeVisible();
    expect(await page.locator('#audition-keys [data-note]').first().textContent()).toBe('');
});

test('parent can choose a time budget and grant a little extra time',async({page})=>{
    await signIn(page);
    page.on('dialog',dialog=>dialog.accept('4321'));
    await page.evaluate(()=>window.showParentPanel());
    await expect(page.locator('#admin-modal')).toBeVisible();
    await page.locator('#parent-time-allowance').selectOption('300');
    await expect(page.locator('#parent-time-status')).toContainText('Saved');
    await page.locator('#admin-modal .btn-primary').last().click();
    await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {canPlayToday}=await import('/js/app-budget.js');
        state.currentUser.playBudget.usedSeconds=300;
        canPlayToday();
    });
    await expect(page.locator('#budget-overlay')).toBeVisible();
    await page.locator('#budget-overlay .btn-primary').click();
    await expect(page.locator('#admin-modal')).toBeVisible();
    await page.locator('#admin-modal .parent-actions button').first().click();
    await page.locator('#admin-modal .btn-primary').last().click();
    await expect(page.locator('#budget-overlay')).toBeHidden();
    await page.locator('.menu-card').filter({hasText:'Adaptive Practice'}).click();
    await expect(page.locator('#screen-game.active')).toBeVisible();
});

test('a time limit stops at a short boundary and never scores partial skill checks',async({page})=>{
    await signIn(page);
    await page.locator('.menu-card').filter({hasText:'Skill Check'}).click();
    await page.locator('#game-start-overlay button').click();
    const state=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {canPlayToday}=await import('/js/app-budget.js');
        const {handleInput}=await import('/js/game.js');
        state.currentUser.playBudget.usedSeconds=state.currentUser.playBudget.dailySeconds;
        canPlayToday();
        for(let i=0;i<4 && state.game.phase==='playing';i++){
            handleInput(state.game.notes[state.game.idx],null);
        }
        return {phase:state.game.phase,checks:state.currentUser.learning.checks.length};
    });
    expect(state.checks).toBe(0);
    await expect(page.locator('#budget-overlay')).toBeVisible();
});
