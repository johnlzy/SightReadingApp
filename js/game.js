import { state } from './state.js';
import { SONG_DB, TREBLE_Y, BASS_Y } from './config.js';
import { playTone, playRun, playClick } from './audio.js';
import { transposeOctaves, keyboardNotesFor, durationNotation, gradeTimedOnset, validateMelody, midiToNote } from './music.js';
import { startMicrophone, stopMicrophone, resetMicrophoneNotes } from './microphone.js';
import { assessOnset, performanceSummary } from './rhythm.js';
import { syncInputModeUI, useTouchInput } from './mic-ui.js';
import { showScreen, renderHighScores, updateLanding } from './ui.js';
import { saveCurrentUser } from './storage.js';
import { canPlayToday, showTimeUpOverlay } from './app-budget.js';
import { remainingSeconds } from './play-budget.js';
import { ensureEconomy, grantSparks } from './economy.js';
import { recordDailyQuest } from './quests.js';
import { renderPipScene } from './companion.js';
import { generateReadingPhrase, finishReadingPhrase } from './learning-journey.js';
import { createScoreDocument, staticScoreSvg } from './score.js';
import {
    ensureLearning, generateAdaptiveExercise, generateSkillCheck,
    recordOutcome, finishLearningSession
} from './learning.js';

/* --- CORE GAME FUNCTIONS --- */

const DEFAULT_PRO_BPM = 50; 
let currentBPM = DEFAULT_PRO_BPM;
const NOTE_ORDER = ['C','D','E','F','G','A','B'];
function isTimedExercise() {
    const mode = state.game.mode;
    return mode === 'song'
        || (state.currentUser?.difficulty === 'pro'
            && (mode === 'coin' || mode === 'practice'));
}

function captureNoteOutcome(rhythmGrade = null, timeMs = Date.now()) {
    const game = state.game;
    const note = game.notes[game.idx];
    if(!note) return;
    const item = {
        note,
        clef: state.currentClef,
        duration: game.durations[game.idx] || 1,
        firstTryCorrect: game.pitchRecordedIndex === game.idx && game.noteWrongCount === 0,
        rhythmGrade,
        latencyMs: isTimedExercise() ? null : Math.max(0,timeMs - (game.noteStartedAt || timeMs))
    };
    game.outcomes.push(item);
    if(game.mode !== 'check' && game.mode !== 'phrase-check') {
        recordOutcome(ensureLearning(state.currentUser), item);
        if(Number.isInteger(state.currentUser.idx)) saveCurrentUser();
    }
    game.noteWrongCount = 0;
    game.noteStartedAt = timeMs;
}


function cancelSessionTimers() {
    clearTimeout(state.game.budgetGraceTimeout);
    state.game.budgetGraceTimeout = null;
    clearInterval(state.game.timerInt);
    clearInterval(state.game.metronomeInt);
    clearTimeout(state.game.countdownTimeout);
    cancelAnimationFrame(state.game.animFrame);
    state.game.timerInt = null;
    state.game.metronomeInt = null;
    state.game.countdownTimeout = null;
    state.game.animFrame = null;
}

const PATH_TREBLE = "M26.4 56.7c-.5-3.3-3.6-5.8-7-5.8-4.2 0-7.3 3.5-7.3 7.6 0 2.2 1 4.2 2.6 5.5l-3.3 14.9c-3.6-1.5-6.6-4.3-6.6-9.1 0-6.4 6-12 14.7-12 7.2 0 12.8 3.5 12.8 9.7 0 3.8-2.5 7.7-6.5 11-4.7 4-9.3 7.6-11.4 14.8-.1 .5-.3 1-.3 1.5l-2 9c.8 .2 1.6 .3 2.5 .3 6.1 0 11-4.9 11-10.9 0-2.8-1-5.4-2.7-7.4l-1.3-2.2c-3-3.1-4.7-4.9-4.7-7.9 0-3.3 2.6-6 7.2-6 4.4 0 7 2.8 7 6 0 1.2-.2 2.1-.6 2.9l12-53.6c-1.2-6.1-6.4-11.1-14.4-11.1-9.2 0-16 6.2-16 15.7 0 8.4 6.2 13.3 12.6 17z";
const PATH_BASS = "M46 76.5C36.9 76.5 29.5 69.1 29.5 60S36.9 43.5 46 43.5c8.7 0 15.8 6.8 16.4 15.4 0 .4 .1 .7 .1 1.1 0 9.1-7.4 16.5-16.5 16.5zm0-29c-6.9 0-12.5 5.6-12.5 12.5S39.1 72.5 46 72.5c6.5 0 11.8-4.9 12.4-11.2-.8-.2-1.6-.3-2.4-.3-10.2 0-18.5-8.3-18.5-18.5 0-.4 0-.8 .1-1.2-5.4 1-9.6 5.2-10.6 10.6 .4-.1 .8-.1 1.2-.1 6.9 0 12.5 5.6 12.5 12.5S45.4 76.5 38.5 76.5c-.4 0-.8 0-1.2-.1 .8 7.4 7.1 13.1 14.7 13.1 8.3 0 15-6.7 15-15s-6.7-15-15-15zm44 2.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5zm0 18c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5z";

