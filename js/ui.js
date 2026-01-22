import { state } from './state.js';
import { INSTRUMENTS, SONG_DB } from './config.js';
import { playRun } from './audio.js';
// Import data functions from storage
import { saveCurrentUser, deleteUser, createUser, loginUser, verifyPin, addAdminCredits, logout as logoutData } from './storage.js';
import { startGame } from './game.js';

/* --- UI HELPERS --- */

export function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
}

/* --- MOVED: LOAD USERS --- */
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

        // Add Click Handlers
        cont.querySelectorAll('.user-btn').forEach(btn => {
            btn.onclick = () => {
                // 1. Update Data
                loginUser(parseInt(btn.dataset.index)); 
                // 2. Update UI
                updateLanding();
                showScreen('screen-landing');
            };
        });
        
        cont.querySelectorAll('.btn-danger').forEach(btn => {
            btn.onclick = () => window.handleUserDelete(parseInt(btn.dataset.delete));
        });
    }
}

/* --- NEW WRAPPERS FOR BUTTONS --- */

export function handleCreateUserUI() {
    // 1. Create data
    const newIndex = createUser();
    // 2. Update UI
    hideNewUserForm();
    loadUsers();
    // 3. Login
    loginUser(newIndex);
    updateLanding();
    showScreen('screen-landing');
}

export function handleLogoutUI() {
    logoutData();
    showScreen('screen-register');
    loadUsers();
}

/* --- ADMIN & SECURITY --- */

export function checkAdmin(callback) {
    const pin = prompt("🔐 Parent Admin: Enter PIN");
    if(verifyPin(pin)) {
        callback();
    } else {
        alert("Incorrect PIN");
    }
}

export function showParentPanel() {
    checkAdmin(() => {
        document.getElementById('admin-modal').style.display = 'flex';
        document.getElementById('admin-current-user').innerText = state.currentUser ? state.currentUser.name : 'Unknown';
        document.getElementById('admin-current-credits').innerText = state.currentUser ? state.currentUser.credits : 0;
    });
}

export function hideParentPanel() {
    document.getElementById('admin-modal').style.display = 'none';
}

export function handleAddCredit(amt) {
    addAdminCredits(amt); 
    updateLanding();
    document.getElementById('admin-current-credits').innerText = state.currentUser.credits;
    alert(`Added ${amt} credits!`);
}

export function handleNewUserClick() {
    checkAdmin(() => {
        showNewUserForm();
    });
}

export function handleUserDelete(index) {
    checkAdmin(() => {
        if(confirm("Are you sure you want to delete this player?")) {
            deleteUser(index);
            loadUsers(); // Refresh the list
        }
    });
}

// ... Keep generateName, setRegDiff, selectAvatar, showNewUserForm, hideNewUserForm ...
// ... Keep updateLanding, setClef, goToStore, buyItem, goToSongs, renderHighScores ...
// (These functions below remain exactly the same as your original file, just ensure they are still there)

export function generateName() {
    const adjs = ['Happy','Sparkly','Jolly','Sunny','Bouncy','Lucky','Magic','Super','Cool'];
    const nouns = ['Panda','Kitty','Puppy','Star','Cookie','Bunny','Tiger','Moon','Bear'];
    state.tempUser.name = adjs[Math.floor(Math.random()*adjs.length)] + ' ' + nouns[Math.floor(Math.random()*nouns.length)];
    const el = document.getElementById('gen-name');
    if(el) el.innerText = state.tempUser.name;
}

export function setRegDiff(lvl) {
    state.tempUser.diff = lvl;
    let t = "C to G (White keys)";
    if(lvl === 'medium') t = "One Octave (White keys)";
    if(lvl === 'hard') t = "One Octave (Black & White)";
    document.getElementById('diff-desc').innerText = t;
}

export function selectAvatar(em) {
    state.tempUser.avatar = em;
}

export function showNewUserForm() {
    document.getElementById('new-user-form').style.display='block';
    generateName();
}

export function hideNewUserForm() {
    document.getElementById('new-user-form').style.display='none';
}

