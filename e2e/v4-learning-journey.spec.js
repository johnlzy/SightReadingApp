import { test, expect } from '@playwright/test';

async function login(page,index=0) {
    await page.addInitScript(()=>{
        if(localStorage.getItem('v42-test-fixture'))return;
        const base={credits:8,lastLogin:new Date().toDateString(),
            instruments:['piano'],tCoins:0,bCoins:0,unlockedSongs:0,
            scores:{coin:{easy:[],medium:[],hard:[],pro:[]},songs:{}}};
        localStorage.setItem('fsr_users_v2',JSON.stringify([
            {...base,name:'Melody One',difficulty:'easy',avatar:'🐱',startingComfort:'new'},
            {...base,name:'Melody Two',difficulty:'pro',avatar:'🦊',startingComfort:'experienced'}
        ]));
        localStorage.setItem('v42-test-fixture','yes');
    });
    await page.goto('/');
    await page.locator('#overlay-start button').click();
    await page.locator('#screen-register .user-btn').nth(index).click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
}
async function completeUntimed(page) {
    return page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {handleInput}=await import('/js/game.js');
        while(state.game.phase==='playing'&&state.game.idx<state.game.notes.length){
            handleInput(state.game.notes[state.game.idx],null);
        }
        return state.currentUser;
    });
}

test('audition saves position, survives page reload and resumes the identical score',async({page})=>{
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await login(page);
    await page.locator('#journey-btn').click();
    await expect(page.locator('#screen-audition.active')).toBeVisible();
    await expect(page.getByRole('button',{name:'Save and leave audition'})).toBeVisible();
    const original=await page.locator('#audition-score').innerHTML();
    await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {auditionInput}=await import('/js/audition-ui.js');
        const {auditionExercise}=await import('/js/audition.js');
        const notes=auditionExercise(1,'treble',0,state.currentUser.profileId).notes;
        notes.slice(0,3).forEach(note=>auditionInput(note));
    });
    await expect(page.locator('#audition-progress')).toContainText('Note 4 of 8');
    await page.getByRole('button',{name:'Save and leave audition'}).click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
    await expect(page.locator('#journey-btn')).toContainText('Resume my concert');
    await page.reload();
    await page.locator('#overlay-start button').click();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#journey-btn')).toContainText('Resume my concert');
    await page.locator('#journey-btn').click();
    await expect(page.locator('#audition-score')).toHaveJSProperty('innerHTML',original);
    await expect(page.locator('#audition-progress')).toContainText('Note 4 of 8');
    const draft=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return state.currentUser.auditionDraft;
    });
    expect(draft.index).toBe(3);
    expect(draft.firstTry).toBe(3);
    expect(errors).toEqual([]);
});

test('audition drafts are private to each sibling, and restart is explicit',async({page})=>{
    await login(page);
    await page.locator('#journey-btn').click();
    await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {auditionInput}=await import('/js/audition-ui.js');
        auditionInput(state.currentUser.auditionDraft?
            (await import('/js/audition.js')).auditionExercise(1,'treble',0,state.currentUser.profileId).notes[0]:'C4');
    });
    await page.getByRole('button',{name:'Save and leave audition'}).click();
    await page.locator('#screen-landing button').filter({hasText:'Logout'}).click();
    await page.locator('#screen-register .user-btn').nth(1).click();
    await expect(page.locator('#journey-btn')).toContainText('first concert');
    await page.locator('#journey-btn').click();
    await expect(page.locator('#audition-level')).toHaveText('Discovery Level 4');
    await page.getByRole('button',{name:'Save and leave audition'}).click();
    await page.locator('#screen-landing button').filter({hasText:'Logout'}).click();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#journey-btn')).toContainText('Resume my concert');
    await page.locator('#journey-btn').click();
    await expect(page.locator('#audition-level')).toHaveText('Discovery Level 1');
    await expect(page.locator('#audition-progress')).toContainText('Note 2 of 8');
    page.on('dialog',d=>d.accept());
    await page.locator('#audition-restart-btn').click();
    await expect(page.locator('#audition-progress')).toContainText('Note 1 of 8');
    expect(await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return state.currentUser.auditionDraft.index;
    })).toBe(0);
});

test('stationary melody practice can show hints, but fresh phrase checks never do',async({page})=>{
    await login(page);
    await page.locator('.reading-journey-actions button').first().click();
    await expect(page.locator('#screen-game.active')).toBeVisible();
    await expect(page.locator('#phrase-score svg')).toBeVisible();
    const html=await page.locator('#phrase-score').innerHTML();
    expect(html).not.toMatch(/translateX|animate-scroll|target|note-highlight/);
    await expect(page.locator('#keyboard .white-key').first()).toHaveText('');
    await expect(page.locator('#phrase-hint-button')).toBeVisible();
    await page.locator('#game-start-overlay button').click();
    await page.locator('#phrase-hint-button').click();
    await expect(page.locator('#phrase-hint-button')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#keyboard .white-key').first()).not.toHaveText('');
    await completeUntimed(page);
    await expect(page.locator('#screen-result.active')).toBeVisible();
    const trained=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return {phrase:state.currentUser.journey.phrases.at(-1),
            notes:JSON.stringify(state.currentUser.learning.notes)};
    });
    expect(trained.phrase.assisted).toBe(true);
    await page.locator('#screen-result button').filter({hasText:'Home'}).click();

    await page.locator('.reading-journey-actions button').last().click();
    await expect(page.locator('#phrase-score svg')).toBeVisible();
    await expect(page.locator('#phrase-hint-controls')).toBeHidden();
    await expect(page.locator('#keyboard .white-key').first()).toHaveText('');
    await page.locator('#game-start-overlay button').click();
    await completeUntimed(page);
    await expect(page.locator('#res-accuracy')).toContainText('Fresh Phrase Check');
    const checked=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return {count:state.currentUser.journey.checkCount,
            score:state.currentUser.journey.checks.at(-1).score,
            notes:JSON.stringify(state.currentUser.learning.notes)};
    });
    expect(checked.count).toBe(1);
    expect(checked.score).toBe(100);
    expect(checked.notes).toBe(trained.notes);
});

test('parent dashboard reports independent reading evidence for the selected child',async({page})=>{
    await login(page);
    await page.locator('.reading-journey-actions button').last().click();
    await page.locator('#game-start-overlay button').click();
    await completeUntimed(page);
    await page.locator('#screen-result button').filter({hasText:'Home'}).click();
    await expect(page.locator('#reading-check-progress')).toContainText('Latest fresh phrase');
    page.on('dialog',d=>d.accept('4321'));
    await page.evaluate(()=>window.showParentPanel());
    await expect(page.locator('#parent-reading-check')).toContainText('100%');
    await expect(page.locator('#parent-reading-level')).toContainText('Reading Level');
});
