import test from 'node:test';
import assert from 'node:assert/strict';
import {createGrandStaffDocument,grandStaffSvg,grandScorePageCount}
 from '../js/grand-staff.js';

test('independent two-staff practice has both correct clefs and musically aligned bars',()=>{
 const score=createGrandStaffDocument({level:6});
 assert.equal(score.type,'grand-staff');
 assert.equal(score.bars.length,4);
 assert.equal(score.method,'adult-observed');
 assert.equal(score.autoscroll,false);
 for(const bar of score.bars){
  assert.equal(bar.right.length,4);
  assert.equal(bar.left.length,4);
 }
 const svg=grandStaffSvg(score,{page:0,systemsPerPage:2});
 assert.match(svg,/data-staff="treble"/);
 assert.match(svg,/data-staff="bass"/);
 assert.match(svg,/data-clef="treble"/);
 assert.match(svg,/data-clef="bass"/);
 assert.match(svg,/data-pitch="C5"/);
 assert.match(svg,/data-pitch="C3"/);
 assert.doesNotMatch(svg,/animate-scroll|translateX|note-target|setInterval/);
 assert.match(svg,/human-observed, not scored by microphone/);
});
test('grand staff has explicit page turns and no hidden auto-scoring',()=>{
 const doc=createGrandStaffDocument({level:9,title:'A Garden Recital'});
 assert.ok(doc.bars[0].left.some(group=>group.length>1));
 const a=grandStaffSvg(doc,{page:0,systemsPerPage:2});
 const b=grandStaffSvg(doc,{page:1,systemsPerPage:2});
 assert.equal(grandScorePageCount(doc,2),2);
 assert.equal(grandScorePageCount(doc,1),4);
 assert.match(a,/page 1 of 2/);
 assert.match(b,/page 2 of 2/);
 assert.notEqual(a,b);
 assert.throws(()=>grandStaffSvg(doc,{page:2,systemsPerPage:2}),/Invalid grand staff page/);
});
