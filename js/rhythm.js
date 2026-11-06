/**
 * Deterministic note-onset evaluation, independent of audio capture and UI.
 * In v3.1 a note's rhythm is judged at key-down; sustain duration is not graded.
 */
export function rhythmWindows(bpm,{shortestAdjacentBeats=null}={}) {
    if(!Number.isFinite(bpm)||bpm<=0)throw new Error('BPM must be positive');
    const beatMs=60000/bpm;
    // A little more forgiving on quarter notes, but never let windows for
    // rapid neighboring notes overlap: an eighth note needs a tighter window.
    const baseGood=Math.min(750,Math.max(180,beatMs*0.38));
    const overlapLimit=shortestAdjacentBeats===null?Infinity:
        (Number.isFinite(shortestAdjacentBeats)&&shortestAdjacentBeats>0
            ? shortestAdjacentBeats*beatMs*0.42 : NaN);
    if(Number.isNaN(overlapLimit))throw new Error('Invalid adjacent note duration');
    const goodMs=Math.min(baseGood,overlapLimit);
    const perfectMs=Math.min(Math.min(220,Math.max(65,beatMs*0.12)),
        goodMs*0.6);
    return {perfectMs,goodMs};
}

export function assessOnset(playedAtMs, expectedAtMs, bpm,
    { adjustmentMs=0,shortestAdjacentBeats=null }={}) {
    if (![playedAtMs, expectedAtMs, adjustmentMs].every(Number.isFinite)) {
        throw new Error('Onset timestamps and adjustment must be finite numbers');
    }
    const {perfectMs,goodMs}=rhythmWindows(bpm,{shortestAdjacentBeats});
    const offsetMs = Math.round(playedAtMs - adjustmentMs - expectedAtMs);
    const absMs = Math.abs(offsetMs);
    const judgement = absMs <= perfectMs ? 'perfect'
        : absMs <= goodMs ? 'good'
        : offsetMs < 0 ? 'early' : 'late';
    return {
        judgement,
        offsetMs,
        perfectMs,
        goodMs,
        accepted: judgement === 'perfect' || judgement === 'good',
        coins: judgement === 'perfect' ? 5 : judgement === 'good' ? 3 : 0
    };
}

/** The expected onset of every note is tied to the original tempo clock,
 * never the player's previous input timestamp. This prevents drift. */
export function expectedOnsetMs(startMs, durations, index, bpm) {
    if (!Number.isInteger(index) || index < 0 || index > durations.length) {
        throw new Error('Invalid note index');
    }
    const beatMs = 60000 / bpm;
    let beats = 0;
    for (let i = 0; i < index; i++) {
        if (!(durations[i] > 0)) throw new Error('Note duration must be positive');
        beats += durations[i];
    }
    return startMs + beats * beatMs;
}

export function performanceSummary(game) {
    const totalNotes = game.notes?.length || 0;
    const correct = game.pitchCorrect || 0;
    const wrong = game.pitchErrors || 0;
    const missing = game.pitchMisses || 0;
    const attempts = correct + wrong + missing;
    const pitch = attempts ? Math.round(100 * correct / attempts) : 100;
    const rhythm = totalNotes
        ? Math.round(100 * (game.rhythmOnTime || 0) / totalNotes)
        : 100;
    const timings = game.rhythmOnTime || 0;
    const averageDeviationMs = timings
        ? Math.round((game.absoluteOnsetErrorMs || 0) / timings)
        : null;
    return { pitch, rhythm, averageDeviationMs, totalNotes,
        perfect: game.rhythmPerfect || 0, good: game.rhythmGood || 0,
        early: game.rhythmEarly || 0, late: game.rhythmLate || 0,
        missed: game.rhythmMisses || 0 };
}
