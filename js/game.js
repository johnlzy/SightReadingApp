function handleResize() {
    HIT_X = window.innerWidth < 600 ? 150 : 300;
    if(document.getElementById('screen-game').classList.contains('active')) {
        positionClefs();
        updateNotePosition(); 
    }
}

function startGame(mode, songIdx=null) {
    game = { mode, songId: songIdx, coins: 0, idx: 0, mistakes: 0, startTime: 0, noteTime: 0 };
    document.getElementById('game-start-overlay').style.display = 'flex';
    showScreen('screen-game');
    handleResize();
    generateNotes();
    renderSheet();
    renderKeyboard();
}

function updateNotePosition() {
    const trans = HIT_X - (game.idx * 120);
    document.getElementById('notes-group').style.transform = `translateX(${trans}px)`;
}

function handleInput(note, el) {
    const target = game.notes[game.idx];
    if(note === target) {
        playTone(note, 'good');
        game.idx++;
        updateNotePosition();
        if(game.idx >= game.notes.length) endGame();
    } else {
        playTone(note, 'bad');
        game.mistakes++;
    }
}

function endGame() {
    clearInterval(game.timerInt);
    const totalTime = parseFloat(((Date.now() - game.startTime)/1000).toFixed(1));
    // Calculate rewards and save
    saveCurrentUser();
    showScreen('screen-result');
}
