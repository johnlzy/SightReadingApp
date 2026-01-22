import { state } from './state.js';
import { SONG_DB, TREBLE_Y, BASS_Y } from './config.js';
import { playTone, playRun, playClick } from './audio.js';
import { showScreen, renderHighScores, updateLanding } from './ui.js';
import { saveCurrentUser, deductCredit } from './storage.js';

/* --- CORE GAME FUNCTIONS --- */

const PRO_BPM = 50; 
const NOTE_ORDER = ['C','D','E','F','G','A','B'];

export function startGame(mode, songIdx=null, isRetry=false) {
    if (!state.currentUser || state.currentUser.credits <= 0) {
        alert("You are out of credits for today! Ask a parent for help.");
        return;
    }
    
    const success = deductCredit();
    if(!success) return; 
    updateLanding();

    state.game.mode = mode;
    state.game.songId = songIdx;
    state.game.coins = 0;
    state.game.idx = 0;
    state.game.mistakes = 0;
    state.game.nextBeatTime = 0;
    
    if(state.game.metronomeInt) clearInterval(state.game.metronomeInt);
    if(state.game.animFrame) cancelAnimationFrame(state.game.animFrame); 

    document.getElementById('game-coins').innerText = 0;
    document.getElementById('game-timer').innerText = 0;
    
    // Reset Progress Bar
    const prog = document.getElementById('progress-fill');
    if(prog) prog.style.width = '0%';

    document.getElementById('game-start-overlay').style.display = 'flex';
    
    showScreen('screen-game');
    
    window.dispatchEvent(new Event('resize')); 
    
    const noteGroup = document.getElementById('notes-group');
    noteGroup.classList.remove('animate-scroll'); 
    updateNotePosition(); 
    
    void noteGroup.offsetWidth; 
    noteGroup.classList.add('animate-scroll'); 
    
    if(isRetry && state.game.lastNotes.length > 0) {
        state.game.notes = [...state.game.lastNotes];
        state.game.durations = [...state.game.lastDurations];
    } else {
        generateNotes();
        state.game.lastNotes = [...state.game.notes];
        state.game.lastDurations = [...state.game.durations];
    }
    
    renderSheet();
    renderKeyboard();
}

export function retryGame() {
    startGame(state.game.mode, state.game.songId, true);
}
window.retryGame = retryGame;

export function updateNotePosition() {
    const line = document.getElementById('hit-line');
    if(line) {
        line.setAttribute('x1', state.HIT_X);
        line.setAttribute('x2', state.HIT_X);
    }

    const isProActive = (state.currentUser.difficulty === 'pro' && state.game.mode === 'coin' && document.getElementById('game-start-overlay').style.display === 'none');
    
    if (!isProActive) {
        // Calculate the X offset based on the cumulative duration of previous notes
        let cumulativeDuration = 0;
        for(let i=0; i<state.game.idx; i++) {
             cumulativeDuration += (state.game.durations[i] || 1);
        }

        const trans = state.HIT_X - (cumulativeDuration * 120);
        const grp = document.getElementById('notes-group');
        if(grp) grp.style.transform = `translateX(${trans}px)`;
    }
}

