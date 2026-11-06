import { state } from './state.js';
import { keyboardNotesFor, midiToNote } from './music.js';
import { createScoreDocument, staticScoreSvg } from './score.js';
import { beginAudition, auditionExercise, submitAuditionNote, skipAuditionNote,
    finishAuditionRound, nextAuditionRound, finalizeAudition } from './audition.js';
import { startMicrophone, stopMicrophone } from './microphone.js';
import { saveCurrentUser } from './storage.js';
import { canPlayToday, showTimeUpOverlay } from './app-budget.js';
import { showScreen, updateLanding } from './ui.js';
import { snapshotAudition, restoreAudition } from './audition-draft.js';

let session = null;
let independent = false;
let running = false;
let startToken = 0;
function saveDraft() {
    if(independent || !state.currentUser || !session) return;
    state.currentUser.auditionDraft = snapshotAudition(session);
    saveCurrentUser();
}
function clearDraft() {
    if(!state.currentUser)return;
    state.currentUser.auditionDraft = null;
    saveCurrentUser();
}
function progressText() {
    if(!session)return '';
    const count = session.index;
    return count>=session.active.notes.length
        ? 'Phrase complete · choose a challenge or finish'
        : 'Note '+Math.min(8,count+1)+' of '+session.active.notes.length+
          ' · your concert is saved as you play';
}


function status(text) {
    const el=document.getElementById('audition-status');
    if(el) el.textContent=text;
}
function setActions(done) {
    document.getElementById('audition-actions').hidden = !done;
    document.getElementById('audition-progress').textContent = progressText();
}
function renderPiano(notes) {
    const el=document.getElementById('audition-keys');
    el.replaceChildren();
    el.classList.toggle('mic-mode',state.inputMode==='microphone');
    if(state.inputMode==='microphone') {
        el.textContent='🎤 Listening to your real piano';
        return;
    }
    const notesAvailable=keyboardNotesFor(notes,session.clef);
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
    const leave=document.querySelector('#screen-audition .top-bar button');
    if(leave) {
        leave.textContent=independent?'← Leave score':'💾 Save & Leave';
        leave.setAttribute('aria-label',independent?'Leave independent score':'Save and leave audition');
    }
    const restart=document.getElementById('audition-restart-btn');
    if(restart)restart.hidden=independent;
    const saveNote=document.getElementById('audition-save-note');
    if(saveNote)saveNote.hidden=independent;
    document.getElementById('audition-heading').textContent=independent ?
        'Read the Music Independently' : 'Pip’s First Concert';
    document.getElementById('audition-level').textContent=independent ?
        'Stationary score · no moving hints' : 'Discovery Level '+session.level;
    setActions(session.index>=session.active.notes.length);
    renderPiano(ex.notes);
    status(state.inputMode==='microphone'
        ? 'Listen and play the notes on your piano. The score will stay still.'
        : 'Use the piano keys below. No labels or moving targets; take your time.');
}

export async function startOpeningAdventure() {
    if(!state.currentUser||!canPlayToday())return;
    if(restoreAudition(state.currentUser,state.currentUser.auditionDraft)) {
        return startAudition(false); // resume the saved concert before regular practice
    }
    if(state.currentUser.placement?.status === 'provisional') {
        const {startGame}=await import('./game.js');
        startGame('practice');
    } else return startAudition(false);
}

export async function startIndependentReader() {
    if(!state.currentUser||!canPlayToday())return;
    return startAudition(true);
}

async function startAudition(asIndependent,{fresh=false}={}) {
    stopMicrophone();
    independent=asIndependent;
    const draft=(!independent && !fresh) ? state.currentUser?.auditionDraft : null;
    session=draft ? restoreAudition(state.currentUser,draft) : null;
    if(!session) session=beginAudition(state.currentUser,state.currentClef);
    if(independent) {
        session.level=Math.max(3,Math.min(6,state.currentUser.readingLevel??4));
        session.active=auditionExercise(session.level,session.clef,session.nonce,session.profileId);
    }
    running=true;
    const token=++startToken;
    state.game.phase='playing';
    state.game.mode=independent?'independent':'audition';
    showScreen('screen-audition');
    renderRound();
    if(draft && !independent) status('Welcome back! Continue where you left off — your earlier notes are saved.');
    if(!independent) saveDraft();

    if(state.inputMode==='microphone') {
        try {
            await startMicrophone({
                onNote:event=>{
                    if(running && token===startToken) auditionInput(midiToNote(event.midiNote));
                },
                onError:()=>{
                    if(running && token===startToken)status('Microphone unavailable. Use on-screen piano keys.');
                }
            });
        }catch {
            if(!running || token!==startToken)return;
            state.inputMode='touch';
            renderPiano(session.active.notes);
            status('Microphone not available. You can continue with the touch piano.');
        }
    }
}

/** Reassess after an existing placement, or deliberately restart a draft. */
export function auditionStartFresh() {
    if(!state.currentUser || !canPlayToday())return;
    if(state.currentUser.auditionDraft &&
        !confirm('Start a fresh concert? Your saved unfinished concert will be replaced.'))return;
    clearDraft();
    if(running) {
        ++startToken;
        stopMicrophone();
        running=false;
    }
    return startAudition(false,{fresh:true});
}

export function auditionInput(note) {
    if(!running||!session||session.index>=session.active.notes.length)return;
    const result=submitAuditionNote(session,note);
    if(!independent) saveDraft();
    if(result.done) {
        finishAuditionRound(session);
        setActions(true);
        status(independent?'You played the whole stationary score. Well done!':
            'Beautiful effort! Try a new challenge or finish your first concert.');
    } else if(result.status==='retry' && !independent) {
        status('Not quite — try again or skip this note. Your place is saved.');
    } else if(result.status==='correct' && !result.done && !independent) {
        status('Nice reading! Keep going at your own pace.');
    }
    if(result.status==='correct' && !result.done) setActions(false);
}

export function auditionSkipNote() {
    if(!running||!session)return;
    skipAuditionNote(session);
    if(!independent) saveDraft();
    if(session.index>=session.active.notes.length) {
        finishAuditionRound(session);
        setActions(true);
        status('Melody complete. Your next level is a new musical adventure!');
    }
}

export function auditionAnother() {
    if(!running||!session||session.index<session.active.notes.length)return;
    nextAuditionRound(session);
    if(!independent)saveDraft();
    renderRound();
}

export function auditionHarder() {
    if(!running||!session||session.index<session.active.notes.length)return;
    nextAuditionRound(session,{stretch:true});
    if(!independent) saveDraft();
    renderRound();
}

export function auditionFinish() {
    if(!running||!session||session.index<session.active.notes.length)return;
    if(!independent) {
        const placed=finalizeAudition(session,state.currentUser);
        clearDraft();
        saveCurrentUser();
        status('We found a great starting point at Reading Level '+placed.level+'!');
    }
    closeAudition();
}

export function closeAudition() {
    if(!running)return;
    if(!independent && session && !session.complete)saveDraft();
    running=false;
    ++startToken;
    stopMicrophone();
    state.game.phase='idle';
    session=null;
    showScreen('screen-landing');
    updateLanding();
}

export function auditionTimeUp() {
    if(!running)return false;
    // Incomplete audition/check cannot lower a child's level or score.
    // Time limits do not erase an audition or turn partial work into failure.
    // The saved draft is available after the parent grants time or tomorrow.
    closeAudition();
    showTimeUpOverlay();
    return true;
}
