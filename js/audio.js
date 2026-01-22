import { state, setAudioCtx } from './state.js';
import { FREQUENCIES, INSTRUMENTS } from './config.js';

export function initAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    setAudioCtx(ctx);
    return ctx;
}

export function playTone(note, type='good', overrideInst=null) {
    const audioCtx = state.audioCtx;
    if(!audioCtx) return;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    let instConfig = overrideInst || INSTRUMENTS[state.currentInstKey] || INSTRUMENTS['piano'];
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

// New: Metronome Click
export function playClick() {
    const audioCtx = state.audioCtx;
    if(!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
    osc.type = 'square';
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

export function playRun(instKey) {
    const key = instKey || state.currentInstKey;
    const config = INSTRUMENTS[key];
    const notes = ['C4','D4','E4','F4','G4'];
    notes.forEach((n, i) => {
        setTimeout(() => playTone(n, 'run', config), i * 120);
    });
}
