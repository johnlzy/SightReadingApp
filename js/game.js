import { state } from './state.js';
import { SONG_DB, TREBLE_Y, BASS_Y } from './config.js';
import { playTone, playRun, playClick } from './audio.js';
import { showScreen, renderHighScores, updateLanding } from './ui.js';
import { saveCurrentUser, deductCredit } from './storage.js';

/* --- CORE GAME FUNCTIONS --- */

const PRO_BPM = 50; // Unified BPM for Pro Mode logic

export function startGame(mode, songIdx=null, isRetry=false) {
    // CREDIT CHECK
    if (!state.currentUser || state.currentUser.credits <= 0) {
        alert("You are out of credits for today! Ask a parent for help.");
        return;
    }
    
    // Deduct Credit
    const success = deductCredit();
    if(!success) return; 
    updateLanding(); // Update UI to show new credit count

    state.game.mode = mode;
    state.game.songId = songIdx;
    state.game.coins = 0;
    state.game.idx = 0;
    state.game.mistakes = 0;
    state.game.nextBeatTime = 0;
    
    if(state.game.metronomeInt) clearInterval(state.game.metronomeInt);
    if(state.game.animFrame) cancelAnimationFrame(state.game.animFrame); // Clear anim frame

    document.getElementById('game-coins').innerText = 0;
    document.getElementById('game-timer').innerText = 0;
    document.getElementById('game-start-overlay').style.display = 'flex';
    
    showScreen('screen-game');
    
    window.dispatchEvent(new Event('resize')); 
    
    // RESET NOTE POSITION
    const noteGroup = document.getElementById('notes-group');
    noteGroup.classList.remove('animate-scroll'); 
    updateNotePosition(); 
    
    // Force Reflow
    void noteGroup.offsetWidth; 
    noteGroup.classList.add('animate-scroll'); 
    
    if(isRetry && state.game.lastNotes.length > 0) {
        state.game.notes = [...state.game.lastNotes];
        state.game.durations = [...state.game.lastDurations];
    } else {
        generateNotes();
        // Save for retry
        state.game.lastNotes = [...state.game.notes];
        state.game.lastDurations = [...state.game.durations];
    }
    
    renderSheet();
    renderKeyboard();
}

export function retryGame() {
    startGame(state.game.mode, state.game.songId, true);
}
window.retryGame = retryGame; // expose to global for UI

export function updateNotePosition() {
    // Update Hit Line Position (for resizes)
    const line = document.getElementById('hit-line');
    if(line) {
        line.setAttribute('x1', state.HIT_X);
        line.setAttribute('x2', state.HIT_X);
    }

    // In Pro Mode, smooth scrolling handles the transform via animation loop.
    // We only manually set it here if we are NOT in the active game loop (e.g. init or end)
    const isProActive = (state.currentUser.difficulty === 'pro' && state.game.mode === 'coin' && document.getElementById('game-start-overlay').style.display === 'none');
    
    if (!isProActive) {
        // Standard calculation assumes equal spacing (duration 1)
        const trans = state.HIT_X - (state.game.idx * 120);
        const grp = document.getElementById('notes-group');
        if(grp) grp.style.transform = `translateX(${trans}px)`;
    }
}

