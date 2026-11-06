import test from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../js/state.js';

const ids = new Map();
function element() {
    const classes = new Set();
    return {
        style: {}, innerText: '', classList: {
            add: name => classes.add(name),
            remove: name => classes.delete(name),
            contains: name => classes.has(name)
        },
        querySelectorAll: () => [], remove: () => {}
    };
}

globalThis.window = { innerWidth: 800, innerHeight: 600 };
globalThis.cancelAnimationFrame = () => {};
globalThis.document = {
    getElementById: id => ids.get(id) ?? null,
    querySelectorAll: () => [],
    createElement: () => element(),
    body: { appendChild: () => {} }
};
for(const id of ['acc-bar-fill', 'keyboard', 'game-start-overlay', 'progress-fill', 'game-coins']) {
    ids.set(id, element());
}
ids.get('game-start-overlay').style.display = 'none';

const { handleInput, exitGame } = await import('../js/game.js');

test('inputs are ignored during the countdown and after a finished round', () => {
    state.currentUser = { difficulty: 'pro' };
    Object.assign(state.game, { mode: 'coin', notes: ['C4'], durations: [1],
        idx: 0, hits: 0, mistakes: 0, phase: 'countdown', nextBeatTime: Date.now() });
    handleInput('C4', element());
    assert.equal(state.game.idx, 0);
    assert.equal(state.game.hits, 0);
    state.game.phase = 'finished';
    handleInput('C4', element());
    assert.equal(state.game.hits, 0);
});

test('correct pitch outside the onset window counts as a mistake, not a hit', () => {
    state.currentUser = { difficulty: 'pro' };
    Object.assign(state.game, { mode: 'coin', notes: ['C4', 'D4'], durations: [1, 1],
        idx: 0, coins: 0, hits: 0, mistakes: 0, phase: 'playing',
        nextBeatTime: Date.now() + 1200 });
    handleInput('C4', element());
    assert.equal(state.game.idx, 0);
    assert.equal(state.game.hits, 0);
    assert.equal(state.game.mistakes, 1);

    state.game.nextBeatTime = Date.now();
    handleInput('C4', element());
    assert.equal(state.game.idx, 1);
    assert.equal(state.game.hits, 1);
});

test('exiting a round cancels an outstanding countdown timer', async () => {
    state.currentUser = null;
    state.game.phase = 'countdown';
    state.game.sessionToken = 7;
    let called = false;
    state.game.countdownTimeout = setTimeout(() => { called = true; }, 20);
    exitGame();
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(called, false);
    assert.equal(state.game.phase, 'idle');
    assert.equal(state.game.sessionToken, 8);
});


test('microphone notes use the same hit and progress path without a virtual key', () => {
    state.currentUser = { difficulty: 'easy' };
    state.inputMode = 'microphone';
    Object.assign(state.game, {
        mode: 'coin', notes: ['A4', 'C4'], durations: [1, 1], idx: 0,
        hits: 0, mistakes: 0, coins: 0, phase: 'playing'
    });
    handleInput('A4', null, Date.now(), 'microphone');
    assert.equal(state.game.hits, 1);
    assert.equal(state.game.coins, 1);
    assert.equal(state.game.idx, 1);
    state.inputMode = 'touch';
});
