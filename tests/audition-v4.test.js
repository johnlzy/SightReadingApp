import test from 'node:test';
import assert from 'node:assert/strict';
import { beginAudition, auditionExercise, submitAuditionNote,
    nextAuditionRound, finalizeAudition, finishAuditionRound, skipAuditionNote } from '../js/audition.js';
import { createScoreDocument, staticScoreSvg } from '../js/score.js';

test('a new learner starts with notes and gets a provisional, not locked placement',()=>{
    const learner={profileId:'child-1',startingComfort:'new'};
    const a=beginAudition(learner);
    assert.equal(a.level,1);
    a.active.notes.forEach(n=>submitAuditionNote(a,n));
    const first=finishAuditionRound(a);
    assert.equal(first.score,100);
    nextAuditionRound(a);
    assert.equal(a.level,2);
    a.active.notes.forEach(n=>submitAuditionNote(a,n));
    const p=finalizeAudition(a,learner);
    assert.equal(p.status,'provisional');
    assert.equal(p.confidence,'medium');
    assert.ok(learner.readingLevel>=2);
});
test('experienced learners may start higher and choose harder material without grinding',()=>{
    const learner={profileId:'advanced',startingComfort:'experienced'};
    const a=beginAudition(learner);
    assert.equal(a.level,4);
    for(let i=0;i<a.active.notes.length;i++)skipAuditionNote(a);
    finishAuditionRound(a);
    nextAuditionRound(a,{stretch:true});
    assert.equal(a.level,5);
    a.active.notes.forEach(n=>submitAuditionNote(a,n));
    const placement=finalizeAudition(a,learner);
    assert.ok(placement.level>=5);
    assert.equal(a.higherChallengeSeen,true);
});
test('wrong attempts cannot turn into inflated first-try scores',()=>{
    const a=beginAudition({profileId:'a',startingComfort:'new'});
    const wrong=a.active.notes[0]==='C4'?'D4':'C4';
    assert.equal(submitAuditionNote(a,wrong).status,'retry');
    assert.equal(submitAuditionNote(a,a.active.notes[0]).status,'correct');
    assert.equal(a.firstTry,0);
});
test('audition excerpts differ by nonce and clef but remain valid static scores',()=>{
    const treble=auditionExercise(4,'treble',1,'student');
    const bass=auditionExercise(4,'bass',1,'student');
    assert.equal(treble.notes.length,8);
    assert.notDeepEqual(treble.notes,bass.notes);
    assert.ok(bass.notes.every(n=>n.match(/\d/)));
    const score=createScoreDocument(treble);
    const svg=staticScoreSvg(score);
    assert.match(svg,/stationary treble clef/);
    assert.doesNotMatch(svg,/translateX|animate-scroll|scrollTo/);
    assert.match(svg,/<ellipse/);
    assert.throws(()=>createScoreDocument({notes:['Z9'],durations:[1]}),/Invalid note/);
});
