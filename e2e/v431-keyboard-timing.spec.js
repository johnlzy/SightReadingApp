import {test,expect} from '@playwright/test';

async function login(page){
    await page.addInitScript(()=>{
        const base={name:'Piano Layout QA',avatar:'🐱',difficulty:'easy',
            credits:50,lastLogin:new Date().toDateString(),
            instruments:['piano'],tCoins:10,bCoins:0,unlockedSongs:15,
            scores:{coin:{easy:[],medium:[],hard:[],pro:[]},songs:{}}};
        localStorage.setItem('fsr_users_v2',JSON.stringify([base]));
    });
    await page.goto('/');
    await page.locator('#overlay-start button').click();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
}
test('piano keys size themselves naturally without a confusing toggle',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await login(page);
    await page.evaluate(()=>window.startGame('song',10));
    await expect(page.locator('#screen-game.active')).toBeVisible();
    const piano=page.locator('#keyboard');
    const info=await piano.evaluate(k=>{
        const white=k.querySelector('.white-key');
        return {width:white.getBoundingClientRect().width,
            whiteCount:k.querySelectorAll('.white-key').length,
            scrollWidth:k.scrollWidth,viewport:k.clientWidth};
    });
    expect(info.width).toBeGreaterThanOrEqual(45);
    expect(info.width).toBeLessThanOrEqual(67);
    expect(info.whiteCount).toBeGreaterThanOrEqual(14);
    await expect(page.locator('#keyboard-size-toggle')).toHaveCount(0);
    await expect(page.locator('#keyboard-range-label')).toContainText('Piano');
    await expect(page.locator('#keyboard-low')).toBeVisible();
    await expect(page.locator('#keyboard-high')).toBeVisible();
    const stored=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return state.currentUser.preferences.keyboardSize;
    });
    // Existing old preference may exist in storage, but is no longer used
    // to make keys too small (or force the child to change a setting).
    expect([undefined,'compact','comfortable']).toContain(stored);
    expect(errors).toEqual([]);
});
test('the keyboard never auto-follows the next note while the child plays',async({page})=>{
    await login(page);
    await page.evaluate(()=>window.startGame('practice'));
    await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {renderKeyboard}=await import('/js/game.js');
        // Intentionally use a six-octave test range: wider than even a
        // desktop dock. Ordinary exercises can fit without panning.
        state.game.notes=['C2','D2','E2','G2','C4','E4','G4','C5','D5','E7'];
        state.game.durations=Array(state.game.notes.length).fill(1);
        renderKeyboard();
    });
    const piano=page.locator('#keyboard');
    await expect(piano.locator('[data-note="E7"]')).toHaveCount(1);
    await page.getByRole('button',{name:'Show higher piano octave'}).click();
    await expect.poll(()=>piano.evaluate(k=>k.scrollLeft)).toBeGreaterThan(70);
    await page.waitForTimeout(350); // allow the deliberate manual scroll to finish
    const before=await piano.evaluate(k=>k.scrollLeft);
    await page.locator('#game-start-overlay button').click();
    const inputs=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {handleInput}=await import('/js/game.js');
        const keys=['C2','D2','E2'];
        for(const note of keys)handleInput(note,null);
        return {idx:state.game.idx,hits:state.game.hits};
    });
    expect(inputs).toEqual({idx:3,hits:3});
    const after=await piano.evaluate(k=>k.scrollLeft);
    expect(Math.abs(after-before)).toBeLessThan(2);
});
test('staff play line is in the score and does not track keyboard scrolling',async({page})=>{
    await login(page);
    await page.evaluate(()=>window.startGame('song',10));
    const before=await page.locator('#hit-line').getAttribute('x1');
    const expected=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        const {gameHitLineX}=await import('/js/playback-geometry.js');
        const rect=document.getElementById('music-svg').getBoundingClientRect();
        return {x:state.HIT_X,expected:gameHitLineX(rect.width,rect.height)};
    });
    expect(Number(before)).toBe(expected.x);
    expect(expected.x).toBe(expected.expected);
    await page.getByRole('button',{name:'Show higher piano octave'}).click();
    await expect(page.locator('#hit-line')).toHaveAttribute('x1',before);
    await expect(page.locator('#staff-hit-hint')).toContainText('green line');
});