// Pitch and rhythm are different skills. Never treat an on-pitch but
// early/late note as a pitch-recognition mistake.
function updateAccuracyUI() {
    const result = performanceSummary(state.game);
    const bar = document.getElementById('acc-bar-fill');
    if (bar) {
        bar.style.width = result.pitch + '%';
        bar.style.backgroundColor = result.pitch >= 80 ? '#4CAF50'
            : result.pitch >= 50 ? '#FFC107' : '#FF5722';
    }
    const timed = isTimedExercise();
    const rhythm = document.getElementById('game-rhythm');
    if (rhythm) {
        rhythm.hidden = !timed;
        rhythm.textContent = timed
            ? 'Rhythm ' + result.rhythm + '%'
            : '';
    }
    return result.pitch;
}

function showRhythmFeedback(label, offsetMs = null) {
    const node = document.getElementById('timing-feedback');
    if(!node) return;
    node.hidden = !label;
    const shortLabel = label === 'perfect' ? 'Perfect!'
        : label === 'good' ? 'Good timing!'
        : label === 'early' ? 'Too early'
        : label === 'late' ? 'Too late' : label;
    node.textContent = shortLabel + (offsetMs === null ? '' : ' (' +
        (offsetMs > 0 ? '+' : '') + offsetMs + ' ms)');
    node.dataset.grade = label;
}

function recordCorrectPitch() {
    if(state.game.pitchRecordedIndex === state.game.idx) return;
    state.game.pitchRecordedIndex = state.game.idx;
    state.game.pitchCorrect++;
}

