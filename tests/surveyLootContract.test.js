import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_DATA } from './fixtures/crescentWorld.generated.js';
import { createWorldRegistry } from '../src/world/worldRegistry.js';
import { normalizeWorldData } from '../src/world/worldValidator.js';
import { createLootSystem, resolveLootTable } from '../src/world/lootSystem.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createItemCatalog } from '../src/inventory/itemCatalog.js';
import { countItems } from '../src/inventory/slotOperations.js';
import { createAuthorDraft } from '../src/author/authorDraft.js';
import { resolveAuthorType } from '../src/author/authorTypeRegistry.js';
import { FIELD_PACK_CARTRIDGE_ID as cartridge } from '../src/base/fieldPackConfig.js';

const chestId='survey_contract_cache', tableId='survey_contract_rewards';
const itemReward={type:'item',id:cartridge,amount:1};
function fixture(rewards=[itemReward], refillSeconds=null) {
  const world=structuredClone(WORLD_DATA),region=world.regions[0];
  world.lootTables??=[];
  world.lootTables.push({id:tableId,rewards:structuredClone(rewards)});
  region.lootChests??=[];
  region.lootChests.push({id:chestId,displayName:'Survey recovery',lootTableId:tableId,refillSeconds,
    pos:{x:(region.bounds.minX+region.bounds.maxX)/2,y:0,z:(region.bounds.minZ+region.bounds.maxZ)/2}});
  return world;
}
function storage(t) {
  const previous=globalThis.localStorage,values=new Map();let failing=false;
  globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(failing)throw Error('quota');values.set(key,value);},removeItem:key=>values.delete(key)};
  t.after(()=>{globalThis.localStorage=previous;});
  return {fail:value=>{failing=value;},snapshot:()=>[...values.entries()]};
}
function runtime(world,grants=[],clock=()=>1000) {
  const registry=createWorldRegistry(world);
  const progress=createFrontierProgress({worldRegistry:registry,resourceDrops:registry.data.resourceDrops});progress.load();
  const chest=registry.getLootChestById(chestId);
  const loot=createLootSystem(registry,{frontierProgress:progress,getActiveSectionId:()=>chest.sectionId,getPlayerPos:()=>({...chest.pos,y:.55}),now:clock,grantRewards:reward=>grants.push(reward)});
  return {progress,loot,registry,counts:()=>countItems(progress.getInventoryState().pack)};
}

test('survey cartridge resolves through the actual catalog with resource and XP siblings',()=>{
  const world=fixture(),catalog=createItemCatalog(world.resourceDrops);
  assert.equal(catalog[cartridge].stackLimit,1);
  assert.deepEqual(resolveLootTable({rewards:[itemReward,{type:'resource',id:'wood',amount:2},{type:'xp',amount:7},
    {type:'item',id:'unknown',amount:4},{type:'resource',id:cartridge,amount:1}]},new Set(world.resourceDrops.map(drop=>drop.id)),new Set(Object.keys(catalog))),{resources:{[cartridge]:1,wood:2},xp:7});
});

test('full pack leaves the unique cartridge recoverable; freed slot, reload and repeated opening cannot duplicate it',t=>{
  storage(t);const world=fixture(),grants=[];let run=runtime(world,grants);
  assert.equal(run.progress.collectResources({wood:320}).ok,true);
  assert.equal(run.loot.open(chestId).reason,'full');assert.equal(grants.length,0);
  assert.equal(run.loot.getAvailability(chestId).available,true);
  run=runtime(world,grants);assert.equal(run.loot.open(chestId).reason,'full');
  assert.equal(run.progress.spendResources({wood:20}).ok,true);
  const claim=run.loot.open(chestId);assert.equal(claim.ok,true);assert.equal(claim.partial,false);
  assert.deepEqual(claim.rewards,{resources:{[cartridge]:1},xp:0});
  assert.equal(run.counts()[cartridge],1);assert.equal(run.counts().wood,300);
  assert.equal(run.progress.getInventoryState().pack.find(slot=>slot?.id===cartridge).count,1);
  run=runtime(world,grants);assert.equal(run.counts()[cartridge],1);
  assert.equal(run.loot.open(chestId).reason,'unavailable');assert.equal(grants.length,1);
});

test('mixed reward partial claim persists cartridge remainder and never repeats accepted resources or XP',t=>{
  storage(t);const rewards=[{type:'resource',id:'wood',amount:1},itemReward,{type:'xp',amount:9}],world=fixture(rewards),grants=[];
  let run=runtime(world,grants);run.progress.collectResources({wood:319});
  const first=run.loot.open(chestId);assert.equal(first.ok,true);assert.equal(first.partial,true);
  assert.deepEqual(first.rewards,{resources:{wood:1},xp:9});assert.equal(run.counts()[cartridge],undefined);
  assert.deepEqual(run.progress.exportSave().payload.progress.lootRemainders[chestId],{resources:{[cartridge]:1},xpCollected:true});
  run=runtime(world,grants);assert.equal(run.loot.open(chestId).reason,'full');
  run.progress.spendResources({wood:20});
  const last=run.loot.open(chestId);assert.equal(last.partial,false);assert.deepEqual(last.rewards,{resources:{[cartridge]:1},xp:0});
  run=runtime(world,grants);assert.equal(run.counts()[cartridge],1);assert.equal(run.counts().wood,300);
  assert.equal(run.loot.open(chestId).reason,'unavailable');assert.equal(grants.reduce((sum,reward)=>sum+reward.xp,0),9);
  assert.equal(run.progress.exportSave().payload.progress.lootRemainders[chestId],undefined);
});

