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
