import { test, expect } from '@playwright/test';

async function login(page, difficulty = 'pro') {
    await page.addInitScript(({ difficulty }) => {
        localStorage.setItem('fsr_users_v2', JSON.stringify([{
            name: 'Rhythm QA', avatar: '🐱', difficulty,
            credits: 99, lastLogin: new Date().toDateString(),
            instruments: ['piano'], tCoins: 0, bCoins: 0, unlockedSongs: 15,
            scores: { coin: { easy: [], medium: [], hard: [], pro: [] }, songs: {} }
        }]));
    }, { difficulty });
    await page.goto('/');
    await page.locator('#overlay-start button').click();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
}

test('timed coin run separates pitch recognition from onset timing feedback', async ({ page }) => {
    await login(page);
    await page.evaluate(() => window.startGame('coin'));
    await expect(page.locator('#screen-game.active')).toBeVisible();
    await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        const { handleInput } = await import('/js/game.js');
        state.game.phase = 'playing';
        state.game.notes = ['C4', 'D4'];
        state.game.durations = [1, 1];
        state.game.idx = 0;
        state.game.nextBeatTime = Date.now() + 1600;
        handleInput('C4', null);
    });
    await expect(page.locator('#timing-feedback')).toContainText('Too early');
    const first = await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        return { pitch: state.game.pitchCorrect, rhythm: state.game.rhythmOnTime, idx: state.game.idx };
    });
    expect(first).toEqual({ pitch: 1, rhythm: 0, idx: 0 });

    await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        const { handleInput } = await import('/js/game.js');
        state.game.nextBeatTime = Date.now();
        handleInput('C4', null);
    });
    await expect(page.locator('#timing-feedback')).toContainText('Perfect!');
    expect(await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        return state.game.rhythmOnTime;
    })).toBe(1);
});

test('result screen shows separate pitch and rhythm grades', async ({ page }) => {
    await login(page);
    await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        const { endGame } = await import('/js/game.js');
        Object.assign(state.game, {
            mode: 'coin', notes: ['C4','D4','E4','F4'],
            durations: [1,1,1,1], idx: 4, phase: 'playing',
            startTime: Date.now() - 2000, hits: 2, mistakes: 2,
            coins: 10, pitchCorrect: 4, pitchErrors: 0, pitchMisses: 0,
            rhythmOnTime: 2, rhythmPerfect: 1, rhythmGood: 1,
            rhythmEarly: 1, rhythmLate: 0, rhythmMisses: 1,
            absoluteOnsetErrorMs: 140
        });
        endGame();
    });
    await expect(page.locator('#screen-result.active')).toBeVisible();
    await expect(page.locator('#res-pitch')).toHaveText('Pitch: 100%');
    await expect(page.locator('#res-rhythm')).toHaveText('Rhythm: 50%');
    await expect(page.locator('#res-timing-breakdown')).toContainText('Perfect 1');
    await expect(page.locator('#res-timing-breakdown')).toContainText('Missed 1');
    await expect(page.locator('#res-accuracy')).toHaveText('Accuracy: 50%');
});

test('mic timing adjustment persists without recording audio', async ({ page }) => {
    await login(page);
    await page.locator('#input-microphone').click();
    await expect(page.locator('#mic-modal')).toBeVisible();
    await page.locator('#mic-timing-adjust').evaluate(input => {
        input.value = '150';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#mic-timing-value')).toHaveText('+150 ms');
    await page.locator('#mic-modal .btn-secondary').click();
    const timing = await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        return { adjustment: state.micTimingAdjustmentMs,
            persisted: localStorage.getItem('fsr_mic_timing_adjustment_v1') };
    });
    expect(timing).toEqual({ adjustment: 150, persisted: '150' });
    // Denied microphone access must not prevent adjusting the per-device setting.
});
