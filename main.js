import { initAudio } from './js/audio.js';
import { 
    showScreen, showNewUserForm, hideNewUserForm, generateName, 
    selectAvatar, setRegDiff, setClef, goToStore, goToSongs, 
    updateLanding, showScreen as showScreenAlias,
    handleNewUserClick, handleUserDelete, showParentPanel, hideParentPanel, handleAddCredit,
    loadUsers, handleCreateUserUI, handleLogoutUI
} from './js/ui.js';
import { startGame, exitGame, beginRound, updateNotePosition } from './js/game.js';
import { state, setHitX } from './js/state.js';
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
    closeMicrophoneSetup();
    useTouchInput();
    handleLogoutUI();
};

window.setClef = setClef;
window.goToStore = goToStore;
window.startGame = startGame;
window.goToSongs = goToSongs;
window.showScreen = showScreenAlias;
window.exitGame = exitGame;
window.beginRound = beginRound;
window.updateLanding = updateLanding;
window.openMicrophoneSetup = openMicrophoneSetup;
window.closeMicrophoneSetup = closeMicrophoneSetup;
window.confirmMicrophoneSetup = confirmMicrophoneSetup;
window.useTouchInput = useTouchInput;
window.setMicTimingAdjustment = setMicTimingAdjustment;

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    // Never leave the microphone active in the background.
    closeMicrophoneSetup();
    if (document.getElementById('screen-game').classList.contains('active')) {
        exitGame();
    }
    useTouchInput();
});

window.addEventListener('resize', handleResize);
handleResize();
