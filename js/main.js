import { initAudio } from './js/audio.js';
import { loadUsers, createUser, loginUser, deleteUser, logout } from './js/storage.js';
import { 
    showScreen, showNewUserForm, hideNewUserForm, generateName, 
    selectAvatar, setRegDiff, setClef, goToStore, goToSongs, 
    updateLanding, showScreen as showScreenAlias 
} from './js/ui.js';
import { startGame, exitGame, beginRound, updateNotePosition } from './js/game.js';
import { state, setHitX } from './js/state.js';

// --- Global Initialization ---

function handleResize() {
    const width = window.innerWidth;
    const oldHit = state.HIT_X;
    
    // If mobile portrait (approx), move hit point left so notes are visible
    if(width < 600) {
        setHitX(150);
    } else {
        setHitX(300);
    }

    // If the game is currently active, we need to adjust the clef and note positions dynamically
    if(oldHit !== state.HIT_X && document.getElementById('screen-game').classList.contains('active')) {
        const xPos = state.HIT_X - 130 < 20 ? 20 : state.HIT_X - 130;
        const treble = document.getElementById('clef-treble-svg');
        const bass = document.getElementById('clef-bass-svg');
        if(treble) treble.setAttribute('transform', `translate(${xPos}, 110) scale(1.6)`);
        if(bass) bass.setAttribute('transform', `translate(${xPos}, 115) scale(2.0)`);
        
        updateNotePosition(); 
    }
}

// Attach functions to window so HTML 'onclick' attributes can see them
window.initAudio = () => {
    initAudio();
    document.getElementById('overlay-start').style.display = 'none';
    
    // Setup Resize Listener
    window.addEventListener('resize', handleResize);
    handleResize();

    loadUsers();
    showScreen('screen-register');
};

window.showNewUserForm = showNewUserForm;
window.hideNewUserForm = hideNewUserForm;
window.generateName = generateName;

window.selectAvatar = (emoji) => {
    // Add visual selection logic (handling the class toggle here to keep UI logic simple)
    document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
    
    // The event target might be the div or the text inside it
    // We check if the click target or its parent has the right class
    const target = event.target.closest('.emoji-opt');
    if(target) target.classList.add('selected');
    
    selectAvatar(emoji);
};

window.setRegDiff = (lvl, el) => {
    // Visual update
    document.querySelectorAll('.toggle-group .toggle-opt').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    setRegDiff(lvl);
};

window.createUser = createUser;
window.loginUser = loginUser; // Note: loadUsers adds listeners, but this is kept for completeness
window.deleteUser = deleteUser;
window.logout = logout;
window.setClef = setClef;
window.goToStore = goToStore;
window.startGame = startGame;
window.goToSongs = goToSongs;
window.showScreen = showScreenAlias;
window.exitGame = exitGame;
window.beginRound = beginRound;

// Init resize listener immediately so layout is correct on initial load
window.addEventListener('resize', handleResize);
handleResize();
