function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    document.getElementById('overlay-start').style.display = 'none';
    
    window.addEventListener('resize', handleResize);
    handleResize();

    loadUsers();
    showScreen('screen-register');
}

function playTone(note, type='good', overrideInst=null) {
    if(!audioCtx) return;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    let instConfig = overrideInst || INSTRUMENTS[currentInstKey] || INSTRUMENTS['piano'];
    let freq = FREQUENCIES[note] || 440; 

    if(type === 'bad') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime+0.3);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime+0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime+0.3);
    } else {
        osc.type = instConfig.type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + instConfig.decay);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + instConfig.decay);
    }
}

function playRun(instKey) {
    const key = instKey || currentInstKey;
    const config = INSTRUMENTS[key];
    const notes = ['C4','D4','E4','F4','G4'];
    notes.forEach((n, i) => {
        setTimeout(() => playTone(n, 'run', config), i * 120);
    });
}
