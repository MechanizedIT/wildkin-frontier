import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { countItems } from '../src/inventory/slotOperations.js';

const resourceDrops = ['wood','stone','fiber','berries','crystal_shard'].map(id => ({ id, displayName:id }));
function setup(raw = null) {
  let value = raw ? JSON.stringify(raw) : null, fail = false;
  globalThis.localStorage = { getItem: () => value, setItem: (_key, next) => { if (fail) throw Error('quota'); value = next; } };
  const progress = createFrontierProgress({ resourceDrops }); progress.load();
  return { progress, fail: next => { fail = next; }, saved: () => value };
}
test('v2 quantities migrate once into the physical pod and retain finite overflow', () => {
  const f=setup({version:2,bankedResources:{wood:1000},craftedConsumables:{medkit:2},fieldSupplies:{berry_lure:1}}), p=f.progress;
  assert.equal(p.getPackResourceCounts().wood,0);
  const inventory=p.getInventoryState();
  assert.equal((countItems(inventory.containers[0].slots).wood??0)+(inventory.legacy.wood??0),1000);
  const exported=p.exportSave().payload;
  assert.equal(exported.gameVersion,3);assert.equal('bankedResources' in exported.progress,false);
  p.load();assert.deepEqual(p.getInventoryState(),inventory);
  p.setInventoryAccess({canAccessContainer:()=>true});
  assert.equal(p.inventory.transfer('pod_locker',inventory.containers[0].slots.findIndex(s=>s?.id==='medkit'),'backpack').ok,true);
  assert.equal(p.getState().craftedConsumables.medkit,2);
});
test('failed collection, crafting and gate repair preserve both quantities and flags', () => {
  const f=setup(),p=f.progress;p.collectResources({fiber:3,berries:2,wood:4},{gathered:true});
  const before=p.getInventoryState();f.fail(true);
  assert.equal(p.collectResources({wood:1}).ok,false);
  assert.equal(p.craftConsumable('medkit').crafted,false);
  assert.equal(p.repairPortalGate('gate_fen',{wood:2}),false);
  assert.equal(p.isPortalGateRepaired('gate_fen'),false);assert.deepEqual(p.getInventoryState(),before);
  f.fail(false);assert.equal(p.craftConsumable('medkit').crafted,true);assert.equal(p.getState().craftedConsumables.medkit,1);
  assert.equal(p.repairPortalGate('gate_fen',{wood:2}),true);assert.equal(p.getPackResourceCounts().wood,2);
});
test('extracting the same carried pack records return without adding material copies', () => {
  const {progress:p}=setup();p.collectResources({wood:8},{gathered:true});p.markDeparted();
  const before=p.getInventoryState().pack;
  assert.equal(p.bankRun({wood:8},12,'real_run').ok,true);assert.deepEqual(p.getInventoryState().pack,before);
  assert.equal(p.bankRun({wood:8},12,'real_run').added,false);assert.equal(p.getBankedXp(),12);
  assert.equal(p.getInventoryState().totals.returned,8);
});
test('partial cache remainder and once-only XP commit with accepted items', () => {
  const f=setup(),p=f.progress;p.collectResources({wood:318}); //15 full stacks +18.
  const reward={resources:{wood:7},xp:20};
  const partial=p.claimLootRewards('cache',null,reward,100);
  assert.equal(partial.ok,true);assert.deepEqual(partial.rewards,{resources:{wood:2},xp:20});assert.deepEqual(partial.remaining,{wood:5});
  assert.equal(p.claimLootRewards('cache',null,reward,100).reason,'full');
  p.spendResources({wood:5});f.fail(true);
  assert.equal(p.claimLootRewards('cache',null,reward,100).ok,false);assert.equal(p.getPackResourceCounts().wood,315);
  f.fail(false);const rest=p.claimLootRewards('cache',null,reward,100);assert.deepEqual(rest.rewards,{resources:{wood:5},xp:0});
  assert.equal(p.getLootChestAvailability('cache',null).available,false);
});
test('invalid v3 save is not overwritten, and invalid restore preserves a working inventory', () => {
  const raw={version:3,inventory:{packTier:0,pack:[]}},f=setup(raw);
  assert.deepEqual(JSON.parse(f.saved()),raw);assert.equal(f.progress.save().saved,false);
  f.progress.clear();f.progress.collectResources({wood:2});const before=f.progress.exportSave().payload;
  const bad=structuredClone(before);bad.progress.inventory.pack[0].count=100;
  assert.equal(f.progress.importSave(bad).ok,false);assert.deepEqual(f.progress.exportSave().payload,before);
});
test('crafting uses only pack and a chosen accessible physical source', () => {
  const {progress:p}=setup({version:2,bankedResources:{fiber:3,berries:2}});
  let access=false;p.setInventoryAccess({canAccessContainer:()=>access,getCraftStorageId:()=> 'pod_locker'});
  assert.equal(p.craftConsumable('medkit').crafted,false);access=true;
  assert.equal(p.craftConsumable('medkit').crafted,true);assert.equal(p.getState().craftedConsumables.medkit,1);
  assert.equal(countItems(p.getInventoryState().containers[0].slots).fiber??0,0);
});
test('paid healing and cache XP persist the post-effect run with items; extraction clears resume once',()=>{
 const f=setup(),p=f.progress;p.collectResources({fiber:6,berries:4});p.craftConsumable('medkit');p.craftConsumable('medkit');
 const live={runId:'run_test',startAnchorId:'entry',sectionId:'section_1',feet:{x:2,y:0,z:29},facingYaw:0,health:2,xp:3,companions:[],corePending:false,kills:0,maxDepth:1,newWaypoints:[],newBeacons:[]};
 p.setRunSnapshotProvider(()=>live);assert.equal(p.checkpointRun().ok,true);
 assert.equal(p.consumeConsumable('medkit',{health:5}).consumed,true);
 assert.equal(JSON.parse(f.saved()).activeRun.health,5);assert.equal(p.getState().craftedConsumables.medkit,1);live.health=5;
 f.fail(true);assert.equal(p.consumeConsumable('medkit',{health:6}).consumed,false);assert.equal(p.getActiveRun().health,5);assert.equal(p.getState().craftedConsumables.medkit,1);
 f.fail(false);assert.equal(p.claimLootRewards('chest_heartwood_core',null,{resources:{wood:1},xp:10}).ok,true);
 assert.equal(JSON.parse(f.saved()).activeRun.xp,13);assert.equal(JSON.parse(f.saved()).activeRun.corePending,true);
 live.xp=13;live.corePending=true;const exported=p.exportSave().payload;
  p.setRunSnapshotProvider(()=>null);assert.equal(p.importSave(exported).ok,true);assert.equal(p.getActiveRun().runId,'run_test','import preserves active run while current runtime is Camp');
  p.checkpointRun();assert.equal(JSON.parse(f.saved()).activeRun.runId,'run_test','old Camp pagehide callback cannot erase imported expedition');
 p.setRunSnapshotProvider(()=>live);assert.equal(p.bankRun({wood:1},13,live.runId,{coreSecured:true}).ok,true);
 assert.equal(JSON.parse(f.saved()).activeRun,null);assert.equal(p.checkpointRun().ok,true);assert.equal(p.getActiveRun(),null,'stale callback cannot resurrect resolved run');
});