export function updateLanding() {
    if(!state.currentUser) return;
    document.getElementById('user-display').innerText = `${state.currentUser.avatar} ${state.currentUser.name}`;
    document.getElementById('landing-t-coins').innerText = state.currentUser.tCoins;
    document.getElementById('landing-b-coins').innerText = state.currentUser.bCoins;
    
    const creds = state.currentUser.credits !== undefined ? state.currentUser.credits : 0;
    document.getElementById('landing-credits').innerText = creds;

    const bag = document.getElementById('landing-bag');
    bag.innerHTML = '';
    const allKeys = Object.keys(INSTRUMENTS);
    allKeys.sort((a,b) => {
        const hasA = state.currentUser.instruments.includes(a);
        const hasB = state.currentUser.instruments.includes(b);
        return hasB - hasA;
    });

    allKeys.forEach(k => {
        const div = document.createElement('div');
        const owned = state.currentUser.instruments.includes(k);
        div.className = `inst-item ${owned?'unlocked':'locked'} ${state.currentInstKey===k && owned ? 'selected':''}`;
        div.innerText = INSTRUMENTS[k].name.split(' ')[1]; 
        if(owned) {
            div.onclick = () => {
                state.currentInstKey = k;
                playRun(k);
                updateLanding();
            }
        }
        bag.appendChild(div);
    });
}

export function setClef(c) {
    state.currentClef = c;
    document.getElementById('clef-treble').classList.toggle('selected', c==='treble');
    document.getElementById('clef-bass').classList.toggle('selected', c==='bass');
}

export function goToStore() {
    const isT = (state.currentClef === 'treble');
    const currency = isT ? state.currentUser.tCoins : state.currentUser.bCoins;
    document.getElementById('store-currency-icon').innerText = isT ? '🎼' : '𝄢';
    document.getElementById('store-coins').innerText = currency;
    document.getElementById('store-title').innerText = isT ? "Treble Store" : "Bass Store";
    
    const list = Object.keys(INSTRUMENTS).filter(k => {
        if(k==='piano') return true;
        const isLow = ['cello','tuba','bassoon','drum','bassg'].includes(k);
        return isT ? !isLow : isLow;
    });

    const grid = document.getElementById('store-grid');
    grid.innerHTML = '';
    
    list.forEach(k => {
        const item = INSTRUMENTS[k];
        const owned = state.currentUser.instruments.includes(k);
        const el = document.createElement('div');
        el.className = 'store-item';
        el.innerHTML = `
            <div style="font-size:3rem; margin-bottom:5px;">${item.name.split(' ')[1]}</div>
            <strong>${item.name.split(' ')[0]}</strong><br>
            ${owned ? '<span style="color:#aaa">Owned</span>' : `<span class="price-tag">${item.price}</span>`}
        `;
        if(!owned) el.onclick = () => buyItem(k, item.price, isT);
        grid.appendChild(el);
    });
    showScreen('screen-store');
}

function buyItem(k, price, isT) {
    if(isT) {
        if(state.currentUser.tCoins >= price) {
            state.currentUser.tCoins -= price;
            state.currentUser.instruments.push(k);
            saveCurrentUser();
            goToStore();
            playRun(k);
        } else alert("Not enough coins!");
    } else {
        if(state.currentUser.bCoins >= price) {
            state.currentUser.bCoins -= price;
            state.currentUser.instruments.push(k);
            saveCurrentUser();
            goToStore();
            playRun(k);
        } else alert("Not enough coins!");
    }
}

export function goToSongs() {
    const cont = document.getElementById('song-list-container');
    cont.innerHTML = '';
    
    SONG_DB.forEach((s, i) => {
        const locked = i > state.currentUser.unlockedSongs;
        const div = document.createElement('div');
        div.className = `song-item ${locked?'locked':''}`;
        div.innerHTML = `
            <div>
                <strong>${i+1}. ${s.title}</strong><br>
                <small>Reward: ${s.reward} coins</small>
            </div>
            <div style="font-size:1.5rem">${locked?'🔒':'✅'}</div>
        `;
        if(!locked) div.onclick = () => startGame('song', i);
        cont.appendChild(div);
    });
    showScreen('screen-songs');
}

export function renderHighScores() {
    const list = document.getElementById('high-score-list');
    const label = document.getElementById('score-category-label');
    list.innerHTML = '';
    
    let scores = [];
    if(state.game.mode === 'coin') {
        label.innerText = `Coin Run - ${state.currentUser.difficulty.toUpperCase()} Mode`;
        scores = state.currentUser.scores.coin[state.currentUser.difficulty];
    } else {
        label.innerText = `Song: ${SONG_DB[state.game.songId].title}`;
        scores = state.currentUser.scores.songs[state.game.songId] || [];
    }

    if(scores.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding:10px;">No records yet.</div>';
    } else {
        scores.forEach((s, i) => {
            const div = document.createElement('div');
            div.className = 'score-row';
            div.innerHTML = `
                <span style="font-weight:bold; color:${i===0?'gold':'#555'}">#${i+1}</span>
                <span>${s}s</span>
            `;
            list.appendChild(div);
        });
    }
}
