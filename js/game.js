import { state } from './state.js';
import { SONG_DB, TREBLE_Y, BASS_Y } from './config.js';
import { playTone, playRun } from './audio.js';
import { showScreen, renderHighScores, updateLanding } from './ui.js';
import { saveCurrentUser } from './storage.js';

/* --- CORE GAME FUNCTIONS --- */

export function startGame(mode, songIdx=null) {
    state.game.mode = mode;
    state.game.songId = songIdx;
    state.game.coins = 0;
    state.game.idx = 0;
    state.game.mistakes = 0;
    
    document.getElementById('game-coins').innerText = 0;
    document.getElementById('game-timer').innerText = 0;
    document.getElementById('game-start-overlay').style.display = 'flex';
    
    showScreen('screen-game');
    
    // Trigger resize logic to ensure HIT_X is correct for the current screen size
    // We'll call the global resize handler (exposed in main.js) or just trigger window resize event
    window.dispatchEvent(new Event('resize')); 
    
    // RESET NOTE POSITION
    const noteGroup = document.getElementById('notes-group');
    noteGroup.classList.remove('animate-scroll'); 
    updateNotePosition(); // Set initial transform
    
    // Force Reflow
    void noteGroup.offsetWidth; 
    noteGroup.classList.add('animate-scroll'); 
    
    generateNotes();
    renderSheet();
    renderKeyboard();
}

export function updateNotePosition() {
    // Current note index moves to HIT_X
    const trans = state.HIT_X - (state.game.idx * 120);
    const grp = document.getElementById('notes-group');
    if(grp) grp.style.transform = `translateX(${trans}px)`;
}

export function generateNotes() {
    state.game.notes = [];
    const octave = state.currentClef === 'treble' ? 4 : 3;
    
    if(state.game.mode === 'song') {
        const raw = SONG_DB[state.game.songId].notes;
        state.game.notes = raw.map(n => {
            if(state.currentClef === 'bass') return n.replace('5','4').replace('4','3');
            return n;
        });
    } else {
        const count = 15 + Math.floor(Math.random()*10);
        const pool = [];
        if(state.currentUser.difficulty === 'easy') {
            ['C','D','E','F','G'].forEach(n => pool.push(n+octave));
        } else if(state.currentUser.difficulty === 'medium') {
            ['C','D','E','F','G','A','B'].forEach(n => pool.push(n+octave));
            pool.push('C'+(octave+1));
        } else {
            ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].forEach(n => pool.push(n+octave));
            pool.push('C'+(octave+1));
        }
        for(let i=0; i<count; i++) {
            state.game.notes.push(pool[Math.floor(Math.random()*pool.length)]);
        }
    }
}

export function renderSheet() {
    const svg = document.getElementById('notes-group');
    const trebleSvg = document.getElementById('clef-treble-svg');
    const bassSvg = document.getElementById('clef-bass-svg');
    svg.innerHTML = '';
    
    // Toggle Clef Visibility
    if(state.currentClef === 'treble') {
        trebleSvg.style.display = 'block';
        bassSvg.style.display = 'none';
    } else {
        trebleSvg.style.display = 'none';
        bassSvg.style.display = 'block';
    }
    
    // We rely on resize handler in main.js to call positionClefs, 
    // but we can ensure they are correct here too if needed.
    
    state.game.notes.forEach((note, i) => {
        let y = 0;
        if(state.currentClef==='treble') y = TREBLE_Y[note] || 220;
        else y = BASS_Y[note] || 100;
        
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute('transform', `translate(${i*120}, ${y})`); 
        g.setAttribute('class', `note ${i===0?'current':'inactive'}`);
        g.setAttribute('id', `note-${i}`);
        
        let needsLine = false;
        if(state.currentClef==='treble' && note==='C4') needsLine=true;
        if(state.currentClef==='bass' && (note==='C4'||note==='E5')) needsLine=true;
        
        if(needsLine) {
            const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
            l.setAttribute('x1', -16); l.setAttribute('x2', 16);
            l.setAttribute('y1', 0); l.setAttribute('y2', 0);
            l.setAttribute('stroke', '#000');
            g.appendChild(l);
        }

        const oval = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        oval.setAttribute('rx', 12); oval.setAttribute('ry', 9);
        oval.setAttribute('class', 'note-head');
        g.appendChild(oval);

        const stem = document.createElementNS("http://www.w3.org/2000/svg", "line");
        stem.setAttribute('stroke', '#000');
        stem.setAttribute('stroke-width', 2);
        if(y < 160) {
            stem.setAttribute('x1', -11); stem.setAttribute('y1', 0);
            stem.setAttribute('x2', -11); stem.setAttribute('y2', 50);
        } else {
            stem.setAttribute('x1', 11); stem.setAttribute('y1', 0);
            stem.setAttribute('x2', 11); stem.setAttribute('y2', -50);
        }
        g.appendChild(stem);

        if(note.includes('#')) {
            const sh = document.createElementNS("http://www.w3.org/2000/svg", "text");
            sh.innerHTML = '♯';
            sh.setAttribute('x', -30); sh.setAttribute('y', 10);
            sh.setAttribute('font-size', '30');
            g.appendChild(sh);
        }
        svg.appendChild(g);
    });
}

