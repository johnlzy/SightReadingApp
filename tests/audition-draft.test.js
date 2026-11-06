import test from 'node:test';
import assert from 'node:assert/strict';
import { beginAudition, submitAuditionNote, finishAuditionRound, nextAuditionRound } from '../js/audition.js';
import { snapshotAudition, restoreAudition, auditionProgressLabel } from '../js/audition-draft.js';

test('resuming an unfinished concert reproduces the same phrase and exact note position',()=>{
    const player={profileId:'reader-a',startingComfort:'new'};
    const concert=beginAudition(player,'treble');
    const original=[...concert.active.notes];
    const wrong=original[0]==='C4'?'D4':'C4';
    submitAuditionNote(concert,wrong);
    submitAuditionNote(concert,original[0]);
    submitAuditionNote(concert,original[1]);
    const draft=snapshotAudition(concert);
    const loaded=restoreAudition(player,JSON.parse(JSON.stringify(draft)));
    assert.deepEqual(loaded.active.notes,original);
    assert.equal(loaded.index,2);
    assert.equal(loaded.firstTry,1);
    assert.equal(loaded.attempted,false);
    assert.equal(loaded.profileId,'reader-a');
    assert.match(auditionProgressLabel(draft),/2\/8/);
});
test('an unanswered wrong note remains a failed first attempt after reentry',()=>{
    const p={profileId:'reader-a',startingComfort:'new'};
    const concert=beginAudition(p);
    const note=concert.active.notes[0];
    submitAuditionNote(concert,note==='C4'?'D4':'C4');
    const restored=restoreAudition(p,snapshotAudition(concert));
    assert.equal(restored.index,0);
    assert.equal(restored.attempted,true);
    submitAuditionNote(restored,note);
    assert.equal(restored.firstTry,0);
    assert.equal(restored.index,1);
});
test('a finished phrase is still eligible for its original challenge and placement',()=>{
    const p={profileId:'reader-a',startingComfort:'some'};
    const a=beginAudition(p);
    for(const n of a.active.notes)submitAuditionNote(a,n);
    finishAuditionRound(a);
    const restored=restoreAudition(p,snapshotAudition(a));
    assert.equal(restored.index,8);
    assert.equal(restored.rounds.length,1);
    nextAuditionRound(restored,{stretch:true});
    assert.equal(restored.index,0);
    assert.equal(restored.nonce,1);
    assert.equal(restored.level,a.level+1);
});
test('checkpoint validation rejects siblings, corrupt indices and implausible scores',()=>{
    const p={profileId:'reader-a',startingComfort:'new'};
    const draft=snapshotAudition(beginAudition(p));
    assert.equal(restoreAudition({profileId:'reader-b'},draft),null);
    assert.equal(restoreAudition(p,{...draft,index:10}),null);
    assert.equal(restoreAudition(p,{...draft,firstTry:6}),null);
    assert.equal(restoreAudition(p,{...draft,nonce:100}),null);
    assert.equal(restoreAudition(p,{...draft,rounds:[{level:1,total:8,firstTry:3,score:100,nonce:0}]}),null);
    assert.equal(snapshotAudition({...beginAudition(p),complete:true}),null);
});
