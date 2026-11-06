import { state } from './state.js';
import { ensureEconomy, getWorkshopItem, catalogItems, audioItems,
    isWorkshopOwned, isWorkshopEquipped, buyWorkshopItem, equipWorkshopItem } from './economy.js';
import { renderPipScene } from './companion.js';
import { saveCurrentUser } from './storage.js';
import { canPlayToday } from './app-budget.js';
import { playRun } from './audio.js';

const CATEGORIES=[
    {id:'hat',label:'Hats',icon:'🍃'},
    {id:'scarf',label:'Accessories',icon:'🎀'},
    {id:'garden',label:'Gardens',icon:'🌼'},
    {id:'stage',label:'Stages',icon:'⭐'},
    {id:'trail',label:'Note Trails',icon:'✨'},
    {id:'sound',label:'Sounds',icon:'🎹'}
];
let category='hat';
let selectedId='hat-leaf';
let workshopPage=0;
const ITEMS_PER_PAGE=6;

function text(id,value) {
    const node=document.getElementById(id);
    if(node)node.textContent=String(value);
}
function entries() {
    return category==='sound' ? audioItems() : catalogItems(category);
}

export function openWorkshop() {
    if(!state.currentUser||!canPlayToday())return;
    ensureEconomy(state.currentUser);
    category='hat';
    workshopPage=0;
    selectedId=state.currentUser.economy.equipped.hat;
    document.querySelectorAll('.screen').forEach(screen=>{
        const active=screen.id==='screen-store';
        screen.classList.toggle('active',active);
        screen.inert=!active;
        screen.setAttribute('aria-hidden',String(!active));
    });
    renderWorkshop();
}

export function chooseWorkshopCategory(next) {
    if(!CATEGORIES.some(c=>c.id===next))return;
    category=next;
    workshopPage=0;
    const first=entries()[0];
    selectedId=first?.id??'hat-leaf';
    renderWorkshop();
}

export function changeWorkshopPage(delta) {
    if(!Number.isInteger(delta))return;
    const all=entries();
    const max=Math.max(0,Math.ceil(all.length/ITEMS_PER_PAGE)-1);
    workshopPage=Math.max(0,Math.min(max,workshopPage+delta));
    selectedId=all[workshopPage*ITEMS_PER_PAGE]?.id||all[0]?.id;
    renderWorkshop();
}

export function previewWorkshopItem(id) {
    if(!state.currentUser||!getWorkshopItem(id)||!entries().some(i=>i.id===id))return;
    selectedId=id;
    renderWorkshop();
}

export function renderWorkshop(message='') {
    if(!state.currentUser)return;
    const user=state.currentUser;
    const economy=ensureEconomy(user);
    text('store-title','Pip’s Workshop');
    text('store-currency-icon','✦');
    text('store-coins',economy.sparks);
    text('workshop-balance',economy.sparks+' Sparks');
    if(message)text('workshop-status',message);
    const tabs=document.getElementById('workshop-categories');
    if(tabs) {
        tabs.replaceChildren();
        for(const c of CATEGORIES) {
            const button=document.createElement('button');
            button.type='button';
            button.className='workshop-category'+(category===c.id?' selected':'');
            button.setAttribute('aria-pressed',String(category===c.id));
            button.textContent=c.icon+' '+c.label;
            button.onclick=()=>chooseWorkshopCategory(c.id);
            tabs.appendChild(button);
        }
    }

    const grid=document.getElementById('store-grid');
    if(grid) {
        grid.replaceChildren();
        for(const item of entries().slice(
            workshopPage*ITEMS_PER_PAGE,(workshopPage+1)*ITEMS_PER_PAGE)) {
            const owned=isWorkshopOwned(user,item.id);
            const equipped=isWorkshopEquipped(user,item.id);
            const button=document.createElement('button');
            button.type='button';
            button.className='workshop-item'+(selectedId===item.id?' selected':'');
            button.dataset.itemId=item.id;
            button.setAttribute('aria-pressed',String(selectedId===item.id));
            const icon=document.createElement('span');
            icon.className='workshop-item-icon';
            icon.textContent=item.emoji;
            const name=document.createElement('strong');
            name.textContent=item.name;
            const price=document.createElement('span');
            price.className='workshop-item-price';
            price.textContent=equipped?'Equipped':owned?'Owned':item.price+' Sparks';
            button.append(icon,name,price);
            button.onclick=()=>previewWorkshopItem(item.id);
            grid.appendChild(button);
        }
    }
    const pages=Math.max(1,Math.ceil(entries().length/ITEMS_PER_PAGE));
    const controls=document.getElementById('workshop-page-controls');
    if(controls)controls.hidden=pages<=1;
    const label=document.getElementById('workshop-page-label');
    if(label)label.textContent=(workshopPage+1)+' / '+pages;
    const prev=document.getElementById('workshop-page-prev');
    const next=document.getElementById('workshop-page-next');
    if(prev)prev.disabled=workshopPage===0;
    if(next)next.disabled=workshopPage>=pages-1;
    const selected=getWorkshopItem(selectedId)??entries()[0];
    if(!selected)return;
    text('workshop-item-name',selected.name);
    text('workshop-item-description',selected.description);
    text('workshop-item-icon',selected.emoji);
    const owned=isWorkshopOwned(user,selected.id);
    const equipped=isWorkshopEquipped(user,selected.id);
    const action=document.getElementById('workshop-action');
    if(action) {
        action.disabled=equipped||(!owned && economy.sparks<selected.price);
        action.textContent=equipped?'Already equipped':owned?'Equip this item':
            selected.price>economy.sparks?'Need '+(selected.price-economy.sparks)+' more Sparks':
            'Buy for '+selected.price+' Sparks';
    }
    const sound=document.getElementById('workshop-hear-sound');
    if(sound)sound.hidden=selected.slot!=='sound';
    const preview=document.getElementById('workshop-pip');
    renderPipScene(preview,user,{mood:'curious',previewId:selected.id,stage:category==='stage'});
    const hint=document.getElementById('workshop-preview-hint');
    if(hint)hint.textContent=equipped?'Pip is wearing this now.':
        selected.slot==='sound'?'Try how the sound feels before buying.':
        'Preview only — equip after purchase to keep the look.';
}

export function workshopAction() {
    if(!state.currentUser||!canPlayToday())return;
    const item=getWorkshopItem(selectedId);
    if(!item)return;
    let message;
    if(!isWorkshopOwned(state.currentUser,item.id)) {
        const purchased=buyWorkshopItem(state.currentUser,item.id);
        if(!purchased.ok) {
            renderWorkshop(purchased.reason==='insufficient'
                ? 'You can earn Sparks by practicing music.':'Already owned.');
            return;
        }
        message='You unlocked '+item.name+'! Pip can wear it now.';
    } else message=item.name+' is now equipped!';
    const equipped=equipWorkshopItem(state.currentUser,item.id);
    if(!equipped)return;
    if(item.slot==='sound') {
        state.currentInstKey=item.instrumentKey;
        playRun(item.instrumentKey);
    }
    saveCurrentUser();
    renderWorkshop(message);
}
export function hearWorkshopSound() {
    const item=getWorkshopItem(selectedId);
    if(item?.slot==='sound'&&canPlayToday())playRun(item.instrumentKey);
}
