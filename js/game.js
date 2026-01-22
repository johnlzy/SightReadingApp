/* --- GAME ENGINE --- */

function handleResize() {
    const width = window.innerWidth;
    const oldHit = HIT_X;
    
    // If mobile portrait (approx), move hit point left so notes are visible
    if(width < 600) {
        HIT_X = 150;
    } else {
        HIT_X = 300;
    }

    if(oldHit !== HIT_X && document.getElementById('screen-game').classList.contains('active')) {
        positionClefs();
        updateNotePosition(); 
    }
}

function positionClefs() {
    const xPos = HIT_X - 130 < 20 ? 20 : HIT_X - 130;
    document.getElementById('clef-treble-svg').setAttribute('transform', `translate(${xPos}, 110) scale(1.6)`);
    document.getElementById('clef-bass-svg').setAttribute('transform', `translate(${xPos}, 115) scale(2.0)`);
}

function startGame(mode, songIdx=null) {
    game.mode = mode;
    game.songId = songIdx;
    game.coins = 0;
    game.idx = 0;
    game.mistakes = 0;
    document.getElementById('game-coins').innerText = 0;
    document.getElementById('game-timer').innerText = 0;
    document.getElementById('game-start-overlay').style.display = 'flex';
    
    showScreen('screen-game');
    handleResize(); // Ensure hit point is correct
    
    // RESET NOTE POSITION
    const noteGroup = document.getElementById('notes-group');
    noteGroup.classList.remove('animate-scroll'); 
    updateNotePosition(); // Set initial transform
    
    // Force Reflow
    void noteGroup.offsetWidth; 
    noteGroup.classList.add('animate-scroll'); 
    
    generateNotes();
    renderSheet();
    renderKeyboard();
}

function updateNotePosition() {
    // Current note index moves to HIT_X
    const trans = HIT_X - (game.idx * 120);
    document.getElementById('notes-group').style.transform = `translateX(${trans}px)`;
}

function generateNotes() {
    game.notes = [];
    const octave = currentClef === 'treble' ? 4 : 3;
    
    if(game.mode === 'song') {
        const raw = SONG_DB[game.songId].notes;
        game.notes = raw.map(n => {
            if(currentClef === 'bass') return n.replace('5','4').replace('4','3');
            return n;
        });
    } else {
        const count = 15 + Math.floor(Math.random()*10);
        const pool = [];
        if(currentUser.difficulty === 'easy') {
            ['C','D','E','F','G'].forEach(n => pool.push(n+octave));
        } else if(currentUser.difficulty === 'medium') {
            ['C','D','E','F','G','A','B'].forEach(n => pool.push(n+octave));
            pool.push('C'+(octave+1));
        } else {
            ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].forEach(n => pool.push(n+octave));
            pool.push('C'+(octave+1));
        }
        for(let i=0; i<count; i++) {
            game.notes.push(pool[Math.floor(Math.random()*pool.length)]);
        }
    }
}

function renderSheet() {
    const svg = document.getElementById('notes-group');
    const trebleSvg = document.getElementById('clef-treble-svg');
    const bassSvg = document.getElementById('clef-bass-svg');
    svg.innerHTML = '';
    
    // Toggle Clef Visibility
    if(currentClef === 'treble') {
        trebleSvg.style.display = 'block';
        bassSvg.style.display = 'none';
    } else {
        trebleSvg.style.display = 'none';
        bassSvg.style.display = 'block';
    }
    
    positionClefs();

    game.notes.forEach((note, i) => {
        let y = 0;
        if(currentClef==='treble') y = TREBLE_Y[note] || 220;
        else y = BASS_Y[note] || 100;
        
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute('transform', `translate(${i*120}, ${y})`); 
        g.setAttribute('class', `note ${i===0?'current':'inactive'}`);
        g.setAttribute('id', `note-${i}`);
        
        let needsLine = false;
        if(currentClef==='treble' && note==='C4') needsLine=true;
        if(currentClef==='bass' && (note==='C4'||note==='E5')) needsLine=true;
        
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
        g.appendChild(oval);

        const stem = document.createElementNS("http://www.w3.org/2000/svg", "line");
        stem.setAttribute('stroke', '#000');
        stem.setAttribute('stroke-width', 2);
        if(y < 160) {
            stem.setAttribute('x1', -11); stem.setAttribute('y1', 0);
            stem.setAttribute('x2', -11); stem.setAttribute('y2', 50);
        } else {
            stem.setAttribute('x1', 11); stem.setAttribute('y1', 0);
            stem.setAttribute('x2', 11); stem.setAttribute('y2', -50);
        }
        g.appendChild(stem);

        if(note.includes('#')) {
            const sh = document.createElementNS("http://www.w3.org/2000/svg", "text");
            sh.innerHTML = '♯';
            sh.setAttribute('x', -30); sh.setAttribute('y', 10);
            sh.setAttribute('font-size', '30');
            g.appendChild(sh);
        }
        svg.appendChild(g);
    });
}

function renderKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    const octave = currentClef === 'treble' ? 4 : 3;
    const whites = ['C','D','E','F','G','A','B','C'];
    
    whites.forEach((w, i) => {
        const k = document.createElement('div');
        k.className = 'white-key';
        const n = w + (i===7 ? octave+1 : octave);
        k.dataset.note = n;
        k.innerText = n;
        k.onclick = () => handleInput(n, k);
        // Better touch handling
        k.ontouchstart = (e) => { e.preventDefault(); handleInput(n, k); };
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
        k.onclick = (e) => { e.stopPropagation(); handleInput(n, k); };
        k.ontouchstart = (e) => { e.preventDefault(); e.stopPropagation(); handleInput(n, k); };
        kb.appendChild(k);
    });
}

