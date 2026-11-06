import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureDailyQuest,recordDailyQuest,questMessage,DAILY_GOAL,DAILY_BONUS}
    from '../js/quests.js';
import {ensureEconomy} from '../js/economy.js';

test('daily first-try music quest grants once only on completed practice',()=>{
    const u={profileId:'kid-a',tCoins:0,bCoins:0,instruments:['piano']};
    ensureEconomy(u);
    const outcomes=Array.from({length:8},()=>({firstTryCorrect:true}));
    const event=recordDailyQuest(u,{sessionId:'round-1',mode:'practice',
        outcomes,day:'2026-11-06'});
    assert.equal(event.bonus,DAILY_BONUS);
    assert.equal(ensureDailyQuest(u,'2026-11-06').progress,DAILY_GOAL);
    assert.equal(u.economy.sparks,DAILY_BONUS);
    assert.equal(recordDailyQuest(u,{sessionId:'round-1',mode:'practice',
        outcomes,day:'2026-11-06'}).bonus,0);
    assert.equal(recordDailyQuest(u,{sessionId:'round-2',mode:'practice',
        outcomes,day:'2026-11-06'}).bonus,0);
    assert.equal(u.economy.sparks,DAILY_BONUS);
    assert.match(questMessage(u,'2026-11-06'),/complete/);
});

test('checks and auditions never purchase progress or fill quests',()=>{
    const u={profileId:'kid-a',tCoins:0,bCoins:0,instruments:['piano']};
    const outcomes=Array(16).fill({firstTryCorrect:true});
    recordDailyQuest(u,{sessionId:'check',mode:'check',
        outcomes,day:'2026-11-06'});
    recordDailyQuest(u,{sessionId:'audition',mode:'audition',
        outcomes,day:'2026-11-06'});
    assert.equal(ensureDailyQuest(u,'2026-11-06').progress,0);
    assert.equal(ensureEconomy(u).sparks,0);
});

test('quest counts only first try and resets on next local day',()=>{
    const u={profileId:'kid-a',tCoins:0,bCoins:0,instruments:['piano']};
    const data=[{firstTryCorrect:true},{firstTryCorrect:false},
        {firstTryCorrect:true}];
    const first=recordDailyQuest(u,{sessionId:'round1',mode:'song',
        outcomes:data,day:'2026-11-06'});
    assert.equal(first.added,2);
    assert.equal(ensureDailyQuest(u,'2026-11-06').progress,2);
    const second=recordDailyQuest(u,{sessionId:'round1',mode:'song',
        outcomes:data,day:'2026-11-06'});
    assert.equal(second.added,0);
    assert.equal(ensureDailyQuest(u,'2026-11-07').progress,0);
    assert.equal(ensureEconomy(u).sparks,0);
});