test('failed initial and remainder saves retain ownership, callbacks and retryability',t=>{
  const disk=storage(t),world=fixture([itemReward,{type:'resource',id:'wood',amount:2},{type:'xp',amount:4}]),grants=[];
  let run=runtime(world,grants);run.progress.collectResources({wood:300});
  const before=run.progress.exportSave().payload,saved=disk.snapshot();disk.fail(true);
  assert.equal(run.loot.open(chestId).ok,false);assert.deepEqual(run.progress.exportSave().payload,before);
  assert.deepEqual(disk.snapshot(),saved);assert.equal(grants.length,0);assert.equal(run.loot.getAvailability(chestId).available,true);
  disk.fail(false);assert.equal(run.loot.open(chestId).partial,true); // one free slot holds cartridge; wood stack is full.
  assert.equal(run.counts()[cartridge],1);assert.deepEqual(grants[0].resources,{[cartridge]:1});
  run=runtime(world,grants);run.progress.spendResources({wood:2});
  const partial=run.progress.exportSave().payload,partialSaved=disk.snapshot();disk.fail(true);
  assert.equal(run.loot.open(chestId).ok,false);assert.deepEqual(run.progress.exportSave().payload,partial);
  assert.deepEqual(disk.snapshot(),partialSaved);assert.equal(grants.length,1);
  disk.fail(false);const finish=run.loot.open(chestId);assert.equal(finish.ok,true);assert.deepEqual(finish.rewards,{resources:{wood:2},xp:0});
  run=runtime(world,grants);assert.equal(run.counts()[cartridge],1);assert.equal(run.loot.open(chestId).reason,'unavailable');
});

test('resource and XP refill sibling still waits for its persisted deadline',t=>{
  storage(t);const world=fixture([{type:'resource',id:'wood',amount:2},{type:'xp',amount:3}],5),grants=[];let now=1000;
  let run=runtime(world,grants,()=>now);assert.equal(run.loot.open(chestId).ok,true);
  run=runtime(world,grants,()=>now);now=5999;assert.equal(run.loot.open(chestId).reason,'unavailable');
  now=6000;assert.equal(run.loot.open(chestId).ok,true);assert.equal(run.counts().wood,4);assert.equal(grants.length,2);
});

test('world validation accepts catalog items and rejects unknown IDs, wrong resource family and invalid quantities',()=>{
  const valid=[itemReward,{type:'item',id:'medkit',amount:2},{type:'resource',id:'wood',amount:3},{type:'xp',amount:4}];
  assert.deepEqual(normalizeWorldData(fixture(valid)).lootTables.find(table=>table.id===tableId).rewards,valid);
  for(const reward of [{...itemReward,id:'unknown'},{...itemReward,id:'__proto__'},{...itemReward,id:'toString'},
    {type:'resource',id:cartridge,amount:1},{...itemReward,amount:0},{...itemReward,amount:-1},{...itemReward,amount:1.5},{...itemReward,type:'blueprint'}]){
    assert.throws(()=>normalizeWorldData(fixture([reward])),undefined,JSON.stringify(reward));
  }
  for(const reward of [itemReward,{type:'resource',id:'wood',amount:1},{type:'xp',amount:1}]){
    assert.throws(()=>normalizeWorldData(fixture([{...reward,amount:Number.MAX_SAFE_INTEGER+1}])),undefined,`${reward.type} must not export an unsafe integer reward`);
  }
});

test('Author shared table JSON edits export and reload both chest references without aliasing reads',t=>{
  storage(t);const world=fixture(),region=world.regions[1];
  region.lootChests??=[];region.lootChests.push({id:'survey_contract_sibling',lootTableId:tableId,refillSeconds:null,pos:{x:(region.bounds.minX+region.bounds.maxX)/2,y:0,z:(region.bounds.minZ+region.bounds.maxZ)/2}});
  const draft=createAuthorDraft(world),field=resolveAuthorType(draft.findObjectById(chestId)).inspector.find(field=>field.key==='lootRewards');
  assert.equal(field.type,'json');assert.equal(field.source,'lootTable');assert.equal(draft.getLootTableDetails(tableId).chestCount,2);
  const detached=draft.getLootTableDetails(tableId);detached.rewards[0].amount=99;detached.chestCount=90;
  assert.equal(draft.getLootTableDetails(tableId).rewards[0].amount,1);assert.equal(draft.getLootTableDetails(tableId).chestCount,2);
  const rewards=[itemReward,{type:'resource',id:'fiber',amount:3},{type:'xp',amount:2}];
  assert.equal(draft.updateInspectorField(chestId,'lootRewards',JSON.stringify(rewards)).ok,true);
  const exported=JSON.parse(draft.exportStableJson()),registry=createWorldRegistry(exported);
  for(const id of [chestId,'survey_contract_sibling'])assert.deepEqual(registry.getLootTableById(registry.getLootChestById(id).lootTableId).rewards,rewards);
  assert.equal(exported.regions.flatMap(region=>region.lootChests??[]).some(chest=>Object.hasOwn(chest,'lootRewards')),false);
  const reloaded=createAuthorDraft(world);assert.ok(reloaded.loadPersisted());assert.deepEqual(reloaded.getLootTableDetails(tableId).rewards,rewards);
  assert.equal(reloaded.getLootTableDetails(tableId).chestCount,2);assert.equal(reloaded.getLootTableDetails('missing'),null);
  draft.flushPersistSync?.();reloaded.flushPersistSync?.();
});

