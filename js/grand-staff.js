import {parseNote} from './music.js';
import {staffLines,staffY,ledgerLineYs,clefSvg} from './notation.js';

/** Original two-hand practice material for independent, human-observed reading.
 * Neither the monophonic mic nor the touch keyboard can grade simultaneous
 * chords. Finishing this score never changes automated pitch mastery. */
const BARS=[
  {right:['C5','D5','E5','G5'],left:[['C3','G3'],'G2','C3','G2']},
  {right:['F5','E5','D5','C5'],left:[['F2','C3'],'C3','F2','C3']},
  {right:['G4','B4','D5','F5'],left:[['G2','D3'],'D3','G2','D3']},
  {right:['E5','D5','C5','C5'],left:[['C3','G3'],'G2','C3',['C3','E3','G3']]}
];

export function createGrandStaffDocument({level=6,title='A Little Garden Recital'}={}){
    const tier=Math.max(6,Math.min(10,Math.trunc(level)||6));
    const bars=BARS.map((bar,i)=>({
        id:i,
        right:bar.right.map(note=>[note]),
        left:bar.left.map(note=>{
            const pitches=Array.isArray(note)?note:[note];
            return pitches.length>1&&tier<8?[pitches[0]]:pitches;
        })
    }));
    for(const b of bars)for(const group of [...b.right,...b.left]){
        if(!group.length)throw Error('Empty chord');
        group.forEach(parseNote);
    }
    return {type:'grand-staff',title,level:tier,meter:'4/4',
        bars,method:'adult-observed',autoscroll:false};
}
export function grandScorePageCount(score,systemsPerPage=2){
    if(score.type!=='grand-staff')throw Error('Grand staff score required');
    return Math.ceil(score.bars.length/systemsPerPage);
}
const escapeXml=x=>String(x).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);

/** A full grand staff: aligned treble/bass systems and notes, manual pages. */
export function grandStaffSvg(score,{page=0,systemsPerPage=2}={}){
    if(score.type!=='grand-staff')throw Error('Grand staff score required');
    if(![1,2].includes(systemsPerPage)||!Number.isInteger(page)||
        page<0||page>=grandScorePageCount(score,systemsPerPage))
        throw Error('Invalid grand staff page');
    const bars=score.bars.slice(page*systemsPerPage,(page+1)*systemsPerPage);
    const width=650,topMargin=88,systemPitch=213,spacing=12;
    const height=topMargin+bars.length*systemPitch+12;
    let elements='<rect width="'+width+'" height="'+height+'" fill="#fffefa"/>'+
        '<text x="'+(width/2)+'" y="33" text-anchor="middle" fill="#294c3d" '+
        'font-family="serif" font-size="22">'+escapeXml(score.title)+'</text>';
    const xLeft=32,xRight=width-26;
    bars.forEach((bar,sys)=>{
        const trebleTop=topMargin+sys*systemPitch;
        const bassTop=trebleTop+92;
        for(const [clef,top] of [['treble',trebleTop],['bass',bassTop]]){
            const staffBottom=top+4*spacing;
            elements+='<g class="grand-staff" data-staff="'+clef+
                '" data-staff-top="'+top+'">';
            for(const y of staffLines(top,spacing)) {
                elements+='<line x1="'+xLeft+'" x2="'+xRight+
                    '" y1="'+y+'" y2="'+y+'" stroke="#29483d" stroke-width="1.5"/>';
            }
            elements+=clefSvg(clef,44,top,spacing,{className:'score-clef'});
            elements+='<text x="119" y="'+(top+18)+'" font-size="23" font-family="serif" fill="#486052">4</text>'+
                '<text x="119" y="'+(top+42)+'" font-size="23" font-family="serif" fill="#486052">4</text>';
            const groups=bar[clef==='treble'?'right':'left'];
            groups.forEach((group,beat)=>{
                const x=194+beat*103;
                for(const pitch of group){
                    const y=staffY(pitch,clef,top,spacing);
                    elements+='<g class="grand-note" data-pitch="'+escapeXml(pitch)+
                        '" data-staff="'+clef+'" data-note-y="'+y+'">';
                    for(const ly of ledgerLineYs(pitch,clef,top,spacing)){
                        elements+='<line x1="'+(x-17)+'" x2="'+(x+17)+
                            '" y1="'+ly+'" y2="'+ly+'" stroke="#29483d" stroke-width="1.6"/>';
                    }
                    const {accidental}=parseNote(pitch);
                    if(accidental)elements+='<text x="'+(x-28)+'" y="'+(y+5)+
                        '" font-size="22" fill="#29483d">'+
                        (accidental==='#'?'♯':'♭')+'</text>';
                    elements+='<ellipse cx="'+x+'" cy="'+y+
                        '" rx="10.5" ry="7.4" fill="#29483d"/>';
                    const upward=clef==='treble';
                    elements+='<path d="M'+(x+(upward?10:-10))+' '+y+
                        'v'+(upward?-42:42)+'" fill="none" stroke="#29483d" stroke-width="2"/>';
                    elements+='</g>';
                }
            });
            elements+='</g>';
        }
        elements+='<line x1="'+xLeft+'" y1="'+trebleTop+
            '" x2="'+xLeft+'" y2="'+(bassTop+48)+'" stroke="#29483d" stroke-width="2.8"/>'+
            '<line x1="'+(xRight-1)+'" y1="'+trebleTop+
            '" x2="'+(xRight-1)+'" y2="'+(bassTop+48)+'" stroke="#29483d" stroke-width="2"/>';
    });
    return '<svg class="independent-score-svg grand-staff-svg" '+
        'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+
        '" role="img" aria-label="'+escapeXml(score.title)+
        '; independent two-staff piano music, page '+(page+1)+
        ' of '+grandScorePageCount(score,systemsPerPage)+
        '; human-observed, not scored by microphone">'+elements+'</svg>';
}
