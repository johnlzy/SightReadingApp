import test from 'node:test';
import assert from 'node:assert/strict';
import {freezeSession,beginResume,finishResume,cancelPause} from '../js/session-pause.js';

test('pausing timed music preserves beat index, pitches and outcomes',()=>{
 const game={phase:'playing',idx:6,hits:4,notes:['C4','G4'],
  outcomes:[{firstTryCorrect:true}],startTime:1000,nextBeatTime:2700,
  noteTime:2500,noteStartedAt:2450};
 assert.equal(freezeSession(game,2850),true);
 assert.equal(game.phase,'paused');
 assert.equal(freezeSession(game,3000),false);
 assert.equal(game.idx,6);
 assert.equal(beginResume(game),true);
 assert.equal(beginResume(game),false);
 const resumed=finishResume(game,7850);
 assert.deepEqual(resumed,{shiftMs:5000,from:'playing'});
 assert.equal(game.phase,'playing');
 assert.equal(game.startTime,6000);
 assert.equal(game.nextBeatTime,7700);
 assert.equal(game.noteTime,7500);
 assert.equal(game.noteStartedAt,7450);
 assert.equal(game.idx,6);
 assert.equal(game.hits,4);
 assert.deepEqual(game.outcomes,[{firstTryCorrect:true}]);
});
test('unstarted count-in resumes to ready without fake progress or negative clocks',()=>{
 const g={phase:'countdown',startTime:0,nextBeatTime:0,noteTime:0};
 assert.equal(freezeSession(g,1000),true);
 assert.equal(beginResume(g),true);
 assert.deepEqual(finishResume(g,4000),{shiftMs:3000,from:'countdown'});
 assert.equal(g.phase,'ready');
 assert.equal(g.startTime,0);
});
test('abandoning a paused session clears resume state safely',()=>{
 const g={phase:'ready',sessionToken:2};
 freezeSession(g,300);
 cancelPause(g);
 assert.equal(g.pausedAt,null);
 assert.equal(g.pausedFrom,null);
 assert.equal(finishResume(g,500),null);
});
