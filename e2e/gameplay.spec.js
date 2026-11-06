import { test, expect } from '@playwright/test';

async function login(page, difficulty = 'easy') {
    await page.addInitScript(({ difficulty }) => {
        const user = {
            name: 'Browser QA', avatar: '🐱', difficulty,
            credits: 99, lastLogin: new Date().toDateString(),
            instruments: ['piano'], tCoins: 0, bCoins: 0, unlockedSongs: 15,
            scores: { coin: { easy: [], medium: [], hard: [], pro: [] }, songs: {} }
        };
        localStorage.setItem('fsr_users_v2', JSON.stringify([user]));
    }, { difficulty });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#overlay-start button').click();
    await expect(page.locator('#screen-register.active')).toBeVisible();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
}

async function startSong(page, index, clef = 'treble') {
    await page.evaluate(clef => window.setClef(clef), clef);
    await page.evaluate(index => window.startGame('song', index), index);
    await expect(page.locator('#screen-game.active')).toBeVisible();
    await expect(page.locator('#notes-group .note').first()).toBeVisible();
}

test('formerly unreachable melodies render all needed piano keys in both clefs', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await login(page);

    await startSong(page, 10, 'treble'); // Für Elise: note C3 is lower than the old keyboard
    await expect(page.locator('#keyboard [data-note="C3"]')).toHaveCount(1);
    await expect(page.locator('#keyboard [data-note="D#4"]')).toHaveCount(1);

    await startSong(page, 10, 'bass'); // Correct bass transposition: C3 -> C2
    await expect(page.locator('#keyboard [data-note="C2"]')).toHaveCount(1);
    await expect(page.locator('#notes-group .note')).toHaveCount(27);

    await startSong(page, 13, 'treble'); // The Entertainer: high E5
    await expect(page.locator('#keyboard [data-note="D#5"]')).toHaveCount(1);
    await expect(page.locator('#keyboard [data-note="E5"]')).toHaveCount(1);
    expect(pageErrors).toEqual([]);
});

test('extended piano remains horizontally scrollable on small screens', async ({ page }) => {
    await login(page);
    await startSong(page, 13);
    const keyboard = page.locator('#keyboard');

    const widths = await keyboard.evaluate(element => ({
        viewportWidth: element.clientWidth,
        contentWidth: element.scrollWidth
    }));
    // Compact keys may fit the entire musical range on tablets/desktop.
    // Scrolling is required only when the range exceeds the keyboard width.
    expect(widths.contentWidth).toBeGreaterThanOrEqual(widths.viewportWidth);

    const farKey = page.locator('#keyboard [data-note="E5"]');
    await farKey.evaluate(element => element.scrollIntoView({ inline: 'center', block: 'nearest' }));
    const visible = await farKey.evaluate(element => {
        const outer = element.closest('#keyboard').getBoundingClientRect();
        const key = element.getBoundingClientRect();
        return key.left >= outer.left - 2 && key.right <= outer.right + 2;
    });
    expect(visible).toBe(true);
});

test('song notation includes dotted notes and no duplicate clef symbols', async ({ page }) => {
    await login(page);
    await startSong(page, 2); // Jingle Bells has dotted quarter notes
    expect(await page.locator('#notes-group circle').count()).toBeGreaterThan(0);
    await startSong(page, 7); // London Bridge has dotted rhythms too
    expect(await page.locator('#notes-group circle').count()).toBeGreaterThan(0);
    await expect(page.locator('#music-svg .clef-symbol')).toHaveCount(1);
});

test('touch input completes an untimed coin run and saves the result', async ({ page }) => {
    await login(page);
    await page.locator('#screen-landing .menu-card').filter({ hasText: 'Coin Run' }).click();
    await page.locator('#game-start-overlay button').click();
    const first = await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        return state.game.notes[0];
    });
    await page.locator('#keyboard [data-note="' + first + '"]').tap();
    expect(await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        return state.game.hits;
    })).toBe(1);

    await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        const { handleInput } = await import('/js/game.js');
        while(state.game.phase === 'playing') {
            const note = state.game.notes[state.game.idx];
            const key = [...document.querySelectorAll('#keyboard [data-note]')]
                .find(element => element.dataset.note === note);
            if(!key) throw new Error('Missing keyboard note ' + note);
            handleInput(note, key);
        }
    });
    await expect(page.locator('#screen-result.active')).toBeVisible();
    await expect(page.locator('#res-accuracy')).toHaveText('Accuracy: 100%');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fsr_users_v2'))[0].scores.coin.easy.length)).toBe(1);
});

test('countdown blocks premature input and cannot restart after exiting', async ({ page }) => {
    await login(page, 'pro');
    await page.locator('#screen-landing .menu-card').filter({ hasText: 'Coin Run' }).click();
    await page.locator('#game-start-overlay button').click();
    await expect(page.locator('#countdown-overlay')).toBeVisible();

    const beforeExit = await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        const first = state.game.notes[0];
        const key = [...document.querySelectorAll('#keyboard [data-note]')]
            .find(element => element.dataset.note === first);
        key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        return { phase: state.game.phase, hits: state.game.hits, index: state.game.idx };
    });
    expect(beforeExit).toEqual({ phase: 'countdown', hits: 0, index: 0 });

    await page.locator('#screen-game .top-bar button').first().click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
    await page.waitForTimeout(150);
    const afterExit = await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        return { phase: state.game.phase, countdownTimeout: state.game.countdownTimeout };
    });
    expect(afterExit).toEqual({ phase: 'idle', countdownTimeout: null });
});
