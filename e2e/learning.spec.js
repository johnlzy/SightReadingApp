import { test, expect } from '@playwright/test';

async function login(page, difficulty='easy') {
    await page.addInitScript(({ difficulty }) => {
        const user = {
            name:'Learning QA', avatar:'🐱', difficulty, credits:99,
            lastLogin:new Date().toDateString(),
            instruments:['piano'], tCoins:0, bCoins:0, unlockedSongs:0,
            scores:{ coin:{ easy:[],medium:[],hard:[],pro:[] }, songs:{} }
        };
        localStorage.setItem('fsr_users_v2',JSON.stringify([user]));
    },{difficulty});
    await page.goto('/');
    await page.locator('#overlay-start button').click();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
}

test('adaptive practice learns from first-try mistakes without costing credits', async ({ page }) => {
    const pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    await login(page);
    await page.locator('.menu-card').filter({hasText:'Adaptive Practice'}).click();
    await expect(page.locator('#screen-game.active')).toBeVisible();
    await page.locator('#game-start-overlay button').click();

    const outcome=await page.evaluate(async () => {
        const {state}=await import('/js/state.js');
        const {handleInput}=await import('/js/game.js');
        const first=state.game.notes[0];
        const wrong=first==='C4'?'D4':'C4';
        handleInput(wrong,null);
        handleInput(first,null);
        while(state.game.phase==='playing') {
            const note=state.game.notes[state.game.idx];
            handleInput(note,null);
        }
        const learner=state.currentUser.learning;
        return {
            first, credits:state.currentUser.credits,
            attempts:learner.notes['treble:'+first].attempts,
            firstTryHits:learner.notes['treble:'+first].firstTryHits,
            lastSession:learner.sessions.at(-1)
        };
    });
    await expect(page.locator('#screen-result.active')).toBeVisible();
    expect(outcome.credits).toBe(99);
    expect(outcome.attempts).toBeGreaterThan(0);
    expect(outcome.firstTryHits).toBeLessThan(outcome.attempts);
    expect(outcome.lastSession.score).toBeLessThan(100);
    expect(outcome.lastSession.total).toBe(16);
    await page.getByRole('button',{name:'Home'}).click();
    await expect(page.locator('#learning-practiced')).not.toHaveText('0/5');
    expect(pageErrors).toEqual([]);
});

test('independent skill checks retain results but do not train mastery', async ({page}) => {
    await login(page);
    // Seed practice data deliberately: check-note generation must not inspect it.
    const before=await page.evaluate(async () => {
        const {state}=await import('/js/state.js');
        const {recordOutcome,ensureLearning,generateSkillCheck}=await import('/js/learning.js');
        const learner=ensureLearning(state.currentUser);
        for(let i=0;i<8;i++) {
            recordOutcome(learner,{clef:'treble',note:'F4',firstTryCorrect:false});
        }
        const expected=generateSkillCheck({
            clef:'treble',difficulty:'easy',checkIndex:learner.checkCount,
            profileKey:String(state.currentUser.idx)
        }).notes;
        const mastery=JSON.stringify(learner.notes);
        return {expected,mastery};
    });
    await page.locator('.menu-card').filter({hasText:'Skill Check'}).click();
    const chosen=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return state.game.notes;
    });
    expect(chosen).toEqual(before.expected);
    await page.locator('#game-start-overlay button').click();
    const after=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {handleInput}=await import('/js/game.js');
        while(state.game.phase==='playing') {
            handleInput(state.game.notes[state.game.idx],null);
        }
        return {
            mastery:JSON.stringify(state.currentUser.learning.notes),
            score:state.currentUser.learning.checks.at(-1).score,
            count:state.currentUser.learning.checkCount,
            credits:state.currentUser.credits
        };
    });
    await expect(page.locator('#screen-result.active')).toBeVisible();
    await expect(page.locator('#res-accuracy')).toHaveText('Skill Check: 100% first try');
    expect(after.score).toBe(100);
    expect(after.count).toBe(1);
    expect(after.credits).toBe(99);
    expect(after.mastery).toBe(before.mastery);
    await page.getByRole('button',{name:'Home'}).click();
    await expect(page.locator('#learning-check-chart .learning-check-bar')).toHaveCount(1);
    await expect(page.locator('#learning-trend')).toContainText('Starting benchmark');
    await page.locator('.menu-card').filter({hasText:'Skill Check'}).click();
    const next=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return state.game.notes;
    });
    expect(next).not.toEqual(before.expected);
});

test('adaptive practice respects bass clef and uses rhythmic patterns for pro', async ({page})=>{
    await login(page,'pro');
    await page.locator('#clef-bass').click();
    await page.locator('.menu-card').filter({hasText:'Adaptive Practice'}).click();
    const exercise=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return {
            notes:state.game.notes,
            durations:state.game.durations,
            mode:state.game.mode,
            clef:state.currentClef,
            credits:state.currentUser.credits
        };
    });
    expect(exercise.mode).toBe('practice');
    expect(exercise.clef).toBe('bass');
    expect(exercise.credits).toBe(99);
    expect(exercise.notes.length).toBe(exercise.durations.length);
    expect(exercise.notes.every(n=>/3|4/.test(n))).toBe(true);
    expect(exercise.durations.reduce((a,b)=>a+b,0)).toBe(16);
    await expect(page.locator('#music-svg .note')).toHaveCount(exercise.notes.length);
});