function beginRound() {
    document.getElementById('game-start-overlay').style.display = 'none';
    game.startTime = Date.now();
    game.noteTime = Date.now();
    game.timerInt = setInterval(() => {
        const t = Math.floor((Date.now() - game.startTime)/1000);
        document.getElementById('game-timer').innerText = t;
    }, 1000);
}

function handleInput(note, el) {
    if(document.getElementById('game-start-overlay').style.display !== 'none') return;
    
    const target = game.notes[game.idx];
    
    if(note === target) {
        el.classList.add('active');
        setTimeout(()=>el.classList.remove('active'), 100);
        playTone(note, 'good');
        
        const dt = (Date.now() - game.noteTime) / 1000;
        let earned = 0;
        if(game.mode === 'coin') {
            earned = 1;
            if(dt < 0.5) earned = 5;
            else if(dt < 1.5) earned = 3;
            else if(dt < 2.5) earned = 2;
            game.coins += earned;
            document.getElementById('game-coins').innerText = game.coins;
            
            const float = document.createElement('div');
            float.className = 'feedback-anim';
            float.innerText = `+${earned}`;
            float.style.left = el.getBoundingClientRect().left + 'px';
            float.style.top = (el.getBoundingClientRect().top - 50) + 'px';
            document.body.appendChild(float);
            setTimeout(()=>float.remove(), 1000);
        }

        const currSvg = document.getElementById(`note-${game.idx}`);
        currSvg.classList.remove('current');
        currSvg.classList.add('inactive');
        
        game.idx++;
        game.noteTime = Date.now();
        updateNotePosition();

        if(game.idx >= game.notes.length) {
            endGame();
        } else {
            const next = document.getElementById(`note-${game.idx}`);
            next.classList.remove('inactive');
            next.classList.add('current');
        }
        
    } else {
        playTone(note, 'bad');
        el.classList.add('wrong');
        setTimeout(()=>el.classList.remove('wrong'), 300);
        game.mistakes++;
    }
}

function endGame() {
    clearInterval(game.timerInt);
    const totalTime = parseFloat(((Date.now() - game.startTime)/1000).toFixed(1));
    let finalCoins = game.coins;
    let msg = "";

    // Score Saving Logic
    if(!currentUser.scores) currentUser.scores = { coin: { easy:[], medium:[], hard:[] }, songs: {} };
    
    if(game.mode === 'coin') {
        // Only save coin run times if they finished
        const arr = currentUser.scores.coin[currentUser.difficulty];
        arr.push(totalTime);
        arr.sort((a,b) => a - b); // Ascending (lower is better)
        if(arr.length > 5) arr.length = 5; // Keep top 5
        
        let bonus = 0;
        if(totalTime < 15) bonus = 25;
        else if(totalTime < 30) bonus = 15;
        else if(totalTime < 45) bonus = 5;
        finalCoins += bonus;
        if(bonus>0) msg = `Speed Bonus: +${bonus}!`;
        
    } else {
        if(game.mistakes === 0) {
            // Only save song times if perfect
            if(!currentUser.scores.songs[game.songId]) currentUser.scores.songs[game.songId] = [];
            const arr = currentUser.scores.songs[game.songId];
            arr.push(totalTime);
            arr.sort((a,b) => a - b);
            if(arr.length > 5) arr.length = 5;

            const s = SONG_DB[game.songId];
            if(game.songId === currentUser.unlockedSongs) {
                finalCoins = s.reward;
                currentUser.unlockedSongs++;
                msg = "Perfect! Song Unlocked!";
            } else if(game.songId < currentUser.unlockedSongs) {
                msg = "Good practice! (Already rewarded)";
                finalCoins = 0;
            }
        } else {
            msg = "Try again for a perfect score to get coins!";
            finalCoins = 0;
        }
    }
    
    if(currentClef==='treble') currentUser.tCoins += finalCoins;
    else currentUser.bCoins += finalCoins;
    saveCurrentUser();
    
    document.getElementById('res-time').innerText = totalTime;
    document.getElementById('res-coins').innerText = finalCoins;
    document.getElementById('res-msg').innerText = msg;
    
    renderHighScores();
    showScreen('screen-result');
    playRun();
}

function renderHighScores() {
    const list = document.getElementById('high-score-list');
    const label = document.getElementById('score-category-label');
    list.innerHTML = '';
    
    let scores = [];
    if(game.mode === 'coin') {
        label.innerText = `Coin Run - ${currentUser.difficulty.toUpperCase()} Mode`;
        scores = currentUser.scores.coin[currentUser.difficulty];
    } else {
        label.innerText = `Song: ${SONG_DB[game.songId].title}`;
        scores = currentUser.scores.songs[game.songId] || [];
    }

    if(scores.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding:10px;">No records yet.</div>';
    } else {
        scores.forEach((s, i) => {
            const div = document.createElement('div');
            div.className = 'score-row';
            div.innerHTML = `
                <span style="font-weight:bold; color:${i===0?'gold':'#555'}">#${i+1}</span>
                <span>${s}s</span>
            `;
            list.appendChild(div);
        });
    }
}

function exitGame() {
    clearInterval(game.timerInt);
    showScreen('screen-landing');
    updateLanding();
}
