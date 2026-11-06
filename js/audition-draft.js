import { auditionExercise, MAX_AUTOMATED_AUDITION_LEVEL } from './audition.js';

/**
 * One resumable First Concert per local child. Do not persist a microphone stream,
 * DOM node, callback or input timestamp. Always regenerate the fixed score
 * from the stored nonce and profile ID to detect corrupt/tampered snapshots.
 */
export function snapshotAudition(session) {
    if (!session || session.complete || typeof session.profileId !== 'string') return null;
    return {
        version:1, profileId:session.profileId, clef:session.clef,
        level:session.level, nonce:session.nonce,
        index:session.index, firstTry:session.firstTry,
        attempted:Boolean(session.attempted),
        rounds:session.rounds.map(r=>({...r})).slice(-12),
        higherChallengeSeen:Boolean(session.higherChallengeSeen),
        updatedAt:Date.now()
    };
}

export function restoreAudition(player, draft) {
    if (!player?.profileId || !draft || draft.version!==1 ||
        draft.profileId!==player.profileId ||
        !['treble','bass'].includes(draft.clef) ||
        !Number.isInteger(draft.level) || draft.level<1 ||
        draft.level>MAX_AUTOMATED_AUDITION_LEVEL ||
        !Number.isInteger(draft.nonce) || draft.nonce<0 || draft.nonce>12 ||
        !Number.isInteger(draft.index) || draft.index<0 || draft.index>8 ||
        !Number.isInteger(draft.firstTry) || draft.firstTry<0 ||
        draft.firstTry>draft.index || !Array.isArray(draft.rounds) ||
        draft.rounds.length>12) return null;
    const rounds=draft.rounds.filter(r=>
        Number.isInteger(r.level) && r.level>=1 &&
        r.level<=MAX_AUTOMATED_AUDITION_LEVEL &&
        Number.isInteger(r.nonce) && r.nonce>=0 && r.nonce<=draft.nonce &&
        r.total===8 && Number.isInteger(r.firstTry) &&
        r.firstTry>=0 && r.firstTry<=8 &&
        r.score===Math.round(100*r.firstTry/8)
    );
    if(rounds.length!==draft.rounds.length ||
        new Set(rounds.map(r=>r.nonce)).size!==rounds.length) return null;
    const active=auditionExercise(draft.level,draft.clef,draft.nonce,player.profileId);
    return {
        profileId:player.profileId, clef:draft.clef, level:draft.level,
        nonce:draft.nonce,index:draft.index,firstTry:draft.firstTry,
        attempted:Boolean(draft.attempted), rounds,
        active,complete:false,higherChallengeSeen:Boolean(draft.higherChallengeSeen)
    };
}

export function auditionProgressLabel(draft) {
    if(!draft || !Number.isInteger(draft.index))return 'Play my first concert';
    return 'Resume my concert · '+Math.min(8,draft.index)+'/8 notes';
}
