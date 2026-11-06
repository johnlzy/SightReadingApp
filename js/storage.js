import { state } from './state.js';

// REMOVED: import from ui.js to break the cycle

// A configurable local parental gate; this is not server-side authentication.
const PIN_KEY = 'fsr_parent_pin_v1';
export function hasParentPin() { return !!localStorage.getItem(PIN_KEY); }
export function setParentPin(pin) {
    if(!/^\d{4,8}$/.test(pin)) return false;
    localStorage.setItem(PIN_KEY, pin);
    return true;
}

/* --- CREDIT LOGIC --- */

function checkDailyCredits(user) {
    const today = new Date().toDateString();
    if (typeof user.credits === 'undefined') user.credits = 0;
    if (!user.instruments) user.instruments = ['piano']; 
    if (typeof user.tCoins === 'undefined') user.tCoins = 0;
    if (typeof user.bCoins === 'undefined') user.bCoins = 0;
    if (typeof user.unlockedSongs === 'undefined') user.unlockedSongs = 0;
    if(!user.scores || typeof user.scores !== 'object') user.scores = {};
    if(!user.scores.coin || typeof user.scores.coin !== 'object') user.scores.coin = {};
    for(const difficulty of ['easy', 'medium', 'hard', 'pro']) {
        if(!Array.isArray(user.scores.coin[difficulty])) user.scores.coin[difficulty] = [];
    }
    if(!user.scores.songs || typeof user.scores.songs !== 'object') user.scores.songs = {};

    if (user.lastLogin !== today) {
        if (user.credits < 8) user.credits = 8;
        user.lastLogin = today;
    }
    return user;
}

export function deductCredit() {
    if(!state.currentUser) return false;
    if(state.currentUser.credits > 0) {
        state.currentUser.credits--;
        saveCurrentUser();
        return true;
    }
    return false;
}

export function addAdminCredits(amount) {
    if(!state.currentUser) return;
    state.currentUser.credits += amount;
    saveCurrentUser();
}

export function verifyPin(input) {
    return hasParentPin() && input === localStorage.getItem(PIN_KEY);
}

/* --- USER LOGIC --- */

// REMOVED: loadUsers() function (Moved to ui.js)

export function createUser() {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    const today = new Date().toDateString();
    
    const newUser = {
        name: state.tempUser.name,
        avatar: state.tempUser.avatar,
        difficulty: state.tempUser.diff,
        tCoins: 0,
        bCoins: 0,
        credits: 8,
        lastLogin: today,
        instruments: ['piano'],
        unlockedSongs: 0,
        scores: { coin: { easy: [], medium: [], hard: [], pro: [] }, songs: {} }
    };
    list.push(newUser);
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));
    
    // Return the new index so UI knows who to log in
    return list.length - 1;
}

export function deleteUser(index) {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    list.splice(index, 1);
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));
    // Removed loadUsers call
}

export function loginUser(index) {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    let user = list[index];
    
    // Check for daily reset
    user = checkDailyCredits(user);
    
    state.currentUser = user;
    state.currentUser.idx = index; 
    
    if(!state.currentUser.scores) {
        state.currentUser.scores = { coin: { easy: [], medium: [], hard: [] }, songs: {} };
    }

    list[index] = user;
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));

    // REMOVED: updateLanding() and showScreen() calls.
    // The UI will handle this after calling loginUser.
}

export function saveCurrentUser() {
    if(state.currentUser === null) return;
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    list[state.currentUser.idx] = state.currentUser;
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));
    // Removed updateLanding call (should be handled by caller or state listener if needed)
}

export function logout() {
    state.currentUser = null;
    // Removed showScreen and loadUsers calls
}
