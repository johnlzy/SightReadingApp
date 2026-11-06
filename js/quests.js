import {localDayKey} from './play-budget.js';
import {ensureEconomy,grantSparks} from './economy.js';

export const DAILY_GOAL=8;
export const DAILY_BONUS=15;
/** Gentle goal, independent from cosmetic spending and opening auditions. */
export function ensureDailyQuest(user,day=localDayKey()) {
    if(!user.quest||user.quest.version!==1||user.quest.dayKey!==day) {
        user.quest={version:1,dayKey:day,progress:0,
            target:DAILY_GOAL,claimed:false,sessionIds:[]};
    }
    if(!Array.isArray(user.quest.sessionIds))user.quest.sessionIds=[];
    user.quest.progress=Math.max(0,Math.min(DAILY_GOAL,
        Number.isInteger(user.quest.progress)?user.quest.progress:0));
    return user.quest;
}

/**
 * Only completed practice/song/coin sessions contribute. Skill checks,
 * auditions, retries of the SAME completed session and partial attempts do not.
 */
export function recordDailyQuest(user,{sessionId,mode,outcomes,day=localDayKey()}={}) {
    const quest=ensureDailyQuest(user,day);
    if(typeof sessionId!=='string'||!sessionId||!['coin','practice','song'].includes(mode)
        ||!Array.isArray(outcomes)||quest.sessionIds.includes(sessionId)) {
        return {added:0,completed:quest.claimed,bonus:0};
    }
    quest.sessionIds.push(sessionId);
    quest.sessionIds=quest.sessionIds.slice(-64);
    if(quest.claimed)return {added:0,completed:true,bonus:0};
    const success=outcomes.filter(x=>x&&x.firstTryCorrect===true).length;
    const before=quest.progress;
    quest.progress=Math.min(DAILY_GOAL,quest.progress+success);
    let bonus=0;
    if(quest.progress>=DAILY_GOAL) {
        const awarded=grantSparks(user,DAILY_BONUS,
            'daily-quest:'+user.profileId+':'+day);
        quest.claimed=true;
        bonus=awarded?DAILY_BONUS:0;
    }
    return {added:quest.progress-before,completed:quest.claimed,bonus};
}

export function questMessage(user,day=localDayKey()) {
    const q=ensureDailyQuest(user,day);
    return q.claimed
        ? 'Today’s music quest is complete. Enjoy your garden!'
        : 'Today’s quest: Read '+q.target+
            ' notes correctly on the first try. '+q.progress+'/'+q.target+' so far.';
}
