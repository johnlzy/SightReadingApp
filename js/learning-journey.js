import { availablePitches, noteMastery } from './learning.js';

const DAY=24*60*60*1000;
const REVIEW_INTERVALS=[1,3,7,14];
const MOTIFS=[
    [0,1,2,1,0,1,0,0],
    [0,2,3,2,1,0,1,0],
    [0,1,3,2,1,2,0,0],
    [0,0,2,1,3,2,1,0],
    [0,2,4,3,2,1,0,0],
    [0,1,0,2,3,2,1,0]
];
const CHECK_MOTIFS=[
    [0,2,1,3,4,2,1,0],
    [0,1,3,4,2,0,2,1],
    [0,3,2,4,3,1,2,0],
    [0,2,4,2,1,3,1,0]
];
function hash(text) {
    let h=2166136261;
    for(const c of String(text))h=Math.imul(h^c.charCodeAt(0),16777619);
    return h>>>0;
}
export function ensureJourney(user) {
    if(!user.journey || user.journey.version!==1) {
        user.journey={version:1,phrases:[],checks:[],
            practiceCount:0,checkCount:0};
    }
    const j=user.journey;
    if(!Array.isArray(j.phrases))j.phrases=[];
    if(!Array.isArray(j.checks))j.checks=[];
    if(!Number.isInteger(j.practiceCount)||j.practiceCount<0)j.practiceCount=0;
    if(!Number.isInteger(j.checkCount)||j.checkCount<0)j.checkCount=0;
    j.phrases=j.phrases.slice(-30);
    j.checks=j.checks.slice(-24);
    return j;
}

/** A learned pitch is due for spaced review after increasingly long delays. */
export function dueReviewNotes(learning,clef,difficulty,now=Date.now()) {
    return availablePitches(difficulty,clef).map(note=>{
        const entry=learning?.notes?.[clef+':'+note];
        if(!entry||!entry.attempts||!Number.isFinite(entry.lastSeen))return null;
        const mastery=noteMastery(learning,clef,note);
        const streak=Number.isFinite(entry.streak)?entry.streak:0;
        const days=REVIEW_INTERVALS[Math.min(REVIEW_INTERVALS.length-1,
            Math.max(0,Math.floor(streak/3)))];
        const dueAt=entry.lastSeen+days*DAY;
        return {note,mastery,dueAt,overdueDays:(now-dueAt)/DAY};
    }).filter(x=>x&&x.dueAt<=now)
        .sort((a,b)=>b.overdueDays-a.overdueDays||a.mastery-b.mastery);
}
export function chooseReadingFocus(user,clef='treble',now=Date.now()) {
    const difficulty=user?.difficulty||'easy';
    const pool=availablePitches(difficulty,clef);
    const due=dueReviewNotes(user?.learning,clef,difficulty,now);
    if(due.length)return {note:due[0].note,reason:'review',
        description:'Revisit '+due[0].note+' to keep yesterday’s skill growing.'};
    const attempted=pool.filter(n=>(user?.learning?.notes?.[clef+':'+n]?.attempts||0)>=2)
        .sort((a,b)=>noteMastery(user.learning,clef,a)-noteMastery(user.learning,clef,b));
    if(attempted.length&&noteMastery(user.learning,clef,attempted[0])<0.72) {
        return {note:attempted[0],reason:'focus',
            description:'Give '+attempted[0]+' another gentle look today.'};
    }
    const unseen=pool.find(n=>!user?.learning?.notes?.[clef+':'+n]?.attempts);
    return {note:unseen||pool[0],reason:unseen?'new':'apply',
        description:unseen
            ? 'Meet '+unseen+' inside a little melody.'
            : 'Try a fresh melody using notes you already know.'};
}

/** Generate coherent, playable monophonic two- or four-bar phrases.
 * Held-out checks use DIFFERENT motif sets and do not consult mastery.
 * This deliberately does not claim polyphonic Grade-8 readiness. */
export function generateReadingPhrase(user,{
    clef='treble',level=user?.readingLevel||1,kind='practice',
    nonce=null
}={}) {
    if(!['practice','check'].includes(kind))throw new Error('Invalid phrase kind');
    if(!['treble','bass'].includes(clef))throw new Error('Invalid clef');
    const j=ensureJourney(user);
    const check=kind==='check';
    const index=nonce??(check?j.checkCount:j.practiceCount);
    const tiers=Math.max(1,Math.min(6,Math.trunc(level)||1));
    const difficulty=tiers<=2?'easy':tiers>=5?'hard':'medium';
    const pool=availablePitches(difficulty,clef);
    const motifs=check?CHECK_MOTIFS:MOTIFS;
    const seed=hash([user.profileId,clef,tiers,kind,index].join(':'));
    const motif=motifs[seed%motifs.length];
    let firstIndex=(seed>>>5)%Math.max(1,pool.length-4);
    if(!check) {
        const focus=chooseReadingFocus(user,clef);
        const found=pool.indexOf(focus.note);
        if(found>=0)firstIndex=Math.min(pool.length-5,found);
    }
    const phrase=motif.map(offset=>pool[Math.min(pool.length-1,firstIndex+offset)]);
    // One note per beat, two complete 4/4 bars, with a recognizable contour.
    const second=tiers>=4
        ? motif.map((offset,i)=>pool[Math.max(0,
            Math.min(pool.length-1,firstIndex+offset+(i<4?1:0)))])
        :[];
    const notes=[...phrase,...second];
    return {
        notes,durations:Array(notes.length).fill(1),clef,
        level:tiers,kind,firstSight:true,bpm:72,
        title:check?'Fresh Sight-Reading Check':'A Melody to Discover',
        focus:check?null:chooseReadingFocus(user,clef),
        excerptId:kind+':'+user.profileId+':'+clef+':'+tiers+':'+index
    };
}

export function finishReadingPhrase(user,{
    kind,clef,level,notes,outcomes,excerptId,hintsUsed=false,
    sessionId,at=Date.now()
}) {
    if(!['practice','check'].includes(kind))throw new Error('Invalid phrase kind');
    if(!Array.isArray(notes)||!notes.length||!Array.isArray(outcomes)||
        outcomes.length!==notes.length)throw new Error('A full phrase is required');
    const j=ensureJourney(user);
    const table=kind==='check'?j.checks:j.phrases;
    if(table.some(x=>x.sessionId===sessionId))return table.find(x=>x.sessionId===sessionId);
    const correct=outcomes.filter(x=>x.firstTryCorrect).length;
    const row={sessionId,excerptId,clef,level,total:outcomes.length,correct,
        score:Math.round(correct*100/outcomes.length),
        assisted:Boolean(hintsUsed),at,kind};
    if(kind==='check') {
        if(hintsUsed)throw new Error('Independent check cannot use hints');
        j.checkCount++;
        j.checks.push(row);
        j.checks=j.checks.slice(-24);
    } else {
        j.practiceCount++;
        j.phrases.push(row);
        j.phrases=j.phrases.slice(-30);
    }
    return row;
}
export function readingJourneySummary(user,clef='treble',now=Date.now()) {
    const j=ensureJourney(user);
    const checks=j.checks.filter(x=>x.clef===clef).slice(-6);
    const practice=j.phrases.filter(x=>x.clef===clef).slice(-6);
    const due=dueReviewNotes(user.learning,clef,user.difficulty||'easy',now);
    const last=checks.at(-1)||null;
    return {level:Math.min(10,Math.max(1,user.readingLevel||1)),checks,practice,
        due:due.slice(0,3),focus:chooseReadingFocus(user,clef,now),last};
}
