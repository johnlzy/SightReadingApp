import test from 'node:test';
import assert from 'node:assert/strict';
import { upgradeProfileList, findProfileIndex, savePreference } from '../js/profiles.js';
import { state } from '../js/state.js';
import { listUsers, loginUser, saveCurrentUser, deleteUser, createUser } from '../js/storage.js';

function makeStorage() {
    const data=new Map();
    return {
        getItem:k=>data.get(k)??null,
        setItem:(k,v)=>data.set(k,String(v)),
        removeItem:k=>data.delete(k)
    };
}
test('legacy siblings obtain immutable distinct IDs with scores intact',()=>{
    const children=[
        {name:'Reader A',difficulty:'easy',tCoins:6,scores:{coin:{easy:[3]}}},
        {name:'Reader B',difficulty:'pro',bCoins:17,scores:{coin:{pro:[21]}}}
    ];
    const migrated=upgradeProfileList(children,(()=>{let i=0;return()=>`profile-${++i}`;})());
    assert.equal(new Set(migrated.map(x=>x.profileId)).size,2);
    assert.equal(findProfileIndex(migrated,migrated[1].profileId),1);
    assert.deepEqual(migrated[0].scores.coin.easy,[3]);
    assert.deepEqual(migrated[1].scores.coin.pro,[21]);
});
test('saving one child and deleting another cannot reassign remaining progress',()=>{
    globalThis.localStorage=makeStorage();
    localStorage.setItem('fsr_users_v2',JSON.stringify([
        {name:'First',difficulty:'easy',credits:8,tCoins:3,bCoins:0},
        {name:'Second',difficulty:'pro',credits:8,tCoins:15,bCoins:0}
    ]));
    const profiles=listUsers(),firstId=profiles[0].profileId,secondId=profiles[1].profileId;
    loginUser(secondId);
    state.currentUser.tCoins=99;
    saveCurrentUser();
    deleteUser(firstId);
    assert.equal(listUsers().length,1);
    assert.equal(listUsers()[0].profileId,secondId);
    state.currentUser.tCoins=110;
    saveCurrentUser();
    assert.equal(listUsers()[0].tCoins,110);
    assert.equal(state.currentUser.idx,0);
});
test('per-player clef and instrument preferences do not bleed across logins',()=>{
    globalThis.localStorage=makeStorage();
    state.tempUser={name:'A',avatar:'🐱',diff:'easy',startingComfort:'new'};
    const a=createUser();
    state.tempUser={name:'B',avatar:'🦊',diff:'pro',startingComfort:'experienced'};
    const b=createUser();
    loginUser(a);
    savePreference(state.currentUser,'clef','bass');
    savePreference(state.currentUser,'instrument','flute');
    saveCurrentUser();
    loginUser(b);
    assert.equal(state.currentClef,'treble');
    assert.equal(state.currentInstKey,'piano');
    assert.equal(state.currentUser.startingComfort,'experienced');
    loginUser(a);
    assert.equal(state.currentClef,'bass');
    assert.equal(state.currentInstKey,'flute');
    assert.equal(listUsers()[a].placement.status,'not-started');
});
