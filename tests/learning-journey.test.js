import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureLearning, recordOutcome } from '../js/learning.js';
import { ensureJourney, dueReviewNotes, chooseReadingFocus, generateReadingPhrase,
    finishReadingPhrase, readingJourneySummary } from '../js/learning-journey.js';

test('spaced-review due dates prioritize retained notes without fake forgetting penalties',()=>{
    const player={profileId:'one',difficulty:'easy',readingLevel:2};
    const learning=ensureLearning(player);
    const now=Date.UTC(2026,10,6);
    recordOutcome(learning,{clef:'treble',note:'F4',firstTryCorrect:true});
    learning.notes['treble:F4'].lastSeen=now-2*86400000;
    const due=dueReviewNotes(learning,'treble','easy',now);
    assert.equal(due[0].note,'F4');
    assert.equal(chooseReadingFocus(player,'treble',now).reason,'review');
    assert.equal(dueReviewNotes(learning,'bass','easy',now).length,0);
});
test('generated practice uses coherent 4/4 phrases, heldout check is mastery-blind',()=>{
    const player={profileId:'reader-A',difficulty:'medium',readingLevel:4};
    const learning=ensureLearning(player);
    for(let i=0;i<12;i++)recordOutcome(learning,{clef:'treble',note:'F4',firstTryCorrect:false});
    const training=generateReadingPhrase(player,{clef:'treble',kind:'practice'});
    const check=generateReadingPhrase(player,{clef:'treble',kind:'check'});
    assert.equal(training.notes.length,16);
    assert.equal(training.durations.reduce((a,b)=>a+b,0),16);
    assert.equal(check.notes.length,16);
    assert.equal(check.durations.reduce((a,b)=>a+b,0),16);
    assert.ok(training.notes.every(n=>/^[A-G][#b]?\d+$/.test(n)));
    assert.notDeepEqual(training.notes,check.notes);
    const before=JSON.stringify(learning.notes);
    const afterCheck=generateReadingPhrase(player,{clef:'treble',kind:'check'});
    assert.deepEqual(afterCheck.notes,check.notes);
    assert.equal(JSON.stringify(learning.notes),before);
});
test('completed independent phrase checks are separate from adaptive practice',()=>{
    const user={profileId:'reader-B',difficulty:'easy',readingLevel:3};
    const learning=ensureLearning(user);
    const before=JSON.stringify(learning.notes);
    const spec=generateReadingPhrase(user,{kind:'check',clef:'treble'});
    const outcomes=spec.notes.map(n=>({note:n,firstTryCorrect:true}));
    const result=finishReadingPhrase(user,{
        kind:'check',clef:'treble',level:spec.level,notes:spec.notes,
        outcomes,sessionId:'check-001',excerptId:spec.excerptId
    });
    assert.equal(result.score,100);
    assert.equal(ensureJourney(user).checkCount,1);
    assert.equal(ensureJourney(user).practiceCount,0);
    assert.equal(JSON.stringify(learning.notes),before);
    assert.equal(finishReadingPhrase(user,{
        kind:'check',clef:'treble',level:spec.level,notes:spec.notes,
        outcomes,sessionId:'check-001',excerptId:spec.excerptId
    }).sessionId,'check-001');
    assert.equal(ensureJourney(user).checkCount,1);
    assert.equal(readingJourneySummary(user,'treble').last.score,100);
    assert.notDeepEqual(generateReadingPhrase(user,{kind:'check'}).notes,spec.notes);
});
test('assisted practice records hints; checks cannot be assisted or incomplete',()=>{
    const user={profileId:'reader-c',difficulty:'easy',readingLevel:1};
    const p=generateReadingPhrase(user,{kind:'practice'});
    const outcomes=p.notes.map(n=>({note:n,firstTryCorrect:true}));
    const row=finishReadingPhrase(user,{
        kind:'practice',clef:'treble',level:p.level,
        notes:p.notes,outcomes,sessionId:'practice-1',
        excerptId:p.excerptId,hintsUsed:true
    });
    assert.equal(row.assisted,true);
    assert.equal(ensureJourney(user).phrases.length,1);
    assert.throws(()=>finishReadingPhrase(user,{
        kind:'check',clef:'treble',level:1,notes:p.notes,
        outcomes:outcomes.slice(0,3),sessionId:'bad'
    }),/full phrase/);
    assert.throws(()=>finishReadingPhrase(user,{
        kind:'check',clef:'treble',level:1,notes:p.notes,
        outcomes,sessionId:'assisted',hintsUsed:true
    }),/cannot use hints/);
});

test('experience hint changes initial phrase complexity without awarding a learning level',()=>{
    const beginner={profileId:'child-younger',difficulty:'easy',startingComfort:'new',readingLevel:null};
    const advanced={profileId:'child-older',difficulty:'pro',startingComfort:'experienced',readingLevel:null};
    assert.equal(readingJourneySummary(beginner).level,null);
    assert.equal(readingJourneySummary(advanced).level,null);
    const simple=generateReadingPhrase(beginner,{kind:'practice'});
    const rich=generateReadingPhrase(advanced,{kind:'practice'});
    assert.equal(simple.level,1);
    assert.equal(simple.notes.length,8);
    assert.equal(rich.level,4);
    assert.equal(rich.notes.length,16);
    assert.equal(advanced.readingLevel,null);
});
