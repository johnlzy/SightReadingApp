import { noteToMidi, midiToNote } from './music.js';

/** Musical contours rotate into new combinations; always monophonic in v4.0. */
const MOTIFS = [
    [0,1,2,1,0,2,3,2],
    [0,2,1,3,2,1,0,1],
    [0,1,3,2,4,3,1,0],
    [0,2,4,3,1,2,0,1]
];
const POOLS = {
    1:['C4','D4','E4','F4','G4'],
    2:['C4','D4','E4','F4','G4','A4','B4','C5'],
    3:['C4','D4','E4','F4','G4','A4','B4','C5','F#4'],
    4:['C4','D4','E4','F#4','G4','A4','B4','C5','D5','E5'],
    5:['G3','A3','B3','C4','D4','E4','F#4','G4','A4','B4','C5','D5'],
    6:['F3','G3','A3','B3','C4','D4','E4','F#4','G4','A4','B4','C5']
};
export const MAX_AUTOMATED_AUDITION_LEVEL = 6;

function checksum(value) {
    let hash=2166136261;
    for(const char of String(value)) hash=Math.imul(hash^char.charCodeAt(0),16777619);
    return hash>>>0;
}
export function auditionExercise(level, clef='treble', nonce=0, profileKey='player') {
    const bounded=Math.max(1,Math.min(MAX_AUTOMATED_AUDITION_LEVEL,Math.trunc(level)));
    const pool=POOLS[bounded];
    const seed=checksum([profileKey,nonce,bounded,clef].join(':'));
    const motif=MOTIFS[seed%MOTIFS.length];
    const start=(seed>>>5)%Math.max(1,pool.length-5);
    const indexes=motif.map(offset=>(start+offset)%pool.length);
    const notes=indexes.map(i => {
        const midi=noteToMidi(pool[i])-(clef==='bass'?12:0);
        return midiToNote(midi);
    });
    return {
        level: bounded, clef, notes, durations:Array(8).fill(1),
        title: 'First Concert · Melody '+(nonce+1),
        kind:'audition', bpm: 72
    };
}

export function beginAudition(player, clef='treble') {
    const start=player?.readingLevel ?? (
        player?.startingComfort === 'experienced' ? 4 :
        player?.startingComfort === 'some' ? 2 : 1
    );
    const level=Math.min(MAX_AUTOMATED_AUDITION_LEVEL,Math.max(1,start));
    return { level, clef, nonce:0, index:0, firstTry:0,
        attempted:false, rounds:[], active:auditionExercise(level,clef,0,player?.profileId),
        profileId:player?.profileId, complete:false, higherChallengeSeen:false
    };
}

export function submitAuditionNote(session, pitch) {
    if(session.complete || session.index>=session.active.notes.length) return { status:'finished' };
    const correct=pitch===session.active.notes[session.index];
    if(correct) {
        if(!session.attempted) session.firstTry++;
        session.index++;
        session.attempted=false;
        return { status:'correct',done:session.index>=session.active.notes.length };
    }
    session.attempted=true;
    return { status:'retry',done:false };
}
export function skipAuditionNote(session) {
    if(session.complete || session.index>=session.active.notes.length) return;
    session.index++;
    session.attempted=false;
}
export function finishAuditionRound(session) {
    const size=session.active.notes.length;
    if(session.index<size)throw new Error('Audition phrase incomplete');
    const result={ level:session.level, firstTry:session.firstTry,
        total:size, score:Math.round(100*session.firstTry/size), nonce:session.nonce };
    session.rounds.push(result);
    return result;
}

export function nextAuditionRound(session, { stretch=false }={}) {
    if(session.complete)throw new Error('Placement already finished');
    if(session.index<session.active.notes.length)throw new Error('Finish current phrase first');
    if(!session.rounds.some(r=>r.nonce===session.nonce)) finishAuditionRound(session);
    const latest=session.rounds.at(-1);
    if(stretch) session.higherChallengeSeen=true;
    const newLevel=stretch ? Math.min(MAX_AUTOMATED_AUDITION_LEVEL,session.level+1)
        : latest.score>=75 ? Math.min(MAX_AUTOMATED_AUDITION_LEVEL,session.level+1)
        : latest.score<35 ? Math.max(1,session.level-1) : session.level;
    session.level=newLevel;
    session.nonce++;
    session.index=0;
    session.firstTry=0;
    session.attempted=false;
    session.active=auditionExercise(newLevel,session.clef,session.nonce,session.profileId);
    return session.active;
}

export function finalizeAudition(session, player) {
    if(session.index>=session.active.notes.length &&
        !session.rounds.some(r=>r.nonce===session.nonce)) finishAuditionRound(session);
    const good=session.rounds.filter(r=>r.score>=75);
    const high=Math.max(0,...good.map(r=>r.level));
    // No amount of one-voice microphone evidence certifies polyphonic reading.
    const suggested=Math.max(1,Math.min(MAX_AUTOMATED_AUDITION_LEVEL+1,high?high+1:session.level));
    const confidence=session.rounds.length>=2?'medium':'low';
    const placement={
        status:'provisional',level:suggested,confidence,results:session.rounds.slice(-8),
        lastAuditionAt:new Date().toISOString(),source:'friendly-audition'
    };
    player.placement=placement;
    player.readingLevel=suggested;
    session.complete=true;
    return placement;
}
