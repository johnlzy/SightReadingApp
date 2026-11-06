import { parseNote, durationNotation } from './music.js';
import { staffY, ledgerLineYs, clefSvg, staffLines } from './notation.js';

/** Score data and rendering are separate from audio/beat clocks. */
export function createScoreDocument({notes,durations,clef='treble',
    title='A New Melody',bpm=72}){
    if(!Array.isArray(notes)||!notes.length||notes.length>64||
        !Array.isArray(durations)||durations.length!==notes.length) {
        throw new Error('Invalid score sequence');
    }
    if(!['treble','bass'].includes(clef))throw new Error('Invalid clef');
    let elapsed=0;
    const events=notes.map((pitch,i)=>{
        parseNote(pitch);
        durationNotation(durations[i]);
        if(!(durations[i]>0))throw new Error('Invalid duration');
        const event={pitch,duration:durations[i],beat:elapsed};
        elapsed+=durations[i];
        return event;
    });
    return {type:'static-score',clef,title,bpm,events,timeSignature:'4/4'};
}
const esc=text=>String(text).replace(/[&<>"']/g,c=>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svgLine=(x1,x2,y,width=1.6)=>'<line x1="'+x1+'" x2="'+x2+
    '" y1="'+y+'" y2="'+y+'" stroke="#2c4c41" stroke-width="'+width+'"/>';

/** Pages, not time, control what part of a score is shown. Nothing auto-scrolls. */
export function staticScoreSvg(score,{
    page=0,notesPerPage=8,notesPerSystem=4,width=560
}={}){
    if(score.type!=='static-score')throw new Error('ScoreDocument required');
    if(!Number.isInteger(page)||page<0||
        !Number.isInteger(notesPerPage)||notesPerPage<1||
        !Number.isInteger(notesPerSystem)||notesPerSystem<1||
        !(width>=480))throw new Error('Invalid score pagination');
    const totalPages=Math.ceil(score.events.length/notesPerPage);
    if(page>=totalPages)throw new Error('Score page out of range');
    const events=score.events.slice(page*notesPerPage,(page+1)*notesPerPage);
    const systems=Math.ceil(events.length/notesPerSystem);
    const spacing=12, topBase=100, systemPitch=132;
    const height=topBase+systems*systemPitch+12;
    const right=width-24, left=32;
    const noteStart=164, available=right-noteStart-16;
    const noteGap=available/notesPerSystem;
    let svg='';
    for(let sys=0;sys<systems;sys++){
        const top=topBase+sys*systemPitch;
        const bottom=top+4*spacing;
        for(const y of staffLines(top,spacing))svg+=svgLine(left,right,y,1.4);
        svg+=clefSvg(score.clef,38,top,spacing,{
            className:'score-clef',fill:'#25493f'
        });
        svg+='<text x="115" y="'+(top+18)+'" fill="#496050" font-size="23" font-family="serif">4</text>'+
             '<text x="115" y="'+(top+42)+'" fill="#496050" font-size="23" font-family="serif">4</text>';
        const row=events.slice(sys*notesPerSystem,(sys+1)*notesPerSystem);
        row.forEach((evt,i)=>{
            const x=noteStart+i*noteGap;
            const y=staffY(evt.pitch,score.clef,top,spacing);
            const notation=durationNotation(evt.duration);
            const ledger=ledgerLineYs(evt.pitch,score.clef,top,spacing);
            svg+='<g class="score-note" data-pitch="'+esc(evt.pitch)+
                '" data-note-y="'+y+'" data-index="'+(page*notesPerPage+sys*notesPerSystem+i)+'">';
            for(const ly of ledger)svg+=svgLine(x-18,x+18,ly,1.6);
            const accidental=parseNote(evt.pitch).accidental;
            if(accidental)svg+='<text x="'+(x-33)+'" y="'+(y+6)+
                '" font-size="23" font-family="serif" fill="#29493d">'+
                (accidental==='#'?'♯':'♭')+'</text>';
            svg+='<ellipse cx="'+x+'" cy="'+y+'" rx="11.5" ry="8" '+
                'stroke="#29493d" stroke-width="1.7" fill="'+
                (notation.hollow?'#fffefa':'#29493d')+'"/>';
            if(notation.stem)svg+='<path d="M'+(x+11)+' '+y+'v-44" '+
                'stroke="#29493d" stroke-width="2" fill="none"/>';
            if(notation.flag)svg+='<path d="M'+(x+11)+' '+(y-44)+
                'q20 11 9 32" fill="none" stroke="#29493d" stroke-width="2"/>';
            if(notation.dotted)svg+='<circle cx="'+(x+24)+'" cy="'+(y-3)+
                '" r="3.3" fill="#29493d"/>';
            svg+='</g>';
        });
        svg+='<line x1="'+(right-1)+'" y1="'+top+'" x2="'+(right-1)+
            '" y2="'+bottom+'" stroke="#29493d" stroke-width="2"/>';
    }
    return '<svg class="independent-score-svg" xmlns="http://www.w3.org/2000/svg" '+
        'viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="xMidYMid meet" '+
        'role="img" aria-label="'+esc(score.title)+'; stationary '+
        esc(score.clef)+' clef piano music, page '+(page+1)+' of '+totalPages+'">'+
        '<rect width="'+width+'" height="'+height+'" fill="#fffefa"/>'+
        '<text x="'+(width/2)+'" y="36" text-anchor="middle" font-family="serif" '+
        'font-size="23" fill="#29493d">'+esc(score.title)+'</text>'+
        '<text x="'+(width-35)+'" y="63" text-anchor="end" font-size="14" fill="#587366">♩ = '+
        Number(score.bpm)+'</text>'+svg+'</svg>';
}
export function scorePageCount(score,notesPerPage=8){
    return Math.ceil(score.events.length/notesPerPage);
}
