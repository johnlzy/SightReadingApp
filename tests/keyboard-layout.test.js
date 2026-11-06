import test from 'node:test';
import assert from 'node:assert/strict';
import {keyboardWhiteWidth,keyboardContentWidth,initialKeyboardLeft,shiftedKeyboardLeft}
 from '../js/keyboard-layout.js';
import {gameHitLineX,timedScoreTranslation,expectedScoreNoteX,pointerOnsetMs,neighboringBeats}
 from '../js/playback-geometry.js';

test('compact piano keys stay narrow across large ranges and all viewport sizes',()=>{
 const phone=keyboardWhiteWidth(390,22,'compact');
 const tablet=keyboardWhiteWidth(768,22,'compact');
 const desktop=keyboardWhiteWidth(1280,22,'compact');
 assert.ok(phone>=26&&phone<=32);
 assert.ok(tablet>=26&&tablet<=32);
 assert.ok(desktop>=26&&desktop<=32);
 assert.ok(keyboardWhiteWidth(390,22,'comfortable')>phone);
 assert.ok(keyboardContentWidth(phone,22)>390);
 assert.throws(()=>keyboardWhiteWidth(390,20,'impossibly-large'),/Unsupported/);
});
test('manual octave shifts are clamped and do not depend on the next note',()=>{
 const w=keyboardWhiteWidth(390,28,'compact');
 const total=keyboardContentWidth(w,28);
 assert.equal(initialKeyboardLeft(0,w,390,total),0);
 const next=shiftedKeyboardLeft(0,w,1,390,total);
 assert.equal(next,w*7);
 assert.equal(shiftedKeyboardLeft(next,w,-1,390,total),0);
 assert.equal(shiftedKeyboardLeft(1e6,w,1,390,total),total-390);
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
      const noteX=expectedScoreNoteX({
        durations,index,nowMs:at,startMs,bpm,hitX
      });
      assert.ok(Math.abs(noteX-hitX)<0.01);
      beats+=durations[index];
   }
 }
});
test('touch uses hardware pointer event time instead of late callback time',()=>{
 const wall=1731000000000,mono=4200;
 assert.equal(pointerOnsetMs({timeStamp:4132},wall,mono),wall-68);
 assert.equal(pointerOnsetMs({timeStamp:Date.now()},wall,mono),wall);
 assert.equal(pointerOnsetMs(null,wall,mono),wall);
});
test('shortest neighboring duration protects dense rhythms from overlap',()=>{
 assert.equal(neighboringBeats([1,0.5,1],1),0.5);
 assert.equal(neighboringBeats([2,1,1],0),1);
 assert.equal(neighboringBeats([],0),1);
});
