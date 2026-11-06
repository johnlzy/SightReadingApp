import test from 'node:test';
import assert from 'node:assert/strict';
import { estimatePitch, NoteEventGate } from '../js/pitch.js';
import { midiToNote } from '../js/music.js';

function pianoWave(frequency, sampleRate = 48000, count = 8192, harmonics = false) {
    const samples = new Float32Array(count);
    for(let i = 0; i < count; i++) {
        const phase = 2 * Math.PI * frequency * i / sampleRate;
        samples[i] = 0.25 * Math.sin(phase);
        if(harmonics) {
            samples[i] += 0.30 * Math.sin(2 * phase) + 0.15 * Math.sin(3 * phase);
        }
    }
    return samples;
}

test('recognizes low, middle and high piano notes without an octave error', () => {
    for (const [freq, expected] of [[65.406, 36], [130.813, 48], [261.626, 60], [440, 69], [659.255, 76]]) {
        for (const harmonics of [false, true]) {
            const detected = estimatePitch(pianoWave(freq, 48000, 8192, harmonics), 48000);
            assert.ok(detected, `No pitch: ${freq}`);
            assert.equal(detected.midi, expected, `Incorrect pitch for ${freq}`);
            assert.ok(detected.confidence >= 0.82);
        }
    }
});

test('supports 44.1 kHz audio capture', () => {
    const detected = estimatePitch(pianoWave(293.665, 44100), 44100);
    assert.equal(detected.midi, 62);
    assert.ok(Math.abs(detected.cents) < 30);
});

test('rejects silence and weak audio', () => {
    assert.equal(estimatePitch(new Float32Array(8192), 48000), null);
    assert.equal(estimatePitch(pianoWave(440).map(x => x * 0.001), 48000), null);
});

test('requires confident stable consecutive frames and rejects held-note retriggers', () => {
    const gate = new NoteEventGate();
    const a4 = { midi: 69, confidence: 0.97, cents: 1, rms: 0.15 };
    assert.equal(gate.push(a4, 1000), null);
    const event = gate.push(a4, 1070);
    assert.deepEqual({ note: event.midiNote, source: event.source }, { note: 69, source: 'microphone' });
    assert.equal(gate.push(a4, 1260), null);
    assert.equal(gate.push(a4, 1450), null);
    gate.push(null, 1530, 0);
    gate.push(null, 1600, 0);
    assert.equal(gate.push(a4, 1670), null);
    assert.equal(gate.push(a4, 1740).midiNote, 69);
});

test('does not count noisy or low-confidence frames as played notes', () => {
    const gate = new NoteEventGate();
    const noisy = { midi: 69, confidence: 0.5, cents: 1, rms: 0.16 };
    assert.equal(gate.push(noisy, 1000), null);
    assert.equal(gate.push(noisy, 1100), null);
    const badlyTuned = { midi: 69, confidence: 0.95, cents: 60, rms: 0.16 };
    assert.equal(gate.push(badlyTuned, 1200), null);
});

test('maps numeric pitches to named notes without requiring a MIDI device', () => {
    assert.equal(midiToNote(36), 'C2');
    assert.equal(midiToNote(69), 'A4');
    assert.equal(midiToNote(76), 'E5');
    assert.throws(() => midiToNote(-1), /Pitch number/);
});
