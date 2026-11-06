import {test,expect} from '@playwright/test';

async function enterAs(page,index=0) {
    await page.addInitScript(()=>{
        if(localStorage.getItem('v41-fixture'))return;
        const base={credits:8,lastLogin:new Date().toDateString(),
            difficulty:'easy',instruments:['piano','violin'],
            unlockedSongs:2,scores:{coin:{easy:[17],medium:[],hard:[],pro:[]},songs:{}},
            learning:{version:1,notes:{},rhythms:{},sessions:[],checks:[],checkCount:0}};
        localStorage.setItem('fsr_users_v2',JSON.stringify([
            {...base,name:'Garden Learner',avatar:'🐱',tCoins:125,bCoins:75},
            {...base,name:'Second Learner',avatar:'🦊',
                instruments:['piano'],tCoins:0,bCoins:0}
        ]));
        localStorage.setItem('v41-fixture','1');
    });
    await page.goto('/');
    await page.locator('#overlay-start button').click();
    await expect(page.locator('#screen-register.active')).toBeVisible();
    await page.locator('#screen-register .user-btn').nth(index).click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
}

async function workshop(page) {
    await page.locator('#screen-landing .menu-card').filter({hasText:'Workshop'}).click();
    await expect(page.locator('#screen-store.active')).toBeVisible();
    await expect(page.locator('#workshop-pip .pip-figure')).toBeVisible();
}

test('legacy coins migrate once and preview/buy/equip visibly changes Pip',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await enterAs(page);
    await expect(page.locator('#landing-sparks')).toHaveText('200');
    await workshop(page);
    await expect(page.locator('#store-coins')).toHaveText('200');
    await page.locator('[data-item-id="hat-cloud"]').click();
    await expect(page.locator('#workshop-pip .pip-figure')).toHaveAttribute('data-hat','hat-cloud');
    const before=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return {sparks:state.currentUser.economy.sparks,
            equipped:state.currentUser.economy.equipped.hat};
    });
    expect(before).toEqual({sparks:200,equipped:'hat-leaf'});
    await page.locator('#workshop-action').click();
    await expect(page.locator('#store-coins')).toHaveText('170');
    await expect(page.locator('#workshop-action')).toBeDisabled();
    await expect(page.locator('#workshop-status')).toContainText('unlocked');
    await page.locator('#screen-store .top-bar button').first().click();
    await expect(page.locator('#home-pip-scene .pip-figure')).toHaveAttribute('data-hat','hat-cloud');
    await page.reload();
    await page.locator('#overlay-start button').click();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#landing-sparks')).toHaveText('170');
    await expect(page.locator('#home-pip-scene .pip-figure')).toHaveAttribute('data-hat','hat-cloud');
    const after=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return {t:state.currentUser.tCoins,b:state.currentUser.bCoins,
            scores:state.currentUser.scores.coin.easy,
            instruments:state.currentUser.instruments,
            migration:state.currentUser.economy.migration};
    });
    expect(after.t).toBe(125);
    expect(after.b).toBe(75);
    expect(after.scores).toEqual([17]);
    expect(after.instruments).toContain('violin');
    expect(after.migration.convertedSparks).toBe(200);
    expect(errors).toEqual([]);
});

test('two siblings maintain separate gardens and Workshop balances',async({page})=>{
    await enterAs(page);
    await workshop(page);
    await page.locator('[data-item-id="hat-cloud"]').click();
    await page.locator('#workshop-action').click();
    await page.locator('#screen-store .top-bar button').first().click();
    await page.locator('#screen-landing button').filter({hasText:'Logout'}).click();
    await page.locator('#screen-register .user-btn').nth(1).click();
    await expect(page.locator('#landing-sparks')).toHaveText('0');
    await expect(page.locator('#home-pip-scene .pip-figure')).toHaveAttribute('data-hat','hat-leaf');
    await workshop(page);
    await page.locator('[data-item-id="hat-cloud"]').click();
    await expect(page.locator('#workshop-action')).toBeDisabled();
    await expect(page.locator('#workshop-action')).toContainText('Need');
    const second=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return {balance:state.currentUser.economy.sparks,
            owned:state.currentUser.economy.ownedItems.includes('hat-cloud')};
    });
    expect(second).toEqual({balance:0,owned:false});
});

test('original purchased sounds are still owned and can be previewed',async({page})=>{
    await enterAs(page);
    await workshop(page);
    await page.locator('#workshop-categories button').filter({hasText:'Sounds'}).click();
    await page.locator('[data-item-id="sound-violin"]').click();
    await expect(page.locator('#workshop-action')).toContainText('Equip');
    await page.locator('[data-item-id="sound-trumpet"]').click();
    await expect(page.locator('#workshop-hear-sound')).toBeVisible();
    await expect(page.locator('#workshop-action')).toContainText('Buy');
    await page.locator('#workshop-action').click();
    await expect(page.locator('#store-coins')).toHaveText('155');
    expect(await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return [state.currentInstKey,
            state.currentUser.instruments.includes('trumpet')];
    })).toEqual(['trumpet',true]);
});

test('first-try practice finishes daily quest once and keeps assessments separate',async({page})=>{
    await enterAs(page,1);
    await page.locator('#screen-landing .menu-card').filter({hasText:'Adaptive Practice'}).click();
    await page.locator('#game-start-overlay button').click();
    const result=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {handleInput}=await import('/js/game.js');
        while(state.game.phase==='playing'){
            handleInput(state.game.notes[state.game.idx],null);
        }
        return {sparks:state.currentUser.economy.sparks,
            quest:state.currentUser.quest.claimed,
            sessions:state.currentUser.learning.sessions.length};
    });
    await expect(page.locator('#screen-result.active')).toBeVisible();
    await expect(page.locator('#res-quest')).toContainText('Daily music quest complete');
    expect(result).toEqual({sparks:27,quest:true,sessions:1});
    await page.getByRole('button',{name:'Home'}).click();
    await expect(page.locator('#daily-quest')).toContainText('complete');
    await page.locator('#screen-landing .menu-card').filter({hasText:'Adaptive Practice'}).click();
    await page.locator('#game-start-overlay button').click();
    const after=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {handleInput}=await import('/js/game.js');
        while(state.game.phase==='playing'){
            handleInput(state.game.notes[state.game.idx],null);
        }
        return {sparks:state.currentUser.economy.sparks,quest:state.currentUser.quest.claimed};
    });
    expect(after).toEqual({sparks:39,quest:true}); // no second +15
});