export function renderKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    const octave = state.currentClef === 'treble' ? 4 : 3;
    const whites = ['C','D','E','F','G','A','B','C'];
    
    whites.forEach((w, i) => {
        const k = document.createElement('div');
        k.className = 'white-key';
        const n = w + (i===7 ? octave+1 : octave);
        k.dataset.note = n;
        k.innerText = n;
        k.onclick = () => handleInput(n, k);
        // Better touch handling
        k.ontouchstart = (e) => { e.preventDefault(); handleInput(n, k); };
        kb.appendChild(k);
    });

    const blacks = [
        {n:'C#', l:9}, {n:'D#', l:21.5}, {n:'F#', l:46.5}, {n:'G#', l:59}, {n:'A#', l:71.5} 
    ];

    blacks.forEach(b => {
        const k = document.createElement('div');
        k.className = 'black-key';
        k.style.left = b.l + '%';
        const n = b.n + octave;
        k.dataset.note = n;
        k.onclick = (e) => { e.stopPropagation(); handleInput(n, k); };
        k.ontouchstart = (e) => { e.preventDefault(); e.stopPropagation(); handleInput(n, k); };
        kb.appendChild(k);
    });
}

export function beginRound() {
    document.getElementById('game-start-overlay').style.display = 'none';
    state.game.startTime = Date.now();
    state.game.noteTime = Date.now();
    
    if(state.game.timerInt) clearInterval(state.game.timerInt);
    
    state.game.timerInt = setInterval(() => {
        const t = Math.floor((Date.now() - state.game.startTime)/1000);
        const el = document.getElementById('game-timer');
        if(el) el.innerText = t;
    }, 1000);
}

export function handleInput(note, el) {
    if(document.getElementById('game-start-overlay').style.display !== 'none') return;
    
    const target = state.game.notes[state.game.idx];
    
    if(note === target) {
        el.classList.add('active');
        setTimeout(()=>el.classList.remove('active'), 100);
        playTone(note, 'good');
        
        const dt = (Date.now() - state.game.noteTime) / 1000;
        let earned = 0;
        if(state.game.mode === 'coin') {
            earned = 1;
            if(dt < 0.5) earned = 5;
            else if(dt < 1.5) earned = 3;
            else if(dt < 2.5) earned = 2;
            state.game.coins += earned;
            document.getElementById('game-coins').innerText = state.game.coins;
            
            const float = document.createElement('div');
            float.className = 'feedback-anim';
            float.innerText = `+${earned}`;
            float.style.left = el.getBoundingClientRect().left + 'px';
            float.style.top = (el.getBoundingClientRect().top - 50) + 'px';
            document.body.appendChild(float);
            setTimeout(()=>float.remove(), 1000);
        }

        const currSvg = document.getElementById(`note-${state.game.idx}`);
        if(currSvg) {
            currSvg.classList.remove('current');
            currSvg.classList.add('inactive');
        }
        
        state.game.idx++;
        state.game.noteTime = Date.now();
        updateNotePosition();

        if(state.game.idx >= state.game.notes.length) {
            endGame();
        } else {
            const next = document.getElementById(`note-${state.game.idx}`);
            if(next) {
                next.classList.remove('inactive');
                next.classList.add('current');
            }
        }
        
    } else {
        playTone(note, 'bad');
        el.classList.add('wrong');
        setTimeout(()=>el.classList.remove('wrong'), 300);
        state.game.mistakes++;
    }
}

export function endGame() {
    clearInterval(state.game.timerInt);
    const totalTime = parseFloat(((Date.now() - state.game.startTime)/1000).toFixed(1));
    let finalCoins = state.game.coins;
    let msg = "";

    // Score Saving Logic
    if(!state.currentUser.scores) state.currentUser.scores = { coin: { easy:[], medium:[], hard:[] }, songs: {} };
    
    if(state.game.mode === 'coin') {
        // Only save coin run times if they finished
        const arr = state.currentUser.scores.coin[state.currentUser.difficulty];
        arr.push(totalTime);
        arr.sort((a,b) => a - b); // Ascending (lower is better)
        if(arr.length > 5) arr.length = 5; // Keep top 5
        
        let bonus = 0;
        if(totalTime < 15) bonus = 25;
        else if(totalTime < 30) bonus = 15;
        else if(totalTime < 45) bonus = 5;
        finalCoins += bonus;
        if(bonus>0) msg = `Speed Bonus: +${bonus}!`;
        
    } else {
        if(state.game.mistakes === 0) {
            // Only save song times if perfect
            if(!state.currentUser.scores.songs[state.game.songId]) state.currentUser.scores.songs[state.game.songId] = [];
            const arr = state.currentUser.scores.songs[state.game.songId];
            arr.push(totalTime);
            arr.sort((a,b) => a - b);
            if(arr.length > 5) arr.length = 5;

            const s = SONG_DB[state.game.songId];
            if(state.game.songId === state.currentUser.unlockedSongs) {
                finalCoins = s.reward;
                state.currentUser.unlockedSongs++;
                msg = "Perfect! Song Unlocked!";
            } else if(state.game.songId < state.currentUser.unlockedSongs) {
                msg = "Good practice! (Already rewarded)";
                finalCoins = 0;
            }
        } else {
            msg = "Try again for a perfect score to get coins!";
            finalCoins = 0;
        }
    }
    
    if(state.currentClef==='treble') state.currentUser.tCoins += finalCoins;
    else state.currentUser.bCoins += finalCoins;
    saveCurrentUser();
    
    document.getElementById('res-time').innerText = totalTime;
    document.getElementById('res-coins').innerText = finalCoins;
    document.getElementById('res-msg').innerText = msg;
    
    renderHighScores();
    showScreen('screen-result');
    playRun();
}

export function exitGame() {
    clearInterval(state.game.timerInt);
    showScreen('screen-landing');
    updateLanding();
}
