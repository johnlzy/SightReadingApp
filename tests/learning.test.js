import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ensureLearning, availablePitches, noteMastery, weakestNotes,
    recordOutcome, generateAdaptiveExercise, generateSkillCheck,
    finishLearningSession, progressSummary
} from '../js/learning.js';

test('legacy players get learning data without losing scores or saved instruments', () => {
    const user = { scores:{coin:{easy:[7]}}, instruments:['piano','flute'] };
    const learning = ensureLearning(user);
    assert.equal(learning.version, 1);
    assert.deepEqual(learning.checks, []);
    assert.deepEqual(user.scores.coin.easy,[7]);
    assert.deepEqual(user.instruments,['piano','flute']);
    assert.equal(ensureLearning(user),learning);
});

test('mastery tracks first-try outcomes per clef independently', () => {
    const learning=ensureLearning({});
    for(let i=0;i<8;i++){
        recordOutcome(learning,{clef:'treble',note:'F4',firstTryCorrect:false,latencyMs:1800});
        recordOutcome(learning,{clef:'treble',note:'C4',firstTryCorrect:true,latencyMs:350});
    }
    recordOutcome(learning,{clef:'bass',note:'F3',firstTryCorrect:true,latencyMs:300});
    assert.ok(noteMastery(learning,'treble','C4')>noteMastery(learning,'treble','F4'));
    assert.equal(weakestNotes(learning,'treble','easy')[0].note,'F4');
    assert.equal(learning.notes['treble:F4'].attempts,8);
    assert.equal(learning.notes['treble:C4'].recent.length,8);
    assert.equal(learning.notes['bass:F3'].attempts,1);
});

test('adaptive practice preferentially revisits demonstrated weak notes', () => {
    const learning=ensureLearning({});
    for(let i=0;i<10;i++) {
        recordOutcome(learning,{clef:'treble',note:'F4',firstTryCorrect:false});
        recordOutcome(learning,{clef:'treble',note:'C4',firstTryCorrect:true});
    }
    let i=0;
    const values=[0.1,0.2,0.8,0.3,0.5,0.9];
    const rng=()=>values[i++%values.length];
    const exercise=generateAdaptiveExercise(learning,{clef:'treble',difficulty:'easy',count:40,rng});
    assert.equal(exercise.notes.length,40);
    assert.ok(exercise.notes.filter(n=>n==='F4').length>=12);
    assert.ok(exercise.notes.every(n=>availablePitches('easy','treble').includes(n)));
    assert.ok(exercise.durations.every(d=>d===1));
});

test('pro adaptive rhythm contains exactly four complete bars and valid durations', () => {
    const learning=ensureLearning({});
    for(let i=0;i<6;i++) {
        recordOutcome(learning,{clef:'bass',note:'C3',duration:0.5,firstTryCorrect:false,rhythmGrade:'early'});
    }
    const exercise=generateAdaptiveExercise(learning,{clef:'bass',difficulty:'pro',rng:()=>0.32});
    assert.ok(exercise.notes.length>=4);
    assert.equal(exercise.notes.length,exercise.durations.length);
    assert.equal(exercise.durations.reduce((a,b)=>a+b,0),16);
    assert.ok(exercise.durations.every(x=>[0.5,1,1.5,2,3,4].includes(x)));
});

test('skill checks are deterministic, balanced and do not consult mastery weights', () => {
    const options={clef:'treble',difficulty:'hard',count:26,checkIndex:2,profileKey:'example'};
    const first=generateSkillCheck(options);
    assert.deepEqual(first,generateSkillCheck(options));
    assert.notDeepEqual(first.notes,generateSkillCheck({...options,checkIndex:3}).notes);
    for(const note of availablePitches('hard','treble')) {
        assert.ok(first.notes.includes(note));
    }
    assert.equal(first.notes.length,26);
    assert.equal(first.durations.length,26);
    assert.ok(first.durations.every(d=>d===1));
});

test('skill-check scores do not alter mastery and remain personal to clef/difficulty', () => {
    const learning=ensureLearning({});
    recordOutcome(learning,{clef:'treble',note:'C4',firstTryCorrect:false});
    const before=JSON.stringify(learning.notes);
    const outcomes=[
        {note:'C4',firstTryCorrect:true,latencyMs:500},
        {note:'D4',firstTryCorrect:false,latencyMs:1000}
    ];
    const result=finishLearningSession(learning,{
        mode:'check',clef:'treble',difficulty:'easy',outcomes,at:1234
    });
    assert.equal(result.score,50);
    assert.equal(result.avgResponseMs,750);
    assert.equal(learning.checkCount,1);
    assert.equal(JSON.stringify(learning.notes),before);
    const progress=progressSummary(learning,'treble','easy');
    assert.equal(progress.checks.length,1);
    assert.equal(progress.practiced,1);
    assert.equal(progress.total,5);
    assert.equal(progressSummary(learning,'bass','easy').checks.length,0);
});

test('historical data is capped and new practice outcomes remain independent of checks', () => {
    const learning=ensureLearning({});
    const outcomes=[{note:'C4',firstTryCorrect:true,latencyMs:320}];
    for(let i=0;i<40;i++) {
        finishLearningSession(learning,{mode:'practice',clef:'treble',difficulty:'easy',outcomes,at:i});
        finishLearningSession(learning,{mode:'check',clef:'treble',difficulty:'easy',outcomes,at:i});
    }
    assert.equal(learning.sessions.length,30);
    assert.equal(learning.checks.length,24);
    assert.equal(learning.checkCount,40);
    assert.equal(learning.notes['treble:C4'],undefined);
});
