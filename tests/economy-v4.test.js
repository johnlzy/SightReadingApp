import test from 'node:test';
import assert from 'node:assert/strict';
import {WORKSHOP_ITEMS,ensureEconomy,grantSparks,buyWorkshopItem,
    equipWorkshopItem,isWorkshopOwned,isWorkshopEquipped,getWorkshopItem} from '../js/economy.js';

test('legacy treble and bass coins convert once and are never erased',()=>{
    const user={profileId:'child-a',tCoins:75,bCoins:45,
        instruments:['piano','violin'],unlockedSongs:4,
        scores:{coin:{easy:[80]}},learning:{notes:{'treble:F4':{attempts:7}}}};
    const e=ensureEconomy(user);
    assert.equal(e.sparks,120);
    assert.deepEqual(e.migration,{trebleCoins:75,bassCoins:45,convertedSparks:120});
    assert.equal(user.tCoins,75);
    assert.equal(user.bCoins,45);
    assert.equal(user.unlockedSongs,4);
    assert.deepEqual(user.scores.coin.easy,[80]);
    assert.equal(user.learning.notes['treble:F4'].attempts,7);
    e.sparks=45;
    ensureEconomy(user);
    assert.equal(e.sparks,45);
    assert.ok(isWorkshopOwned(user,'sound-violin'));
    assert.ok(isWorkshopEquipped(user,'hat-leaf'));
});

test('separate children have independent balances and accessories',()=>{
    const first={profileId:'first',tCoins:95,bCoins:5,instruments:['piano']};
    const second={profileId:'second',tCoins:0,bCoins:20,instruments:['piano']};
    ensureEconomy(first);
    ensureEconomy(second);
    assert.equal(buyWorkshopItem(first,'hat-cloud').ok,true);
    assert.equal(equipWorkshopItem(first,'hat-cloud'),true);
    assert.equal(first.economy.sparks,70);
    assert.equal(second.economy.sparks,20);
    assert.equal(isWorkshopOwned(second,'hat-cloud'),false);
    assert.equal(second.economy.equipped.hat,'hat-leaf');
});

test('purchase is preview-first, atomic, single-charge and never grants musical advantage',()=>{
    const u={profileId:'child',tCoins:50,bCoins:0,instruments:['piano']};
    const e=ensureEconomy(u);
    const selected=getWorkshopItem('hat-cloud');
    assert.equal(selected.price,30);
    assert.equal(e.sparks,50); // a preview never writes to the player
    assert.equal(equipWorkshopItem(u,'hat-cloud'),false);
    assert.equal(buyWorkshopItem(u,'hat-cloud').ok,true);
    assert.equal(e.sparks,20);
    assert.deepEqual(buyWorkshopItem(u,'hat-cloud'),{ok:false,reason:'owned'});
    assert.equal(e.sparks,20);
    assert.equal(equipWorkshopItem(u,'hat-cloud'),true);
    assert.equal(isWorkshopEquipped(u,'hat-cloud'),true);
    assert.equal(buyWorkshopItem(u,'stage-starlight').reason,'insufficient');
    assert.equal(u.credits,undefined);
    assert.equal(u.readingLevel,undefined);
});

test('grants are once-only and cannot mint invalid Sparks',()=>{
    const u={profileId:'child',tCoins:0,bCoins:0,instruments:['piano']};
    ensureEconomy(u);
    assert.equal(grantSparks(u,20,'round-1'),true);
    assert.equal(grantSparks(u,20,'round-1'),false);
    assert.equal(grantSparks(u,10,'round-2'),true);
    assert.equal(u.economy.sparks,30);
    assert.throws(()=>grantSparks(u,-4,'bad'),/Invalid/);
    assert.throws(()=>grantSparks(u,900,'bad'),/Invalid/);
    assert.throws(()=>grantSparks(u,5,''),/Invalid/);
    assert.equal(u.economy.sparks,30);
});

test('legacy instrument choices can be bought or equipped safely as sounds',()=>{
    const u={profileId:'child',tCoins:100,bCoins:0,instruments:['piano','violin'],
        preferences:{clef:'treble',instrument:'piano',input:'touch'}};
    ensureEconomy(u);
    assert.equal(isWorkshopOwned(u,'sound-violin'),true);
    assert.equal(equipWorkshopItem(u,'sound-violin'),true);
    assert.equal(u.preferences.instrument,'violin');
    assert.equal(buyWorkshopItem(u,'sound-trumpet').ok,true);
    assert.equal(u.instruments.includes('trumpet'),true);
    assert.equal(equipWorkshopItem(u,'sound-trumpet'),true);
    assert.equal(u.preferences.instrument,'trumpet');
    assert.deepEqual(buyWorkshopItem(u,'sound-trumpet'),{ok:false,reason:'owned'});
});

test('catalog contains only approved, non-pay-to-learn cosmetic slots',()=>{
    const ids=new Set();
    for(const item of WORKSHOP_ITEMS){
        assert.equal(ids.has(item.id),false);
        ids.add(item.id);
        assert.ok(['hat','scarf','garden','stage','trail'].includes(item.slot));
        assert.ok(Number.isSafeInteger(item.price)&&item.price>=0);
    }
    assert.ok(WORKSHOP_ITEMS.length>=16);
    assert.equal(getWorkshopItem('buy-extra-reading-level'),null);
});
