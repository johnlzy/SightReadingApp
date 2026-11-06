/**
 * Parent-set, per-child daily play-time accounting. A "Music Pass" is five
 * minutes, but we charge real foreground seconds, not whole game entries.
 *
 * This is local browser convenience, NOT tamper-proof device parental control.
 */
export const DEFAULT_DAILY_SECONDS = 15 * 60;
export const PHRASE_GRACE_SECONDS = 45;
export const PLAY_PASS_SECONDS = 5 * 60;

export function localDayKey(date = new Date()) {
    const n = x => String(x).padStart(2, '0');
    return date.getFullYear() + '-' + n(date.getMonth() + 1) + '-' + n(date.getDate());
}

export function ensureBudget(user, dayKey = localDayKey()) {
    if(!user.playBudget || typeof user.playBudget !== 'object') {
        user.playBudget = {
            version: 1, dailySeconds: DEFAULT_DAILY_SECONDS, usedSeconds: 0,
            bonusSeconds: 0, dayKey, grants: [], reviewed: false
        };
    }
    const b = user.playBudget;
    if(b.version !== 1) b.version = 1;
    if(!Number.isFinite(b.dailySeconds) && b.dailySeconds !== null) b.dailySeconds = DEFAULT_DAILY_SECONDS;
    if(!Number.isFinite(b.usedSeconds) || b.usedSeconds < 0) b.usedSeconds = 0;
    if(!Number.isFinite(b.bonusSeconds) || b.bonusSeconds < 0) b.bonusSeconds = 0;
    if(!Array.isArray(b.grants)) b.grants = [];
    if(!b.dayKey || b.dayKey !== dayKey) {
        b.dayKey = dayKey;
        b.usedSeconds = 0;
        b.bonusSeconds = 0;
        b.grants = [];
    }
    return b;
}

export function remainingSeconds(user, dayKey = localDayKey()) {
    const b = ensureBudget(user, dayKey);
    return b.dailySeconds === null ? Infinity
        : Math.max(0, b.dailySeconds + b.bonusSeconds - b.usedSeconds);
}

export function setDailyAllowance(user, dailySeconds, dayKey = localDayKey()) {
    if(dailySeconds !== null &&
        (!Number.isInteger(dailySeconds) || dailySeconds < 0 || dailySeconds > 3600 || dailySeconds % 300 !== 0)) {
        throw new Error('Allowance must be in five-minute steps from 0 to 60, or unlimited');
    }
    const b = ensureBudget(user, dayKey);
    b.dailySeconds = dailySeconds;
    b.reviewed = true;
    return b;
}

export function grantExtraTime(user, seconds, grantId, dayKey = localDayKey()) {
    if(![300,600].includes(seconds) || typeof grantId !== 'string' || !grantId) {
        throw new Error('Invalid caregiver time grant');
    }
    const b = ensureBudget(user, dayKey);
    if(b.grants.includes(grantId)) return false;
    b.grants.push(grantId);
    b.bonusSeconds += seconds;
    return true;
}

/** A pure foreground accounting engine, which can be driven by a fake clock. */
export class PlayBudgetClock {
    constructor(user, { now = () => performance.now(), day = () => localDayKey(),
        onUpdate = () => {}, onExpired = () => {}, save = () => {} } = {}) {
        this.user = user;
        this.now = now;
        this.day = day;
        this.onUpdate = onUpdate;
        this.onExpired = onExpired;
        this.save = save;
        this.running = false;
        this.lastTick = null;
        this.exhaustedNotified = false;
        ensureBudget(user, day());
    }

    resume() {
        this.lastTick = this.now();
        this.running = true;
        this.exhaustedNotified = false;
        this.tick();
    }

    pause() {
        this.tick();
        this.running = false;
        this.lastTick = null;
        this.save();
    }

    tick() {
        const time = this.now();
        const b = ensureBudget(this.user, this.day());
        if(this.running && this.lastTick !== null) {
            const elapsed = Math.max(0, Math.min((time - this.lastTick)/1000, 15));
            b.usedSeconds += elapsed;
        }
        this.lastTick = time;
        const remaining = remainingSeconds(this.user, this.day());
        this.onUpdate(remaining);
        this.save();
        if(remaining <= 0 && !this.exhaustedNotified) {
            this.exhaustedNotified = true;
            this.onExpired();
        }
        return remaining;
    }

    allowed() { return this.tick() > 0; }
}

export function passesLabel(seconds) {
    return Number.isFinite(seconds)
        ? Math.ceil(Math.max(0, seconds) / PLAY_PASS_SECONDS) + ' Music Passes'
        : 'Unlimited Music Time';
}
