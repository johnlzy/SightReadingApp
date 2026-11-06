import test from 'node:test';
import assert from 'node:assert/strict';
import { staffY, ledgerLineYs, staffLines, clefSvg } from '../js/notation.js';
import {createScoreDocument,staticScoreSvg,scorePageCount} from '../js/score.js';

test('treble geometry: bottom E4, G4 line, middle C ledger below',()=>{
  assert.deepEqual(staffLines(120,20),[120,140,160,180,200]);
  assert.equal(staffY('E4','treble',120,20),200);
  assert.equal(staffY('G4','treble',120,20),180);
  assert.equal(staffY('C4','treble',120,20),220);
  assert.deepEqual(ledgerLineYs('C4','treble',120,20),[220]);
  assert.deepEqual(ledgerLineYs('D4','treble',120,20),[]);
  assert.deepEqual(ledgerLineYs('A5','treble',120,20),[100]);
});
test('bass geometry: bottom G2, C3 space, F3 line, middle C ledger above',()=>{
  assert.equal(staffY('G2','bass',120,20),200);
  assert.equal(staffY('C3','bass',120,20),170);
  assert.equal(staffY('F3','bass',120,20),140);
  assert.equal(staffY('A3','bass',120,20),120);
  assert.equal(staffY('C4','bass',120,20),100);
  assert.deepEqual(ledgerLineYs('C4','bass',120,20),[100]);
  assert.deepEqual(ledgerLineYs('A2','bass',120,20),[]);
  assert.deepEqual(ledgerLineYs('E2','bass',120,20),[220]);
});
test('both clef vectors have bounded anchors and are font-independent',()=>{
  const treble=clefSvg('treble',12,120,20);
  const bass=clefSvg('bass',12,120,20);
  assert.match(treble,/data-clef="treble"/);
  assert.match(bass,/data-clef="bass"/);
  assert.match(treble,/data-anchor-y="180"/);
  assert.match(bass,/data-anchor-y="140"/);
  assert.match(treble,/<path d="M314/);
  assert.match(bass,/<path d="M50/);
  assert.doesNotMatch(treble,/font-family|𝄞/);
  assert.doesNotMatch(bass,/font-family|𝄢/);
});
test('static score shares exact treble/bass coordinates and keeps page stationary',()=>{
  for(const [clef,notes,firstY] of [
    ['treble',['E4','G4','C4','D4','E4','F4','G4','A4'],148],
    ['bass',['G2','C3','F3','C4','G2','A2','B2','C3'],148]
  ]){
    const score=createScoreDocument({notes,durations:notes.map(()=>1),clef});
    const markup=staticScoreSvg(score);
    assert.match(markup,new RegExp('data-clef="'+clef+'"'));
    assert.match(markup,/class="score-note"/);
    assert.match(markup,/data-index="7"/);
    assert.doesNotMatch(markup,/animate-scroll|translateX|setInterval/);
    assert.equal(scorePageCount(score),1);
  }
});
test('a 16-note score is paged manually with distinct notes and no moving cursor',()=>{
  const notes=['E4','F4','G4','A4','B4','C5','D5','E5','D5','C5','B4','A4','G4','F4','E4','D4'];
  const score=createScoreDocument({notes,durations:notes.map(()=>1),clef:'treble'});
  const first=staticScoreSvg(score,{page:0});
  const second=staticScoreSvg(score,{page:1});
  assert.equal(scorePageCount(score),2);
  assert.match(first,/data-index="0"/);
  assert.doesNotMatch(first,/data-index="8"/);
  assert.match(second,/data-index="8"/);
  assert.doesNotMatch(second,/data-index="0"/);
  assert.match(second,/page 2 of 2/);
  assert.throws(()=>staticScoreSvg(score,{page:2}),/page out of range/);
});
