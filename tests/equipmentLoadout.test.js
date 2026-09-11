import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { normalizeLoadout } from '../src/equipment/equipmentCatalog.js';

test('quick slots normalize corrupt IDs, duplicates and selection without introducing owned stacks',()=>{
  assert.deepEqual(normalizeLoadout({slots:['omni_tool','omni_tool','bad',null,'medkit','build_tool'],selected:Infinity}),
    {slots:['omni_tool',null,null,null,'medkit'],selected:0});
  assert.equal(normalizeLoadout(null).slots.length,5);
});

test('loadout assignment, use counts, reload, export/import, clear and storage rollback share the persistent owner',()=>{
  const old=globalThis.localStorage,values=new Map();let fail=false;
  globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('storage full');values.set(k,v);},removeItem:k=>values.delete(k)};
  try{
    const p=createFrontierProgress();p.load();
    p.bankRun({berries:20,fiber:20},0,'loadout-proof');p.craftConsumable('medkit');
    assert.equal(p.assignQuickSlot(0,'medkit').ok,true);
    assert.deepEqual(p.getLoadout().slots.slice(0,2),['medkit','omni_tool']);
    assert.equal(p.assignQuickSlot(4,'calming_chime').reason,'item-unavailable');
    assert.equal(p.selectQuickSlot(1).ok,true);
    const borrowed=p.getLoadout();borrowed.slots[1]=null;assert.equal(p.getLoadout().slots[1],'omni_tool');
    const before=p.getState();fail=true;
    assert.equal(p.assignQuickSlot(4,'medkit').ok,false);
    assert.equal(p.selectQuickSlot(0).ok,false);
    assert.deepEqual(p.getState(),before);fail=false;
    p.load();assert.equal(p.getLoadout().selected,1);
    assert.equal(p.consumeConsumable('medkit').consumed,true);
    assert.equal(p.getLoadout().slots[0],'medkit');assert.equal(p.getState().craftedConsumables.medkit,0);
    const transfer=p.exportSave().payload;p.clear();assert.equal(p.getLoadout().slots[0],'omni_tool');
    assert.equal(p.importSave(transfer).ok,true);assert.equal(p.getLoadout().slots[0],'medkit');
  }finally{globalThis.localStorage=old;}
});
