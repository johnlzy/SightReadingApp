import { test, expect } from '@playwright/test';

async function enterWithSyntheticPiano(page, { denied = false } = {}) {
    await page.addInitScript(({ denied }) => {
        const user = {
            name: 'Acoustic QA', avatar: '🎹', difficulty: 'easy',
            credits: 99, lastLogin: new Date().toDateString(),
            instruments: ['piano'], tCoins: 0, bCoins: 0, unlockedSongs: 0,
            scores: { coin: { easy: [], medium: [], hard: [], pro: [] }, songs: {} }
        };
        localStorage.setItem('fsr_users_v2', JSON.stringify([user]));
        window.__pianoSessions = [];
        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia: async () => {
                    if (denied) throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
                    const context = new (window.AudioContext || window.webkitAudioContext)();
                    const source = context.createOscillator();
                    const gain = context.createGain();
                    const destination = context.createMediaStreamDestination();
                    gain.gain.value = 0;
                    source.frequency.value = 440;
                    source.connect(gain);
                    gain.connect(destination);
                    source.start();
                    await context.resume();
                    window.__pianoSessions.push({ context, source, gain, stream: destination.stream });
                    window.__playSyntheticNote = (frequency, volume = 0.5) => {
                        const session = window.__pianoSessions.at(-1);
                        session.source.frequency.setValueAtTime(frequency, session.context.currentTime);
                        session.gain.gain.setValueAtTime(volume, session.context.currentTime);
                    };
                    return destination.stream;
                }
            }
        });
    }, { denied });
    await page.goto('/');
    await page.locator('#overlay-start button').click();
    await page.locator('#screen-register .user-btn').first().click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
}

test('calibrates to an acoustic note, uses microphone in Coin Run, then releases it', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await enterWithSyntheticPiano(page);
    await page.evaluate(()=>window.setHomeTab('setup'));
    await page.locator('#input-microphone').click();
    await expect(page.locator('#mic-modal')).toBeVisible();

    await expect.poll(() => page.evaluate(() => window.__pianoSessions.length)).toBe(1);
    await page.evaluate(() => window.__playSyntheticNote(440));
    await expect(page.locator('#mic-calibration-note')).toHaveText('A4', { timeout: 12000 });
    await expect(page.locator('#mic-confirm')).toBeEnabled();
    await page.locator('#mic-confirm').click();
    await expect(page.locator('#mic-modal')).toBeHidden();
    await expect(page.locator('#input-microphone')).toHaveClass(/selected/);
    await expect.poll(() => page.evaluate(() => window.__pianoSessions[0].stream.getAudioTracks()[0].readyState)).toBe('ended');

    await page.locator('#screen-landing .menu-card').filter({ hasText: 'Coin Run' }).click();
    await expect(page.locator('#keyboard')).toBeHidden();
    await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        const { renderSheet } = await import('/js/game.js');
        state.game.notes = ['A4', 'C4'];
        state.game.durations = [1, 1];
        renderSheet();
    });
    await page.locator('#game-start-overlay button').click();
    await expect.poll(() => page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        return state.game.phase;
    })).toBe('playing', { timeout: 10000 });
    await page.evaluate(() => window.__playSyntheticNote(440));
    await expect.poll(() => page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        return state.game.hits;
    }), { timeout: 12000 }).toBe(1);
    await expect(page.locator('#mic-game-note')).toHaveText('A4');

    await page.locator('#screen-game .top-bar button').first().click();
    await expect(page.locator('#screen-landing.active')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__pianoSessions.at(-1).stream.getAudioTracks()[0].readyState)).toBe('ended');
    expect(errors).toEqual([]);
});

test('permission denial is explained and touch piano stays available', async ({ page }) => {
    await enterWithSyntheticPiano(page, { denied: true });
    await page.evaluate(()=>window.setHomeTab('setup'));
    await page.locator('#input-microphone').click();
    await expect(page.locator('#mic-status')).toContainText('denied');
    await expect(page.locator('#mic-confirm')).toBeDisabled();
    await page.locator('#mic-modal .btn-secondary').click();
    await expect(page.locator('#input-touch')).toHaveClass(/selected/);
    await page.locator('#screen-landing .menu-card').filter({ hasText: 'Coin Run' }).click();
    await expect(page.locator('#keyboard')).toBeVisible();
});

test('real piano mode exposes a visible switch back to touch keys', async ({ page }) => {
    await enterWithSyntheticPiano(page);
    await page.evaluate(()=>window.setHomeTab('setup'));
    await page.locator('#input-microphone').click();
    await expect.poll(() => page.evaluate(() => window.__pianoSessions.length)).toBe(1);
    await page.evaluate(() => window.__playSyntheticNote(440));
    await expect(page.locator('#mic-confirm')).toBeEnabled({ timeout: 12000 });
    await page.locator('#mic-confirm').click();
    await page.locator('#screen-landing .menu-card').filter({ hasText: 'Coin Run' }).click();
    await expect(page.locator('#mic-game-status')).toBeVisible();
    await expect(page.locator('#keyboard')).toBeHidden();
    await page.locator('#mic-game-status button').click();
    await expect(page.locator('#keyboard')).toBeVisible();
    await expect(page.locator('#mic-game-status')).toBeHidden();
});
