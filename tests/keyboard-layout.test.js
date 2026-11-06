import test from 'node:test';
import assert from 'node:assert/strict';
import {keyboardWhiteWidth,keyboardContentWidth,initialKeyboardLeft,
    shiftedKeyboardLeft} from '../js/keyboard-layout.js';
import {gameHitLineX,timedScoreTranslation,expectedScoreNoteX,
    pointerOnsetMs,neighboringBeats} from '../js/playback-geometry.js';

test('the white keys are consistently finger-sized across phone, tablet and desktop',()=>{
    for(const width of [320,360,390,768,844,1280]){
        for(const noteCount of [5,7,14,22,40]){
            const key=keyboardWhiteWidth(width,noteCount);
            assert.ok(key>=46&&key<=66,`Unexpected ${key}px key on ${width}px screen`);
        }
    }
    assert.ok(keyboardWhiteWidth(390,22)>=54);
    assert.ok(keyboardWhiteWidth(768,22)>=56);
    assert.ok(keyboardWhiteWidth(1280,22)>=56);
    // Five beginner notes must not stretch to giant widths.
    assert.equal(keyboardWhiteWidth(390,5),66);
    // Advanced range does not force the same notes into tiny keys.
    assert.equal(keyboardWhiteWidth(390,40),keyboardWhiteWidth(390,14));
    assert.throws(()=>keyboardWhiteWidth(0,9),/Invalid piano geometry/);
});
test('long scores pan by octave instead of shrinking every key',()=>{
    const key=keyboardWhiteWidth(390,34);
    const total=keyboardContentWidth(key,34);
    assert.ok(total>390);
    assert.equal(initialKeyboardLeft(0,key,390,total),0);
    const oneOctave=shiftedKeyboardLeft(0,key,1,390,total);
    assert.equal(oneOctave,key*7);
    assert.equal(shiftedKeyboardLeft(oneOctave,key,-1,390,total),0);
    assert.equal(shiftedKeyboardLeft(1e6,key,1,390,total),total-390);
});
test('short beginner keyboard fits naturally without being stretched full-screen',()=>{
    const key=keyboardWhiteWidth(390,5);
    assert.equal(keyboardContentWidth(key,5),330);
    assert.equal(initialKeyboardLeft(10,key,390,390),0);
});
test('score play marker and current note share one independent clock',()=>{
    for(const [width,height] of [[390,420],[844,190],[768,580],[1280,450]]){
        const hitX=gameHitLineX(width,height);
        assert.ok(hitX>=185&&hitX<=440);
        const startMs=10000,bpm=90;
        const durations=[1,0.5,0.5,2];
        let beats=0;
        for(let index=0;index<durations.length;index++){
            const at=startMs+beats*60000/bpm;
            const noteX=expectedScoreNoteX({durations,index,
                nowMs:at,startMs,bpm,hitX});
            assert.ok(Math.abs(noteX-hitX)<0.01);
            beats+=durations[index];
        }
    }
});
test('touch uses original event timestamp rather than delayed callback',()=>{
    const wall=1731000000000,mono=4200;
    assert.equal(pointerOnsetMs({timeStamp:4132},wall,mono),wall-68);
    assert.equal(pointerOnsetMs({timeStamp:Date.now()},wall,mono),wall);
    assert.equal(pointerOnsetMs(null,wall,mono),wall);
});
test('adjacent note duration protects dense rhythms from overlap',()=>{
    assert.equal(neighboringBeats([1,0.5,1],1),0.5);
    assert.equal(neighboringBeats([2,1,1],0),1);
    assert.equal(neighboringBeats([],0),1);
});
