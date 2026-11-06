/**
 * Melody Garden v4.1 — Sparks are cosmetic-only.
 * Local migration is additive, idempotent, and preserves both old coin
 * balances and already purchased instruments.
 */
export const WORKSHOP_ITEMS = Object.freeze([
    {id:'hat-leaf',slot:'hat',name:'Pip’s Leaf Cap',emoji:'🍃',price:0,description:'A fresh little garden leaf.'},
    {id:'hat-cloud',slot:'hat',name:'Cloud Beret',emoji:'☁️',price:30,description:'Soft as a lullaby.'},
    {id:'hat-comet',slot:'hat',name:'Comet Crown',emoji:'🌠',price:55,description:'Ready for a starry recital.'},
    {id:'hat-sun',slot:'hat',name:'Sunshine Crown',emoji:'☀️',price:95,description:'A cheerful golden glow.'},
    {id:'hat-phones',slot:'hat',name:'Star Headphones',emoji:'🎧',price:75,description:'Dress for a listening party.'},
    {id:'scarf-none',slot:'scarf',name:'No Scarf',emoji:'✨',price:0,description:'Keep things simple.'},
    {id:'scarf-berry',slot:'scarf',name:'Berry Bow',emoji:'🎀',price:45,description:'A bright splash of color.'},
    {id:'scarf-mint',slot:'scarf',name:'Mint Scarf',emoji:'🧣',price:65,description:'A cozy musical accessory.'},
    {id:'garden-meadow',slot:'garden',name:'Sunny Meadow',emoji:'🌼',price:0,description:'Pip’s first home.'},
    {id:'garden-pond',slot:'garden',name:'Lily Pond',emoji:'🪷',price:70,description:'A quiet place to practice.'},
    {id:'garden-night',slot:'garden',name:'Moonlit Garden',emoji:'🌙',price:85,description:'A little evening sparkle.'},
    {id:'garden-orchard',slot:'garden',name:'Music Orchard',emoji:'🌳',price:110,description:'Grow a colorful musical world.'},
    {id:'stage-simple',slot:'stage',name:'Garden Recital',emoji:'🎼',price:0,description:'Your first performance.'},
    {id:'stage-starlight',slot:'stage',name:'Starlight Stage',emoji:'⭐',price:120,description:'A sky full of applause.'},
    {id:'stage-ocean',slot:'stage',name:'Ocean Concert',emoji:'🐠',price:150,description:'Play beneath the waves.'},
    {id:'trail-glow',slot:'trail',name:'Soft Glow',emoji:'✨',price:0,description:'Pip’s natural shimmer.'},
    {id:'trail-heart',slot:'trail',name:'Heart Notes',emoji:'💛',price:55,description:'Tiny floating hearts.'},
    {id:'trail-rainbow',slot:'trail',name:'Rainbow Notes',emoji:'🌈',price:95,description:'A gentle rainbow of music.'}
]);

export const STARTER_EQUIPPED=Object.freeze({
    hat:'hat-leaf',scarf:'scarf-none',garden:'garden-meadow',
    stage:'stage-simple',trail:'trail-glow'
});
const ITEM_BY_ID=new Map(WORKSHOP_ITEMS.map(x=>[x.id,x]));
const AUDIO_PRICE={violin:25,flute:25,trumpet:45,harp:75,synth:95,
    cello:25,tuba:35,bassoon:45,drum:75,bassg:95};
const MAX_GRANT_IDS=180;

export function getWorkshopItem(id) {
    if(ITEM_BY_ID.has(id)) return ITEM_BY_ID.get(id);
    if(typeof id==='string' && id.startsWith('sound-')) {
        const key=id.slice(6);
        if(Object.hasOwn(AUDIO_PRICE,key)) return {
            id,slot:'sound',name:key[0].toUpperCase()+key.slice(1)+' Sound',
            emoji:({violin:'🎻',flute:'🪈',trumpet:'🎺',harp:'🪉',
                synth:'🎛️',cello:'🎻',tuba:'🎺',bassoon:'🎶',drum:'🥁',bassg:'🎸'})[key],
            price:AUDIO_PRICE[key],description:'Change your practice instrument sound.',
            instrumentKey:key
        };
    }
    return null;
}
export function catalogItems(category='hat') {
    return WORKSHOP_ITEMS.filter(x=>x.slot===category);
}
export function audioItems() {
    return Object.keys(AUDIO_PRICE).map(key=>getWorkshopItem('sound-'+key));
}

