/**
 * Pure, browser-independent monophonic pitch estimator.
 * Uses YIN cumulative-mean-normalized difference after low-cost downsampling.
 * Designed for a single piano melody, not chords or sustain-pedal transcription.
 */
export function estimatePitch(samples, sampleRate, {
    minHz = 60, maxHz = 1400, minRms = 0.008, threshold = 0.18
} = {}) {
    if (!samples || samples.length < 1024 || !(sampleRate > 0)) return null;

    // Averaging adjacent samples provides a simple low-pass filter prior to decimation.
    const stride = Math.max(1, Math.floor(sampleRate / 12000));
    const length = Math.floor(samples.length / stride);
    const signal = new Float32Array(length);
    let mean = 0;
    for (let i = 0; i < length; i++) {
        let sum = 0;
        for (let j = 0; j < stride; j++) sum += samples[i * stride + j];
        signal[i] = sum / stride;
        mean += signal[i];
    }
    mean /= length;

    let power = 0;
    for (let i = 0; i < length; i++) {
        signal[i] -= mean;
        power += signal[i] * signal[i];
    }
    const rms = Math.sqrt(power / length);
    if (rms < minRms) return null;

    const rate = sampleRate / stride;
    const minLag = Math.max(2, Math.floor(rate / maxHz));
    const maxLag = Math.min(Math.floor(rate / minHz), Math.floor(length / 2) - 2);
    if (maxLag <= minLag) return null;

    const differences = new Float32Array(maxLag + 2);
    const comparisons = Math.floor(length / 2);
    for (let lag = 1; lag <= maxLag + 1; lag++) {
        let difference = 0;
        for (let i = 0; i < comparisons; i++) {
            const delta = signal[i] - signal[i + lag];
            difference += delta * delta;
        }
        differences[lag] = difference;
    }

    const normalized = new Float32Array(maxLag + 2);
    let cumulative = 0;
    let bestLag = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let lag = 1; lag <= maxLag + 1; lag++) {
        cumulative += differences[lag];
        normalized[lag] = cumulative > 0 ? differences[lag] * lag / cumulative : 1;
        if (lag >= minLag && lag <= maxLag && normalized[lag] < bestScore) {
            bestLag = lag;
            bestScore = normalized[lag];
        }
    }

    // Choose the earliest convincing periodicity to reduce octave errors.
    let selected = -1;
    for (let lag = minLag; lag <= maxLag; lag++) {
        if (normalized[lag] < threshold) {
            while (lag < maxLag && normalized[lag + 1] < normalized[lag]) lag++;
            selected = lag;
            break;
        }
    }
    if (selected < 0) {
        if (bestScore > 0.28) return null;
        selected = bestLag;
    }

    const prev = normalized[selected - 1];
    const current = normalized[selected];
    const next = normalized[selected + 1];
    const denominator = prev - 2 * current + next;
    const correction = Math.abs(denominator) > 1e-9
        ? Math.max(-1, Math.min(1, 0.5 * (prev - next) / denominator)) : 0;
    const frequency = rate / (selected + correction);
    if (frequency < minHz * 0.95 || frequency > maxHz * 1.05) return null;

    const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
    const cents = 1200 * Math.log2(frequency / (440 * 2 ** ((midi - 69) / 12)));
    return { frequency, midi, cents, rms, confidence: Math.max(0, 1 - current) };
}

/**
 * Suppress microphone noise and sustain as separate note events.
 * Require stable pitches on consecutive analysis frames. Re-arm on silence,
 * a different pitch, or a fresh amplitude attack for repeated notes.
 */
export class NoteEventGate {
    constructor({ minConfidence = 0.82, minRms = 0.012, stableFrames = 2, retriggerMs = 180 } = {}) {
        Object.assign(this, { minConfidence, minRms, stableFrames, retriggerMs });
        this.reset();
    }

    reset() {
        this.candidate = null;
        this.stable = 0;
        this.lastEmitted = null;
        this.lastEventMs = -Infinity;
        this.lastRms = 0;
        this.quietFrames = 2;
        this.armed = true;
    }

    push(pitch, atMs, rms = pitch?.rms ?? 0) {
        const previousRms = this.lastRms;
        this.lastRms = rms;
        if (!pitch || rms < this.minRms || pitch.confidence < this.minConfidence
            || Math.abs(pitch.cents ?? 0) > 40) {
            if (rms < this.minRms) {
                this.quietFrames++;
                if (this.quietFrames >= 2) this.armed = true;
            }
            this.candidate = null;
            this.stable = 0;
            return null;
        }

        const attack = rms > this.minRms * 2 && rms > previousRms * 1.5;
        this.quietFrames = 0;
        if (this.candidate !== pitch.midi) {
            this.candidate = pitch.midi;
            this.stable = 1;
        } else {
            this.stable++;
        }
        if (this.stable < this.stableFrames || atMs - this.lastEventMs < this.retriggerMs) return null;
        if (!this.armed && pitch.midi === this.lastEmitted && !attack) return null;

        this.lastEmitted = pitch.midi;
        this.lastEventMs = atMs;
        this.armed = false;
        return {
            midiNote: pitch.midi,
            onsetTimeMs: atMs - 45, // Approximate capture + stabilization lag.
            confidence: pitch.confidence,
            source: 'microphone'
        };
    }
}
