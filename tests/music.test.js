import test from 'node:test';
import assert from 'node:assert/strict';
import { SONG_DB } from '../js/config.js';
import {
    parseNote, noteToMidi, transposeOctaves, noteFrequency,
    keyboardNotesFor, durationNotation, gradeTimedOnset, validateMelody
} from '../js/music.js';

test('pitch parsing and octave transposition preserve accidentals', () => {
    assert.equal(noteToMidi('C4'), 60);
    assert.equal(noteToMidi('A4'), 69);
    assert.equal(noteToMidi('G#3'), 56);
    assert.equal(transposeOctaves('C3', -1), 'C2');
    assert.equal(transposeOctaves('D#5', -1), 'D#4');
    assert.equal(transposeOctaves('A#3', -1), 'A#2');
    assert.equal(parseNote('C#4').midi, 61);
    assert.throws(() => noteToMidi('H4'), /Invalid note/);
});

test('fallback synthesis uses the correct frequency', () => {
    assert.ok(Math.abs(noteFrequency('A4') - 440) < 0.001);
    assert.ok(Math.abs(noteFrequency('C2') - 65.4064) < 0.01);
    assert.ok(Math.abs(noteFrequency('E5') - 659.255) < 0.01);
});

test('every note in all fifteen songs is playable for both clefs', () => {
    assert.equal(SONG_DB.length, 15);
    for(const song of SONG_DB) {
        for(const clef of ['treble', 'bass']) {
            const notes = validateMelody(song.melody, clef);
            const available = new Set(keyboardNotesFor(notes, clef).map(noteToMidi));
            assert.equal(notes.length, song.melody.length, song.title);
            assert.ok(notes.every(note => available.has(noteToMidi(note))), `${song.title} - ${clef}`);
        }
    }
});

test('the formerly unplayable songs include their full extended pitch range', () => {
    const furElise = SONG_DB.find(song => song.title.startsWith('Fur Elise'));
    const treble = validateMelody(furElise.melody, 'treble');
    const bass = validateMelody(furElise.melody, 'bass');
    assert.ok(keyboardNotesFor(treble, 'treble').includes('C3'));
    assert.ok(keyboardNotesFor(bass, 'bass').includes('C2'));
    assert.ok(bass.includes('C2'));
});

test('dotted notes and flagged eighth notes retain their proper notation', () => {
    assert.deepEqual(durationNotation(1.5), { hollow: false, stem: true, flag: false, dotted: true });
    assert.deepEqual(durationNotation(3), { hollow: true, stem: true, flag: false, dotted: true });
    assert.equal(durationNotation(0.5).flag, true);
    assert.equal(durationNotation(4).stem, false);
    assert.throws(() => durationNotation(0.75), /Unsupported note duration/);
});

test('mistimed notes are rejected even when the pitch is correct', () => {
    assert.equal(gradeTimedOnset(650, 1000, 100), 'early');
    assert.equal(gradeTimedOnset(1150, 1000, 100), 'on-time');
    assert.equal(gradeTimedOnset(1350, 1000, 100), 'late');
    assert.throws(() => gradeTimedOnset(1000, 1000, 0), /BPM/);
});
