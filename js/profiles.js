/**
 * V4 account migration is additive and idempotent.
 * Profiles are still LOCAL browser data, not authenticated accounts.
 */
export function newProfileId() {
    if(typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'local-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,11);
}

export function upgradeProfile(user, createId = newProfileId) {
    if(!user || typeof user !== 'object' || Array.isArray(user)) throw new Error('Invalid player');
    if(!user.profileId) user.profileId = createId();
    if(!user.preferences || typeof user.preferences !== 'object') {
        user.preferences = {
            clef: 'treble',
            instrument: 'piano',
            input: 'touch'
        };
    }
    if(!['treble','bass'].includes(user.preferences.clef)) user.preferences.clef = 'treble';
    if(!['touch','microphone'].includes(user.preferences.input)) user.preferences.input = 'touch';
    if(typeof user.preferences.instrument !== 'string') user.preferences.instrument = 'piano';
    if(!user.placement || typeof user.placement !== 'object') {
        user.placement = {
            status: 'not-started',
            level: null, confidence: 'low', results: [], lastAuditionAt: null
        };
    }
    if(!Array.isArray(user.placement.results)) user.placement.results = [];
    if(!Number.isInteger(user.readingLevel) || user.readingLevel < 1 || user.readingLevel > 10) {
        const observed = user.placement?.level;
        user.readingLevel = Number.isInteger(observed) && observed >= 1 && observed <= 10
            ? observed : null; // Never infer a reading level from Easy/Hard/Pro.
    }
    return user;
}

export function upgradeProfileList(list, createId = newProfileId) {
    if(!Array.isArray(list)) return [];
    const seen = new Set();
    return list.filter(u => u && typeof u === 'object' && !Array.isArray(u))
        .map(user => {
            upgradeProfile(user, createId);
            if(seen.has(user.profileId)) user.profileId = createId();
            seen.add(user.profileId);
            return user;
        });
}

export function findProfileIndex(list, identifier) {
    return typeof identifier === 'number'
        ? (Number.isInteger(identifier) && identifier >= 0 && identifier < list.length ? identifier : -1)
        : list.findIndex(user => user.profileId === identifier);
}

export function savePreference(user, key, value) {
    if(!user || !user.preferences) return;
    if(key === 'clef' && !['treble','bass'].includes(value)) return;
    if(key === 'input' && !['touch','microphone'].includes(value)) return;
    if(!['clef','input','instrument'].includes(key)) return;
    user.preferences[key] = value;
}
