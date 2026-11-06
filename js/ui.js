import { state } from './state.js';
import { INSTRUMENTS, SONG_DB } from './config.js';
import { playRun } from './audio.js';
import { saveCurrentUser, deleteUser, createUser, loginUser, listUsers, saveUserPreference, verifyPin, hasParentPin, setParentPin, addAdminCredits, logout as logoutData } from './storage.js';
import { activatePlayBudget, deactivatePlayBudget, pausePlayBudget, resumePlayBudget,
    currentPlayBudget, configurePlayBudget, addParentPlaytime, canPlayToday } from './app-budget.js';
import { startGame, pauseMusicSession } from './game.js';
import { ensureLearning, progressSummary } from './learning.js';
import { ensureEconomy } from './economy.js';
import { ensureDailyQuest, questMessage } from './quests.js';
import { renderPipScene } from './companion.js';
import { restoreAudition, auditionProgressLabel } from './audition-draft.js';
import { readingJourneySummary } from './learning-journey.js';
import { openWorkshop } from './workshop-ui.js';
import { syncInputModeUI } from './mic-ui.js';
let parentZoneAuthorized = false;

export function showScreen(id) {
    // Inactive screens must not expose hidden controls to keyboard users,
    // assistive technology, or browser automation.
    document.querySelectorAll('.screen').forEach(screen => {
        const active = screen.id === id;
        screen.classList.toggle('active', active);
        screen.inert = !active;
        screen.setAttribute('aria-hidden', String(!active));
    });
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
        if(document.getElementById('screen-game')?.classList.contains('active'))
            pauseMusicSession();
        pausePlayBudget();
        document.getElementById('admin-modal').style.display = 'flex';
        document.getElementById('admin-current-user').innerText = state.currentUser ? state.currentUser.name : 'Unknown';
        const b = currentPlayBudget();
        document.getElementById('parent-used-time').textContent = b
            ? Math.round(b.usedSeconds/60) + ' minutes used today' : 'No player selected';
        document.getElementById('parent-time-allowance').value = String(b?.dailySeconds ?? 'unlimited');
        if(state.currentUser) {
            const reading=readingJourneySummary(state.currentUser,state.currentClef);
            const text = (id,value)=>{
                const el=document.getElementById(id);
                if(el)el.textContent=value;
            };
            text('parent-reading-level',reading.level===null
                ? 'Reading Level: not assessed yet (try the opening concert)'
                : 'Reading Level '+reading.level+
                    ' (based on current in-app evidence; not an examination grade)');
            text('parent-reading-focus','Next focus: '+reading.focus.description);
            text('parent-reading-check',reading.last
                ? 'Most recent independent phrase: '+reading.last.score+
                    '% first-try · '+reading.last.clef+' clef'
                : 'Independent phrase checks: not yet taken');
        }
    });
}

export function hideParentPanel() {
    parentZoneAuthorized = false;
    document.getElementById('admin-modal').style.display = 'none';
    if(state.game.phase!=='paused'&&state.game.phase!=='resuming')
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
    const economy=ensureEconomy(state.currentUser);
    ensureDailyQuest(state.currentUser);
    const sparkBalance=document.getElementById('landing-sparks');
    if(sparkBalance) sparkBalance.textContent=String(economy.sparks);
    // The historical coin balances remain in storage for migration audit.
    const formerTreble=document.getElementById('landing-t-coins');
    const formerBass=document.getElementById('landing-b-coins');
    if(formerTreble)formerTreble.textContent=String(state.currentUser.tCoins);
    if(formerBass)formerBass.textContent=String(state.currentUser.bCoins);
    const quest=document.getElementById('daily-quest');
    if(quest)quest.textContent=questMessage(state.currentUser);
    const pip=document.getElementById('home-pip-scene');
    if(pip)renderPipScene(pip,state.currentUser,{mood:'welcome'});
    
    const b = currentPlayBudget();
    const remaining = b?.remaining;
    document.getElementById('landing-credits').innerText =
        remaining === Infinity ? '∞' : Math.ceil(Math.max(0,remaining ?? 0)/300);
    renderLearningDashboard();
    const placed = state.currentUser.placement?.status === 'provisional';
    const draft = restoreAudition(state.currentUser,state.currentUser.auditionDraft);
    const hero = document.getElementById('today-mission');
    const action = document.getElementById('journey-btn');
    if(hero) hero.textContent = draft
        ? 'Your first concert is saved at note '+Math.min(8,draft.index+1)+
            ' of 8. You can finish when you are ready.'
        : placed
            ? 'Reading Level ' + (state.currentUser.readingLevel ??
                state.currentUser.placement.level) +
              ' · Pip has a new note adventure for you today.'
            : 'Meet Pip at your first concert. Show the music you already know!';
    if(action) action.textContent = draft
        ? auditionProgressLabel(draft)
        : placed ? '🌱 Continue my adventure' : '🎵 Play my first concert';
    const retry = document.getElementById('audition-retry-btn');
    if(retry)retry.hidden=Boolean(draft)||!placed;

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
    const reading=readingJourneySummary(state.currentUser,state.currentClef);
    const readingLabels = {
        1:'Note Detective',2:'Staff Explorer',3:'Melody Maker',
        4:'Page Reader',5:'Rhythm Navigator',6:'Two-Staff Explorer',
        7:'Fluent Musician',8:'Phrase Performer',
        9:'Independent Pianist',10:'Concert Reader'
    };
    const rd={
        'reading-level-indicator':reading.level===null
            ? 'Explore your own reading level'
            : 'Level '+reading.level+' · '+readingLabels[reading.level],
        'reading-next-skill':reading.focus.description,
        'reading-check-progress':reading.last
            ? 'Latest fresh phrase: '+reading.last.score+'% first try. '+
                reading.checks.length+' checks saved.'
            : 'Try a fresh phrase check to see how your reading transfers.'
    };
    for(const [id,value] of Object.entries(rd)){
        const el=document.getElementById(id);
        if(el)el.textContent=value;
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

// Preserve legacy navigation handlers while the Workshop owns purchasing.
export function goToStore() {
    openWorkshop();
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

    if(['practice','check','phrase','phrase-check'].includes(state.game.mode)) {
        label.textContent = state.game.mode === 'phrase-check'
            ? 'Your new-phrase checks are saved separately from practice.'
            : state.game.mode === 'phrase'
                ? 'Your stationary melody practice is now in My Learning Journey.'
                : state.game.mode === 'check'
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
