import test from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../js/state.js';
import { createUser, loginUser, saveCurrentUser, hasParentPin, setParentPin, verifyPin } from '../js/storage.js';

function makeStorage() {
    const db = new Map();
    return {
        getItem: key => db.get(key) ?? null,
        setItem: (key, val) => db.set(key, String(val)),
        removeItem: key => db.delete(key)
    };
}

test('new users can save a Pro score', () => {
    globalThis.localStorage = makeStorage();
    state.tempUser = { name: 'Test Reader', avatar: '🐱', diff: 'pro' };
    const id = createUser();
    loginUser(id);
    assert.ok(Array.isArray(state.currentUser.scores.coin.pro));
    state.currentUser.scores.coin.pro.push(50);
    saveCurrentUser();
    assert.deepEqual(JSON.parse(localStorage.getItem('fsr_users_v2'))[id].scores.coin.pro, [50]);
});

test('legacy profiles migrate missing score arrays without deleting scores', () => {
    globalThis.localStorage = makeStorage();
    const user = { name: 'Legacy', difficulty: 'pro', credits: 4, lastLogin: new Date().toDateString(),
        instruments: ['piano'], tCoins: 10, bCoins: 3, unlockedSongs: 0,
        scores: { coin: { easy: [12], hard: [24] }, songs: { '0': [99] } } };
    localStorage.setItem('fsr_users_v2', JSON.stringify([user]));
    loginUser(0);
    assert.deepEqual(state.currentUser.scores.coin.pro, []);
    assert.deepEqual(state.currentUser.scores.coin.easy, [12]);
    assert.deepEqual(state.currentUser.scores.songs['0'], [99]);
});

test('parent PIN is configurable rather than a shared hardcoded PIN', () => {
    globalThis.localStorage = makeStorage();
    assert.equal(hasParentPin(), false);
    assert.equal(verifyPin('123456'), false);
    assert.equal(setParentPin('12'), false);
    assert.equal(setParentPin('483920'), true);
    assert.equal(verifyPin('483920'), true);
    assert.equal(verifyPin('123456'), false);
});
