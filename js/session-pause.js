/**
 * Pure time-shifting logic for resumable sight-reading sessions.
 * The rest of the game uses ordinary Date.now() timestamps; while paused
 * these reference timestamps are shifted by the entire pause + count-in.
 */
export function freezeSession(game,atMs){
  if(!['playing','countdown','ready'].includes(game.phase))return false;
  if(!Number.isFinite(atMs))throw Error('Invalid pause clock');
  game.pausedFrom=game.phase;
  game.pausedAt=atMs;
  game.phase='paused';
  return true;
}
export function beginResume(game){
  if(game.phase!=='paused')return false;
  game.phase='resuming';
  return true;
}
export function finishResume(game,atMs){
  if(game.phase!=='resuming' || !Number.isFinite(game.pausedAt) ||
      !Number.isFinite(atMs))return null;
  const shiftMs=Math.max(0,atMs-game.pausedAt);
  const from=game.pausedFrom;
  for(const field of ['startTime','noteTime','noteStartedAt','nextBeatTime']){
    if(Number.isFinite(game[field]) && game[field]>0) game[field]+=shiftMs;
  }
  game.pausedAt=null;
  game.pausedFrom=null;
  game.phase=from==='playing'?'playing':'ready';
  return {shiftMs,from};
}
export function cancelPause(game){
  game.pausedAt=null;
  game.pausedFrom=null;
  game.resumeTimeout=null;
}
