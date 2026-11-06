import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOnset, rhythmWindows, expectedOnsetMs, performanceSummary } from '../js/rhythm.js';

test('tempo-relative windows assign perfect/good/early/late from onset', () => {
    const at = 2000, bpm = 120;
    assert.equal(assessOnset(2000, at, bpm).judgement, 'perfect');
    assert.equal(assessOnset(2100, at, bpm).judgement, 'good');
    assert.equal(assessOnset(2200, at, bpm).judgement, 'late');
    assert.equal(assessOnset(1780, at, bpm).judgement, 'early');
    assert.equal(assessOnset(1950, at, bpm).coins, 5);
    assert.equal(assessOnset(2100, at, bpm).coins, 3);
    assert.equal(assessOnset(2200, at, bpm).coins, 0);
});

test('beginner tempos receive wider but bounded timing tolerance', () => {
    const fast = rhythmWindows(120);
    const slow = rhythmWindows(20);
    assert.ok(slow.goodMs > fast.goodMs);
    assert.equal(slow.goodMs, 750);
    assert.throws(() => rhythmWindows(0), /BPM/);
});

test('microphone delay compensation moves detected late notes toward their onset', () => {
    const expectedAt = 1000;
    const unadjusted = assessOnset(1320, expectedAt, 120);
    const adjusted = assessOnset(1320, expectedAt, 120, { adjustmentMs: 250 });
    assert.equal(unadjusted.judgement, 'late');
    assert.equal(adjusted.judgement, 'good');
    assert.equal(adjusted.offsetMs, 70);
});

test('expected beat timestamps are anchored to original start, not prior performance', () => {
    assert.equal(expectedOnsetMs(1000, [0.5, 1.5, 2, 1], 0, 120), 1000);
    assert.equal(expectedOnsetMs(1000, [0.5, 1.5, 2, 1], 1, 120), 1250);
    assert.equal(expectedOnsetMs(1000, [0.5, 1.5, 2, 1], 2, 120), 2000);
    assert.throws(() => expectedOnsetMs(1000, [1], 2, 120), /index/);
});

test('pitch recognition and rhythmic success are independent scores', () => {
    const result = performanceSummary({
        notes: ['C4', 'D4', 'E4', 'F4'],
        pitchCorrect: 4, pitchErrors: 1, pitchMisses: 0,
        rhythmOnTime: 2, rhythmPerfect: 1, rhythmGood: 1,
        rhythmEarly: 1, rhythmLate: 0, rhythmMisses: 1,
        absoluteOnsetErrorMs: 150
    });
    assert.equal(result.pitch, 80);
    assert.equal(result.rhythm, 50);
    assert.equal(result.averageDeviationMs, 75);
    assert.deepEqual([result.perfect, result.good, result.early, result.late, result.missed], [1,1,1,0,1]);
});
