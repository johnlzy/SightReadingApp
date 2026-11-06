/**
 * v3.2: deterministic, local-only sight-reading practice curriculum.
 * No server, model training, or personal recordings are required.
 * Assessment sequences are selected without looking at learned skill weights.
 */
export function ensureLearning(user) {
    if(!user.learning || typeof user.learning !== 'object' || Array.isArray(user.learning)) {
        user.learning = {};
    }
    const state = user.learning;
    state.version = 1;
    if(!state.notes || typeof state.notes !== 'object' || Array.isArray(state.notes)) state.notes = {};
    if(!state.rhythms || typeof state.rhythms !== 'object' || Array.isArray(state.rhythms)) state.rhythms = {};
    if(!Array.isArray(state.sessions)) state.sessions = [];
    if(!Array.isArray(state.checks)) state.checks = [];
    state.checkCount = Number.isInteger(state.checkCount) && state.checkCount >= 0 ? state.checkCount : 0;
    state.sessions = state.sessions.slice(-30);
    state.checks = state.checks.slice(-24);
    return state;
}

export function availablePitches(difficulty, clef) {
    const octave = clef === 'bass' ? 3 : 4;
    const easy = ['C','D','E','F','G'];
    const octaveNotes = ['C','D','E','F','G','A','B'];
    const chromatic = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    if(difficulty === 'easy') return easy.map(n => n + octave);
    if(difficulty === 'hard') return [...chromatic.map(n => n + octave), 'C' + (octave + 1)];
    return [...octaveNotes.map(n => n + octave), 'C' + (octave + 1)];
}

export function noteMastery(learning, clef, note) {
    const entry = learning?.notes?.[clef + ':' + note];
    if (!entry || !entry.attempts) return 0.5; // honest uncertainty
    const attempts = Math.max(0, entry.attempts);
    const hits = Math.min(attempts, Math.max(0, entry.firstTryHits || 0));
    const baseline = (hits + 2) / (attempts + 4); // prior prevents premature mastery
    const recent = Array.isArray(entry.recent) ? entry.recent.slice(-8) : [];
    const trend = recent.length ? recent.reduce((sum,n) => sum + (n ? 1 : 0), 0) / recent.length : baseline;
    return Math.max(0, Math.min(1, baseline * 0.55 + trend * 0.45));
}

export function weakestNotes(learning, clef, difficulty, limit = 3) {
    const pool = availablePitches(difficulty, clef);
    return pool.filter(note => (learning?.notes?.[clef+':'+note]?.attempts || 0) >= 2)
        .map(note => ({ note, mastery: noteMastery(learning, clef, note),
            attempts: learning.notes[clef+':'+note].attempts }))
        .sort((a,b) => a.mastery-b.mastery || b.attempts-a.attempts)
        .slice(0,limit);
}

export function recordOutcome(learning, { clef, note, duration = 1, firstTryCorrect, rhythmGrade = null, latencyMs = null }) {
    if(!['treble','bass'].includes(clef) || typeof note !== 'string') throw new Error('Invalid note outcome');
    const key = clef + ':' + note;
    const notes = learning.notes;
    const entry = notes[key] || { attempts:0, firstTryHits:0, streak:0, recent:[], responseTotalMs:0, responses:0 };
    entry.attempts++;
    if(firstTryCorrect) {
        entry.firstTryHits++;
        entry.streak++;
    } else {
        entry.streak = 0;
    }
    entry.recent.push(firstTryCorrect ? 1 : 0);
    entry.recent = entry.recent.slice(-12);
    if(Number.isFinite(latencyMs) && latencyMs >= 0) {
        entry.responseTotalMs += Math.min(latencyMs, 60000);
        entry.responses++;
    }
    entry.lastSeen = Date.now();
    notes[key] = entry;

    if(rhythmGrade !== null) {
        const bucket = String(duration);
        const rhythm = learning.rhythms[bucket] || { attempts:0, onTime:0, recent:[] };
        const success = rhythmGrade === 'perfect' || rhythmGrade === 'good';
        rhythm.attempts++;
        if(success) rhythm.onTime++;
        rhythm.recent.push(success ? 1 : 0);
        rhythm.recent = rhythm.recent.slice(-12);
        learning.rhythms[bucket] = rhythm;
    }
    return entry;
}

function randomChoice(values, rng, previous = null) {
    if(!values.length) return null;
    const alternatives = values.length > 1 ? values.filter(n => n !== previous) : values;
    return alternatives[Math.floor(Math.min(0.999999, Math.max(0, rng())) * alternatives.length)];
}

