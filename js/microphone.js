import { estimatePitch, NoteEventGate } from './pitch.js';

let session = null;
let generation = 0;

function releaseResources(resources) {
    if (!resources) return;
    if (resources.raf) cancelAnimationFrame(resources.raf);
    if (resources.stream) {
        for (const track of resources.stream.getTracks()) {
            track.onended = null;
            track.stop();
        }
    }
    try { resources.source?.disconnect(); } catch {}
    try { resources.analyser?.disconnect(); } catch {}
    try { resources.silent?.disconnect(); } catch {}
    if (resources.context?.state !== 'closed') {
        resources.context?.close().catch(() => {});
    }
}

/** Stop immediately on exit, logout, mode change, and tab backgrounding. */
export function stopMicrophone() {
    generation++;
    releaseResources(session);
    session = null;
}

export function isMicrophoneActive() {
    return Boolean(session);
}

export function resetMicrophoneNotes() {
    session?.gate.reset();
}

/**
 * Begin microphone capture only after an explicit user gesture.
 * The stream is analyzed entirely in memory; no recording or network uploads.
 */
export async function startMicrophone({ onNote = () => {}, onMonitor = () => {}, onError = () => {} } = {}) {
    stopMicrophone();
    const token = generation;
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access needs HTTPS or localhost and a supported browser.');
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser.');

    // Instantiate in the user gesture before awaiting permission (important on mobile).
    const context = new AudioContextClass({ latencyHint: 'interactive' });
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: 1
            },
            video: false
        });
        if (generation !== token) {
            releaseResources({ context, stream });
            return false;
        }
        await context.resume();
        if (generation !== token) {
            releaseResources({ context, stream });
            return false;
        }

        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 8192;
        analyser.smoothingTimeConstant = 0;
        // A silent connection keeps the analyser rendering without audio feedback.
        const silent = context.createGain();
        silent.gain.value = 0;
        source.connect(analyser);
        analyser.connect(silent);
        silent.connect(context.destination);

        const resources = {
            context, stream, source, analyser, silent,
            buffer: new Float32Array(analyser.fftSize),
            gate: new NoteEventGate(),
            raf: null,
            lastFrameMs: 0
        };
        session = resources;

        function tick(now) {
            if (generation !== token || session !== resources) return;
            resources.raf = requestAnimationFrame(tick);
            if (now - resources.lastFrameMs < 65) return;
            resources.lastFrameMs = now;

            analyser.getFloatTimeDomainData(resources.buffer);
            const pitch = estimatePitch(resources.buffer, context.sampleRate);
            let sum = 0;
            for (let i = 0; i < resources.buffer.length; i += 8) {
                const amplitude = resources.buffer[i];
                sum += amplitude * amplitude;
            }
            const rms = Math.sqrt(sum / (resources.buffer.length / 8));
            onMonitor({ pitch, rms, active: true });
            const event = resources.gate.push(pitch, Date.now(), rms);
            if (event) onNote(event);
        }

        for (const track of stream.getAudioTracks()) {
            track.onended = () => {
                if (generation !== token) return;
                stopMicrophone();
                onError(new Error('The microphone was disconnected. Switch to on-screen keys.'));
            };
        }
        resources.raf = requestAnimationFrame(tick);
        return true;
    } catch (error) {
        if (generation === token) {
            stopMicrophone();
        } else {
            releaseResources({ context, stream });
        }
        throw error;
    }
}
