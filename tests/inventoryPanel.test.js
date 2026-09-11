import test from 'node:test';
import assert from 'node:assert/strict';
import { inventorySplitPayload, inventoryKeyboardIndex, inventoryTransferReason } from '../src/ui/inventoryPanel.js';
import { createInventoryActions } from '../src/inventory/inventoryActions.js';
import { createInventoryState } from '../src/inventory/inventoryState.js';
import { createItemCatalog } from '../src/inventory/itemCatalog.js';

test('split UI request uses the authoritative transfer and conserves both stacks', () => {
  let inventory=createInventoryState(); inventory.pack[0]={id:'wood',count:12};
  const actions=createInventoryActions({catalog:createItemCatalog(),getInventory:()=>inventory,commitInventory:next=>{inventory=next;return{ok:true};}});
  const request=inventorySplitPayload(actions.view(),0,5);
  assert.deepEqual(request,{fromId:'backpack',fromIndex:0,toId:'backpack',toIndex:1,count:5});
  assert.equal(actions.transfer(request.fromId,request.fromIndex,request.toId,request).ok,true);
  assert.deepEqual(inventory.pack.slice(0,2),[{id:'wood',count:7},{id:'wood',count:5}]);
});

test('split rejects full containers, stale stacks, fractional and whole-stack quantities', () => {
  const c={id:'backpack',slots:[{id:'wood',count:3},null]};
  for(const count of [-1,0,1.5,3,4,null])assert.equal(inventorySplitPayload(c,0,count),null);
  assert.equal(inventorySplitPayload(c,1,1),null);
  assert.equal(inventorySplitPayload({...c,slots:[c.slots[0]]},0,1),null);
});

test('keyboard navigation retains four-column moves and clamps upgraded container ends', () => {
  assert.equal(inventoryKeyboardIndex(0,'ArrowLeft',16),0);
  assert.equal(inventoryKeyboardIndex(3,'ArrowDown',16),7);
  assert.equal(inventoryKeyboardIndex(35,'ArrowDown',36),35);
  assert.equal(inventoryKeyboardIndex(35,'Home',36),0);
  assert.equal(inventoryKeyboardIndex(0,'End',36),35);
});

test('withdraw-only supplies admit explicit taking but reject deposits, rearrangement and split',()=>{
 const model={pack:{id:'backpack',slots:[{id:'wood',count:2},null]},storage:{id:'legacy_supplies',withdrawOnly:true,slots:[{id:'wood',count:20,totalCount:300},null]}};
 assert.equal(inventoryTransferReason(model,'legacy_supplies',0,'backpack'),null);
 assert.match(inventoryTransferReason(model,'backpack',0,'legacy_supplies',1),/only allows taking/);
 assert.match(inventoryTransferReason(model,'legacy_supplies',0,'backpack',0),/Take to Backpack/);
 assert.match(inventoryTransferReason(model,'legacy_supplies',0,'backpack',1),/Take to Backpack/);
 assert.match(inventoryTransferReason(model,'legacy_supplies',0,'legacy_supplies',1),/only allows taking/);
 assert.equal(inventorySplitPayload(model.storage,0,5),null);
 assert.equal(inventoryTransferReason(model,'backpack',0,'backpack',1),null);
});
