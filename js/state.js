/**
 * Shared application state
 */
export const state = {
    audioCtx: null,
    currentUser: null,
    currentClef: 'treble',
    currentInstKey: 'piano',
    
    // Game Session State
game: { 
        mode: 'coin', 
        notes: [],
        durations: [],
        idx: 0, 
        startTime: 0, 
        noteTime: 0, 
        coins: 0, 
        timerInt: null,
        metronomeInt: null,
        nextBeatTime: 0,
        songId: -1, 
        mistakes: 0,
        hits: 0, // <--- Added this property
        
        lastNotes: [],
        lastDurations: []
    },
    
    // Temporary registration state
    tempUser: { 
        avatar: '🐱', 
        diff: 'easy', 
        name: '' 
    },

    // Responsive hit position (updated on resize)
    HIT_X: 300
};

// Simple setter for audio context to allow initializing it from audio.js
export function setAudioCtx(ctx) {
    state.audioCtx = ctx;
}

// Setter for Hit X
export function setHitX(val) {
    state.HIT_X = val;
}
