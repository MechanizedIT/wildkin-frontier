import test from 'node:test';
import assert from 'node:assert/strict';
import {createItemCatalog} from '../src/inventory/itemCatalog.js';
import {createInventoryState,cloneInventory} from '../src/inventory/inventoryState.js';
import {createInventoryActions,BACKPACK_ID,LEGACY_SUPPLIES_ID} from '../src/inventory/inventoryActions.js';
const catalog=createItemCatalog([{id:'wood'},{id:'fiber'},{id:'berries'}]);
function fixture(){let inventory=createInventoryState(),saved=true,near=true,writes=0;const actions=createInventoryActions({catalog,getInventory:()=>inventory,canAccessContainer:()=>near,commitInventory:next=>{writes++;if(!saved)return{ok:false,reason:'storage-write-failed'};inventory=cloneInventory(next);return{ok:true};}});return{actions,get inventory(){return inventory;},set inventory(value){inventory=value;},set saved(value){saved=value;},set near(value){near=value;},get writes(){return writes;}};}

test('physical transfer revalidates access and leaves both containers untouched on save failure',()=>{
 const f=fixture();f.inventory.pack[0]={id:'wood',count:12};const before=cloneInventory(f.inventory);
 f.near=false;assert.equal(f.actions.transfer(BACKPACK_ID,0,'pod_locker').reason,'out-of-reach');assert.equal(f.writes,0);
 f.near=true;f.saved=false;assert.equal(f.actions.transfer(BACKPACK_ID,0,'pod_locker').moved,0);assert.deepEqual(f.inventory,before);
 f.saved=true;assert.equal(f.actions.transfer(BACKPACK_ID,0,'pod_locker').moved,12);assert.equal(f.inventory.pack[0],null);assert.deepEqual(f.inventory.containers[0].slots[0],{id:'wood',count:12});
 const view=f.actions.view('pod_locker');view.slots[0].count=1;assert.equal(f.inventory.containers[0].slots[0].count,12);
});

test('pickup acceptance and milestone receipt commit together and retain unaccepted quantities',()=>{
 const f=fixture();f.inventory.pack=Array.from({length:16},()=>({id:'wood',count:20}));f.inventory.pack[0].count=18;
 f.saved=false;const failed=f.actions.collect('wood',5,{gathered:true});assert.equal(failed.added,0);assert.equal(failed.remaining,5);assert.equal(f.inventory.totals.gathered,0);
 f.saved=true;const result=f.actions.collect('wood',5,{gathered:true});assert.equal(result.added,2);assert.equal(result.remaining,3);assert.equal(f.inventory.totals.gathered,2);
});

test('one chosen physical crafting source and output share a single durable commit',()=>{
 const f=fixture();f.inventory.pack[0]={id:'berries',count:2};f.inventory.containers[0].slots[0]={id:'fiber',count:4};
 assert.equal(f.actions.craft({berries:2,fiber:1},{berry_lure:1},BACKPACK_ID).reason,'duplicate-container');
 assert.equal(f.actions.craft({berries:2,fiber:1},{berry_lure:1},LEGACY_SUPPLIES_ID).reason,'withdraw-only');
 f.near=false;assert.equal(f.actions.craft({berries:2,fiber:1},{berry_lure:1},'pod_locker').reason,'out-of-reach');
 f.near=true;const before=cloneInventory(f.inventory);f.saved=false;assert.equal(f.actions.craft({berries:2,fiber:1},{berry_lure:1},'pod_locker').ok,false);assert.deepEqual(f.inventory,before);
 f.saved=true;assert.equal(f.actions.craft({berries:2,fiber:1},{berry_lure:1},'pod_locker').ok,true);assert.deepEqual(f.inventory.pack[0],{id:'berry_lure',count:1});assert.equal(f.inventory.containers[0].slots[0].count,3);
});

test('same-container split preserves ownership and legacy delivery cannot receive new deposits',()=>{
 const f=fixture();f.inventory.pack[0]={id:'wood',count:10};
 assert.equal(f.actions.transfer(BACKPACK_ID,0,BACKPACK_ID,{toIndex:1,count:3}).ok,true);assert.deepEqual(f.inventory.pack.slice(0,2),[{id:'wood',count:7},{id:'wood',count:3}]);
 assert.equal(f.actions.transfer(BACKPACK_ID,0,LEGACY_SUPPLIES_ID).reason,'withdraw-only');
 f.inventory.legacy.wood=30;f.saved=false;assert.equal(f.actions.takeLegacy('wood',5).ok,false);assert.equal(f.inventory.legacy.wood,30);
 f.saved=true;assert.equal(f.actions.takeLegacy('wood',5).moved,5);assert.equal(f.inventory.legacy.wood,25);
 f.near=false;assert.equal(f.actions.view(LEGACY_SUPPLIES_ID).reason,'out-of-reach');
});
