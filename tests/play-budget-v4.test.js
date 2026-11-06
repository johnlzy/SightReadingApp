import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureBudget, remainingSeconds, setDailyAllowance, grantExtraTime,
    PlayBudgetClock, localDayKey } from '../js/play-budget.js';

test('five-minute Music Passes consume actual active seconds, not entries',()=>{
    const user={};
    let ms=0,saves=0;
    const clock=new PlayBudgetClock(user,{now:()=>ms,day:()=> '2026-11-06',save:()=>saves++});
    setDailyAllowance(user,900,'2026-11-06');
    clock.resume();
    for(let i=0;i<150;i++){ms+=1000;clock.tick();}
    clock.pause();
    assert.ok(remainingSeconds(user,'2026-11-06')>=749 && remainingSeconds(user,'2026-11-06')<=750.1);
    clock.resume();
    for(let i=0;i<150;i++){ms+=1000;clock.tick();}
    assert.ok(remainingSeconds(user,'2026-11-06')>=599);
    assert.ok(saves>1);
});

test('parent can pause, grant idempotent bonus and reset tomorrow',()=>{
    const user={};
    setDailyAllowance(user,0,'2026-11-06');
    assert.equal(remainingSeconds(user,'2026-11-06'),0);
    assert.equal(grantExtraTime(user,300,'parent-event-1','2026-11-06'),true);
    assert.equal(grantExtraTime(user,300,'parent-event-1','2026-11-06'),false);
    assert.equal(remainingSeconds(user,'2026-11-06'),300);
    assert.equal(remainingSeconds(user,'2026-11-07'),0);
    assert.equal(user.playBudget.bonusSeconds,0);
    assert.equal(user.playBudget.dailySeconds,0);
});
test('unlimited and per-child budgets remain independent',()=>{
    const a={},b={};
    setDailyAllowance(a,null,'2026-11-06');
    setDailyAllowance(b,600,'2026-11-06');
    assert.equal(remainingSeconds(a,'2026-11-06'),Infinity);
    assert.equal(remainingSeconds(b,'2026-11-06'),600);
    b.playBudget.usedSeconds=240;
    assert.equal(remainingSeconds(a,'2026-11-06'),Infinity);
    assert.equal(remainingSeconds(b,'2026-11-06'),360);
    assert.throws(()=>setDailyAllowance(b,321,'2026-11-06'),/five-minute/);
});
test('background pause does not consume seconds and expiration is notified once',()=>{
    const user={}; let ms=0,expired=0;
    const clock=new PlayBudgetClock(user,{now:()=>ms,day:()=> '2026-11-06',
        onExpired:()=>expired++});
    setDailyAllowance(user,0,'2026-11-06');
    clock.resume();
    assert.equal(expired,1);
    ms+=100000;
    clock.pause();
    ms+=100000;
    clock.tick();
    assert.equal(expired,1);
    assert.equal(user.playBudget.usedSeconds,15); // capped single heartbeat in active session
});
