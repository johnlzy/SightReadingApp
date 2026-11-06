import { state } from './state.js';
import { midiToNote } from './music.js';
import { startMicrophone, stopMicrophone } from './microphone.js';
import { saveUserPreference } from './storage.js';
import { pausePlayBudget, resumePlayBudget } from './app-budget.js';

let calibrationDetected = false;
const TIMING_KEY = 'fsr_mic_timing_adjustment_v1';

export function setMicTimingAdjustment(value) {
    const numeric = Number(value);
    const adjustment = Number.isFinite(numeric)
        ? Math.round(Math.max(-250, Math.min(250, numeric)) / 25) * 25 : 0;
    state.micTimingAdjustmentMs = adjustment;
    localStorage.setItem(TIMING_KEY, String(adjustment));
    const label = document.getElementById('mic-timing-value');
    if(label) label.textContent = (adjustment > 0 ? '+' : '') + adjustment + ' ms';
    const slider = document.getElementById('mic-timing-adjust');
    if(slider) slider.value = String(adjustment);
}

export function restoreMicTimingAdjustment() {
    setMicTimingAdjustment(localStorage.getItem(TIMING_KEY) ?? 0);
}


export function syncInputModeUI() {
    const mic = state.inputMode === 'microphone';
    document.getElementById('input-touch')?.classList.toggle('selected', !mic);
    document.getElementById('input-microphone')?.classList.toggle('selected', mic);
    const detail = document.getElementById('input-mode-help');
    if (detail) detail.textContent = mic
        ? 'Real piano selected. Your browser will ask for microphone access when you start a round.'
        : 'Tap the on-screen piano keys. No microphone is used.';
    document.querySelector('.game-wrapper')?.classList.toggle('mic-mode', mic);
    const live = document.getElementById('mic-game-status');
    if (live) live.hidden = !mic;
}

export function useTouchInput(persist = true) {
    stopMicrophone();
    state.inputMode = 'touch';
    if(persist) saveUserPreference('input','touch');
    syncInputModeUI();
}

export function closeMicrophoneSetup() {
    stopMicrophone();
    const modal=document.getElementById('mic-modal');
    const wasOpen=modal&&!modal.hidden;
    if(modal)modal.hidden=true;
    resumePlayBudget();
    if(wasOpen)window.setHomeTab?.('play');
}

/** Request permission only after the child/parent explicitly clicks the mic button. */
export async function openMicrophoneSetup() {
    pausePlayBudget();
    stopMicrophone();
    calibrationDetected = false;
    const modal = document.getElementById('mic-modal');
    const status = document.getElementById('mic-status');
    const note = document.getElementById('mic-calibration-note');
    const meter = document.getElementById('mic-level-fill');
    const confirm = document.getElementById('mic-confirm');
    modal.hidden = false;
    confirm.disabled = true;
    note.textContent = '—';
    meter.style.width = '0%';
    status.textContent = 'Allow the microphone, then play one piano note.';
    restoreMicTimingAdjustment();

    try {
        const ready = await startMicrophone({
            onMonitor: ({ pitch, rms }) => {
                meter.style.width = Math.min(100, Math.round(rms * 350)) + '%';
                if (pitch && pitch.confidence >= 0.82 && Math.abs(pitch.cents) <= 40) {
                    note.textContent = midiToNote(pitch.midi);
                }
            },
            onNote: event => {
                calibrationDetected = true;
                note.textContent = midiToNote(event.midiNote);
                confirm.disabled = false;
                status.textContent = 'Note recognized! You can use your real piano.';
            },
            onError: error => {
                status.textContent = error.message;
                confirm.disabled = true;
            }
        });
        if (!ready && !modal.hidden) {
            status.textContent = 'Microphone setup was cancelled.';
        }
    } catch (error) {
        if (modal.hidden) return;
        const denied = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError';
        status.textContent = denied
            ? 'Microphone permission was denied. Enable it in browser settings, or use the on-screen piano.'
            : error.message || 'Could not start the microphone. You can still use the on-screen keys.';
        confirm.disabled = true;
    }
}

export function confirmMicrophoneSetup() {
    if (!calibrationDetected) return;
    stopMicrophone(); // Never keep listening between practice rounds.
    state.inputMode = 'microphone';
    saveUserPreference('input','microphone');
    document.getElementById('mic-modal').hidden = true;
    resumePlayBudget();
    syncInputModeUI();
    window.setHomeTab?.('play');
}
