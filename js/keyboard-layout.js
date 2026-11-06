/**
 * Child-friendly piano keys with one responsive size—no mode switch.
 *
 * At typical widths the white keys are about 52–64 CSS px, so they are
 * usable by small hands without becoming enormous on wide displays.
 * Longer musical ranges are panned manually, never shrunk to fit.
 */
const MIN_WHITE_KEY=46;
const MAX_WHITE_KEY=66;
const DESIRED_WHITE_KEY=60;
const MIN_VISIBLE_WHITE_KEYS=7;

export function keyboardWhiteWidth(viewportWidth,whiteKeyCount) {
    if(!(viewportWidth>0)||!Number.isFinite(viewportWidth)||
        !Number.isInteger(whiteKeyCount)||whiteKeyCount<1) {
        throw new Error('Invalid piano geometry');
    }
    // A 390px phone shows roughly seven white keys; a tablet shows 12–13.
    // Short exercises never stretch a five-note keyboard to giant keys.
    const visible=Math.max(MIN_VISIBLE_WHITE_KEYS,
        Math.ceil(viewportWidth/DESIRED_WHITE_KEY));
    const width=Math.min(viewportWidth/Math.min(visible,whiteKeyCount),
        MAX_WHITE_KEY);
    return Math.round(Math.max(MIN_WHITE_KEY,width));
}
export function keyboardContentWidth(keyWidth,whiteKeyCount){
    if(!(keyWidth>0)||!Number.isInteger(whiteKeyCount)||whiteKeyCount<1)
        throw Error('Invalid piano width');
    return Math.round(keyWidth*whiteKeyCount);
}
export function initialKeyboardLeft(keyLeft,keyWidth,viewportWidth,totalWidth){
    if(![keyLeft,keyWidth,viewportWidth,totalWidth].every(Number.isFinite))
        throw Error('Invalid keyboard start offset');
    // Center the first note once. Never follow later notes during gameplay.
    return Math.max(0,Math.min(Math.max(0,totalWidth-viewportWidth),
        keyLeft+keyWidth/2-viewportWidth/2));
}
export function shiftedKeyboardLeft(scrollLeft,keyWidth,direction,
    viewportWidth,totalWidth){
    if(!Number.isInteger(direction)||Math.abs(direction)!==1)
        throw Error('Octave direction must be -1 or 1');
    return Math.max(0,Math.min(Math.max(0,totalWidth-viewportWidth),
        scrollLeft+direction*keyWidth*7));
}
