import test from 'node:test';
import assert from 'node:assert/strict';
import { createItemCatalog } from '../src/inventory/itemCatalog.js';
import { countItems } from '../src/inventory/slotOperations.js';
import { createInventoryState, cloneInventory, readInventoryState, migrateLegacyInventory, getPackResources, getPackEquipment, withdrawLegacy } from '../src/inventory/inventoryState.js';
const catalog=createItemCatalog([{id:'wood'},{id:'fiber'},{id:'berries'}]);
const total=inventory=>{const out=countItems([...inventory.pack,...inventory.containers.flatMap(c=>c.slots)]);for(const[id,count]of Object.entries(inventory.legacy))out[id]=(out[id]??0)+count;return out;};

test('legacy migration preserves large bank and separate gear counters with bounded physical overflow',()=>{
 const raw={bankedResources:{wood:1000000000,fiber:7,berries:3,old_alien_seed:2},craftedConsumables:{medkit:11},fieldSupplies:{berry_lure:9}};
 const result=migrateLegacyInventory(raw,catalog);assert.equal(result.ok,true);
 assert.deepEqual(total(result.inventory),{wood:1000000000,fiber:7,berries:3,old_alien_seed:2,medkit:11,berry_lure:9});
 assert.equal(result.inventory.pack.length,16);assert.equal(result.inventory.containers.length,1);assert.equal(result.inventory.containers[0].slots.length,24);
 assert.deepEqual(result.receipt.unknown,['old_alien_seed']);assert.equal(readInventoryState(result.inventory,catalog).ok,true);
 const again=readInventoryState(JSON.parse(JSON.stringify(result.inventory)),catalog);assert.deepEqual(total(again.inventory),total(result.inventory));
});

test('new-format validation rejects corrupted stacks and containers without discarding contents',()=>{
 const state=createInventoryState();assert.equal(readInventoryState(state,catalog).ok,true);
 let bad=cloneInventory(state);bad.pack[0]={id:'wood',count:21};assert.equal(readInventoryState(bad,catalog).reason,'invalid-pack-stacks');
 bad=cloneInventory(state);bad.containers.push({...bad.containers[0]});assert.equal(readInventoryState(bad,catalog).reason,'invalid-container-id');
 bad=cloneInventory(state);bad.pack[0]={id:'unknown',count:2};assert.equal(readInventoryState(bad,catalog).ok,false);assert.equal(bad.pack[0].count,2);
 assert.equal(migrateLegacyInventory({bankedResources:{wood:-1}},catalog).ok,false);
});

test('legacy delivery withdrawal respects pack capacity and never creates a spendable duplicate',()=>{
 const state=createInventoryState();state.legacy={wood:1000};state.pack=Array.from({length:16},()=>({id:'wood',count:20}));state.pack[4].count=18;
 const result=withdrawLegacy(state,'wood',20,catalog);assert.equal(result.moved,2);assert.equal(result.inventory.legacy.wood,998);assert.deepEqual(total(result.inventory),total(state));
 assert.equal(withdrawLegacy(result.inventory,'wood',20,catalog).reason,'full');assert.equal(state.legacy.wood,1000);
});

test('resource and equipment views read only actual backpack stacks',()=>{
 const state=createInventoryState();state.pack[0]={id:'wood',count:7};state.pack[1]={id:'medkit',count:2};state.pack[2]={id:'woven_snare',count:3};
 state.containers[0].slots[0]={id:'wood',count:20};state.containers[0].slots[1]={id:'medkit',count:5};
 assert.equal(getPackResources(state,catalog).wood,7);assert.equal(getPackEquipment(state,catalog).craftedConsumables.medkit,2);assert.equal(getPackEquipment(state,catalog).fieldSupplies.woven_snare,3);
 const snapshot=readInventoryState(state,catalog).inventory;snapshot.pack[0].count=1;assert.equal(state.pack[0].count,7);
});

test('legacy quantities with valid prototype-like Author IDs survive migration and withdrawal',()=>{
 const custom=createItemCatalog([{id:'constructor'},{id:'__proto__'}]);
 const raw={bankedResources:JSON.parse('{"constructor":1000,"__proto__":2000}')};
 const migrated=migrateLegacyInventory(raw,custom);assert.equal(migrated.ok,true);
 assert.equal(readInventoryState(migrated.inventory,custom).ok,true);
 const moved=withdrawLegacy(migrated.inventory,'constructor',10,custom);assert.equal(moved.moved,10);
 assert.equal(getPackResources(moved.inventory,custom).constructor,10);
 assert.equal(getPackResources(moved.inventory,custom).__proto__,0);
 const unknown=migrateLegacyInventory(raw,catalog);assert.equal(unknown.inventory.legacy.__proto__,2000);
});

test('migration saturates only milestone statistics when valid quantities exceed their aggregate range',()=>{
 const result=migrateLegacyInventory({bankedResources:{wood:Number.MAX_SAFE_INTEGER,fiber:Number.MAX_SAFE_INTEGER}},catalog);
 assert.equal(result.ok,true);assert.equal(result.inventory.totals.returned,Number.MAX_SAFE_INTEGER);
 assert.equal(readInventoryState(result.inventory,catalog).ok,true);
 const counts=total(result.inventory);assert.equal(counts.wood,Number.MAX_SAFE_INTEGER);assert.equal(counts.fiber,Number.MAX_SAFE_INTEGER);
});
