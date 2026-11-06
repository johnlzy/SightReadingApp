import { initAudio } from './js/audio.js';
import { 
    showScreen, setHomeTab, changeSongPage, showNewUserForm, hideNewUserForm, generateName, 
    selectAvatar, setRegDiff, setClef, goToStore, goToSongs, 
    updateLanding, showScreen as showScreenAlias,
    handleNewUserClick, handleUserDelete, showParentPanel, hideParentPanel, handleAddCredit,
    parentSetTimeAllowance, parentGrantMusicTime,
    loadUsers, handleCreateUserUI, handleLogoutUI
} from './js/ui.js';
import { startGame, exitGame, beginRound, updateNotePosition, onPlayTimeExpired, togglePhraseHints, changePhrasePage, pauseMusicSession, resumeMusicSession, toggleKeyboardSize, panKeyboard } from './js/game.js';
import { gameHitLineX } from './js/playback-geometry.js';
import { state, setHitX } from './js/state.js';
import { workshopAction, hearWorkshopSound, changeWorkshopPage } from './js/workshop-ui.js';
import { pausePlayBudget, resumePlayBudget, touchPlayBudget, resumeFromIdle, onPlaytimeExpired,
    deactivatePlayBudget, hideTimeUpOverlay } from './js/app-budget.js';
import {
    startOpeningAdventure, startIndependentReader, closeAudition,
    auditionSkipNote, auditionHarder, auditionAnother, auditionFinish, auditionTimeUp,
    auditionStartFresh, startGrandStaffReader, grandTurnPage, finishGrandScore
} from './js/audition-ui.js';
import {
    openMicrophoneSetup, closeMicrophoneSetup, confirmMicrophoneSetup,
    useTouchInput, syncInputModeUI, restoreMicTimingAdjustment, setMicTimingAdjustment
} from './js/mic-ui.js';

// --- Global Initialization ---

function handleResize() {
    const staff=document.getElementById('music-svg');
    const rect=staff?.getBoundingClientRect();
    const width=rect?.width || window.innerWidth;
    const height=rect?.height || Math.max(180,window.innerHeight*0.48);
    setHitX(gameHitLineX(width,height));

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
window.changeWorkshopPage = changeWorkshopPage;
window.hearWorkshopSound = hearWorkshopSound;
window.startGame = startGame;
window.toggleKeyboardSize = toggleKeyboardSize;
window.panKeyboard = panKeyboard;
window.togglePhraseHints = togglePhraseHints;
window.changePhrasePage = changePhrasePage;
window.goToSongs = goToSongs;
window.changeSongPage = changeSongPage;
window.setHomeTab = setHomeTab;
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
window.startGrandStaffReader = startGrandStaffReader;
window.grandTurnPage = grandTurnPage;
window.finishGrandScore = finishGrandScore;

onPlaytimeExpired(() => {
    if(!auditionTimeUp()) onPlayTimeExpired();
});
document.addEventListener('pointerdown', touchPlayBudget, { passive: true });
document.addEventListener('keydown', touchPlayBudget, { passive: true });
document.addEventListener('visibilitychange', () => {
    if(document.hidden) {
        pausePlayBudget();
        closeMicrophoneSetup();
        const gameActive=document.getElementById('screen-game').classList.contains('active');
        if(gameActive) pauseMusicSession(); // stops tracks, preserves selected mic mode
        if(document.getElementById('screen-audition').classList.contains('active')) closeAudition();
        // Do not silently switch a real-piano child to touch during a paused
        // game. Resume must be able to re-request mic permission on gesture.
        if(!gameActive) useTouchInput(false);
    } else {
        if(state.game.phase!=='paused'&&state.game.phase!=='resuming')
            resumePlayBudget();
    }
});
window.addEventListener('pagehide', pausePlayBudget);

window.addEventListener('resize', handleResize);
handleResize();
