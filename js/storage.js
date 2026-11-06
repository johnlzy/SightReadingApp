import { state } from './state.js';
import { ensureLearning } from './learning.js';
import { ensureJourney } from './learning-journey.js';
import { upgradeProfile, upgradeProfileList, findProfileIndex, newProfileId, savePreference } from './profiles.js';
import { ensureBudget, localDayKey } from './play-budget.js';
import { ensureEconomy } from './economy.js';
import { ensureDailyQuest } from './quests.js';

const PLAYERS_KEY = 'fsr_users_v2';
const PIN_KEY = 'fsr_parent_pin_v1';

// A local convenience gate, not strong authentication or OS screen-time controls.
export function hasParentPin() { return !!localStorage.getItem(PIN_KEY); }
export function setParentPin(pin) {
    if(!/^\d{4,8}$/.test(pin)) return false;
    localStorage.setItem(PIN_KEY, pin);
    return true;
}
export function verifyPin(input) {
    return hasParentPin() && input === localStorage.getItem(PIN_KEY);
}

function readPlayers() {
    try {
        const raw = JSON.parse(localStorage.getItem(PLAYERS_KEY) || '[]');
        return upgradeProfileList(raw);
    } catch {
        return [];
    }
}
function persistPlayers(list) {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(list));
}
export function listUsers() {
    const list = readPlayers();
    persistPlayers(list); // saves immutable IDs for older profiles exactly once
    return list;
}

function preparePlayer(user) {
    upgradeProfile(user);
    if(!Number.isFinite(user.credits)) user.credits = 0;
    if(!Array.isArray(user.instruments)) user.instruments = ['piano'];
    if(!Number.isFinite(user.tCoins)) user.tCoins = 0;
    if(!Number.isFinite(user.bCoins)) user.bCoins = 0;
    if(!Number.isInteger(user.unlockedSongs)) user.unlockedSongs = 0;
    if(!user.scores || typeof user.scores !== 'object') user.scores = {};
    if(!user.scores.coin || typeof user.scores.coin !== 'object') user.scores.coin = {};
    for(const d of ['easy','medium','hard','pro']) {
        if(!Array.isArray(user.scores.coin[d])) user.scores.coin[d] = [];
    }
    if(!user.scores.songs || typeof user.scores.songs !== 'object') user.scores.songs = {};
    ensureLearning(user);
    ensureJourney(user);
    ensureBudget(user, localDayKey());
    ensureEconomy(user);
    ensureDailyQuest(user);
    // Keep historical v3 ticket balances for safe migration, but do not
    // charge per activity once Music Pass time limits are enabled.
    return user;
}

export function createUser() {
    const users = listUsers();
    const newUser = preparePlayer({
        profileId: newProfileId(),
        name: state.tempUser.name,
        avatar: state.tempUser.avatar,
        difficulty: state.tempUser.diff,
        startingComfort: state.tempUser.startingComfort || 'new',
        tCoins: 0, bCoins: 0, credits: 8,
        lastLogin: new Date().toDateString(),
        instruments: ['piano'],
        unlockedSongs: 0,
        scores: { coin: { easy: [], medium: [], hard: [], pro: [] }, songs: {} },
        learning: { version:1, notes:{}, rhythms:{}, sessions:[], checks:[], checkCount:0 }
    });
    users.push(newUser);
    persistPlayers(users);
    return users.length - 1; // legacy registration interface
}

export function deleteUser(identifier) {
    const users = listUsers();
    const index = findProfileIndex(users, identifier);
    if(index < 0) return false;
    const [removed] = users.splice(index, 1);
    persistPlayers(users);
    if(state.currentUser?.profileId === removed.profileId) logout();
    else if(state.currentUser) state.currentUser.idx =
        findProfileIndex(users, state.currentUser.profileId);
    return true;
}

export function loginUser(identifier) {
    const users = listUsers();
    const index = findProfileIndex(users, identifier);
    if(index < 0) return null;
    const user = preparePlayer(users[index]);
    state.currentUser = user;
    state.currentUser.idx = index;
    state.currentClef = user.preferences.clef;
    state.currentInstKey = user.preferences.instrument;
    // Restore preference only; capture still requires a Start click / permission.
    state.inputMode = user.preferences.input;
    users[index] = user;
    persistPlayers(users);
    return user;
}

export function saveCurrentUser() {
    if(!state.currentUser?.profileId) return;
    const users = listUsers();
    const index = findProfileIndex(users, state.currentUser.profileId);
    if(index < 0) return; // never resurrect a deleted sibling's account
    state.currentUser.idx = index;
    users[index] = state.currentUser;
    persistPlayers(users);
}

export function saveUserPreference(key, value) {
    if(!state.currentUser) return;
    savePreference(state.currentUser, key, value);
    saveCurrentUser();
}

export function deductCredit() {
    // Legacy API maintained for existing callers; V4 use the time budget.
    if(!state.currentUser) return false;
    if(state.currentUser.credits > 0) {
        state.currentUser.credits--;
        saveCurrentUser();
        return true;
    }
    return false;
}

export function addAdminCredits(amount) {
    if(!state.currentUser || !Number.isFinite(amount)) return;
    state.currentUser.credits += amount;
    saveCurrentUser();
}

export function logout() {
    state.currentUser = null;
    state.currentClef = 'treble';
    state.currentInstKey = 'piano';
    state.inputMode = 'touch';
}
