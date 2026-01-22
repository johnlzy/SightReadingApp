import { state } from './state.js';
import { INSTRUMENTS, SONG_DB } from './config.js';
import { playRun } from './audio.js';
import { saveCurrentUser, deleteUser, createUser, loginUser, verifyPin, addAdminCredits, logout as logoutData } from './storage.js';
import { startGame } from './game.js';

export function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
}

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
            btn.onclick = () => {
                loginUser(parseInt(btn.dataset.index)); 
                updateLanding();
                showScreen('screen-landing');
            };
        });
        
        cont.querySelectorAll('.btn-danger').forEach(btn => {
            btn.onclick = () => window.handleUserDelete(parseInt(btn.dataset.delete));
        });
    }
}

export function handleCreateUserUI() {
    const newIndex = createUser();
    hideNewUserForm();
    loadUsers();
    loginUser(newIndex);
    updateLanding();
    showScreen('screen-landing');
}

export function handleLogoutUI() {
    logoutData();
    showScreen('screen-register');
    loadUsers();
}

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
            loadUsers(); 
        }
    });
}

export function generateName() {
    const adjs = ['Happy','Sparkly','Jolly','Sunny','Bouncy','Lucky','Magic','Super','Cool'];
    const nouns = ['Panda','Kitty','Puppy','Star','Cookie','Bunny','Tiger','Moon','Bear'];
    state.tempUser.name = adjs[Math.floor(Math.random()*adjs.length)] + ' ' + nouns[Math.floor(Math.random()*nouns.length)];
    const el = document.getElementById('gen-name');
    if(el) el.innerText = state.tempUser.name;
}

export function setRegDiff(lvl, el) {
    if(el) {
        document.querySelectorAll('.toggle-group .toggle-opt').forEach(d => d.classList.remove('selected'));
        el.classList.add('selected');
    }
    state.tempUser.diff = lvl;
    let t = "C to G (White keys)";
    if(lvl === 'medium') t = "One Octave (White keys)";
    if(lvl === 'hard') t = "One Octave (Black & White)";
    if(lvl === 'pro') t = "Rhythm & Timing (Metronome 80 BPM)";
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
        const completed = i < state.currentUser.unlockedSongs; // Check if completed
    
        // Determine reward text
        let rewardText = `Reward: ${s.reward} coins`;
        if (completed) {
            rewardText = `Reward: Claimed (0 coins)`;
        }
    
        const div = document.createElement('div');
        div.className = `song-item ${locked?'locked':''}`;
        div.innerHTML = `
            <div>
                <strong>${i+1}. ${s.title}</strong><br>
                <small>${rewardText}</small> </div>
            <div style="font-size:1.5rem">${locked?'🔒':'✅'}</div>
        `;
        
        if(!locked) div.onclick = () => startGame('song', i);
        cont.appendChild(div);
    });
    showScreen('screen-songs');
}

// NEW: Global Score Aggregation
function getGlobalScores(type, key) {
    const users = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    let allScores = [];

    users.forEach(u => {
        if(!u.scores) return;
        
        let userScores = [];
        if(type === 'coin') {
            // key is difficulty (e.g., 'pro')
            // Ensure schema exists
            if(u.scores.coin && u.scores.coin[key]) {
                userScores = u.scores.coin[key];
            }
        } else {
            // key is songId
            if(u.scores.songs && u.scores.songs[key]) {
                userScores = u.scores.songs[key];
            }
        }

        // Add to global list
        userScores.forEach(s => {
            allScores.push({ name: u.name, score: s });
        });
    });

    return allScores;
}

export function renderHighScores() {
    const list = document.getElementById('high-score-list');
    const label = document.getElementById('score-category-label');
    list.innerHTML = '';
    
    let scores = []; // Array of objects {name, score}
    let isTime = false;

    if(state.game.mode === 'coin') {
        const diff = state.currentUser.difficulty;
        label.innerText = `Coin Run - ${diff.toUpperCase()} Mode (Top 5 Global)`;
        
        // Fetch Global Scores for this difficulty
        scores = getGlobalScores('coin', diff);
        
        // Sort DESC (Higher coins is better)
        scores.sort((a,b) => b.score - a.score);
        
        // If Pro, we display coins. If not pro, we also display coins.
        isTime = false;
        
    } else {
        label.innerText = `Song: ${SONG_DB[state.game.songId].title} (Top 5 Global)`;
        
        // Fetch Global Scores for this song
        scores = getGlobalScores('song', state.game.songId);
        
        // Sort ASC (Lower time is better)
        scores.sort((a,b) => a.score - b.score);
        
        isTime = true;
    }

    // Slice top 5
    if(scores.length > 5) scores.length = 5;

    if(scores.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding:10px;">No records yet.</div>';
    } else {
        scores.forEach((s, i) => {
            const div = document.createElement('div');
            const unit = isTime ? 's' : ' coins';
            div.className = 'score-row';
            div.innerHTML = `
                <span style="font-weight:bold; color:${i===0?'gold':'#555'}">#${i+1} ${s.name}</span>
                <span>${s.score}${unit}</span>
            `;
            list.appendChild(div);
        });
    }
}
