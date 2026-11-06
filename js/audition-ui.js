import { state } from './state.js';
import { keyboardNotesFor, midiToNote } from './music.js';
import { createScoreDocument, staticScoreSvg } from './score.js';
import { beginAudition, auditionExercise, submitAuditionNote, skipAuditionNote,
    finishAuditionRound, nextAuditionRound, finalizeAudition } from './audition.js';
import { startMicrophone, stopMicrophone } from './microphone.js';
import { saveCurrentUser } from './storage.js';
import { canPlayToday, showTimeUpOverlay } from './app-budget.js';
import { showScreen, updateLanding } from './ui.js';

let session = null;
let independent = false;
let running = false;

function status(text) {
    const el=document.getElementById('audition-status');
    if(el) el.textContent=text;
}
function setActions(done) {
    document.getElementById('audition-actions').hidden = !done;
    document.getElementById('audition-progress').textContent = done ?
        'Melody complete — choose your next adventure' : 'Read the whole score, then play your notes.';
}
function renderPiano(notes) {
    const el=document.getElementById('audition-keys');
    el.replaceChildren();
    el.classList.toggle('mic-mode',state.inputMode==='microphone');
    if(state.inputMode==='microphone') {
        el.textContent='🎤 Listening to your real piano';
        return;
    }
    const notesAvailable=keyboardNotesFor(notes,state.currentClef);
    const white=notesAvailable.filter(n=>!n.includes('#')).length;
    const width=Math.max(38,Math.floor((el.clientWidth||420)/Math.min(8,white)));
    const bed=document.createElement('div');
    bed.className='keyboard-keys';
    bed.style.width=white*width+'px';
    el.appendChild(bed);
    let count=0;
    for(const pitch of notesAvailable) {
        const black=pitch.includes('#');
        const key=document.createElement('button');
        key.className=black?'black-key':'white-key';
        key.dataset.note=pitch;
        key.type='button';
        key.setAttribute('aria-label','Piano key'); // no pitch hint during sight reading
        if(black) {
            key.style.left=count*width-width*.29+'px';
            key.style.width=Math.round(width*.58)+'px';
        } else {
            key.style.flex='0 0 '+width+'px';
            count++;
        }
        key.onpointerdown=event=>{
            event.preventDefault(); event.stopPropagation();
            auditionInput(pitch);
        };
        bed.appendChild(key);
    }
}

function renderRound() {
    const ex=session.active;
    const svg=createScoreDocument({
        notes:ex.notes,durations:ex.durations,clef:ex.clef,
        title:independent?'Independent Reading · Fresh Melody':ex.title,bpm:ex.bpm
    });
    document.getElementById('audition-score').innerHTML=staticScoreSvg(svg);
    document.getElementById('audition-heading').textContent=independent ?
        'Read the Music Independently' : 'Pip’s First Concert';
    document.getElementById('audition-level').textContent=independent ?
        'Stationary score · no moving hints' : 'Discovery Level '+session.level;
    setActions(false);
    renderPiano(ex.notes);
    status(state.inputMode==='microphone'
        ? 'Listen and play the notes on your piano. The score will stay still.'
        : 'Use the piano keys below. No labels or moving targets; take your time.');
}

export async function startOpeningAdventure() {
    if(!state.currentUser||!canPlayToday())return;
    if(state.currentUser.placement?.status === 'provisional') {
        const {startGame}=await import('./game.js');
        startGame('practice');
    } else startAudition(false);
}

export async function startIndependentReader() {
    if(!state.currentUser||!canPlayToday())return;
    return startAudition(true);
}

async function startAudition(asIndependent) {
    stopMicrophone();
    independent=asIndependent;
    session=beginAudition(state.currentUser,state.currentClef);
    if(independent) {
        session.level=Math.max(3,Math.min(6,state.currentUser.readingLevel??4));
        session.active=auditionExercise(session.level,session.clef,session.nonce,session.profileId);
    }
    running=true;
    state.game.phase='playing'; // active time counts even without touch events
    state.game.mode=independent?'independent':'audition';
    showScreen('screen-audition');
    renderRound();

    if(state.inputMode==='microphone') {
        try {
            await startMicrophone({
                onNote:event=>{if(running)auditionInput(midiToNote(event.midiNote));},
                onError:()=>{status('Microphone unavailable. Use on-screen piano keys.');}
            });
        }catch {
            state.inputMode='touch';
            renderPiano(session.active.notes);
            status('Microphone not available. You can continue with the touch piano.');
        }
    }
}
export function auditionInput(note) {
    if(!running||!session||session.index>=session.active.notes.length)return;
    const result=submitAuditionNote(session,note);
    if(result.done) {
        finishAuditionRound(session);
        setActions(true);
        status(independent?'You played the whole stationary score. Well done!':
            'Beautiful effort! Try a new challenge or finish your first concert.');
    } else if(result.status==='retry' && !independent) {
        status('Keep listening and reading. You can try again or skip this note.');
    }
}

export function auditionSkipNote() {
    if(!running||!session)return;
    skipAuditionNote(session);
    if(session.index>=session.active.notes.length) {
        finishAuditionRound(session);
        setActions(true);
        status('Melody complete. Your next level is a new musical adventure!');
    }
}

export function auditionHarder() {
    if(!running||!session||session.index<session.active.notes.length)return;
    nextAuditionRound(session,{stretch:true});
    renderRound();
}

export function auditionFinish() {
    if(!running||!session||session.index<session.active.notes.length)return;
    if(!independent) {
        const placed=finalizeAudition(session,state.currentUser);
        saveCurrentUser();
        status('We found a great starting point at Reading Level '+placed.level+'!');
    }
    closeAudition();
}

export function closeAudition() {
    if(!running)return;
    running=false;
    stopMicrophone();
    state.game.phase='idle';
    session=null;
    showScreen('screen-landing');
    updateLanding();
}

export function auditionTimeUp() {
    if(!running)return false;
    // Incomplete audition/check cannot lower a child's level or score.
    if(!independent && session && session.rounds.length) {
        state.currentUser.placement.status='incomplete';
        state.currentUser.placement.results=session.rounds;
        saveCurrentUser();
    }
    closeAudition();
    showTimeUpOverlay();
    return true;
}