test('Author invalid JSON/item edits reject atomically across table, persisted draft and history',t=>{
  const disk=storage(t),draft=createAuthorDraft(fixture());
  assert.equal(draft.updateInspectorField(chestId,'lootRewards',JSON.stringify([itemReward,{type:'xp',amount:2}])).ok,true);
  const before=draft.exportStableJson(),saved=disk.snapshot();
  for(const value of ['[','null','[]','{}',JSON.stringify([{...itemReward,id:'unknown'}]),JSON.stringify([{...itemReward,amount:-1}]),JSON.stringify([{type:'resource',id:cartridge,amount:1}]),
    ...[itemReward,{type:'resource',id:'wood',amount:1},{type:'xp',amount:1}].map(reward=>JSON.stringify([{...reward,amount:Number.MAX_SAFE_INTEGER+1}]))]){
    const result=draft.updateInspectorField(chestId,'lootRewards',value);assert.equal(result.ok,false,value);
    assert.equal(draft.exportStableJson(),before);assert.deepEqual(disk.snapshot(),saved);
  }
  assert.equal(draft.undo().ok,true);assert.deepEqual(draft.getLootTableDetails(tableId).rewards,[itemReward]);
  draft.flushPersistSync?.();
});

test('authored prototype-name resources resolve and claim as own finite rewards through reload',t=>{
  storage(t);const world=fixture([{type:'resource',id:'constructor',amount:1},{type:'item',id:'constructor',amount:2}]);
  world.resourceDrops.push({...structuredClone(world.resourceDrops[0]),id:'constructor',displayName:'Authored constructor'});
  const catalog=createItemCatalog(world.resourceDrops),expected=Object.fromEntries([['constructor',3]]);
  const resolved=resolveLootTable(world.lootTables.find(table=>table.id===tableId),new Set(world.resourceDrops.map(drop=>drop.id)),new Set(Object.keys(catalog)));
  assert.deepEqual(resolved,{resources:expected,xp:0});
  assert.equal(Object.hasOwn(resolved.resources,'constructor'),true);
  // The world schema requires a leading letter, so __proto__ is only a defensive resolver check.
  const defensive=resolveLootTable({rewards:[{type:'resource',id:'__proto__',amount:2}]},new Set(['__proto__']),new Set());
  assert.deepEqual(defensive.resources,Object.fromEntries([['__proto__',2]]));assert.equal(Object.hasOwn(defensive.resources,'__proto__'),true);
  const grants=[];let run=runtime(world,grants);const claim=run.loot.open(chestId);
  assert.equal(claim.ok,true);assert.equal(claim.partial,false);assert.deepEqual(claim.rewards.resources,expected);
  assert.deepEqual(run.counts(),expected);assert.deepEqual(grants[0].resources,expected);
  run=runtime(world,grants);assert.deepEqual(run.counts(),expected);assert.equal(run.loot.open(chestId).reason,'unavailable');assert.equal(grants.length,1);
});

test('duplicate safe amounts cannot overflow item/resource totals or XP through validation and Author edits',t=>{
  const disk=storage(t),draft=createAuthorDraft(fixture());
  assert.equal(draft.updateInspectorField(chestId,'lootRewards',JSON.stringify([itemReward])).ok,true);
  const before=draft.exportStableJson(),saved=disk.snapshot(),maximum=Number.MAX_SAFE_INTEGER;
  const cases=[
    [{type:'xp',amount:maximum},{type:'xp',amount:1}],
    [{type:'item',id:cartridge,amount:maximum},{type:'item',id:cartridge,amount:1}],
    [{type:'resource',id:'wood',amount:maximum},{type:'resource',id:'wood',amount:1}],
    [{type:'resource',id:'wood',amount:maximum},{type:'item',id:'wood',amount:1}],
  ];
  for(const rewards of cases){
    for(const reward of rewards)assert.doesNotThrow(()=>normalizeWorldData(fixture([reward])),'each individual amount is valid');
    assert.throws(()=>normalizeWorldData(fixture(rewards)),undefined,`unsafe combined ${rewards[0].type} amount`);
    assert.equal(draft.updateInspectorField(chestId,'lootRewards',JSON.stringify(rewards)).ok,false);
    assert.equal(draft.exportStableJson(),before);assert.deepEqual(disk.snapshot(),saved);
  }
  draft.flushPersistSync?.();
});
