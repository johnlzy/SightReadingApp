/** 
 * Visual timing and touch timestamps share one clock.
 * Markers live in the STAFF, never above the child's finger on the piano.
 */
export const SCROLL_PIXELS_PER_BEAT=120;
export const FIRST_NOTE_X=80;

export function gameHitLineX(screenWidth,screenHeight) {
    if(!(screenWidth>0)||!(screenHeight>0))throw Error('Invalid staff dimensions');
    // Score SVG is 1000x340 with xMinYMid meet; derive visible target from
    // the actual SVG aspect ratio, not the width of the piano keyboard.
    const scale=Math.min(screenWidth/1000,screenHeight/340);
    const desiredPx=screenWidth*0.32;
    return Math.round(Math.max(185,Math.min(440,desiredPx/scale)));
}
export function timedScoreTranslation({
    nowMs,startMs,bpm,hitX,pixelsPerBeat=SCROLL_PIXELS_PER_BEAT
}) {
    if(![nowMs,startMs,bpm,hitX,pixelsPerBeat].every(Number.isFinite)||bpm<=0)
        throw Error('Invalid score clock');
    return hitX-FIRST_NOTE_X-(nowMs-startMs)/(60000/bpm)*pixelsPerBeat;
}
export function expectedScoreNoteX({
    durations,index,nowMs,startMs,bpm,hitX
}) {
    if(!Array.isArray(durations)||!Number.isInteger(index)||index<0||index>=durations.length)
        throw Error('Invalid score note');
    let beats=0;
    for(let i=0;i<index;i++)beats+=durations[i];
    return FIRST_NOTE_X+beats*SCROLL_PIXELS_PER_BEAT+
        timedScoreTranslation({nowMs,startMs,bpm,hitX});
}

/** Convert a pointer event's monotonic timestamp to wall-clock milliseconds.
 * The raw Date.now call runs later, after JS scheduling and handler work. */
export function pointerOnsetMs(event,wallNow=Date.now(),
    monotonicNow=typeof performance!=='undefined'?performance.now():NaN) {
    const timestamp=event?.timeStamp;
    if(!Number.isFinite(timestamp)||!Number.isFinite(monotonicNow))return wallNow;
    const age=monotonicNow-timestamp;
    // Some browsers return epoch-based timestamps; reject clock mismatches.
    if(age < -30 || age > 3000)return wallNow;
    return Math.round(wallNow-Math.max(0,age));
}

export function neighboringBeats(durations,index) {
    const values=[durations?.[index],durations?.[index-1],durations?.[index+1]]
        .filter(value=>Number.isFinite(value)&&value>0);
    return values.length?Math.min(...values):1;
}
