/**
 * Shared application state
 */
export const state = {
    audioCtx: null,
    currentUser: null,
    currentClef: 'treble',
    currentInstKey: 'piano',
    inputMode: 'touch', // 'touch' or 'microphone'; no hardware keyboard dependency
    micTimingAdjustmentMs: 0, // additional device delay compensation in milliseconds
    
    // Game Session State
game: { 
        mode: 'coin',
        phase: 'idle', // idle | ready | countdown | playing | finished
        sessionToken: 0, 
        notes: [],
        durations: [],
        idx: 0, 
        startTime: 0, 
        noteTime: 0, 
        coins: 0, 
        timerInt: null,
        countdownTimeout: null,
        animFrame: null,
        metronomeInt: null,
        nextBeatTime: 0,
        songId: -1, 
        mistakes: 0,
        hits: 0,
        pitchCorrect: 0,
        pitchErrors: 0,
        pitchMisses: 0,
        pitchRecordedIndex: -1,
        rhythmOnTime: 0,
        rhythmPerfect: 0,
        rhythmGood: 0,
        rhythmEarly: 0,
        rhythmLate: 0,
        rhythmMisses: 0,
        absoluteOnsetErrorMs: 0,
        noteTimingIssue: null,
        noteWrongCount: 0,
        noteStartedAt: 0,
        noteRhythmGrade: null,
        outcomes: [],
        exerciseKind: null,
        
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