export function generateNotes() {
    state.game.notes = [];
    state.game.durations = [];
    const octave = state.currentClef === 'treble' ? 4 : 3;
    
    if(state.game.mode === 'song') {
        const raw = SONG_DB[state.game.songId].notes;
        state.game.notes = raw.map(n => {
            if(state.currentClef === 'bass') return n.replace('5','4').replace('4','3');
            return n;
        });
        // Default durations for song mode (all quarters for simplicity unless DB updated)
        state.game.durations = state.game.notes.map(() => 1);
        
    } else {
        // COIN RUN GENERATION
        const pool = [];
        const diff = state.currentUser.difficulty;
        
        // Define pools
        if(diff === 'easy') {
            ['C','D','E','F','G'].forEach(n => pool.push(n+octave));
        } else if(diff === 'medium') {
            ['C','D','E','F','G','A','B'].forEach(n => pool.push(n+octave));
            pool.push('C'+(octave+1));
        } else if(diff === 'pro') {
            // Pro Mode: White keys only (similar to medium but rhythm focused)
            ['C','D','E','F','G','A','B'].forEach(n => pool.push(n+octave));
            pool.push('C'+(octave+1));
        } else {
            // Hard use full scale
            ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].forEach(n => pool.push(n+octave));
            pool.push('C'+(octave+1));
        }

        // --- Melodious Logic ---
        const count = 16; // Fixed count for consistent runs
        let currentIdx = Math.floor(pool.length / 2); // Start in middle
        
        if (diff === 'pro') {
             // PRO MODE: RHYTHM GENERATION (4 bars of 4/4)
             for(let bar=0; bar<4; bar++) {
                 let beatsLeft = 4;
                 while(beatsLeft > 0) {
                     // Pick a duration that fits
                     const opts = [1]; // Quarter
                     if(beatsLeft >= 2) opts.push(2); // Half
                     if(beatsLeft >= 4) opts.push(4); // Whole
                     if(beatsLeft >= 0.5) opts.push(0.5); // Eighth
                     
                     // Weighted random for variety
                     const dur = opts[Math.floor(Math.random()*opts.length)];
                     
                     // If eighth, force pairs usually to keep it simple, or just allow single
                     if(dur === 0.5 && beatsLeft >= 1 && Math.random()>0.3) {
                         // Add two eighths
                         state.game.durations.push(0.5, 0.5);
                         beatsLeft -= 1;
                         // Add 2 notes
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
            // Normal Modes
            for(let i=0; i<count; i++) {
                currentIdx = getMelodiousIndex(currentIdx, pool.length);
                state.game.notes.push(pool[currentIdx]);
                state.game.durations.push(1);
            }
        }
    }
}

function getMelodiousIndex(curr, max) {
    const moves = [-2, -1, -1, 0, 1, 1, 2, 3, -3, 4, -4, 5, -5]; // Weighted small steps
    let move = moves[Math.floor(Math.random() * moves.length)];
    let next = curr + move;
    if(next < 0) next = 0; // Clamp
    if(next >= max) next = max - 1; // Clamp
    return next;
}

export function renderSheet() {
    const noteGroup = document.getElementById('notes-group');
    const svgContainer = document.getElementById('music-svg');
    const trebleSvg = document.getElementById('clef-treble-svg');
    const bassSvg = document.getElementById('clef-bass-svg');
    
    noteGroup.innerHTML = '';
    
    // --- Render Stationary Pink Hit Line ---
    // Remove existing if any
    const oldLine = document.getElementById('hit-line');
    if(oldLine) oldLine.remove();

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute('id', 'hit-line');
    line.setAttribute('x1', state.HIT_X);
    line.setAttribute('x2', state.HIT_X);
    line.setAttribute('y1', 0);
    line.setAttribute('y2', 300);
    line.setAttribute('stroke', '#FF69B4'); // Hot Pink
    line.setAttribute('stroke-width', 4);
    line.setAttribute('opacity', 0.6);
    // Insert before notes-group so notes fly over it
    svgContainer.insertBefore(line, noteGroup);


    // --- Clef Display ---
    if(state.currentClef === 'treble') {
        trebleSvg.style.display = 'block';
        bassSvg.style.display = 'none';
    } else {
        trebleSvg.style.display = 'none';
        bassSvg.style.display = 'block';
    }
    
    // Track cumulative X position for variable note spacing
    let currentX = 0;
    const PIXELS_PER_BEAT = 120;

    state.game.notes.forEach((note, i) => {
        let y = 0;
        if(state.currentClef==='treble') y = TREBLE_Y[note] || 220;
        else y = BASS_Y[note] || 100;
        
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        // Use cumulative X instead of index-based X
        g.setAttribute('transform', `translate(${currentX}, ${y})`); 
        g.setAttribute('class', `note ${i===0?'current':'inactive'}`);
        g.setAttribute('id', `note-${i}`);
        
        const dur = state.game.durations[i] || 1;

        // Advance X for the NEXT note based on THIS note's duration
        currentX += (dur * PIXELS_PER_BEAT);

        // Ledger Lines
        let needsLine = false;
        if(state.currentClef==='treble' && note==='C4') needsLine=true;
        if(state.currentClef==='bass' && (note==='C4'||note==='E5')) needsLine=true; // E5 approx high for bass
        
        if(needsLine) {
            const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
            l.setAttribute('x1', -16); l.setAttribute('x2', 16);
            l.setAttribute('y1', 0); l.setAttribute('y2', 0);
            l.setAttribute('stroke', '#000');
            g.appendChild(l);
        }

        // Note Head
        const oval = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        oval.setAttribute('rx', 12); oval.setAttribute('ry', 9);
        oval.setAttribute('class', 'note-head');
        oval.setAttribute('stroke', '#000');
        oval.setAttribute('stroke-width', '2');
        
        if(dur >= 2) {
             oval.setAttribute('fill', '#fff'); // Hollow for Half/Whole
        } else {
             oval.setAttribute('class', 'note-head filled'); // Filled CSS class handles color
             // Fallback if css fails
             oval.setAttribute('fill', 'currentColor'); 
        }
        g.appendChild(oval);

        // Stem
        if (dur < 4) { // Whole notes have no stem
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
            
            // Flag for Eighth Note
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
    
    // --- Pro Mode Countdown & Logic ---
    if (state.currentUser.difficulty === 'pro' && state.game.mode === 'coin') {
        startProCountdown();
        return;
    }

    // --- Standard Mode Start ---
    state.game.startTime = Date.now();
    state.game.noteTime = Date.now();
    
    if(state.game.timerInt) clearInterval(state.game.timerInt);
    
    state.game.timerInt = setInterval(() => {
        const t = Math.floor((Date.now() - state.game.startTime)/1000);
        const el = document.getElementById('game-timer');
        if(el) el.innerText = t;
    }, 1000);
}

// New: Pro Mode Countdown
function startProCountdown() {
    let count = 4;
    // const BPM = 20; // Unused here
    const interval = 60000 / 60; // Keep countdown brisk (1s)
    
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
            playClick(); // Sound click
            count--;
            setTimeout(tick, interval);
        } else {
             overlay.style.display = 'none';
             startProGame();
        }
    };
    tick();
}

// New: Pro Mode Game Loop
function startProGame() {
    state.game.startTime = Date.now();
    state.game.noteTime = Date.now();
    state.game.nextBeatTime = state.game.startTime; 
    
    const interval = 60000 / PRO_BPM;

    // Start Metronome Audio
    state.game.metronomeInt = setInterval(() => playClick(), interval);
    
    // Start Visual Scroll & Logic Loop
    const animate = () => {
        // Exit if game ended
        if(state.game.mode !== 'coin' || state.currentUser.difficulty !== 'pro') return;
        
        const now = Date.now();

        // --- Auto-Advance / Miss Logic ---
        if(state.game.idx < state.game.notes.length) {
            const dur = state.game.durations[state.game.idx];
            const msPerBeat = 60000 / PRO_BPM;
            const currentDurationMs = dur * msPerBeat;
            // Deadline is end of the note duration
            const deadline = state.game.nextBeatTime + currentDurationMs;

            if (now > deadline) {
                 // Missed! Auto-advance
                 const currSvg = document.getElementById(`note-${state.game.idx}`);
                 if(currSvg) {
                     currSvg.classList.remove('current');
                     currSvg.classList.add('inactive');
                     currSvg.style.opacity = 0.4;
                     const head = currSvg.querySelector('.note-head');
                     if(head) head.setAttribute('fill', '#ff4444'); // Red feedback
                 }
                 
                 // Show Miss
                 const float = document.createElement('div');
                 float.className = 'feedback-anim';
                 float.innerText = "Miss";
                 float.style.color = "#ff4444";
                 float.style.left = state.HIT_X + 'px';
                 float.style.top = '100px';
                 document.body.appendChild(float);
                 setTimeout(()=>float.remove(), 1000);

                 state.game.idx++;
                 state.game.nextBeatTime += currentDurationMs; // Shift expected time for next note
                 updateNotePosition(); // Updates 'current' class on new note
            }
        }

        // --- End Game Check ---
        if(state.game.idx >= state.game.notes.length) {
            // Wait for the last note's time to fully pass (visual finish)
            if (now > state.game.nextBeatTime) {
                endGame();
                return;
            }
        }

        // --- Visual Scrolling ---
        const elapsed = now - state.game.startTime;
        const beatTime = 60000 / PRO_BPM; // Use unified BPM
        
        // Calculate shift: 1 Beat = 120px spacing
        // Since renderSheet now spaces notes based on duration * 120,
        // and time flows linearly, this shift will align perfectly.
        const pxShift = (elapsed / beatTime) * 120;
        
        // Target: Current beat note should align with HIT_X
        const currentX = state.HIT_X - pxShift;
        
        const grp = document.getElementById('notes-group');
        if(grp) grp.style.transform = `translateX(${currentX}px)`;
        
        state.game.animFrame = requestAnimationFrame(animate);
    };
    state.game.animFrame = requestAnimationFrame(animate);

    // Score Timer
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

        // --- Pro Mode Rhythm Check ---
        if(isPro) {
            const now = Date.now();
            // Calculate timing against the ideal beat time
            const diff = now - state.game.nextBeatTime; // + is Late, - is Early
            const absDiff = Math.abs(diff);

            const msPerBeat = 60000 / PRO_BPM; // Use unified BPM
            const dur = state.game.durations[state.game.idx];
            const noteDurationMs = dur * msPerBeat;

            // Updated Scoring Logic per requirements
            if (absDiff <= (noteDurationMs * 0.25)) {
                // Within +/- 25% window
                earned = 5;
            } else if (diff > (noteDurationMs * 0.25) && diff <= noteDurationMs) {
                // Late but within duration
                earned = 3;
            } else {
                // Too Early or Too Late (missed window entirely)
                earned = 0;
            }

            // Always advance in Pro mode, but earned might be 0
            isTimingGood = true; 
            
            // Advance expected time for next note
            state.game.nextBeatTime += noteDurationMs;
        }

        if(isTimingGood) {
            el.classList.add('active');
            setTimeout(()=>el.classList.remove('active'), 100);
            playTone(note, 'good');
            
            const dt = (Date.now() - state.game.noteTime) / 1000;
            
            if(state.game.mode === 'coin') {
                if(!isPro) {
                    earned = 1; // Standard mode
                } 
                // In Pro mode 'earned' is already calculated
                
                state.game.coins += earned;
                document.getElementById('game-coins').innerText = state.game.coins;
                
                // Show floating text if earned > 0, else maybe "Miss"?
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
                // Fill if it was hollow, to show completion
                const head = currSvg.querySelector('.note-head');
                if(head) head.setAttribute('fill', 'var(--primary)'); 
            }
            
            state.game.idx++;
            state.game.noteTime = Date.now();
            updateNotePosition();

            // Note: For Pro mode, we let the animate loop handle the final endGame call
            // to ensure visual smoothness, unless we are strictly not Pro.
            if(!isPro && state.game.idx >= state.game.notes.length) {
                endGame();
            }
        } else {
             // Correct Pitch, Bad Rhythm (This block acts as fallback for non-pro logic mainly)
             state.game.mistakes++;
             playTone(note, 'bad');
        }
        
    } else {
        // Wrong Note
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
    
    // Cleanup Overlay
    const overlay = document.getElementById('countdown-overlay');
    if(overlay) overlay.style.display = 'none';

    const totalTime = parseFloat(((Date.now() - state.game.startTime)/1000).toFixed(1));
    let finalCoins = state.game.coins;
    let msg = "";

    if(!state.currentUser.scores) state.currentUser.scores = { coin: { easy:[], medium:[], hard:[], pro:[] }, songs: {} };
    if(!state.currentUser.scores.coin.pro) state.currentUser.scores.coin.pro = []; // Ensure schema exists

    if(state.game.mode === 'coin') {
        const arr = state.currentUser.scores.coin[state.currentUser.difficulty];
        
        let bonus = 0;
        if(totalTime < 15) bonus = 25;
        else if(totalTime < 30) bonus = 15;
        else if(totalTime < 45) bonus = 5;
        
        // In pro mode, we don't give speed bonuses, score is pure accuracy
        if(state.currentUser.difficulty !== 'pro') {
            finalCoins += bonus;
            if(bonus>0) msg = `Speed Bonus: +${bonus}!`;
        } else {
            msg = "Sequence Complete!";
        }

        // Leaderboard Logic: Save COINS, Sort DESCENDING
        arr.push(finalCoins);
        arr.sort((a,b) => b - a); // Higher score first
        if(arr.length > 5) arr.length = 5; 
        
    } else {
        // ... (Song mode logic same as before)
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
    
    // Show Retry Button for Coin Runs
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
