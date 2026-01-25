import { state } from './state.js';
import { SONG_DB, TREBLE_Y, BASS_Y } from './config.js';
import { playTone, playRun, playClick } from './audio.js';
import { showScreen, renderHighScores, updateLanding } from './ui.js';
import { saveCurrentUser, deductCredit } from './storage.js';

/* --- CORE GAME FUNCTIONS --- */

const DEFAULT_PRO_BPM = 50; 
let currentBPM = DEFAULT_PRO_BPM;
const NOTE_ORDER = ['C','D','E','F','G','A','B'];

const PATH_TREBLE = "M26.4 56.7c-.5-3.3-3.6-5.8-7-5.8-4.2 0-7.3 3.5-7.3 7.6 0 2.2 1 4.2 2.6 5.5l-3.3 14.9c-3.6-1.5-6.6-4.3-6.6-9.1 0-6.4 6-12 14.7-12 7.2 0 12.8 3.5 12.8 9.7 0 3.8-2.5 7.7-6.5 11-4.7 4-9.3 7.6-11.4 14.8-.1 .5-.3 1-.3 1.5l-2 9c.8 .2 1.6 .3 2.5 .3 6.1 0 11-4.9 11-10.9 0-2.8-1-5.4-2.7-7.4l-1.3-2.2c-3-3.1-4.7-4.9-4.7-7.9 0-3.3 2.6-6 7.2-6 4.4 0 7 2.8 7 6 0 1.2-.2 2.1-.6 2.9l12-53.6c-1.2-6.1-6.4-11.1-14.4-11.1-9.2 0-16 6.2-16 15.7 0 8.4 6.2 13.3 12.6 17z";
const PATH_BASS = "M46 76.5C36.9 76.5 29.5 69.1 29.5 60S36.9 43.5 46 43.5c8.7 0 15.8 6.8 16.4 15.4 0 .4 .1 .7 .1 1.1 0 9.1-7.4 16.5-16.5 16.5zm0-29c-6.9 0-12.5 5.6-12.5 12.5S39.1 72.5 46 72.5c6.5 0 11.8-4.9 12.4-11.2-.8-.2-1.6-.3-2.4-.3-10.2 0-18.5-8.3-18.5-18.5 0-.4 0-.8 .1-1.2-5.4 1-9.6 5.2-10.6 10.6 .4-.1 .8-.1 1.2-.1 6.9 0 12.5 5.6 12.5 12.5S45.4 76.5 38.5 76.5c-.4 0-.8 0-1.2-.1 .8 7.4 7.1 13.1 14.7 13.1 8.3 0 15-6.7 15-15s-6.7-15-15-15zm44 2.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5zm0 18c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5z";

// Helper to update live accuracy UI
function updateAccuracyUI() {
    const total = (state.game.hits || 0) + (state.game.mistakes || 0);
    const acc = total === 0 ? 100 : Math.round((state.game.hits / total) * 100);
    const el = document.getElementById('game-acc');
    if (el) el.innerText = acc + '%';
    return acc;
}

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
    state.game.hits = 0; // Initialize hits for accuracy
    state.game.nextBeatTime = 0;
    
    // Feature: Tempo scaling based on difficulty for Song Mode
    if (mode === 'song' && songIdx !== null) {
        const baseBPM = SONG_DB[songIdx].bpm || 80;
        const diff = state.currentUser.difficulty;
        let multiplier = 1;

        if (diff === 'easy') multiplier = 0.25;
        else if (diff === 'medium') multiplier = 0.50;
        else if (diff === 'hard') multiplier = 0.75;
        else multiplier = 1.0; // Pro

        currentBPM = baseBPM * multiplier;
    } else {
        currentBPM = DEFAULT_PRO_BPM;
    }

    if(state.game.metronomeInt) clearInterval(state.game.metronomeInt);
    if(state.game.animFrame) cancelAnimationFrame(state.game.animFrame); 

    document.getElementById('game-coins').innerText = 0;
    document.getElementById('game-timer').innerText = 0;
    updateAccuracyUI(); // Reset accuracy display
    
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

    const isProActive = (((state.currentUser.difficulty === 'pro' && state.game.mode === 'coin') || state.game.mode === 'song') && document.getElementById('game-start-overlay').style.display === 'none');
    
    if (!isProActive) {
        let cumulativeDuration = 0;
        for(let i=0; i<state.game.idx; i++) {
             cumulativeDuration += (state.game.durations[i] || 1);
        }
        const trans = state.HIT_X - (cumulativeDuration * 120) - 80;
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
                            const randIdx = Math.floor(Math.random() * pool.length);
                            state.game.notes.push(pool[randIdx]);
                         }
                     } else {
                         state.game.durations.push(dur);
                         beatsLeft -= dur;
                         const randIdx = Math.floor(Math.random() * pool.length);
                         state.game.notes.push(pool[randIdx]);
                     }
                 }
             }
        } else {
            for(let i=0; i<count; i++) {
                const randIdx = Math.floor(Math.random() * pool.length);
                state.game.notes.push(pool[randIdx]);
                state.game.durations.push(1);
            }
        }
    }
}