export function generateAdaptiveExercise(learning, {
    clef = 'treble', difficulty = 'easy', count = 16, rng = Math.random
} = {}) {
    const pool = availablePitches(difficulty, clef);
    const ranked = [...pool].sort((a,b) => noteMastery(learning,clef,a) - noteMastery(learning,clef,b));
    // Focus is supported by evidence, not just lack of exposure.
    const weak = ranked.filter(n => (learning?.notes?.[clef+':'+n]?.attempts || 0) >= 2)
        .slice(0, Math.max(1,Math.ceil(pool.length/2)));
    const unseen = pool.filter(n => !learning?.notes?.[clef+':'+n]?.attempts);
    const notes = [];
    const durations = [];
    const pick = () => {
        const chance = rng();
        const preferred = chance < 0.6 && weak.length ? weak
            : chance < 0.7 && unseen.length ? unseen : pool;
        const selected = randomChoice(preferred, rng, notes.at(-1));
        notes.push(selected);
    };

    if(difficulty !== 'pro') {
        for(let i=0;i<count;i++) { pick(); durations.push(1); }
    } else {
        // Four complete 4-beat bars, biased toward rhythms the player missed.
        for(let bar=0;bar<4;bar++) {
            let beatsLeft = 4;
            while(beatsLeft > 0) {
                const allowed = [0.5,1,1.5,2,3,4].filter(d => d <= beatsLeft);
                const weighted = allowed.flatMap(d => {
                    const x = learning?.rhythms?.[String(d)];
                    const difficultyWeight = x && x.attempts >= 2 ? 1 + Math.round(4*(1-x.onTime/x.attempts)) : 1;
                    return Array(Math.max(1,difficultyWeight)).fill(d);
                });
                const duration = randomChoice(weighted, rng);
                pick();
                durations.push(duration);
                beatsLeft = Math.round((beatsLeft-duration)*2)/2;
            }
        }
    }
    return { notes, durations, focus: weak.slice(0,3),
        kind:'adaptive', clef, difficulty };
}

function seedString(text) {
    let value = 2166136261;
    for (const letter of text) {
        value = Math.imul(value ^ letter.charCodeAt(0), 16777619);
    }
    return value >>> 0;
}
function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) | 0;
        let n = Math.imul(state ^ state >>> 15, 1 | state);
        n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
        return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * A balanced unseen *sequence* built without access to mastery weights.
 * The pitch vocabulary intentionally matches practice, but ordering is fresh.
 */
export function generateSkillCheck({ clef='treble', difficulty='easy', count=16, checkIndex=0, profileKey='' } = {}) {
    const pool = availablePitches(difficulty,clef);
    const rng = seededRandom(seedString([clef,difficulty,checkIndex,profileKey].join('|')));
    const notes = [];
    while(notes.length < count) {
        const cycle = [...pool];
        for(let i=cycle.length-1;i>0;i--) {
            const j=Math.floor(rng()*(i+1));
            [cycle[i],cycle[j]]=[cycle[j],cycle[i]];
        }
        for(const note of cycle) {
            if(notes.length >= count) break;
            if(note === notes.at(-1) && cycle.length>1) {
                const alternate=cycle.find(n=>n!==note && !notes.slice(-2).includes(n));
                if(alternate) { notes.push(alternate); continue; }
            }
            notes.push(note);
        }
    }
    return { notes, durations: Array(notes.length).fill(1), kind:'check', clef,difficulty };
}

function summarizeOutcomes(outcomes) {
    const total = outcomes.length;
    const firstTry = outcomes.filter(x => x.firstTryCorrect).length;
    const times = outcomes.map(x=>x.latencyMs).filter(x=>Number.isFinite(x) && x>=0);
    return {
        total, correct:firstTry,
        score: total ? Math.round(firstTry*100/total) : 0,
        avgResponseMs: times.length ? Math.round(times.reduce((a,b)=>a+b,0)/times.length) : null
    };
}

export function finishLearningSession(learning, { mode, clef, difficulty, outcomes, at=Date.now() }) {
    if (!['practice','check'].includes(mode)) throw new Error('Unsupported learning session');
    const summary = summarizeOutcomes(outcomes);
    const row = { ...summary, mode, clef, difficulty, at };
    if(mode === 'check') {
        learning.checkCount++;
        learning.checks.push(row);
        learning.checks = learning.checks.slice(-24);
    } else {
        learning.sessions.push(row);
        learning.sessions = learning.sessions.slice(-30);
    }
    return row;
}

export function progressSummary(learning, clef, difficulty) {
    const pool = availablePitches(difficulty,clef);
    const practiced = pool.filter(n=>(learning?.notes?.[clef+':'+n]?.attempts||0)>0).length;
    const mastered = pool.filter(n=>(learning?.notes?.[clef+':'+n]?.attempts||0)>=5
        && noteMastery(learning,clef,n)>=0.8).length;
    const checks = (learning?.checks||[]).filter(x=>x.clef===clef&&x.difficulty===difficulty).slice(-8);
    const sessions = (learning?.sessions||[]).filter(x=>x.clef===clef&&x.difficulty===difficulty).slice(-8);
    return { practiced, mastered, total:pool.length, weak:weakestNotes(learning,clef,difficulty),
        checks, sessions };
}
