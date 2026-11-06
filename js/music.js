const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function parseNote(note) {
    const match = /^([A-G])([#b]?)(-?\d+)$/.exec(note);
    if (!match) throw new Error(`Invalid note: ${note}`);
    const [, letter, accidental, octaveText] = match;
    const octave = Number(octaveText);
    const offset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
    return { letter, accidental, octave, midi: (octave + 1) * 12 + SEMITONES[letter] + offset };
}

export function noteToMidi(note) {
    return parseNote(note).midi;
}

export function transposeOctaves(note, octaves) {
    const { letter, accidental, octave } = parseNote(note);
    if (!Number.isInteger(octaves)) throw new Error('Octave shift must be an integer');
    return `${letter}${accidental}${octave + octaves}`;
}

export function noteFrequency(note) {
    return 440 * 2 ** ((noteToMidi(note) - 69) / 12);
}

// Include the normal training octave and extend only when a melody requires it.
export function keyboardNotesFor(sequence, clef = 'treble') {
    const baseOctave = clef === 'bass' ? 3 : 4;
    const pitches = sequence.map(noteToMidi);
    const lowestOctave = pitches.length ? Math.floor(Math.min(...pitches) / 12) - 1 : baseOctave;
    const highestOctave = pitches.length ? Math.floor(Math.max(...pitches) / 12) - 1 : baseOctave;
    const first = Math.min(baseOctave, lowestOctave);
    const last = Math.max(baseOctave + 1, highestOctave + 1);
    const notes = [];
    for (let octave = first; octave < last; octave++) {
        for (const pitch of CHROMATIC) notes.push(pitch + octave);
    }
    notes.push('C' + last);
    return notes;
}

export function durationNotation(beats) {
    const durations = {
        0.5: { hollow: false, stem: true, flag: true, dotted: false },
        1: { hollow: false, stem: true, flag: false, dotted: false },
        1.5: { hollow: false, stem: true, flag: false, dotted: true },
        2: { hollow: true, stem: true, flag: false, dotted: false },
        3: { hollow: true, stem: true, flag: false, dotted: true },
        4: { hollow: true, stem: false, flag: false, dotted: false }
    };
    if (!Object.hasOwn(durations, beats)) throw new Error(`Unsupported note duration: ${beats}`);
    return durations[beats];
}

// Fixed onset window based on beat duration, with bounds suitable for touch input.
export function gradeTimedOnset(playedMs, expectedMs, bpm) {
    if (!(bpm > 0)) throw new Error('BPM must be positive');
    const toleranceMs = Math.min(240, Math.max(110, 60000 / bpm * 0.3));
    const deltaMs = playedMs - expectedMs;
    return deltaMs < -toleranceMs ? 'early' : deltaMs > toleranceMs ? 'late' : 'on-time';
}

export function validateMelody(melody, clef = 'treble') {
    const notes = melody.map(item => clef === 'bass' ? transposeOctaves(item.n, -1) : item.n);
    melody.forEach(item => durationNotation(item.d));
    const available = new Set(keyboardNotesFor(notes, clef).map(noteToMidi));
    if (!notes.every(note => available.has(noteToMidi(note)))) {
        throw new Error('Exercise includes pitches outside its keyboard');
    }
    return notes;
}
