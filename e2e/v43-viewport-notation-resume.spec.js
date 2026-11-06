import {test,expect} from '@playwright/test';

async function signIn(page, difficulty='easy'){
    await page.addInitScript(({difficulty})=>{
      if(localStorage.getItem('v43fixture'))return;
      const u={name:'Notation Explorer',avatar:'🐱',difficulty,
        credits:20,lastLogin:new Date().toDateString(),
        instruments:['piano'],tCoins:140,bCoins:20,unlockedSongs:15,
        scores:{coin:{easy:[],medium:[],hard:[],pro:[]},songs:{}}};
      localStorage.setItem('fsr_users_v2',JSON.stringify([u]));
      localStorage.setItem('v43fixture','1');
    },{difficulty});
    await page.goto('/');
    await page.locator('#overlay-start button').click();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
}
async function viewportUsage(page,selector){
    return page.evaluate(selector=>{
        const el=document.querySelector(selector),box=el.getBoundingClientRect();
        return {
            inner:window.innerHeight,
            bodyScroll:document.body.scrollHeight,
            rootScroll:document.documentElement.scrollHeight,
            viewportHeight:box.height,
            scrollOverflow:el.scrollHeight-el.clientHeight
        };
    },selector);
}
test('the Garden console fits one viewport and each tab exposes its own controls',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await signIn(page);
    const size=await viewportUsage(page,'.home-console');
    expect(size.bodyScroll).toBeLessThanOrEqual(size.inner+3);
    expect(size.scrollOverflow).toBeLessThanOrEqual(3);
    await expect(page.locator('#journey-btn')).toBeInViewport();
    await expect(page.locator('#screen-landing .menu-card').first()).toBeVisible();
    if(await page.locator('.home-tabbar').isVisible()){
      await page.locator('[data-home-tab="learn"]').click();
      await expect(page.locator('#screen-landing .learning-panel')).toBeVisible();
      await page.locator('[data-home-tab="setup"]').click();
      await expect(page.locator('#clef-bass')).toBeVisible();
      await page.locator('#clef-bass').click();
      await expect(page.locator('#clef-bass')).toHaveClass(/selected/);
      await expect(page.locator('#input-microphone')).toBeVisible();
      await page.locator('[data-home-tab="play"]').click();
      await expect(page.locator('#screen-landing .reading-journey-actions button').first()).toBeVisible();
    }
    expect(errors).toEqual([]);
});
test('Songbook uses pages rather than vertical list scrolling',async({page})=>{
    await signIn(page);
    await page.locator('#screen-landing .menu-card').filter({hasText:'Song Mode'}).click();
    await expect(page.locator('#screen-songs.active')).toBeVisible();
    await expect(page.locator('#song-list-container .song-item')).toHaveCount(8);
    const first=await page.locator('#song-page-label').textContent();
    expect(first).toContain('1 of 2');
    const before=await viewportUsage(page,'#song-list-container');
    expect(before.scrollOverflow).toBeLessThanOrEqual(3);
    await page.locator('#song-page-next').click();
    await expect(page.locator('#song-list-container .song-item')).toHaveCount(7);
    await expect(page.locator('#song-page-label')).toContainText('2 of 2');
    await page.locator('#song-page-prev').click();
    await expect(page.locator('#song-page-label')).toContainText('1 of 2');
});
test('Workshop preserves a bounded catalogue and has manual pages for sounds',async({page})=>{
    await signIn(page);
    await page.locator('#screen-landing .menu-card').filter({hasText:'Workshop'}).click();
    await expect(page.locator('#screen-store.active')).toBeVisible();
    await page.locator('#workshop-categories button').filter({hasText:'Sounds'}).click();
    await expect(page.locator('#workshop-page-controls')).toBeVisible();
    await expect(page.locator('#store-grid .workshop-item')).toHaveCount(6);
    await page.locator('#workshop-page-next').click();
    await expect(page.locator('#store-grid .workshop-item')).toHaveCount(4);
    const used=await viewportUsage(page,'#screen-store .workshop-content');
    expect(used.scrollOverflow).toBeLessThanOrEqual(3);
});
test('shared treble/bass clefs and canonical ledger lines appear in gameplay and static notation',async({page})=>{
    await signIn(page);
    for(const clef of ['treble','bass']){
      await page.evaluate(clef=>window.setClef(clef),clef);
      await page.evaluate(()=>window.startGame('coin'));
      await expect(page.locator('#music-svg .clef-symbol')).toHaveCount(1);
      await expect(page.locator('#music-svg .clef-symbol')).toHaveAttribute('data-clef',clef);
      await page.evaluate(()=>window.exitGame());
      await page.evaluate(()=>window.startGame('phrase'));
      await expect(page.locator('#phrase-score .score-clef').first()).toHaveAttribute('data-clef',clef);
      const markup=await page.locator('#phrase-score').innerHTML();
      expect(markup).not.toMatch(/𝄞|𝄢|translateX|animate-scroll/);
      await page.evaluate(()=>window.exitGame());
    }
});
test('a multi-page static phrase is manually paged, never automatically scrolled',async({page})=>{
    await signIn(page);
    await page.evaluate(async()=>{
      const {state}=await import('/js/state.js');
      state.currentUser.readingLevel=4;
    });
    await page.evaluate(()=>window.startGame('phrase'));
    await expect(page.locator('#phrase-page-controls')).toBeVisible();
    await expect(page.locator('#phrase-page-label')).toHaveText('1 / 2');
    await expect(page.locator('#phrase-score [data-index="0"]')).toHaveCount(1);
    await page.locator('#phrase-page-next').click();
    await expect(page.locator('#phrase-page-label')).toHaveText('2 / 2');
    await expect(page.locator('#phrase-score [data-index="8"]')).toHaveCount(1);
    await expect(page.locator('#phrase-score [data-index="0"]')).toHaveCount(0);
    const used=await viewportUsage(page,'.game-wrapper');
    expect(used.scrollOverflow).toBeLessThanOrEqual(3);
});
test('a timed song freezes its beat deadline and note index across pause/resume',async({page})=>{
    test.setTimeout(38_000);
    await signIn(page,'pro');
    await page.evaluate(()=>window.startGame('song',0));
    await page.locator('#game-start-overlay button').click();
    await expect.poll(()=>page.evaluate(async()=>{
      const {state}=await import('/js/state.js');return state.game.phase;
    }),{timeout:12000}).toBe('playing');
    await page.locator('#game-pause-button').click();
    await expect(page.locator('#game-pause-overlay')).toBeVisible();
    const before=await page.evaluate(async()=>{
      const {state}=await import('/js/state.js');
      return {phase:state.game.phase,idx:state.game.idx,
        hits:state.game.hits,next:state.game.nextBeatTime,start:state.game.startTime};
    });
    expect(before.phase).toBe('paused');
    await page.waitForTimeout(1700);
    const held=await page.evaluate(async()=>{
      const {state}=await import('/js/state.js');
      return {phase:state.game.phase,idx:state.game.idx,
        hits:state.game.hits,next:state.game.nextBeatTime};
    });
    expect(held).toEqual({phase:'paused',idx:before.idx,hits:before.hits,next:before.next});
    await page.locator('#resume-game-button').click();
    await expect.poll(()=>page.evaluate(async()=>{
      const {state}=await import('/js/state.js');return state.game.phase;
    }),{timeout:10000}).toBe('playing');
    const after=await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        return {idx:state.game.idx,hits:state.game.hits,
            next:state.game.nextBeatTime,start:state.game.startTime,
            resumedIndex:state.game.resumedAtNote,
            resumedAt:state.game.resumedAtMs,
            resumedDeadline:state.game.resumedInitialDeadlineMs,
            resumedDuration:state.game.durations[state.game.resumedAtNote]};
    });
    // A running piece may legitimately advance during Playwright polling.
    // The exact checkpoint must preserve the note and afford its full beat.
    expect(after.resumedIndex).toBe(before.idx);
    expect(after.hits).toBe(before.hits);
    expect(after.resumedDeadline-after.resumedAt).toBeGreaterThanOrEqual(
        after.resumedDuration*60000/80-1);
    expect(after.next-before.next).toBeGreaterThan(2500);
    expect(after.start-before.start).toBeGreaterThan(2500);
    await expect(page.locator('#game-pause-overlay')).toBeHidden();
});
test('background visibility pauses the active game without exiting or scoring a miss',async({page})=>{
    await signIn(page);
    await page.locator('#screen-landing .menu-card').filter({hasText:'Coin Run'}).click();
    await page.locator('#game-start-overlay button').click();
    await expect.poll(()=>page.evaluate(async()=>{
      const {state}=await import('/js/state.js');return state.game.phase;
    })).toBe('playing');
    await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        state.inputMode='microphone'; // fake a child who selected real piano
        Object.defineProperty(document,'hidden',{configurable:true,value:true});
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('#game-pause-overlay')).toBeVisible();
    const during=await page.evaluate(async()=>{
      const {state}=await import('/js/state.js');
      return {phase:state.game.phase,idx:state.game.idx,input:state.inputMode};
    });
    expect(during.phase).toBe('paused');
    expect(during.input).toBe('microphone'); // preserve real-piano choice
    await page.evaluate(()=>{
        Object.defineProperty(document,'hidden',{configurable:true,value:false});
        document.dispatchEvent(new Event('visibilitychange'));
    });
    const later=await page.evaluate(async()=>{
      const {state}=await import('/js/state.js');
      return {phase:state.game.phase,idx:state.game.idx};
    });
    expect(later).toEqual(during);
    // Return to touch for this browser-only test (the separate synthetic
    // microphone tests exercise real audio capture).
    await page.evaluate(async()=>{
        const {state}=await import('/js/state.js');
        state.inputMode='touch';
    });
    await page.locator('#resume-game-button').click();
    await expect.poll(()=>page.evaluate(async()=>{
      const {state}=await import('/js/state.js');return state.game.phase;
    }),{timeout:10000}).toBe('playing');
});