function getNoteY(note, clef) {
    const natural = note.replace(/[#b]/g, '');
    const letter = natural.charAt(0);
    const octave = parseInt(natural.slice(1));
    const refIndex = 0; 
    const idx = NOTE_ORDER.indexOf(letter);

    if (clef === 'treble') {
        const refOctave = 4, refY = 220;
        const steps = (octave - refOctave) * 7 + (idx - refIndex);
        return refY - (steps * 10);
    } else {
        const refOctave = 3, refY = 170; 
        const steps = (octave - refOctave) * 7 + (idx - refIndex);
        return refY - (steps * 10);
    }
}

export function renderSheet() {
    const noteGroup = document.getElementById('notes-group');
    const svgContainer = document.getElementById('music-svg');
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

    const clefG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const clefPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    
    if(state.currentClef === 'treble') {
        clefG.setAttribute('transform', 'translate(10, 110) scale(3.5)');
        clefPath.setAttribute('d', PATH_TREBLE);
        clefPath.setAttribute('transform', 'scale(0.25)');
    } else {
        clefG.setAttribute('transform', 'translate(10, 125) scale(3.5)'); 
        clefPath.setAttribute('d', PATH_BASS);
        clefPath.setAttribute('transform', 'scale(0.2) translate(-20,0)');
    }
    clefPath.setAttribute('fill', '#000');
    clefG.appendChild(clefPath);
    svgContainer.appendChild(clefG);

    let currentX = 80;
    const PIXELS_PER_BEAT = 120;

    state.game.notes.forEach((note, i) => {
        const y = getNoteY(note, state.currentClef);
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        g.setAttribute('transform', `translate(${currentX}, ${y})`); 
        g.setAttribute('class', `note ${i===0?'current':'inactive'}`);
        g.setAttribute('id', `note-${i}`);
        
        const dur = state.game.durations[i] || 1;
        currentX += (dur * PIXELS_PER_BEAT);

        let needsLine = false;
        if(y >= 220 && (y-220)%20 === 0) needsLine = true;
        if(y <= 100 && (100-y)%20 === 0) needsLine = true;
        
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
        k.onpointerdown = (e) => {
            e.preventDefault();
            handleInput(n, k);
        };
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
        k.onpointerdown = (e) => {
            e.preventDefault(); 
            e.stopPropagation(); 
            handleInput(n, k);
        };
        kb.appendChild(k);
    });
}

export function beginRound() {
    document.getElementById('game-start-overlay').style.display = 'none';
    const isProCoin = (state.currentUser.difficulty === 'pro' && state.game.mode === 'coin');
    const isSong = (state.game.mode === 'song');

    if (isProCoin || isSong) {
        startCountdown(() => {
            startProGame();
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
    const interval = 60000 / currentBPM; 
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
    
    const animate = () => {
        if( !((state.game.mode === 'coin' && state.currentUser.difficulty === 'pro') || state.game.mode === 'song') ) return;
        
        const now = Date.now();

        if(state.game.idx < state.game.notes.length) {
            const dur = state.game.durations[state.game.idx];
            const msPerBeat = 60000 / currentBPM; 
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

                 state.game.mistakes++;
                 updateAccuracyUI(); // Update accuracy on miss
                 state.game.idx++;
                 
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

        const elapsed = now - state.game.startTime;
        const beatTime = 60000 / currentBPM; 
        const pxShift = (elapsed / beatTime) * 120;
        const currentX = state.HIT_X - pxShift - 80;
        
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
    
    const isPro = ((state.currentUser.difficulty === 'pro' && state.game.mode === 'coin') || state.game.mode === 'song');
    
    if (isPro) {
        const target = state.game.notes[state.game.idx];
        if (note !== target) {
            const nextIdx = state.game.idx + 1;
            if (nextIdx < state.game.notes.length) {
                const nextTarget = state.game.notes[nextIdx];
                if (note === nextTarget) {
                    const now = Date.now();
                    const msPerBeat = 60000 / currentBPM;
                    const dur = state.game.durations[state.game.idx];
                    const currentDurationMs = dur * msPerBeat;
                    const deadline = state.game.nextBeatTime + currentDurationMs;
                    
                    if (deadline - now < 300) {
                         state.game.mistakes++;
                         updateAccuracyUI(); // Update accuracy on mistake
                         const currSvg = document.getElementById(`note-${state.game.idx}`);
                         if(currSvg) {
                             currSvg.classList.remove('current');
                             currSvg.classList.add('inactive');
                             currSvg.style.opacity = 0.4;
                             const head = currSvg.querySelector('.note-head');
                             if(head) head.setAttribute('fill', '#ff4444'); 
                         }
                         
                         state.game.idx++;
                         state.game.nextBeatTime += currentDurationMs;
                         
                         const pct = (state.game.idx / state.game.notes.length) * 100;
                         const prog = document.getElementById('progress-fill');
                         if(prog) prog.style.width = pct + '%';
                         
                         updateNotePosition();
                         handleInput(note, el);
                         return;
                    }
                }
            }
        }
    }

    const target = state.game.notes[state.game.idx];
    
    if(note === target) {
        let isTimingGood = true;
        let earned = 0;

        if(isPro) {
            const now = Date.now();
            const diff = now - state.game.nextBeatTime; 
            const absDiff = Math.abs(diff);
            const msPerBeat = 60000 / currentBPM; 
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
            state.game.hits = (state.game.hits || 0) + 1; // Increment hits
            updateAccuracyUI(); // Update accuracy UI

            el.classList.add('active');
            setTimeout(()=>el.classList.remove('active'), 100);
            playTone(note, 'good');
            
            const currSvg = document.getElementById(`note-${state.game.idx}`);
            let animX = 0, animY = 0;
            if(currSvg) {
                const rect = currSvg.getBoundingClientRect();
                animX = rect.left + (rect.width/2) - 10;
                animY = rect.top - 20;
            } else {
                animX = window.innerWidth / 2;
                animY = window.innerHeight / 2;
            }

            if(state.game.mode === 'coin') {
                if(!isPro) earned = 1; 
                state.game.coins += earned;
                document.getElementById('game-coins').innerText = state.game.coins;
                
                const float = document.createElement('div');
                float.className = 'feedback-anim';
                float.innerText = earned > 0 ? `+${earned}` : '0';
                float.style.color = earned > 0 ? 'var(--accent)' : '#999';
                float.style.left = animX + 'px';
                float.style.top = animY + 'px';
                document.body.appendChild(float);
                setTimeout(()=>float.remove(), 1000);
            } else {
                const float = document.createElement('div');
                float.className = 'feedback-anim';
                float.innerText = "✨";
                float.style.left = animX + 'px';
                float.style.top = animY + 'px';
                document.body.appendChild(float);
                setTimeout(()=>float.remove(), 1000);
            }

            if(currSvg) {
                currSvg.classList.remove('current');
                currSvg.classList.add('inactive');
                const head = currSvg.querySelector('.note-head');
                if(head) head.setAttribute('fill', 'var(--primary)'); 
            }
            
            state.game.idx++;
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
             updateAccuracyUI();
             playTone(note, 'bad');
        }
        
    } else {
        playTone(note, 'bad');
        el.classList.add('wrong');
        setTimeout(()=>el.classList.remove('wrong'), 300);
        state.game.mistakes++;
        updateAccuracyUI(); // Update accuracy on wrong input
    }
}

export function endGame() {
    clearInterval(state.game.timerInt);
    if(state.game.metronomeInt) clearInterval(state.game.metronomeInt);
    if(state.game.animFrame) cancelAnimationFrame(state.game.animFrame);
    
    const overlay = document.getElementById('countdown-overlay');
    if(overlay) overlay.style.display = 'none';

    const totalTime = parseFloat(((Date.now() - state.game.startTime)/1000).toFixed(1));
    const accuracy = updateAccuracyUI(); // Get final accuracy
    let finalCoins = state.game.coins;
    let msg = "";

    const accEl = document.getElementById('res-accuracy');
    if(accEl) accEl.style.display = 'none';

    if(!state.currentUser.scores) state.currentUser.scores = { coin: { easy:[], medium:[], hard:[], pro:[] }, songs: {} };

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
        
        // Final coins multiplied by accuracy
        finalCoins = Math.round(finalCoins * (accuracy / 100));

        arr.push(finalCoins);
        arr.sort((a,b) => b - a); 
        if(arr.length > 5) arr.length = 5; 
    } else {
        if(accEl) {
            accEl.innerText = `Accuracy: ${accuracy}%`;
            accEl.style.display = 'block';
        }

        if(accuracy >= 90) {
            if(!state.currentUser.scores.songs[state.game.songId]) state.currentUser.scores.songs[state.game.songId] = [];
            const arr = state.currentUser.scores.songs[state.game.songId];
            arr.push(totalTime);
            arr.sort((a,b) => a - b);
            if(arr.length > 5) arr.length = 5;

            const s = SONG_DB[state.game.songId];
            if(state.game.songId === state.currentUser.unlockedSongs) {
                // Final reward based on accuracy
                finalCoins = Math.round(s.reward * (accuracy / 100));
                state.currentUser.unlockedSongs++;
                msg = `Passed! Song Unlocked! (+${finalCoins})`;
            } else {
                msg = "Good practice! (Already rewarded)";
                finalCoins = 0;
            }
        } else {
            msg = "Need 90% accuracy to pass!";
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
    retryBtn.style.display = 'block';
    retryBtn.onclick = retryGame;

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
