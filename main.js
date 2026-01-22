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

// --- Global Initialization ---

function handleResize() {
    const width = window.innerWidth;
    
    // Update the global HIT_X based on screen width
    if(width < 600) {
        setHitX(150);
    } else {
        setHitX(300);
    }

    // FIX: Always update the SVG transforms if the game screen is active.
    // Updated scale factors for the new, high-res paths.
    if(document.getElementById('screen-game').classList.contains('active')) {
        const xPos = state.HIT_X - 130 < 20 ? 20 : state.HIT_X - 130;
        const treble = document.getElementById('clef-treble-svg');
        const bass = document.getElementById('clef-bass-svg');
        
        // Apply the correct scale and position for the game view (New standard paths)
        if(treble) treble.setAttribute('transform', `translate(${xPos}, 110) scale(0.8)`);
        if(bass) bass.setAttribute('transform', `translate(${xPos}, 115) scale(0.9)`);
        
        updateNotePosition(); 
    }
}

window.initAudio = () => {
    initAudio();
    document.getElementById('overlay-start').style.display = 'none';
    
    window.addEventListener('resize', handleResize);
    handleResize();

    loadUsers(); 
    showScreen('screen-register');
};

// NEW: Protected/Admin Functions
window.handleNewUserClick = handleNewUserClick;
window.handleUserDelete = handleUserDelete;
window.showParentPanel = showParentPanel;
window.hideParentPanel = hideParentPanel;
window.handleAddCredit = handleAddCredit;

window.showNewUserForm = showNewUserForm;
window.hideNewUserForm = hideNewUserForm;
window.generateName = generateName;

window.selectAvatar = (emoji) => {
    document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
    const target = event.target.closest('.emoji-opt');
    if(target) target.classList.add('selected');
    selectAvatar(emoji);
};

window.setRegDiff = (lvl, el) => {
    document.querySelectorAll('.toggle-group .toggle-opt').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    setRegDiff(lvl);
};

window.createUser = handleCreateUserUI; 
window.logout = handleLogoutUI;

window.setClef = setClef;
window.goToStore = goToStore;
window.startGame = startGame;
window.goToSongs = goToSongs;
window.showScreen = showScreenAlias;
window.exitGame = exitGame;
window.beginRound = beginRound;
window.updateLanding = updateLanding;

window.addEventListener('resize', handleResize);
// Initial call
handleResize();
