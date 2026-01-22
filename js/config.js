/* js/config.js */
const FREQUENCIES = {
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'E5': 659.25 
};

const TREBLE_Y = { 'C4':220, 'D4':210, 'E4':200, 'F4':190, 'G4':180, 'A4':170, 'B4':160, 'C5':150 };
const BASS_Y = { 'C3':170, 'D3':160, 'E3':150, 'F3':140, 'G3':130, 'A3':120, 'B3':110, 'C4':100 };

const INSTRUMENTS = {
    'piano': { name: 'Piano 🎹', price: 0, type: 'triangle', decay: 0.8 },
    'violin': { name: 'Violin 🎻', price: 15, type: 'sawtooth', decay: 1.2 },
    'flute': { name: 'Flute 🪈', price: 30, type: 'sine', decay: 0.6 },
    'trumpet': { name: 'Trumpet 🎺', price: 60, type: 'square', decay: 0.8 },
    'harp': { name: 'Harp 🧚‍♀️', price: 120, type: 'sine', decay: 1.5 },
    'synth': { name: 'Synth 👾', price: 240, type: 'sawtooth', decay: 0.3 },
    'cello': { name: 'Cello 🎻', price: 15, type: 'sawtooth', decay: 1.5 },
    'tuba': { name: 'Tuba 🎺', price: 30, type: 'square', decay: 1.0 },
    'bassoon': { name: 'Bassoon 🥢', price: 60, type: 'triangle', decay: 0.9 },
    'drum': { name: 'Timpani 🥁', price: 120, type: 'sine', decay: 0.4 },
    'bassg': { name: 'Bass Gt 🎸', price: 240, type: 'square', decay: 0.7 }
};

const SONG_DB = [
    { title: "Twinkle Twinkle", reward: 10, notes: ["C4","C4","G4","G4","A4","A4","G4","F4","F4","E4","E4","D4","D4","C4","G4","G4","F4","F4","E4","E4","D4","G4","G4","F4","F4","E4","E4","D4","C4","C4","G4","G4","A4","A4","G4","F4","F4","E4","E4","D4","D4","C4"] },
    { title: "Mary Had a Little Lamb", reward: 20, notes: ["E4","D4","C4","D4","E4","E4","E4","D4","D4","D4","E4","G4","G4","E4","D4","C4","D4","E4","E4","E4","E4","D4","D4","E4","D4","C4"] },
];

/* GLOBAL STATE */
let audioCtx;
let currentUser = null;
let currentClef = 'treble';
let currentInstKey = 'piano';
let game = { mode: 'coin', notes: [], idx: 0, startTime: 0, noteTime: 0, coins: 0, timerInt: null, songId: -1, mistakes: 0 };
let HIT_X = 300; 
let tempUser = { avatar:'🐱', diff:'easy', name:'' };

/* PARENTAL CONTROL */
const PARENT_PIN = "123456";
const DAILY_CREDITS = 8;