export function generateNotes() {
    state.game.notes = [];
    state.game.durations = [];
    const octave = state.currentClef === 'treble' ? 4 : 3;
    
    if(state.game.mode === 'song') {
        const songData = SONG_DB[state.game.songId].melody; 
        
        state.game.notes = songData.map(item => {
            let n = item.n;
            if(state.currentClef === 'bass') return n.replace('5','4').replace('4','3');
            return n;
        });
        
        state.game.durations = songData.map(item => item.d);
        
    } else {
        const pool = [];
        const diff = state.currentUser.difficulty;
        
        if(diff === 'easy') {
            ['C','D','E','F','G'].forEach(n => pool.push(n+octave));
        } else if(diff === 'medium') {
            ['C','D','E','F','G','A','B'].forEach(n => pool.push(n+octave));
            pool.push('C'+(octave+1));
        } else if(diff === 'pro') {
            ['C','D','E','F','G','A','B'].forEach(n => pool.push(n+octave));
            pool.push('C'+(octave+1));
        } else {
            ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].forEach(n => pool.push(n+octave));
            pool.push('C'+(octave+1));
        }

        const count = 16; 
        let currentIdx = Math.floor(pool.length / 2);
        
        if (diff === 'pro') {
             for(let bar=0; bar<4; bar++) {
                 let beatsLeft = 4;
                 while(beatsLeft > 0) {
                     const opts = [1];
                     if(beatsLeft >= 2) opts.push(2); 
                     if(beatsLeft >= 4) opts.push(4); 
                     if(beatsLeft >= 0.5) opts.push(0.5); 
                     
                     const dur = opts[Math.floor(Math.random()*opts.length)];
                     
                     if(dur === 0.5 && beatsLeft >= 1 && Math.random()>0.3) {
                         state.game.durations.push(0.5, 0.5);
                         beatsLeft -= 1;
                         for(let k=0; k<2; k++) {
                            currentIdx = getMelodiousIndex(currentIdx, pool.length);
                            state.game.notes.push(pool[currentIdx]);
                         }
                     } else {
                         state.game.durations.push(dur);
                         beatsLeft -= dur;
                         currentIdx = getMelodiousIndex(currentIdx, pool.length);
                         state.game.notes.push(pool[currentIdx]);
                     }
                 }
             }
        } else {
            for(let i=0; i<count; i++) {
                currentIdx = getMelodiousIndex(currentIdx, pool.length);
                state.game.notes.push(pool[currentIdx]);
                state.game.durations.push(1);
            }
        }
    }
}

function getMelodiousIndex(curr, max) {
    const moves = [-2, -1, -1, 0, 1, 1, 2, 3, -3, 4, -4, 5, -5];
    let move = moves[Math.floor(Math.random() * moves.length)];
    let next = curr + move;
    if(next < 0) next = 0; 
    if(next >= max) next = max - 1; 
    return next;
}

