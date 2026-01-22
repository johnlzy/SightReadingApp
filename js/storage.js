import { state } from './state.js';
import { updateLanding, showScreen, hideNewUserForm } from './ui.js';

/* --- USER LOGIC --- */

export function loadUsers() {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    const cont = document.getElementById('existing-users-list');
    if (!cont) return; // Guard in case DOM isn't ready
    
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

        // Add event listeners (replacing inline onclicks)
        cont.querySelectorAll('.user-btn').forEach(btn => {
            btn.onclick = () => loginUser(parseInt(btn.dataset.index));
        });
        cont.querySelectorAll('.btn-danger').forEach(btn => {
            btn.onclick = () => deleteUser(parseInt(btn.dataset.delete));
        });
    }
}

export function createUser() {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    const newUser = {
        name: state.tempUser.name,
        avatar: state.tempUser.avatar,
        difficulty: state.tempUser.diff,
        tCoins: 0,
        bCoins: 0,
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
    if(!confirm("Are you sure you want to delete this player?")) return;
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    list.splice(index, 1);
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));
    loadUsers();
}

export function loginUser(index) {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    state.currentUser = list[index];
    state.currentUser.idx = index; 
    
    // Legacy migration check (if old user format)
    if(!state.currentUser.scores) {
        state.currentUser.scores = { coin: { easy: [], medium: [], hard: [] }, songs: {} };
    }

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
