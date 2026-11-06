import {ensureEconomy,getWorkshopItem} from './economy.js';

/** One original, CSS-drawn Pip, with four non-punitive expressions. */
const STATES=new Set(['welcome','curious','focused','celebrate']);
const DECOR={
    'garden-meadow':'meadow','garden-pond':'pond',
    'garden-night':'night','garden-orchard':'orchard',
    'stage-simple':'meadow','stage-starlight':'night','stage-ocean':'pond'
};

export function pipAppearance(user,previewId=null) {
    const e=ensureEconomy(user);
    const equipped={...e.equipped};
    const item=previewId?getWorkshopItem(previewId):null;
    if(item && item.slot!=='sound')equipped[item.slot]=item.id;
    return equipped;
}

export function renderPipScene(container,user,{mood='welcome',previewId=null,stage=false}={}) {
    if(!container)return;
    const equipped=pipAppearance(user,previewId);
    const sceneId=stage ? equipped.stage : equipped.garden;
    const sceneClass=DECOR[sceneId]||'meadow';
    const emotion=STATES.has(mood)?mood:'welcome';
    const scene=document.createElement('div');
    scene.className='pip-room pip-room--'+sceneClass;
    scene.dataset.scene=sceneId;
    scene.dataset.mood=emotion;
    scene.setAttribute('role','img');
    const hat=getWorkshopItem(equipped.hat);
    const scarf=getWorkshopItem(equipped.scarf);
    scene.setAttribute('aria-label','Pip the music companion, '+emotion+
        ', wearing '+(hat?.name||'a leaf cap')+
        (scarf?.id!=='scarf-none'?', with '+scarf?.name:'')+'.');

    const decor=document.createElement('div');
    decor.className='pip-room-decor';
    decor.setAttribute('aria-hidden','true');
    const props=sceneClass==='pond'?['🌿','🪷','🫧']:
        sceneClass==='night'?['✦','✧','☾']:sceneClass==='orchard'?['✿','♬','🌳']:['✿','✦','🌼'];
    for(const [i,symbol] of props.entries()) {
        const element=document.createElement('span');
        element.textContent=symbol;
        element.className='pip-decor pip-decor--'+i;
        decor.appendChild(element);
    }
    scene.appendChild(decor);

    const figure=document.createElement('div');
    figure.className='pip-figure pip-figure--'+emotion;
    figure.dataset.hat=equipped.hat;
    figure.dataset.scarf=equipped.scarf;
    figure.dataset.trail=equipped.trail;
    figure.setAttribute('aria-hidden','true');

    const wingLeft=document.createElement('span');
    wingLeft.className='pip-wing pip-wing--left';
    const wingRight=document.createElement('span');
    wingRight.className='pip-wing pip-wing--right';
    figure.append(wingLeft,wingRight);

    const body=document.createElement('div');
    body.className='pip-body';
    const eyes=document.createElement('div');
    eyes.className='pip-eyes';
    for(let i=0;i<2;i++) {
        const eye=document.createElement('span');
        eye.className='pip-eye';
        eyes.appendChild(eye);
    }
    body.appendChild(eyes);
    const mouth=document.createElement('span');
    mouth.className='pip-mouth';
    body.appendChild(mouth);
    figure.appendChild(body);

    const hatMark=document.createElement('span');
    hatMark.className='pip-hat';
    hatMark.textContent=hat?.emoji||'🍃';
    figure.appendChild(hatMark);
    if(equipped.scarf!=='scarf-none') {
        const scarfMark=document.createElement('span');
        scarfMark.className='pip-scarf';
        scarfMark.textContent=scarf?.emoji||'🎀';
        figure.appendChild(scarfMark);
    }
    const note=document.createElement('span');
    note.className='pip-trail';
    note.textContent=equipped.trail==='trail-heart'?'♥':
        equipped.trail==='trail-rainbow'?'🌈':'✧';
    figure.appendChild(note);
    scene.appendChild(figure);
    container.replaceChildren(scene);
}