// New Helper to calculate Y position dynamically to avoid missing notes
function getNoteY(note, clef) {
    const natural = note.replace(/[#b]/g, '');
    const letter = natural.charAt(0);
    const octave = parseInt(natural.slice(1));

    if (clef === 'treble') {
        // Ref C4 = 220 (One ledger line below staff)
        const refOctave = 4;
        const refIndex = 0; // C
        const refY = 220;
        const idx = NOTE_ORDER.indexOf(letter);
        const steps = (octave - refOctave) * 7 + (idx - refIndex);
        return refY - (steps * 10);
    } else {
        // Ref C3 = 170 (Second space from bottom)
        const refOctave = 3;
        const refIndex = 0; // C
        const refY = 170; 
        const idx = NOTE_ORDER.indexOf(letter);
        const steps = (octave - refOctave) * 7 + (idx - refIndex);
        return refY - (steps * 10);
    }
}

export function renderSheet() {
    const noteGroup = document.getElementById('notes-group');
    const svgContainer = document.getElementById('music-svg');
    const trebleSvg = document.getElementById('clef-treble-svg');
    const bassSvg = document.getElementById('clef-bass-svg');
    
    noteGroup.innerHTML = '';
    
    const oldLine = document.getElementById('hit-line');
    if(oldLine) oldLine.remove();

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute('id', 'hit-line');
    line.setAttribute('x1', state.HIT_X);
    line.setAttribute('x2', state.HIT_X);
    line.setAttribute('y1', 0);
    line.setAttribute('y2', 300);
    line.setAttribute('stroke', '#FF69B4');
    line.setAttribute('stroke-width', 4);
    line.setAttribute('opacity', 0.6);
    svgContainer.insertBefore(line, noteGroup);

    if(state.currentClef === 'treble') {
        trebleSvg.style.display = 'block';
        bassSvg.style.display = 'none';
    } else {
        trebleSvg.style.display = 'none';
        bassSvg.style.display = 'block';
    }
    
    let currentX = 0;
    const PIXELS_PER_BEAT = 120;

    state.game.notes.forEach((note, i) => {
        // Use dynamic calculation instead of static map
        const y = getNoteY(note, state.currentClef);
        
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        g.setAttribute('transform', `translate(${currentX}, ${y})`); 
        g.setAttribute('class', `note ${i===0?'current':'inactive'}`);
        g.setAttribute('id', `note-${i}`);
        
        const dur = state.game.durations[i] || 1;

        currentX += (dur * PIXELS_PER_BEAT);

        // Dynamic Ledger Lines
        // Staff lines are roughly 120 to 200. 
        // 220 is C4 (line). 100 is A5 (line).
        // Simple check: if Y is divisible by 20 (line) and outside the 120-200 range?
        // Let's stick to C4 and standard ranges for simplicity or check specific positions.
        // C4(220) needs line. A3(240) needs line. A5(100) needs line.
        let needsLine = false;
        if(y >= 220 && (y-220)%20 === 0) needsLine = true; // Low notes on lines
        if(y <= 100 && (100-y)%20 === 0) needsLine = true; // High notes on lines
        
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
        oval.setAttribute('stroke', '#000');
        oval.setAttribute('stroke-width', '2');
        
        if(dur >= 2) {
             oval.setAttribute('fill', '#fff'); 
        } else {
             oval.setAttribute('class', 'note-head filled'); 
             oval.setAttribute('fill', 'currentColor'); 
        }
        g.appendChild(oval);

        if (dur < 4) { 
            const stem = document.createElementNS("http://www.w3.org/2000/svg", "line");
            stem.setAttribute('stroke', '#000');
            stem.setAttribute('stroke-width', 2);
            let stemUp = y >= 160; 
            
            if(stemUp) {
                stem.setAttribute('x1', 11); stem.setAttribute('y1', 0);
                stem.setAttribute('x2', 11); stem.setAttribute('y2', -50);
            } else {
                stem.setAttribute('x1', -11); stem.setAttribute('y1', 0);
                stem.setAttribute('x2', -11); stem.setAttribute('y2', 50);
            }
            g.appendChild(stem);
            
            if (dur === 0.5) {
                const flag = document.createElementNS("http://www.w3.org/2000/svg", "path");
                flag.setAttribute('fill', 'none');
                flag.setAttribute('stroke', '#000');
                flag.setAttribute('stroke-width', 2);
                if(stemUp) {
                    flag.setAttribute('d', "M11,-50 Q25,-40 25,-20");
                } else {
                    flag.setAttribute('d', "M-11,50 Q-25,40 -25,20");
                }
                g.appendChild(flag);
            }
        }

        if(note.includes('#')) {
            const sh = document.createElementNS("http://www.w3.org/2000/svg", "text");
            sh.innerHTML = '♯';
            sh.setAttribute('x', -30); sh.setAttribute('y', 10);
            sh.setAttribute('font-size', '30');
            g.appendChild(sh);
        }
        noteGroup.appendChild(g);
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
    
    // Updated: Use countdown for Pro Mode OR Song Mode
    const isProCoin = (state.currentUser.difficulty === 'pro' && state.game.mode === 'coin');
    const isSong = (state.game.mode === 'song');

    if (isProCoin || isSong) {
        startCountdown(() => {
            if (isProCoin) startProGame();
            else startStandardGame();
        });
        return;
    }

    startStandardGame();
}

function startStandardGame() {
    state.game.startTime = Date.now();
    state.game.noteTime = Date.now();
    
    if(state.game.timerInt) clearInterval(state.game.timerInt);
    
    state.game.timerInt = setInterval(() => {
        const t = Math.floor((Date.now() - state.game.startTime)/1000);
        const el = document.getElementById('game-timer');
        if(el) el.innerText = t;
    }, 1000);
}

function startCountdown(callback) {
    let count = 4;
    const interval = 1000; // 1 second per beat for standard countdown
    
    let overlay = document.getElementById('countdown-overlay');
    if(!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'countdown-overlay';
        overlay.style = "position:absolute; top:40%; left:0; width:100%; text-align:center; font-size:6rem; color:var(--primary); font-weight:bold; z-index:600; text-shadow:2px 2px white;";
        document.getElementById('screen-game').appendChild(overlay);
    }
    overlay.style.display = 'block';
    
    const tick = () => {
        if(count > 0) {
            overlay.innerText = count;
            playClick(); 
            count--;
            setTimeout(tick, interval);
        } else {
             overlay.style.display = 'none';
             if(callback) callback();
        }
    };
    tick();
}

function startProGame() {
    const noteGroup = document.getElementById('notes-group');
    if(noteGroup) noteGroup.classList.remove('animate-scroll');

    state.game.startTime = Date.now();
    state.game.noteTime = Date.now();
    state.game.nextBeatTime = state.game.startTime; 
    
    const interval = 60000 / PRO_BPM;

    state.game.metronomeInt = setInterval(() => playClick(), interval);
    
    const animate = () => {
        if(state.game.mode !== 'coin' || state.currentUser.difficulty !== 'pro') return;
        
        const now = Date.now();

        if(state.game.idx < state.game.notes.length) {
            const dur = state.game.durations[state.game.idx];
            const msPerBeat = 60000 / PRO_BPM;
            const currentDurationMs = dur * msPerBeat;
            const deadline = state.game.nextBeatTime + currentDurationMs;

            if (now > deadline) {
                 const currSvg = document.getElementById(`note-${state.game.idx}`);
                 if(currSvg) {
                     currSvg.classList.remove('current');
                     currSvg.classList.add('inactive');
                     currSvg.style.opacity = 0.4;
                     const head = currSvg.querySelector('.note-head');
                     if(head) head.setAttribute('fill', '#ff4444'); 
                 }
                 
                 const float = document.createElement('div');
                 float.className = 'feedback-anim';
                 float.innerText = "Miss";
                 float.style.color = "#ff4444";
                 float.style.left = state.HIT_X + 'px';
                 float.style.top = '100px';
                 document.body.appendChild(float);
                 setTimeout(()=>float.remove(), 1000);

                 state.game.idx++;
                 
                 // Update Progress
                 const pct = (state.game.idx / state.game.notes.length) * 100;
                 const prog = document.getElementById('progress-fill');
                 if(prog) prog.style.width = pct + '%';

                 state.game.nextBeatTime += currentDurationMs; 
                 updateNotePosition(); 
            }
        }

        if(state.game.idx >= state.game.notes.length) {
            if (now > state.game.nextBeatTime) {
                endGame();
                return;
            }
        }

        // Logic for smooth scrolling
        const elapsed = now - state.game.startTime;
        const beatTime = 60000 / PRO_BPM; 
        
        // This linear calculation only works if all notes are the same, OR if we sum durations.
        // For Pro mode (random generation), we currently generate random rhythms.
        // We need to calculate the PIXEL offset based on time.
        
        const pxShift = (elapsed / beatTime) * 120;
        const currentX = state.HIT_X - pxShift;
        
        const grp = document.getElementById('notes-group');
        if(grp) grp.style.transform = `translateX(${currentX}px)`;
        
        state.game.animFrame = requestAnimationFrame(animate);
    };
    state.game.animFrame = requestAnimationFrame(animate);

    state.game.timerInt = setInterval(() => {
        const t = Math.floor((Date.now() - state.game.startTime)/1000);
        const el = document.getElementById('game-timer');
        if(el) el.innerText = t;
    }, 1000);
}

export function handleInput(note, el) {
    if(document.getElementById('game-start-overlay').style.display !== 'none') return;
    
    const target = state.game.notes[state.game.idx];
    const isPro = (state.currentUser.difficulty === 'pro' && state.game.mode === 'coin');
    
    if(note === target) {
        let isTimingGood = true;
        let earned = 0;

        if(isPro) {
            const now = Date.now();
            const diff = now - state.game.nextBeatTime; 
            const absDiff = Math.abs(diff);

            const msPerBeat = 60000 / PRO_BPM; 
            const dur = state.game.durations[state.game.idx];
            const noteDurationMs = dur * msPerBeat;

            if (absDiff <= (noteDurationMs * 0.25)) {
                earned = 5;
            } else if (diff > (noteDurationMs * 0.25) && diff <= noteDurationMs) {
                earned = 3;
            } else {
                earned = 0;
            }

            isTimingGood = true; 
            
            state.game.nextBeatTime += noteDurationMs;
        }

        if(isTimingGood) {
            el.classList.add('active');
            setTimeout(()=>el.classList.remove('active'), 100);
            playTone(note, 'good');
            
            const dt = (Date.now() - state.game.noteTime) / 1000;
            
            if(state.game.mode === 'coin') {
                if(!isPro) {
                    earned = 1; 
                } 
                
                state.game.coins += earned;
                document.getElementById('game-coins').innerText = state.game.coins;
                
                const float = document.createElement('div');
                float.className = 'feedback-anim';
                float.innerText = earned > 0 ? `+${earned}` : '0';
                float.style.color = earned > 0 ? 'var(--accent)' : '#999';
                float.style.left = el.getBoundingClientRect().left + 'px';
                float.style.top = (el.getBoundingClientRect().top - 50) + 'px';
                document.body.appendChild(float);
                setTimeout(()=>float.remove(), 1000);
            }

            const currSvg = document.getElementById(`note-${state.game.idx}`);
            if(currSvg) {
                currSvg.classList.remove('current');
                currSvg.classList.add('inactive');
                const head = currSvg.querySelector('.note-head');
                if(head) head.setAttribute('fill', 'var(--primary)'); 
            }
            
            state.game.idx++;

            // Update Progress Bar
            const pct = (state.game.idx / state.game.notes.length) * 100;
            const prog = document.getElementById('progress-fill');
            if(prog) prog.style.width = pct + '%';

            state.game.noteTime = Date.now();
            updateNotePosition();

            if(!isPro && state.game.idx >= state.game.notes.length) {
                endGame();
            }
        } else {
             state.game.mistakes++;
             playTone(note, 'bad');
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
    if(state.game.metronomeInt) clearInterval(state.game.metronomeInt);
    if(state.game.animFrame) cancelAnimationFrame(state.game.animFrame);
    
    const overlay = document.getElementById('countdown-overlay');
    if(overlay) overlay.style.display = 'none';

    const totalTime = parseFloat(((Date.now() - state.game.startTime)/1000).toFixed(1));
    let finalCoins = state.game.coins;
    let msg = "";

    if(!state.currentUser.scores) state.currentUser.scores = { coin: { easy:[], medium:[], hard:[], pro:[] }, songs: {} };
    if(!state.currentUser.scores.coin.pro) state.currentUser.scores.coin.pro = []; 

    if(state.game.mode === 'coin') {
        const arr = state.currentUser.scores.coin[state.currentUser.difficulty];
        
        let bonus = 0;
        if(totalTime < 15) bonus = 25;
        else if(totalTime < 30) bonus = 15;
        else if(totalTime < 45) bonus = 5;
        
        if(state.currentUser.difficulty !== 'pro') {
            finalCoins += bonus;
            if(bonus>0) msg = `Speed Bonus: +${bonus}!`;
        } else {
            msg = "Sequence Complete!";
        }

        arr.push(finalCoins);
        arr.sort((a,b) => b - a); 
        if(arr.length > 5) arr.length = 5; 
        
    } else {
        if(state.game.mistakes === 0) {
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
    
    const retryBtn = document.getElementById('btn-retry');
    if(state.game.mode === 'coin') {
        retryBtn.style.display = 'block';
        retryBtn.onclick = retryGame;
    } else {
        retryBtn.style.display = 'none';
    }

    renderHighScores();
    showScreen('screen-result');
    playRun();
}

export function exitGame() {
    clearInterval(state.game.timerInt);
    if(state.game.metronomeInt) clearInterval(state.game.metronomeInt);
    if(state.game.animFrame) cancelAnimationFrame(state.game.animFrame);
    
    const overlay = document.getElementById('countdown-overlay');
    if(overlay) overlay.style.display = 'none';
    
    showScreen('screen-landing');
    updateLanding();
}
