/**
 * Stable keys instead of automatic following while the student plays.
 * The user may manually pan the keyboard or choose denser keys.
 */
export const KEYBOARD_SIZES = Object.freeze({
    compact:{minWidth:26,maxWidth:32,visibleTarget:14},
    comfortable:{minWidth:34,maxWidth:43,visibleTarget:11}
});
export function keyboardWhiteWidth(viewportWidth,whiteKeyCount,size='compact'){
    const config=KEYBOARD_SIZES[size];
    if(!config)throw Error('Unsupported keyboard size');
    if(!(viewportWidth>0)||!Number.isInteger(whiteKeyCount)||whiteKeyCount<1)
        throw Error('Invalid piano geometry');
    return Math.round(Math.min(config.maxWidth,
        Math.max(config.minWidth,viewportWidth/
            Math.min(config.visibleTarget,whiteKeyCount))));
}
export function keyboardContentWidth(keyWidth,whiteKeyCount){
    if(!(keyWidth>0)||whiteKeyCount<1)throw Error('Invalid piano width');
    return Math.round(keyWidth*whiteKeyCount);
}
export function initialKeyboardLeft(keyLeft,keyWidth,viewportWidth,totalWidth){
    if(![keyLeft,keyWidth,viewportWidth,totalWidth].every(Number.isFinite))
        throw Error('Invalid keyboard start offset');
    // Center FIRST key once. There is intentionally no next-note tracking.
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
