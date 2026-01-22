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
        mode: 'coin', // 'coin' or 'song'
        notes: [], 
        idx: 0, 
        startTime: 0, 
        noteTime: 0, 
        coins: 0, 
        timerInt: null, 
        songId: -1, 
        mistakes: 0 
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
