import { initAudio } from './js/audio.js';
import { 
    showScreen, showNewUserForm, hideNewUserForm, generateName, 
    selectAvatar, setRegDiff, setClef, goToStore, goToSongs, 
    updateLanding, showScreen as showScreenAlias,
    handleNewUserClick, handleUserDelete, showParentPanel, hideParentPanel, handleAddCredit,
    parentSetTimeAllowance, parentGrantMusicTime,
    loadUsers, handleCreateUserUI, handleLogoutUI
} from './js/ui.js';
import { startGame, exitGame, beginRound, updateNotePosition, onPlayTimeExpired, togglePhraseHints, pauseMusicSession, resumeMusicSession } from './js/game.js';
import { state, setHitX } from './js/state.js';
import { workshopAction, hearWorkshopSound } from './js/workshop-ui.js';
import { pausePlayBudget, resumePlayBudget, touchPlayBudget, resumeFromIdle, onPlaytimeExpired,
    deactivatePlayBudget, hideTimeUpOverlay } from './js/app-budget.js';
import {
    startOpeningAdventure, startIndependentReader, closeAudition,
    auditionSkipNote, auditionHarder, auditionAnother, auditionFinish, auditionTimeUp,
    auditionStartFresh
} from './js/audition-ui.js';
import {
    openMicrophoneSetup, closeMicrophoneSetup, confirmMicrophoneSetup,
    useTouchInput, syncInputModeUI, restoreMicTimingAdjustment, setMicTimingAdjustment
} from './js/mic-ui.js';

// --- Global Initialization ---

function handleResize() {
    const width = window.innerWidth;
    
    if(width < 600) {
        setHitX(150);
    } else {
        setHitX(300);
    }

    if(document.getElementById('screen-game').classList.contains('active')) {
        updateNotePosition(); 
    }
}

window.initAudio = () => {
    initAudio();
    document.getElementById('overlay-start').style.display = 'none';
    
    handleResize();

    loadUsers();
    restoreMicTimingAdjustment();
    syncInputModeUI();
    showScreen('screen-register');
};

// Admin Functions
window.handleNewUserClick = handleNewUserClick;
window.handleUserDelete = handleUserDelete;
window.showParentPanel = showParentPanel;
window.hideParentPanel = hideParentPanel;
window.handleAddCredit = handleAddCredit;
window.parentSetTimeAllowance = parentSetTimeAllowance;
window.parentGrantMusicTime = parentGrantMusicTime;
window.resumeFromIdle = resumeFromIdle;

window.showNewUserForm = showNewUserForm;
window.hideNewUserForm = hideNewUserForm;
window.generateName = generateName;

window.selectAvatar = (emoji, target) => {
    document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
    if(target) target.classList.add('selected');
    selectAvatar(emoji);
};

window.setRegDiff = (lvl, el) => {
    document.querySelectorAll('.toggle-group .toggle-opt').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    setRegDiff(lvl);
};

window.createUser = handleCreateUserUI; 
window.logout = () => {
    pausePlayBudget();
    closeAudition();
    closeMicrophoneSetup();
    useTouchInput(false);
    handleLogoutUI();
    hideTimeUpOverlay();
};

window.setClef = setClef;
window.goToStore = goToStore;
window.workshopAction = workshopAction;
window.hearWorkshopSound = hearWorkshopSound;
window.startGame = startGame;
window.togglePhraseHints = togglePhraseHints;
window.goToSongs = goToSongs;
window.showScreen = showScreenAlias;
window.exitGame = exitGame;
window.beginRound = beginRound;
window.pauseMusicSession = pauseMusicSession;
window.resumeMusicSession = resumeMusicSession;
window.updateLanding = updateLanding;
window.openMicrophoneSetup = openMicrophoneSetup;
window.closeMicrophoneSetup = closeMicrophoneSetup;
window.confirmMicrophoneSetup = confirmMicrophoneSetup;
window.useTouchInput = useTouchInput;
window.setMicTimingAdjustment = setMicTimingAdjustment;
window.startOpeningAdventure = startOpeningAdventure;
window.startIndependentReader = startIndependentReader;
window.closeAudition = closeAudition;
window.auditionSkipNote = auditionSkipNote;
window.auditionHarder = auditionHarder;
window.auditionAnother = auditionAnother;
window.auditionFinish = auditionFinish;
window.auditionStartFresh = auditionStartFresh;

onPlaytimeExpired(() => {
    if(!auditionTimeUp()) onPlayTimeExpired();
});
document.addEventListener('pointerdown', touchPlayBudget, { passive: true });
document.addEventListener('keydown', touchPlayBudget, { passive: true });
document.addEventListener('visibilitychange', () => {
    if(document.hidden) {
        pausePlayBudget();
        closeMicrophoneSetup();
        if(document.getElementById('screen-game').classList.contains('active')) pauseMusicSession();
        if(document.getElementById('screen-audition').classList.contains('active')) closeAudition();
        useTouchInput(false);
    } else {
        if(state.game.phase!=='paused'&&state.game.phase!=='resuming')
            resumePlayBudget();
    }
});
window.addEventListener('pagehide', pausePlayBudget);

window.addEventListener('resize', handleResize);
handleResize();
