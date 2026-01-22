import { state } from './state.js';
import { updateLanding, showScreen, hideNewUserForm } from './ui.js';

export const ADMIN_PIN = "123456";

/* --- CREDIT LOGIC --- */

function checkDailyCredits(user) {
    const today = new Date().toDateString();
    
    // Legacy support: ensure credits exist if undefined
    if (typeof user.credits === 'undefined') {
        user.credits = 0; // Initialize at 0, logic below will top it up
    }

    // If it's a new day
    if (user.lastLogin !== today) {
        // OPTION 1: Top up to 8 only if they are below 8
        if (user.credits < 8) {
            user.credits = 8;
        }
        // OPTION 2: Add 8 credits as a daily bonus (accumulative)
        // user.credits += 8; 

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
    updateLanding();
}

export function verifyPin(input) {
    return input === ADMIN_PIN;
}

/* --- USER LOGIC --- */

export function loadUsers() {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    const cont = document.getElementById('existing-users-list');
    if (!cont) return; 
    
    cont.innerHTML = '';
    if(list.length === 0) {
        cont.innerHTML = '<p style="color:#888; text-align:center;">No existing players found.</p>';
    } else {
        list.forEach((u, index) => {
            const row = document.createElement('div');
            row.className = 'user-row';
            row.innerHTML = `
                <button class="user-btn" data-index="${index}">
                    <span style="font-size:1.5rem">${u.avatar}</span> 
                    <strong>${u.name}</strong> 
                    <span style="color:#888; font-size:0.8rem">(${u.difficulty})</span>
                </button>
                <button class="btn-danger" data-delete="${index}">🗑️</button>
            `;
            cont.appendChild(row);
        });

        cont.querySelectorAll('.user-btn').forEach(btn => {
            btn.onclick = () => loginUser(parseInt(btn.dataset.index));
        });
        cont.querySelectorAll('.btn-danger').forEach(btn => {
            // UI layer handles the PIN prompt now
            btn.onclick = () => window.handleUserDelete(parseInt(btn.dataset.delete));
        });
    }
}

export function createUser() {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    const today = new Date().toDateString();
    
    const newUser = {
        name: state.tempUser.name,
        avatar: state.tempUser.avatar,
        difficulty: state.tempUser.diff,
        tCoins: 0,
        bCoins: 0,
        credits: 8,           // New: Daily Credits
        lastLogin: today,     // New: Date tracking
        instruments: ['piano'],
        unlockedSongs: 0,
        scores: {
            coin: { easy: [], medium: [], hard: [] },
            songs: {}
        }
    };
    list.push(newUser);
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));
    hideNewUserForm();
    loadUsers();
    loginUser(list.length - 1);
}

export function deleteUser(index) {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    list.splice(index, 1);
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));
    loadUsers();
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

    // Save back in case date/credits were updated
    list[index] = user;
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));

    updateLanding();
    showScreen('screen-landing');
}

export function saveCurrentUser() {
    if(state.currentUser === null) return;
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    list[state.currentUser.idx] = state.currentUser;
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));
    updateLanding();
}

export function logout() {
    state.currentUser = null;
    showScreen('screen-register');
    loadUsers();
}
