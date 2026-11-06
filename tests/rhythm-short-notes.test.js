import test from 'node:test';
import assert from 'node:assert/strict';
import {rhythmWindows,assessOnset} from '../js/rhythm.js';

test('half-beat neighboring notes have non-overlapping timing acceptance',()=>{
 const bpm=90,beat=60000/bpm;
 const w=rhythmWindows(bpm,{shortestAdjacentBeats:0.5});
 assert.ok(w.goodMs<beat*0.25);
 assert.ok(w.perfectMs<w.goodMs);
 const t=5000;
 assert.equal(assessOnset(t+Math.round(w.goodMs-1),t,bpm,
    {shortestAdjacentBeats:0.5}).accepted,true);
 assert.equal(assessOnset(t+Math.round(w.goodMs+40),t,bpm,
    {shortestAdjacentBeats:0.5}).accepted,false);
});
test('quarter-note timing remains forgiving with truthful early/late feedback',()=>{
 const bpm=50,beat=60000/bpm;
 const w=rhythmWindows(bpm,{shortestAdjacentBeats:1});
 assert.ok(w.goodMs>400);
 assert.ok(w.goodMs<beat/2);
 assert.equal(assessOnset(10000+410,10000,bpm,
    {shortestAdjacentBeats:1}).judgement,'good');
 assert.equal(assessOnset(10000-700,10000,bpm,
    {shortestAdjacentBeats:1}).judgement,'early');
});
