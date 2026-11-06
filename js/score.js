import { parseNote, durationNotation } from './music.js';

const DIATONIC = ['C','D','E','F','G','A','B'];
function diatonicPosition(note) {
    const parsed = parseNote(note);
    return parsed.octave * 7 + DIATONIC.indexOf(parsed.letter);
}

/**
 * V4 foundation: static, monophonic notation, distinct from the scrolling
 * game renderer. Multi-voice/Grand Staff engraving remains a future spike.
 */
export function createScoreDocument({ notes, durations, clef='treble', title='A New Melody', bpm=72 }) {
    if(!Array.isArray(notes) || !notes.length || notes.length > 32 ||
       !Array.isArray(durations) || durations.length !== notes.length) {
        throw new Error('Invalid score sequence');
    }
    if(!['treble','bass'].includes(clef)) throw new Error('Invalid clef');
    const events = notes.map((pitch,i) => {
        parseNote(pitch);
        durationNotation(durations[i]);
        return { pitch, duration: durations[i], beat: durations.slice(0,i).reduce((a,b)=>a+b,0) };
    });
    return { type:'static-score', clef, title, bpm, events, timeSignature:'4/4' };
}

function safe(text) {
    return String(text).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

export function staticScoreSvg(score) {
    if(score.type !== 'static-score') throw new Error('ScoreDocument required');
    const systemCount = Math.ceil(score.events.length/8);
    const height = 115 + systemCount * 168;
    const width=1000, staffStart=145;
    const staff=Array.from({length:systemCount},(_,sys) => {
        const bottom=staffStart + sys*168 + 48;
        const lines=Array.from({length:5},(_,i)=>
            '<line x1="50" y1="'+(bottom-12*i)+'" x2="950" y2="'+(bottom-12*i)+'" stroke="#354c46" stroke-width="1.8"/>').join('');
        const clef=score.clef==='treble'?'𝄞':'𝄢';
        const text='<text x="62" y="'+(bottom+1)+'" font-family="serif" font-size="72" fill="#315f50">'+clef+'</text>';
        return lines+text+
            '<text x="118" y="'+(bottom-23)+'" font-family="serif" font-size="27" fill="#4d6054">4</text>'+
            '<text x="118" y="'+(bottom-2)+'" font-family="serif" font-size="27" fill="#4d6054">4</text>';
    }).join('');

    let notes='';
    score.events.forEach((evt,i) => {
        const sys=Math.floor(i/8), pos=i%8;
        const bottom=staffStart+sys*168+48;
        const base=score.clef==='treble' ? diatonicPosition('E4') : diatonicPosition('G2');
        const y=bottom-(diatonicPosition(evt.pitch)-base)*6;
        const x=185+pos*92;
        const notation=durationNotation(evt.duration);
        const ledger=[];
        for(let line=bottom+12; line<=y;line+=12)ledger.push(line);
        for(let line=bottom-60;line>=y;line-=12)ledger.push(line);
        const ledgers=ledger.map(ly=>'<line x1="'+(x-17)+'" x2="'+(x+17)+'" y1="'+ly+'" y2="'+ly+'" stroke="#263f38" stroke-width="1.8"/>').join('');
        const head='<ellipse cx="'+x+'" cy="'+y+'" rx="12" ry="8" stroke="#263f38" stroke-width="1.7" fill="'+(notation.hollow?'#ffffff':'#2b4d3e')+'"/>';
        const stem=notation.stem?'<line x1="'+(x+11)+'" y1="'+y+'" x2="'+(x+11)+'" y2="'+(y-43)+'" stroke="#263f38" stroke-width="2"/>':'';
        const flag=notation.flag?'<path d="M'+(x+11)+' '+(y-43)+' Q'+(x+33)+' '+(y-28)+' '+(x+20)+' '+(y-11)+'" fill="none" stroke="#263f38" stroke-width="2"/>':'';
        const dot=notation.dotted?'<circle cx="'+(x+25)+'" cy="'+(y-3)+'" r="3.4" fill="#263f38"/>':'';
        const acc=parseNote(evt.pitch).accidental;
        const accidental=acc?'<text x="'+(x-32)+'" y="'+(y+6)+'" font-size="23" font-family="serif" fill="#263f38">'+(acc==='#'?'♯':'♭')+'</text>':'';
        notes+=ledgers+head+stem+flag+dot+accidental;
        if(pos===3 || pos===7)notes+='<line x1="'+(x+46)+'" y1="'+(bottom-48)+'" x2="'+(x+46)+'" y2="'+bottom+'" stroke="#263f38" stroke-width="1.6"/>';
    });
    return '<svg class="independent-score-svg" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+safe(score.title)+'; stationary '+safe(score.clef)+' clef piano music">'+
        '<rect width="1000" height="'+height+'" fill="#fffdfa"/>'+
        '<text x="500" y="48" font-family="serif" font-size="26" text-anchor="middle" fill="#284538">'+safe(score.title)+'</text>'+
        '<text x="910" y="76" font-family="sans-serif" font-size="16" fill="#547466">♩ = '+Number(score.bpm)+'</text>'+
        staff+notes+'</svg>';
}
