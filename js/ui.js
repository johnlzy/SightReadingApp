import { state } from './state.js';
import { INSTRUMENTS, SONG_DB } from './config.js';
import { playRun } from './audio.js';
import { saveCurrentUser, deleteUser, createUser, loginUser, listUsers, saveUserPreference, verifyPin, hasParentPin, setParentPin, addAdminCredits, logout as logoutData } from './storage.js';
import { activatePlayBudget, deactivatePlayBudget, pausePlayBudget, resumePlayBudget,
    currentPlayBudget, configurePlayBudget, addParentPlaytime, canPlayToday } from './app-budget.js';
import { startGame } from './game.js';
import { ensureLearning, progressSummary } from './learning.js';
import { syncInputModeUI } from './mic-ui.js';
let parentZoneAuthorized = false;

export function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
}

export function loadUsers() {
    const list = listUsers();
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
                    <span class="user-avatar" style="font-size:1.5rem"></span>
                    <strong class="user-name"></strong>
                    <span class="user-difficulty" style="color:#888; font-size:0.8rem"></span>
                </button>
                <button class="btn-danger" data-delete="${index}">🗑️</button>
            `;
            row.querySelector('.user-avatar').textContent = u.avatar || '🎹';
            row.querySelector('.user-name').textContent = u.name || 'Player';
            row.querySelector('.user-difficulty').textContent = u.placement?.status === 'provisional'
                ? `(Reading Level ${u.placement.level})` : '(Your own music journey)';
            cont.appendChild(row);
        });

        cont.querySelectorAll('.user-btn').forEach(btn => {
            btn.onclick = () => {
                loginUser(parseInt(btn.dataset.index));
                setClef(state.currentClef);
                activatePlayBudget();
                syncInputModeUI();
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
    const nickname = document.getElementById('child-name-input')?.value?.trim();
    if(nickname) state.tempUser.name = nickname.slice(0,30);
    state.tempUser.startingComfort =
        document.getElementById('starting-comfort')?.value || 'new';
    const newIndex = createUser();
    hideNewUserForm();
    loadUsers();
    loginUser(newIndex);
    setClef(state.currentClef);
    activatePlayBudget();
    syncInputModeUI();
    updateLanding();
    showScreen('screen-landing');
}

export function handleLogoutUI() {
    parentZoneAuthorized = false;
    deactivatePlayBudget();
    logoutData();
    showScreen('screen-register');
    loadUsers();
}

export function checkAdmin(callback) {
    if(!hasParentPin()) {
        const chosen = prompt('🔐 Parent setup: Choose a 4–8 digit PIN (keep it private)');
        if(chosen === null) return;
        if(!setParentPin(chosen)) {
            alert('Choose a PIN containing 4 to 8 digits.');
            return;
        }
        callback();
        return;
    }
    const pin = prompt("🔐 Parent Admin: Enter PIN");
    if(pin === null) return;
    if(verifyPin(pin)) callback();
    else alert("Incorrect PIN");
}

export function showParentPanel() {
    checkAdmin(() => {
        parentZoneAuthorized = true;
        pausePlayBudget();
        document.getElementById('admin-modal').style.display = 'flex';
        document.getElementById('admin-current-user').innerText = state.currentUser ? state.currentUser.name : 'Unknown';
        const b = currentPlayBudget();
        document.getElementById('parent-used-time').textContent = b
            ? Math.round(b.usedSeconds/60) + ' minutes used today' : 'No player selected';
        document.getElementById('parent-time-allowance').value = String(b?.dailySeconds ?? 'unlimited');
    });
}

export function hideParentPanel() {
    parentZoneAuthorized = false;
    document.getElementById('admin-modal').style.display = 'none';
    resumePlayBudget();
}
export function parentSetTimeAllowance(value) {
    if(!parentZoneAuthorized) return;
    configurePlayBudget(value === 'unlimited' ? null : Number(value));
    showParentTimeMessage('Saved for this player');
}
export function parentGrantMusicTime(seconds) {
    if(!parentZoneAuthorized) return;
    addParentPlaytime(seconds);
    showParentTimeMessage('Extra time added for today');
}
function showParentTimeMessage(message) {
    const node = document.getElementById('parent-time-status');
    if(node) node.textContent = message;
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
    if(lvl === 'pro') t = "Rhythm & Timing (50 BPM Coin Run)";
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
    
    const b = currentPlayBudget();
    const remaining = b?.remaining;
    document.getElementById('landing-credits').innerText =
        remaining === Infinity ? '∞' : Math.ceil(Math.max(0,remaining ?? 0)/300);
    renderLearningDashboard();
    const placed = state.currentUser.placement?.status === 'provisional';
    const hero = document.getElementById('today-mission');
    const action = document.getElementById('journey-btn');
    if(hero) hero.textContent = placed
        ? 'Reading Level ' + (state.currentUser.readingLevel ??
            state.currentUser.placement.level) +
          ' · Pip has a new note adventure for you today.'
        : 'Meet Pip at your first concert. Show the music you already know!';
    if(action) action.textContent = placed
        ? '🌱 Continue my adventure' : '🎵 Play my first concert';

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
                saveUserPreference('instrument',k);
                playRun(k);
                updateLanding();
            }
        }
        bag.appendChild(div);
    });
}

export function renderLearningDashboard() {
    if(!state.currentUser) return;
    const learning = ensureLearning(state.currentUser);
    const { mastered, practiced, total, weak, checks } = progressSummary(
        learning, state.currentClef, state.currentUser.difficulty
    );
    const ids = {
        'learning-clef': state.currentClef === 'treble' ? 'Treble clef' : 'Bass clef',
        'learning-practiced': practiced + '/' + total,
        'learning-mastered': String(mastered),
        'learning-checks': String(checks.length),
        'learning-focus': weak.length
            ? 'Focus notes: ' + weak.map(x=>x.note).join(', ') +
                '. Adaptive Practice will revisit these.'
            : practiced === 0
                ? 'Start Adaptive Practice to discover which notes need extra attention.'
                : 'Keep practicing! More attempts will reveal your strongest and weakest notes.'
    };
    for(const [id,value] of Object.entries(ids)) {
        const el = document.getElementById(id);
        if(el) el.textContent = value;
    }
    const chart = document.getElementById('learning-check-chart');
    if(chart) {
        chart.replaceChildren();
        for(const [i,check] of checks.entries()) {
            const bar = document.createElement('div');
            bar.className = 'learning-check-bar';
            bar.style.height = Math.max(5,check.score) + '%';
            bar.dataset.scoreLow = String(check.score < 70);
            bar.title = 'Check ' + (i+1) + ': ' + check.score + '% first try';
            bar.setAttribute('aria-label',bar.title);
            const label = document.createElement('span');
            label.textContent = check.score + '%';
            bar.appendChild(label);
            chart.appendChild(bar);
        }
    }
    const trend = document.getElementById('learning-trend');
    if(trend) {
        if(checks.length >= 2) {
            const change = checks.at(-1).score - checks.at(-2).score;
            trend.textContent = 'Last Skill Check: ' + checks.at(-1).score +
                '% first try (' + (change >= 0 ? '+' : '') + change +
                ' points from the previous check).';
        } else if(checks.length) {
            trend.textContent = 'Starting benchmark: ' + checks[0].score +
                '% first try. Take another Skill Check after some practice.';
        } else {
            trend.textContent = 'No Skill Checks yet. Take one to set a baseline on a fresh sequence.';
        }
    }
}

export function setClef(c) {
    state.currentClef = c;
    saveUserPreference('clef',c);
    document.getElementById('clef-treble').classList.toggle('selected', c==='treble');
    document.getElementById('clef-bass').classList.toggle('selected', c==='bass');
    renderLearningDashboard();
}

export function goToStore() {
    if(!canPlayToday()) return;
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
    if(!canPlayToday()) return;
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
            <div style="font-size:1.5rem">${locked?'🔒':completed?'✅':'▶️'}</div>
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

    if(state.game.mode === 'practice' || state.game.mode === 'check') {
        label.textContent = state.game.mode === 'check'
            ? 'Skill Check results are saved in My Learning Journey.'
            : 'Adaptive Practice results help select your next exercises.';
        list.textContent = 'Progress is personal — it is not part of the coin leaderboard.';
        return;
    }

    if(state.game.mode === 'coin') {
        const diff = state.currentUser.difficulty;
        label.innerText = `Coin Run - ${diff.toUpperCase()} Mode (Top 5 on This Device)`;
        
        // Fetch Global Scores for this difficulty
        scores = getGlobalScores('coin', diff);
        
        // Sort DESC (Higher coins is better)
        scores.sort((a,b) => b.score - a.score);
        
        // If Pro, we display coins. If not pro, we also display coins.
        isTime = false;
        
    } else {
        label.innerText = `Song: ${SONG_DB[state.game.songId].title} (Top 5 on This Device)`;
        
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
            const name = document.createElement('span');
            name.style.fontWeight = 'bold';
            name.style.color = i === 0 ? 'gold' : '#555';
            name.textContent = `#${i+1} ${s.name}`;
            const value = document.createElement('span');
            value.textContent = `${s.score}${unit}`;
            div.append(name, value);
            list.appendChild(div);
        });
    }
}
