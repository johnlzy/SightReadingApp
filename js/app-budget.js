import { state } from './state.js';
import { ensureBudget, remainingSeconds, PlayBudgetClock, setDailyAllowance, grantExtraTime, localDayKey } from './play-budget.js';
import { saveCurrentUser } from './storage.js';

let clock = null;
let ticker = null;
let expiryHandler = () => showTimeUpOverlay();
let lastInteractionAt = 0;
let idle = false;
const IDLE_MS = 120_000;

export function onPlaytimeExpired(handler) {
    expiryHandler = handler;
}

function displayTime(remaining) {
    const node = document.getElementById('music-passes');
    const warning = document.getElementById('budget-nearly-done');
    if(node) {
        node.textContent = Number.isFinite(remaining)
            ? '🎟️ ' + Math.ceil(Math.max(0, remaining) / 300) + ' passes · ' +
              Math.ceil(Math.max(0, remaining) / 60) + ' min'
            : '🎟️ Unlimited';
    }
    if(warning) {
        warning.hidden = !Number.isFinite(remaining) || remaining > 120 || remaining <= 0;
    }
}
function tick() {
    if(!clock || !state.currentUser) return;
    const now = performance.now();
    if(!['playing','countdown','ready','arming'].includes(state.game.phase)
        && now - lastInteractionAt > IDLE_MS && !idle) {
        idle = true;
        clock.pause();
        const node = document.getElementById('budget-idle');
        if(node) node.hidden = false;
    }
    if(clock.running) clock.tick();
}

export function activatePlayBudget() {
    deactivatePlayBudget();
    if(!state.currentUser) return;
    ensureBudget(state.currentUser);
    idle = false;
    lastInteractionAt = performance.now();
    clock = new PlayBudgetClock(state.currentUser, {
        onUpdate: displayTime,
        onExpired: () => expiryHandler(),
        save: () => saveCurrentUser()
    });
    if(!document.hidden) clock.resume();
    ticker = setInterval(tick, 1000);
    document.getElementById('budget-idle')?.setAttribute('hidden','');
    if(remainingSeconds(state.currentUser) <= 0) expiryHandler();
    else hideTimeUpOverlay();
}

export function deactivatePlayBudget() {
    clearInterval(ticker);
    ticker = null;
    if(clock) clock.pause();
    clock = null;
    idle = false;
}

export function touchPlayBudget() {
    lastInteractionAt = performance.now();
}

export function resumeFromIdle() {
    if(!clock || !state.currentUser) return;
    idle = false;
    touchPlayBudget();
    document.getElementById('budget-idle')?.setAttribute('hidden','');
    if(!document.hidden) clock.resume();
}

export function pausePlayBudget() {
    if(clock) clock.pause();
}
export function resumePlayBudget() {
    if(!clock || !state.currentUser || document.hidden || idle) return;
    touchPlayBudget();
    clock.resume();
}
export function canPlayToday() {
    if(!state.currentUser) return false;
    const left = clock ? clock.tick() : remainingSeconds(state.currentUser);
    if(left <= 0) {
        expiryHandler();
        return false;
    }
    return true;
}

export function configurePlayBudget(seconds) {
    if(!state.currentUser) return;
    setDailyAllowance(state.currentUser, seconds);
    saveCurrentUser();
    displayTime(remainingSeconds(state.currentUser));
    if(remainingSeconds(state.currentUser) > 0) hideTimeUpOverlay();
    else expiryHandler();
}

export function addParentPlaytime(seconds) {
    if(!state.currentUser) return false;
    const grantId = 'parent-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    const changed = grantExtraTime(state.currentUser, seconds, grantId);
    saveCurrentUser();
    displayTime(remainingSeconds(state.currentUser));
    if(changed) hideTimeUpOverlay();
    return changed;
}

export function showTimeUpOverlay() {
    const element = document.getElementById('budget-overlay');
    if(element) element.hidden = false;
}
export function hideTimeUpOverlay() {
    const element = document.getElementById('budget-overlay');
    if(element) element.hidden = true;
}
export function currentPlayBudget() {
    if(!state.currentUser) return null;
    const budget = ensureBudget(state.currentUser, localDayKey());
    return {...budget, remaining: remainingSeconds(state.currentUser)};
}