/** Safe to run multiple times; existing legacy balances are never deleted. */
export function ensureEconomy(user) {
    if(!user||typeof user!=='object')throw new Error('Player required');
    if(!user.economy || user.economy.version!==1) {
        const t=Number.isFinite(user.tCoins)?Math.max(0,Math.floor(user.tCoins)):0;
        const b=Number.isFinite(user.bCoins)?Math.max(0,Math.floor(user.bCoins)):0;
        user.economy={
            version:1,sparks:t+b,ownedItems:Object.values(STARTER_EQUIPPED),
            equipped:{...STARTER_EQUIPPED},grants:[],purchases:[],
            migration:{trebleCoins:t,bassCoins:b,convertedSparks:t+b}
        };
    }
    const e=user.economy;
    e.sparks=Number.isSafeInteger(e.sparks)&&e.sparks>=0?e.sparks:0;
    if(!Array.isArray(e.ownedItems))e.ownedItems=[];
    if(!e.equipped||typeof e.equipped!=='object')e.equipped={};
    for(const [slot,id] of Object.entries(STARTER_EQUIPPED)){
        if(!e.ownedItems.includes(id))e.ownedItems.push(id);
        if(!getWorkshopItem(e.equipped[slot])||
            !e.ownedItems.includes(e.equipped[slot])||
            getWorkshopItem(e.equipped[slot]).slot!==slot)e.equipped[slot]=id;
    }
    if(!Array.isArray(e.grants))e.grants=[];
    if(!Array.isArray(e.purchases))e.purchases=[];
    e.grants=e.grants.slice(-MAX_GRANT_IDS);
    e.purchases=e.purchases.slice(-MAX_GRANT_IDS);
    if(!Array.isArray(user.instruments))user.instruments=['piano'];
    return e;
}

/** A stable completed session ID makes the reward idempotent on replay. */
export function grantSparks(user,amount,grantId) {
    const e=ensureEconomy(user);
    if(!Number.isSafeInteger(amount)||amount<0||amount>500 ||
       typeof grantId!=='string'||!grantId)throw new Error('Invalid Sparks reward');
    if(amount===0||e.grants.includes(grantId))return false;
    e.grants.push(grantId);
    e.grants=e.grants.slice(-MAX_GRANT_IDS);
    e.sparks+=amount;
    return true;
}
export function buyWorkshopItem(user,id) {
    const item=getWorkshopItem(id);
    if(!item)throw new Error('Unknown Workshop item');
    const e=ensureEconomy(user);
    if(item.slot==='sound'){
        if(user.instruments.includes(item.instrumentKey))return {ok:false,reason:'owned'};
    }else if(e.ownedItems.includes(id))return {ok:false,reason:'owned'};
    if(item.price>e.sparks)return {ok:false,reason:'insufficient'};
    e.sparks-=item.price;
    if(item.slot==='sound')user.instruments.push(item.instrumentKey);
    else e.ownedItems.push(id);
    e.purchases.push({itemId:id,cost:item.price});
    e.purchases=e.purchases.slice(-MAX_GRANT_IDS);
    return {ok:true,item,balance:e.sparks};
}
export function equipWorkshopItem(user,id) {
    const item=getWorkshopItem(id);
    if(!item)throw new Error('Unknown Workshop item');
    const e=ensureEconomy(user);
    if(item.slot==='sound') {
        if(!user.instruments.includes(item.instrumentKey))return false;
        user.preferences ??={clef:'treble',input:'touch',instrument:'piano'};
        user.preferences.instrument=item.instrumentKey;
    } else {
        if(!e.ownedItems.includes(id))return false;
        e.equipped[item.slot]=id;
    }
    return true;
}
export function isWorkshopOwned(user,id){
    const item=getWorkshopItem(id);
    if(!item)return false;
    const e=ensureEconomy(user);
    return item.slot==='sound'?
        user.instruments.includes(item.instrumentKey):e.ownedItems.includes(id);
}
export function isWorkshopEquipped(user,id){
    const item=getWorkshopItem(id);
    if(!item)return false;
    const e=ensureEconomy(user);
    return item.slot==='sound'?
        user.preferences?.instrument===item.instrumentKey : e.equipped[item.slot]===id;
}