export function startGame(mode, songIdx=null, isRetry=false) {
    if(!state.currentUser || !canPlayToday()) return false;
    // v4 replaces per-round tickets with metered daily foreground playtime;
    // all existing game modes draw from the same parent-approved budget.
    stopMicrophone();
    updateLanding();
    clearTimeout(state.game.budgetGraceTimeout);
    state.game.budgetGraceTimeout = null;
    state.game.budgetEnding = false;

    state.game.mode = mode;
    state.game.sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID() : 'round-'+Date.now()+'-'+Math.random().toString(36).slice(2);
    state.game.songId = songIdx;
    state.game.coins = 0;
    state.game.idx = 0;
    state.game.mistakes = 0;
    state.game.hits = 0;
    state.game.pitchCorrect = 0;
    state.game.pitchErrors = 0;
    state.game.pitchMisses = 0;
    state.game.pitchRecordedIndex = -1;
    state.game.rhythmOnTime = 0;
    state.game.rhythmPerfect = 0;
    state.game.rhythmGood = 0;
    state.game.rhythmEarly = 0;
    state.game.rhythmLate = 0;
    state.game.rhythmMisses = 0;
    state.game.absoluteOnsetErrorMs = 0;
    state.game.noteTimingIssue = null;
    state.game.noteWrongCount = 0;
    state.game.noteStartedAt = 0;
    state.game.outcomes = [];
    state.game.exerciseKind = mode;
    state.game.phraseSpec = null;
    state.game.hintsUsed = false;
    state.game.nextBeatTime = 0;
    state.game.sessionToken = (state.game.sessionToken || 0) + 1;
    state.game.phase = 'ready';
    state.game.budgetEnding = false;
    
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

    cancelSessionTimers();

    const counterLabel = document.getElementById('game-counter-label');
    if(counterLabel)counterLabel.textContent =
        ['phrase','phrase-check'].includes(mode) ? 'Notes' : mode === 'coin' ? 'Points' : 'Progress';
    document.getElementById('game-coins').innerText = 0;
    document.getElementById('game-timer').innerText = 0;
    updateAccuracyUI(); // Reset both skill displays
    showRhythmFeedback(null);
    
    const prog = document.getElementById('progress-fill');
    if(prog) prog.style.width = '0%';

    document.getElementById('game-start-overlay').style.display = 'flex';
    
    showScreen('screen-game');
    syncInputModeUI();
    window.dispatchEvent(new Event('resize')); 
    
    const noteGroup = document.getElementById('notes-group');
    const staticPhrase = mode === 'phrase' || mode === 'phrase-check';
    const gameView = document.querySelector('.game-wrapper');
    gameView?.classList.toggle('static-phrase-mode',staticPhrase);
    gameView?.classList.remove('phrase-show-labels');
    const hintButton=document.getElementById('phrase-hint-button');
    if(hintButton)hintButton.setAttribute('aria-pressed','false');
    const hint = document.getElementById('phrase-hint-controls');
    if(hint)hint.hidden = mode !== 'phrase';
    const noteView = document.getElementById('phrase-score');
    if(noteView)noteView.hidden=!staticPhrase;
    noteGroup.classList.remove('animate-scroll'); 
    updateNotePosition(); 
    
    void noteGroup.offsetWidth; 
    if(!staticPhrase) noteGroup.classList.add('animate-scroll'); 
    
    if(isRetry && !['practice','check','phrase','phrase-check'].includes(mode) && state.game.lastNotes.length > 0) {
        state.game.notes = [...state.game.lastNotes];
        state.game.durations = [...state.game.lastDurations];
    } else {
        generateNotes();
        state.game.lastNotes = [...state.game.notes];
        state.game.lastDurations = [...state.game.durations];
    }
    
    renderSheet();
    renderKeyboard();
    if(staticPhrase && noteView) {
        const score=createScoreDocument({
            notes:state.game.notes,durations:state.game.durations,clef:state.currentClef,
            title:state.game.phraseSpec?.title||'A Fresh Melody',
            bpm:state.game.phraseSpec?.bpm||72
        });
        noteView.innerHTML=staticScoreSvg(score);
    }
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

    const isProActive = (isTimedExercise() && document.getElementById('game-start-overlay').style.display === 'none');
    
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
        state.game.notes = validateMelody(songData, state.currentClef);
        state.game.durations = songData.map(item => item.d);
    } else if(state.game.mode === 'practice') {
        const exercise = generateAdaptiveExercise(ensureLearning(state.currentUser), {
            clef:state.currentClef, difficulty:state.currentUser.difficulty
        });
        state.game.notes = exercise.notes;
        state.game.durations = exercise.durations;
    } else if(state.game.mode === 'phrase' || state.game.mode === 'phrase-check') {
        const kind=state.game.mode === 'phrase-check' ? 'check' : 'practice';
        const spec=generateReadingPhrase(state.currentUser,{
            clef:state.currentClef,kind,level:state.currentUser.readingLevel||1
        });
        state.game.phraseSpec=spec;
        state.game.notes=[...spec.notes];
        state.game.durations=[...spec.durations];
    } else if(state.game.mode === 'check') {
        const learning = ensureLearning(state.currentUser);
        const exercise = generateSkillCheck({
            clef:state.currentClef, difficulty:state.currentUser.difficulty,
            checkIndex:learning.checkCount,
            profileKey: String(state.currentUser.idx ?? state.currentUser.name)
        });
        state.game.notes = exercise.notes;
        state.game.durations = exercise.durations;
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
    svgContainer.querySelectorAll('.clef-symbol').forEach(element => element.remove());
    
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
    clefG.setAttribute('class', 'clef-symbol');
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
        const notation = durationNotation(dur);
        currentX += (dur * PIXELS_PER_BEAT);

        // Draw every ledger line required for notes above/below the staff.
        const ledgerPositions = [];
        for(let ly = 220; ly <= y; ly += 20) ledgerPositions.push(ly - y);
        for(let ly = 100; ly >= y; ly -= 20) ledgerPositions.push(ly - y);
        ledgerPositions.forEach(offset => {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', -16); line.setAttribute('x2', 16);
            line.setAttribute('y1', offset); line.setAttribute('y2', offset);
            line.setAttribute('stroke', '#000');
            g.appendChild(line);
        });

        const oval = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        oval.setAttribute('rx', 12); oval.setAttribute('ry', 9);
        oval.setAttribute('class', 'note-head');
        oval.setAttribute('stroke', '#000');
        oval.setAttribute('stroke-width', '2');
        
        if(notation.hollow) {
             oval.setAttribute('fill', '#fff'); 
        } else {
             oval.setAttribute('class', 'note-head filled'); 
             oval.setAttribute('fill', 'currentColor'); 
        }
        g.appendChild(oval);

        if (notation.stem) { 
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
            
            if (notation.flag) {
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

        if(notation.dotted) {
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute('cx', 22);
            dot.setAttribute('cy', y % 20 === 0 ? -5 : 0);
            dot.setAttribute('r', 3);
            dot.setAttribute('fill', '#000');
            g.appendChild(dot);
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
    const sequence = state.game.notes;
    const availableNotes = keyboardNotesFor(sequence, state.currentClef);
    const whiteCount = availableNotes.filter(n => !n.includes('#')).length;
    const keyWidth = Math.max(38, Math.floor(kb.clientWidth / Math.min(8, whiteCount)));
    const blackWidth = Math.round(keyWidth * 0.58);

    const keybed = document.createElement('div');
    keybed.className = 'keyboard-keys';
    keybed.style.width = (whiteCount * keyWidth) + 'px';
    kb.appendChild(keybed);

    let whiteIndex = 0;
    availableNotes.forEach(note => {
        const isBlack = note.includes('#');
        const key = document.createElement('div');
        key.className = isBlack ? 'black-key' : 'white-key';
        key.dataset.note = note;
        if(isBlack) {
            key.style.left = (whiteIndex * keyWidth - blackWidth / 2) + 'px';
            key.style.width = blackWidth + 'px';
        } else {
            key.style.flex = '0 0 ' + keyWidth + 'px';
            if(!['phrase','phrase-check'].includes(state.game.mode))key.innerText=note;
            whiteIndex++;
        }
        key.onpointerdown = event => {
            event.preventDefault();
            event.stopPropagation();
            handleInput(note, key);
        };
        keybed.appendChild(key);
    });
    focusCurrentKey();
}

function focusCurrentKey() {
    if(state.game.mode === 'phrase' || state.game.mode === 'phrase-check')return;
    const kb = document.getElementById('keyboard');
    const target = state.game.notes[state.game.idx];
    const key = [...kb.querySelectorAll('[data-note]')].find(el => el.dataset.note === target);
    if(!key) return;
    const left = Math.max(0, key.offsetLeft - kb.clientWidth / 2 + key.clientWidth / 2);
    kb.scrollTo({ left, behavior: 'smooth' });
}

function showCurrentNote() {
    const note = document.getElementById(`note-${state.game.idx}`);
    if(note) {
        note.classList.remove('inactive');
        note.classList.add('current');
    }
    focusCurrentKey();
}

export async function beginRound() {
    if(state.game.phase !== 'ready') return;
    const startOverlay = document.getElementById('game-start-overlay');
    const button = startOverlay.querySelector('button');
    const token = state.game.sessionToken;

    if(state.inputMode === 'microphone') {
        state.game.phase = 'arming';
        button.disabled = true;
        button.textContent = '🎤 Connecting...';
        try {
            const connected = await startMicrophone({
                onNote: event => {
                    if (state.game.phase === 'playing' && state.inputMode === 'microphone') {
                        handleInput(midiToNote(event.midiNote), null, event.onsetTimeMs, 'microphone');
                    }
                },
                onMonitor: ({ pitch }) => {
                    const label = document.getElementById('mic-game-note');
                    if(label) label.textContent = pitch?.confidence >= 0.82
                        ? midiToNote(pitch.midi) : 'Listening…';
                },
                onError: error => {
                    useTouchInput();
                    alert(error.message || 'Microphone disconnected. You can continue with touch keys.');
                }
            });
            if (!connected || token !== state.game.sessionToken || state.game.phase !== 'arming') return;
        } catch (error) {
            if(token !== state.game.sessionToken || state.game.phase !== 'arming') return;
            useTouchInput();
            alert((error.name === 'NotAllowedError' ? 'Microphone permission denied. ' : '')
                + 'Switching to on-screen piano. ' + (error.message || ''));
        } finally {
            button.disabled = false;
            button.textContent = 'START';
            if(token === state.game.sessionToken && state.game.phase === 'arming') {
                state.game.phase = 'ready';
            }
        }
    }

    if(token !== state.game.sessionToken || state.game.phase !== 'ready') return;
    startOverlay.style.display = 'none';
    if (isTimedExercise()) {
        startCountdown(startProGame);
    } else {
        startStandardGame();
    }
}

function startStandardGame() {
    if(state.game.phase !== 'ready') return;
    state.game.phase = 'playing';
    if(state.inputMode === 'microphone') resetMicrophoneNotes();
    state.game.startTime = Date.now();
    state.game.noteTime = Date.now();
    state.game.noteStartedAt = state.game.noteTime;
    if(state.game.timerInt) clearInterval(state.game.timerInt);
    state.game.timerInt = setInterval(() => {
        const t = Math.floor((Date.now() - state.game.startTime)/1000);
        const el = document.getElementById('game-timer');
        if(el) el.innerText = t;
    }, 1000);
}

function startCountdown(callback) {
    state.game.phase = 'countdown';
    const token = state.game.sessionToken;
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
        if(state.game.phase !== 'countdown' || state.game.sessionToken !== token) return;
        if(count > 0) {
            overlay.innerText = count;
            playClick();
            count--;
            state.game.countdownTimeout = setTimeout(tick, interval);
        } else {
            overlay.style.display = 'none';
            state.game.countdownTimeout = null;
            if(callback) callback();
        }
    };
    tick();
}

function startProGame() {
    if(state.game.phase !== 'countdown') return;
    state.game.phase = 'playing';
    if(state.inputMode === 'microphone') resetMicrophoneNotes();
    const noteGroup = document.getElementById('notes-group');
    if(noteGroup) noteGroup.classList.remove('animate-scroll');

    state.game.startTime = Date.now();
    state.game.noteTime = Date.now();
    state.game.noteStartedAt = state.game.noteTime;
    state.game.nextBeatTime = state.game.startTime; 
    
    const animate = () => {
        if(state.game.phase !== 'playing') return;
        
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

                 // A note can have the correct pitch but the wrong timing.
                 if(state.game.pitchRecordedIndex !== state.game.idx) {
                     state.game.pitchMisses++;
                 }
                 const issue = state.game.noteTimingIssue;
                 if(issue === 'early') state.game.rhythmEarly++;
                 else if(issue === 'late') state.game.rhythmLate++;
                 else state.game.rhythmMisses++;
                 showRhythmFeedback(issue || 'Miss');
                 captureNoteOutcome(issue || 'miss', now);
                 state.game.mistakes++;
                 state.game.idx++;
                 state.game.pitchRecordedIndex = -1;
                 state.game.noteTimingIssue = null;
                 updateAccuracyUI();
                 showCurrentNote();
                 
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

export function handleInput(note, el, playedAtMs = Date.now(), source = 'touch') {
    if(state.game.phase !== 'playing' || state.game.idx >= state.game.notes.length) return;
    if(source === 'microphone' && state.inputMode !== 'microphone') return;
    const isMic = source === 'microphone';
    const isTimed = isTimedExercise();
    if(!el && typeof document.querySelectorAll === 'function') {
        el = [...document.querySelectorAll('#keyboard [data-note]')]
            .find(key => key.dataset.note === note) || null;
    }
    const markKey = className => {
        el?.classList.add(className);
        if(el) setTimeout(() => el.classList.remove(className),
            className === 'wrong' ? 300 : 100);
    };
    const feedbackAudio = type => {
        // Synthesized piano feedback would feed directly into the open mic.
        if(!isMic) playTone(note, type);
    };
    const target = state.game.notes[state.game.idx];

    if(note !== target) {
        feedbackAudio('bad');
        markKey('wrong');
        state.game.pitchErrors++;
        state.game.noteWrongCount++;
        state.game.mistakes++;
        updateAccuracyUI();
        if(isTimed) showRhythmFeedback('Wrong note');
        return;
    }

    recordCorrectPitch();
    let earned = isTimed ? 0 : 1;
    let rhythmGrade = null;

    if(isTimed) {
        const evaluation = assessOnset(
            playedAtMs,
            state.game.nextBeatTime,
            currentBPM,
            { adjustmentMs: isMic ? (state.micTimingAdjustmentMs || 0) : 0 }
        );
        if(!evaluation.accepted) {
            // Remember the last timing issue for this note, but count it once
            // only if the note is ultimately missed. Repeated input is not
            // a stream of new mistakes.
            if(!state.game.noteTimingIssue) state.game.noteTimingIssue = evaluation.judgement;
            showRhythmFeedback(evaluation.judgement, evaluation.offsetMs);
            markKey('wrong');
            updateAccuracyUI();
            return;
        }
        const initialMistake = state.game.noteTimingIssue;
        rhythmGrade = initialMistake || evaluation.judgement;
        if(initialMistake === 'early') {
            state.game.rhythmEarly++;
            showRhythmFeedback('early');
        } else if(initialMistake === 'late') {
            state.game.rhythmLate++;
            showRhythmFeedback('late');
        } else {
            earned = evaluation.coins;
            state.game.rhythmOnTime++;
            if(evaluation.judgement === 'perfect') state.game.rhythmPerfect++;
            else state.game.rhythmGood++;
            state.game.absoluteOnsetErrorMs += Math.abs(evaluation.offsetMs);
            showRhythmFeedback(evaluation.judgement, evaluation.offsetMs);
        }
        state.game.noteTimingIssue = null;
        state.game.nextBeatTime += state.game.durations[state.game.idx] * (60000 / currentBPM);
    }

    state.game.hits++;
    if(['phrase','phrase-check'].includes(state.game.mode)) {
        const counter=document.getElementById('game-coins');
        if(counter)counter.textContent=String(state.game.hits);
    }
    updateAccuracyUI();
    markKey('active');
    feedbackAudio('good');

    const currSvg = document.getElementById(`note-${state.game.idx}`);
    let animX = window.innerWidth / 2;
    let animY = window.innerHeight / 2;
    if(currSvg) {
        const rect = currSvg.getBoundingClientRect();
        animX = rect.left + rect.width / 2 - 10;
        animY = rect.top - 20;
    }

    const float = document.createElement('div');
    float.className = 'feedback-anim';
    float.innerText = state.game.mode === 'coin' ? '+' + earned : '✨';
    float.style.left = animX + 'px';
    float.style.top = animY + 'px';
    document.body.appendChild(float);
    setTimeout(() => float.remove(), 1000);

    if(state.game.mode === 'coin') {
        state.game.coins += earned;
        document.getElementById('game-coins').innerText = state.game.coins;
    }
    if(currSvg) {
        currSvg.classList.remove('current');
        currSvg.classList.add('inactive');
        const head = currSvg.querySelector('.note-head');
        if(head) head.setAttribute('fill', 'var(--primary)');
    }

    captureNoteOutcome(rhythmGrade, playedAtMs);
    state.game.idx++;
    state.game.pitchRecordedIndex = -1;
    // Give a child a humane end-of-phrase stop when the daily budget expires.
    // The current exercise remains incomplete; no assessment result is saved.
    const budgetCheckpoint = state.game.budgetEnding &&
        (state.game.idx % 4 === 0 || state.game.idx >= state.game.notes.length);
    showCurrentNote();
    const pct = state.game.idx / state.game.notes.length * 100;
    const progress = document.getElementById('progress-fill');
    if(progress) progress.style.width = pct + '%';
    state.game.noteTime = Date.now();
    updateNotePosition();

    if(!isTimed && state.game.idx >= state.game.notes.length) endGame();
    else if(budgetCheckpoint && state.game.phase === 'playing') endForBudget();
}

export function endGame() {
    if(state.game.phase !== 'playing') return;
    state.game.phase = 'finished';
    stopMicrophone();
    cancelSessionTimers();
    
    const overlay = document.getElementById('countdown-overlay');
    if(overlay) overlay.style.display = 'none';

    const totalTime = parseFloat(((Date.now() - state.game.startTime)/1000).toFixed(1));
    updateAccuracyUI();
    const summary = performanceSummary(state.game);
    const isTimed = isTimedExercise();
    const accuracy = isTimed
        ? Math.min(summary.pitch, summary.rhythm) : summary.pitch;
    let finalCoins = state.game.coins;
    let msg = "";

    const accEl = document.getElementById('res-accuracy');
    if(accEl) {
        accEl.innerText = `Accuracy: ${accuracy}%`;
        accEl.style.display = 'block';
    }
    const pitchResult = document.getElementById('res-pitch');
    if(pitchResult) pitchResult.textContent = `Pitch: ${summary.pitch}%`;
    const rhythmResult = document.getElementById('res-rhythm');
    if(rhythmResult) {
        rhythmResult.hidden = !isTimed;
        rhythmResult.textContent = `Rhythm: ${summary.rhythm}%`;
    }
    const timingResult = document.getElementById('res-timing-breakdown');
    if(timingResult) {
        timingResult.hidden = !isTimed;
        timingResult.textContent = isTimed
            ? `Perfect ${summary.perfect} · Good ${summary.good} · Early ${summary.early} · Late ${summary.late} · Missed ${summary.missed} · Typical deviation ${summary.averageDeviationMs ?? '—'} ms`
            : '';
    }

    if(!state.currentUser.scores) state.currentUser.scores = { coin: { easy:[], medium:[], hard:[], pro:[] }, songs: {} };

    if(state.game.mode === 'phrase' || state.game.mode === 'phrase-check') {
        const result=finishReadingPhrase(state.currentUser,{
            kind:state.game.mode === 'phrase-check'?'check':'practice',
            clef:state.currentClef,level:state.game.phraseSpec.level,
            notes:state.game.notes,outcomes:state.game.outcomes,
            excerptId:state.game.phraseSpec.excerptId,
            hintsUsed:state.game.hintsUsed,
            sessionId:state.game.sessionId
        });
        finalCoins=0;
        if(accEl)accEl.textContent=(state.game.mode==='phrase-check'
            ?'Fresh Phrase Check: ':'Melody Reading: ')+result.score+'% first try';
        if(pitchResult)pitchResult.textContent='First-try notes: '+result.correct+' / '+result.total;
        msg=state.game.mode==='phrase-check'
            ? 'Your fresh melody result is saved separately from practice.'
            : state.game.hintsUsed
                ? 'Wonderful effort! Keep practicing, then try again without hints.'
                : 'You read a complete stationary melody. Try a fresh phrase next!';
        saveCurrentUser();
    } else if(state.game.mode === 'practice' || state.game.mode === 'check') {
        const learning = ensureLearning(state.currentUser);
        const progress = finishLearningSession(learning, {
            mode:state.game.mode,
            clef:state.currentClef,
            difficulty:state.currentUser.difficulty,
            outcomes:state.game.outcomes
        });
        const firstTry = progress.score;
        finalCoins = 0;
        if(accEl) accEl.textContent = state.game.mode === 'check'
            ? 'Skill Check: ' + firstTry + '% first try'
            : 'Practice: ' + firstTry + '% first try';
        if(pitchResult) pitchResult.textContent = 'First-try notes: ' +
            progress.correct + ' / ' + progress.total;
        msg = state.game.mode === 'check'
            ? 'Independent skill check saved. Compare your next result on the Learning Dashboard.'
            : 'Nice practice! Your next round will focus on notes that need review.';
        if(Number.isInteger(state.currentUser.idx)) saveCurrentUser();
    } else if(state.game.mode === 'coin') {
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

        if(summary.pitch >= 90 && summary.rhythm >= 80) {
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
            msg = "Goal: at least 90% pitch and 80% rhythm to pass!";
            finalCoins = 0;
        }
    }
    
    // Sparks are separate from historic treble/bass coins. Once-only session
    // grants prevent duplicated rewards after navigation/repeated callbacks.
    ensureEconomy(state.currentUser);
    const sessionKey = state.game.sessionId || ('legacy-'+Date.now()+'-'+Math.random());
    const reward = state.game.mode === 'practice' ? 12
        : state.game.mode === 'check' ? 8
        : state.game.mode === 'coin' ? Math.min(40,Math.max(0,finalCoins))
        : finalCoins>0 ? Math.min(40,Math.max(15,finalCoins)) : 8;
    const credited=grantSparks(state.currentUser,reward,'round:'+sessionKey) ? reward : 0;
    const quest=recordDailyQuest(state.currentUser,{
        sessionId:sessionKey,mode:state.game.mode,outcomes:state.game.outcomes
    });
    const allSparks=credited+quest.bonus;
    saveCurrentUser();

    document.getElementById('res-time').innerText = totalTime;
    document.getElementById('res-coins').innerText = allSparks;
    document.getElementById('res-msg').innerText = msg;
    const questReward=document.getElementById('res-quest');
    if(questReward) {
        questReward.hidden=!quest.bonus;
        questReward.textContent=quest.bonus
            ? '🌟 Daily music quest complete! +'+quest.bonus+' bonus Sparks' : '';
    }
    renderPipScene(document.getElementById('result-pip-scene'),
        state.currentUser,{mood:'celebrate',stage:true});
    
    const retryBtn = document.getElementById('btn-retry');
    retryBtn.style.display = 'block';
    retryBtn.onclick = retryGame;

    renderHighScores();
    showScreen('screen-result');
    if(remainingSeconds(state.currentUser) <= 0) showTimeUpOverlay();
    playRun();
}

export function exitGame() {
    stopMicrophone();
    state.game.phase = 'idle';
    state.game.sessionToken = (state.game.sessionToken || 0) + 1;
    cancelSessionTimers();
    const overlay = document.getElementById('countdown-overlay');
    if(overlay) overlay.style.display = 'none';
    showScreen('screen-landing');
    updateLanding();
}

/** Called by the shared Music Pass clock, never by an individual game mode. */
export function onPlayTimeExpired() {
    if(!state.currentUser) return;
    if(state.game.phase === 'playing') {
        if(state.game.budgetEnding) return;
        state.game.budgetEnding = true;
        state.game.budgetGraceTimeout = setTimeout(endForBudget, 45_000);
        const label = document.getElementById('budget-nearly-done');
        if(label) {
            label.hidden = false;
            label.textContent = 'Music time is complete — finish this short phrase.';
        }
    } else {
        if(['ready','countdown','arming'].includes(state.game.phase)) exitGame();
        showTimeUpOverlay();
    }
}

function endForBudget() {
    if(!state.game.budgetEnding && remainingSeconds(state.currentUser) > 0) return;
    // A partial Skill Check is not scored, and a partial song cannot be
    // recorded as passed. Practice outcomes already earned remain in memory.
    if(state.game.mode === 'check') state.game.outcomes = [];
    exitGame();
    const label = document.getElementById('budget-nearly-done');
    if(label) label.hidden = true;
    showTimeUpOverlay();
}

/** Key labels are a teaching scaffold and are NEVER available in blind checks. */
export function togglePhraseHints() {
    if(state.game.mode!=='phrase' || !['ready','playing'].includes(state.game.phase))return false;
    const el=document.querySelector('.game-wrapper');
    const show=!el?.classList.contains('phrase-show-labels');
    el?.classList.toggle('phrase-show-labels',show);
    if(show)state.game.hintsUsed=true;
    document.querySelectorAll('#keyboard .white-key').forEach(key=>{
        key.textContent=show?key.dataset.note:'';
    });
    document.getElementById('phrase-hint-button')?.setAttribute('aria-pressed',String(show));
    return show;
}
