import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEquipmentSystem } from '../src/equipment/equipmentSystem.js';
import { createTamingEquipmentUse } from '../src/equipment/tamingEquipment.js';
function fixture() {
  const state={loadout:{slots:['omni_tool','medkit','berry_lure','woven_snare','build_tool'],selected:0},craftedConsumables:{medkit:2},fieldSupplies:{berry_lure:1}};
  const calls=[], progress={getLoadout:()=>state.loadout,getState:()=>state,selectQuickSlot(slot){state.loadout.selected=slot;return {ok:true};},assignQuickSlot(slot,id){state.loadout.slots[slot]=id;return {ok:true};}};
  const equipment=createEquipmentSystem({progress,isCamp:()=>true,cancelTool:()=>calls.push('cancel'),setToolEquipped:v=>calls.push(['visible',v]),heal:()=>{state.craftedConsumables.medkit--;calls.push('heal');return {ok:true};},beginTaming:item=>{calls.push(item.id);return {ok:true};},openBuild:()=>{calls.push('build');return {ok:true};},notify:m=>calls.push(m)});
  return {state,calls,equipment,progress};
}
test('selection consumes nothing; each non-tool press uses once, holding cannot consume again',()=>{
  const {state,calls,equipment}=fixture();equipment.select(1);
  assert.equal(state.craftedConsumables.medkit,2);assert.equal(equipment.isToolEquipped(),false);
  equipment.routeInput({held:false});equipment.routeInput({requested:true,held:true});
  for(let i=0;i<4;i++)equipment.routeInput({requested:true,held:true});
  assert.equal(state.craftedConsumables.medkit,1);assert.equal(calls.filter(c=>c==='heal').length,1);
});
test('switching while held, opening a modal and empty-item use cannot cause hidden attacks or spend',()=>{
  const {state,calls,equipment}=fixture();equipment.select(1);
  assert.equal(equipment.routeInput({requested:true,held:true}).toolAllowed,false);assert.equal(state.craftedConsumables.medkit,2);
  equipment.routeInput({blocked:true,requested:true});assert.equal(state.craftedConsumables.medkit,2);
  equipment.routeInput({held:false});state.craftedConsumables.medkit=0;equipment.routeInput({requested:true});
  assert.equal(calls.filter(c=>c==='heal').length,0);assert.ok(calls.some(c=>typeof c==='string'&&c.includes('Craft')));
  equipment.select(0);equipment.routeInput({held:false});assert.equal(equipment.routeInput({requested:true,held:true}).toolAllowed,true);
});
test('supplies/build invoke existing actions; failed persistent selection keeps the original held tool',()=>{
  const {calls,equipment,progress}=fixture();equipment.select(2);equipment.routeInput({held:false});equipment.routeInput({requested:true});assert.ok(calls.includes('berry_lure'));
  equipment.select(4);equipment.routeInput({held:false});equipment.routeInput({requested:true});assert.ok(calls.includes('build'));
  equipment.select(0);progress.selectQuickSlot=()=>({ok:false,reason:'storage-write-failed'});assert.equal(equipment.select(1).ok,false);assert.equal(equipment.isToolEquipped(),true);
});
test('taming equipment resumes the exact live attempt after its supply was consumed, and rejects another species',()=>{
  const target=id=>({state:{id,visualAssetId:'asset_wildkin_mossling',pos:{x:id==='active'?4:1,y:.5,z:0}}});
  let active={id:'active',speciesId:'mossling'};const calls=[];
  const use=createTamingEquipmentUse({companions:{getFieldTamingState:()=>active,beginBond:id=>{calls.push(id);return true;}},progress:{getFieldSupplies:()=>({berry_lure:0})},creatures:{getActiveAliveCreatures:()=>[target('other'),target('active')]},getPlayerPosition:()=>({x:0,y:.5,z:0})});
  assert.equal(use({id:'berry_lure',name:'Berry lure',species:'mossling'}).ok,true);assert.deepEqual(calls,['active']);
  assert.equal(use({id:'woven_snare',name:'Woven snare',species:'tidefin'}).ok,false);
  active=null;assert.match(use({id:'berry_lure',name:'Berry lure',species:'mossling'}).message,/Craft/);assert.deepEqual(calls,['active']);
});
