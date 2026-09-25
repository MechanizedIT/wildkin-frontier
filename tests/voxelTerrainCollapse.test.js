import test from 'node:test';
import assert from 'node:assert/strict';
import { TerrainChunkWorld, TERRAIN_LEDGE_FIXTURE, excavateSphere, terrainChunkId } from '../lab/voxel/terrain-chunks.js';
import { TerrainMatterWindow } from '../lab/voxel/terrain-matter-window.js';
import { classifyTerrainComponent, deriveTerrainStructuralSeeds, queryTerrainSupport, TERRAIN_COLLAPSE_POLICY } from '../lab/voxel/terrain-collapse.js';
import { actorMatterSamples, matterMaterialAt } from '../lab/voxel/matter-actor.js';
import { MATTER_MATERIAL } from '../lab/voxel/matter-material-policy.js';
import { analyzeMatterConnectivity } from '../lab/voxel/matter-connectivity.js';
import { parcelBits, parcelMaterial } from '../lab/voxel/matter-ownership.js';

const COLLAPSE_EDITS=Object.freeze([
  [6.2,4.2,9],[6.8,4.2,9],[7.4,4.2,9],[6.2,4.7,9],[6.8,4.7,9],
  [7.4,4.7,9],[6.2,5.2,9],[6.8,5.2,9],[7.4,5.2,9],[6.2,5.7,9],
]);

function solidGrid(materialsByX){
  const size=[materialsByX.length+1,2,2],densities=new Float64Array(size[0]*size[1]*size[2]).fill(-1),materials=new Uint8Array(densities.length);
  for(let z=0;z<size[2];z++)for(let y=0;y<size[1];y++)for(let x=0;x<size[0];x++)materials[x+size[0]*(y+size[1]*z)]=materialsByX[Math.min(x,materialsByX.length-1)];
  return {size,spacing:.5,min:[0,0,0],densities,materials,index:([x,y,z])=>x+size[0]*(y+size[1]*z),
    readDensity([x,y,z]){return x<0||y<0||z<0||x>=size[0]||y>=size[1]||z>=size[2]?1:densities[x+size[0]*(y+size[1]*z)];}};
}
function chain(material,count){return {cells:Array.from({length:count},(_,x)=>[x,0,0]),occupiedProbes:count*8};}
function findActorMaterialPoint(actor,material){
  const samples=actorMatterSamples(actor),[nx,ny,nz]=samples.size,candidates=[];
  for(let z=2;z<nz-2;z++)for(let y=2;y<ny-2;y++)for(let x=2;x<nx-2;x++){
    const i=x+nx*(y+ny*z);if(samples.densities[i]<-.02&&samples.materials[i]===material){const point=samples.position(i);
      if(matterMaterialAt(samples,point)!==material)continue;let own=0,foreign=0;
      for(let dz=-2;dz<=2;dz++)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const j=x+dx+nx*((y+dy)+ny*(z+dz));
        if(samples.densities[j]<0){if(samples.materials[j]===material)own++;else if(samples.materials[j]!==0)foreign++;}}
      candidates.push({point,score:own-2*foreign});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);return candidates[0]?.point??null;
}
async function prepareCollapseFixture(){
  const world=new TerrainChunkWorld(),results=[];
  for(const center of COLLAPSE_EDITS){const changes=excavateSphere(world,center,.88,MATTER_MATERIAL.DIRT);assert.ok(changes.length,`ordinary shovel input has dirt at ${center}`);
    const result=await world.editSamples(changes);assert.equal(result.status,'COMMITTED');results.push(result);}
  return {world,results,actor:world.actors[0]};
}
async function prepareBeforeCollapse(){
  const world=new TerrainChunkWorld();
  for(const center of COLLAPSE_EDITS.slice(0,-1)){
    const changes=excavateSphere(world,center,.88,MATTER_MATERIAL.DIRT);assert.ok(changes.length);
    const result=await world.editSamples(changes);assert.equal(result.status,'COMMITTED');assert.equal(world.actors.length,0);
  }
  return world;
}

test('changed terrain samples produce stable adjacent structural seed cells',()=>{
  const input=[[0,6,0],[0,6,0],[16,3,16]],a=deriveTerrainStructuralSeeds(input),b=deriveTerrainStructuralSeeds(input);
  assert.deepEqual(a,b);assert.equal(new Set(a.seedCells.map(p=>p.join(','))).size,a.seedCells.length);
  assert.ok(a.seedCells.some(([x,y,z])=>x===-1&&y===5&&z===-1));
  assert.ok(a.seedCells.some(([x,y,z])=>x===15&&y===2&&z===15));
});

test('repeated terrain input at an unchanged scalar sample is an empty no-op',async()=>{
  const world=new TerrainChunkWorld(),changes=excavateSphere(world,[6.2,4.2,9],.88,MATTER_MATERIAL.DIRT);
  assert.ok(changes.length);assert.equal((await world.editSamples(changes)).status,'COMMITTED');
  const revision=world.revision,repeat=world.prepareEdit(changes);
  assert.equal(repeat.status,'EMPTY');assert.equal(world.revision,revision);
});

test('bounded expansion completes a seeded unsupported component and maximum-window uncertainty fails closed',()=>{
  const island={read([x,y,z]){return x>=0&&x<13&&y>=4&&y<9&&z>=1&&z<5?{density:-1,material:1}:{density:1,material:0};}},
    policy={...TERRAIN_COLLAPSE_POLICY,initialMargin:4,expansionStep:3,maxExpansions:5};
  const query=queryTerrainSupport(island,[[0,6,2]],{policy});
  assert.equal(query.status,'COMPLETE');assert.ok(query.expansions>0);assert.equal(query.candidateComponents.length,1);
  assert.ok(query.expansionHistory[0].unknownBoundary.axes[0]===1);
  const held=queryTerrainSupport(island,[[0,6,2]],{policy:{...policy,maxExpansions:0}});
  assert.equal(held.status,'DEFERRED_UNKNOWN_SUPPORT');assert.equal(held.candidateComponents.length,0);
  assert.ok(held.reason.includes('nonresident')||held.reason.includes('expansion'));
});

test('material-aware component tiers separate crumble, transient, persistent, mixed and oversize outcomes',()=>{
  const tiny=classifyTerrainComponent(solidGrid([2]),chain([2],1));
  const small=classifyTerrainComponent(solidGrid([2,2]),chain([2,2],2));
  const dirt=classifyTerrainComponent(solidGrid(Array(16).fill(2)),chain(Array(16).fill(2),16));
  const tinyRock=classifyTerrainComponent(solidGrid([1]),chain([1],1));
  const smallRock=classifyTerrainComponent(solidGrid(Array(4).fill(1)),chain(Array(4).fill(1),4));
  const rock=classifyTerrainComponent(solidGrid(Array(12).fill(1)),chain(Array(12).fill(1),12));
  const mixed=classifyTerrainComponent(solidGrid([1,2]),chain([1,2],2));
  const oversize=classifyTerrainComponent(solidGrid(Array(30).fill(1)),chain(Array(30).fill(1),30));
  assert.equal(tiny.kind,'crumble');assert.equal(small.kind,'transient-dirt-clod');
  assert.equal(tinyRock.kind,'rock-debris');assert.equal(smallRock.kind,'transient-rock-fragment');
  assert.equal(dirt.kind,'persistent-dirt-actor');assert.equal(rock.kind,'persistent-rock-actor');
  assert.equal(mixed.kind,'persistent-mixed-actor');assert.deepEqual(mixed.materials,['rock','dirt']);
  assert.equal(oversize.kind,'deferred-oversize');
});

test('natural mixed ledge starts anchored, includes a cave and spans both logical chunk seams',()=>{
  assert.deepEqual(TERRAIN_LEDGE_FIXTURE.chunkBoundary,[0,8]);
  const world=new TerrainChunkWorld(),support=queryTerrainSupport(world,[[0,14,18]]);
  assert.equal(support.status,'COMPLETE');assert.equal(support.candidateComponents.length,0);
  assert.ok(support.result.components.some(component=>component.anchored&&component.cells.some(cell=>{
    const [x,y,z]=support.window.localToGlobal(cell);return x>=-10&&x<=10&&y>=10&&y<=15&&z>=14&&z<=23;
  })),'ledge matter is connected to the explicit bottom/world anchor');
  const window=new TerrainMatterWindow(world,{min:[-12,0,12],max:[12,16,26],maxIntervals:[24,16,24]}),chunks=new Set(),materials={rock:0,dirt:0};
  for(let z=12;z<26;z++)for(let y=10;y<16;y++)for(let x=-12;x<12;x++){
    if(x< -11||x>10||z<13||z>23)continue;const local=[x+12,y,z-12],bits=parcelBits(window,local);
    for(let probe=0;probe<8;probe++)if(bits[probe]){const material=parcelMaterial(window,local,probe);materials[material===1?'rock':'dirt']++;
      chunks.add(terrainChunkId(Math.floor(x/16),0,Math.floor(z/16)));}
  }
  assert.ok(materials.rock>0&&materials.dirt>0);assert.ok(chunks.has('-1,0,0')&&chunks.has('0,0,1'));
  assert.ok(chunks.size>=4,'the ledge samples occupy both sides of X=0 and Z=8 m chunk seams');
  assert.ok(world.read([0,10,18]).density>=0,'the underside opens into a shallow excavatable alcove');
});

test('ordinary edits read locally, preserve supported early digging, then atomically extract a mixed slab',async()=>{
  const world=new TerrainChunkWorld(),ordinary=world.prepareEdit(excavateSphere(world,COLLAPSE_EDITS[0],.88,MATTER_MATERIAL.DIRT));
  assert.equal(ordinary.status,'PREPARED_INPUT');assert.equal(ordinary.supportEvidence.status,'COMPLETE');
  assert.equal(ordinary.supportEvidence.expansions,0);assert.ok(ordinary.supportEvidence.readChunkIds.length<9);
  assert.ok(ordinary.directDirtyChunkIds.length<ordinary.supportEvidence.readChunkIds.length);
  assert.deepEqual(ordinary.collapseDirtyChunkIds,[]);
  const first=await world.publishEdit(ordinary);assert.equal(first.status,'COMMITTED');
  for(const center of COLLAPSE_EDITS.slice(1,5)){
    const result=await world.editSamples(excavateSphere(world,center,.88,MATTER_MATERIAL.DIRT));
    assert.equal(result.status,'COMMITTED');assert.equal(world.actors.length,0,'the early shovel edits leave the ledge supported');
    assert.notEqual(result.event.collapseEvidence.persistentCount,1);
  }
  let collapse=null;
  for(const center of COLLAPSE_EDITS.slice(5)){
    const result=await world.editSamples(excavateSphere(world,center,.88,MATTER_MATERIAL.DIRT));assert.equal(result.status,'COMMITTED');
    if(world.actors.length){collapse=result.event;break;}
  }
  assert.ok(collapse);assert.equal(world.actors.length,1);
  const actor=world.actors[0];assert.equal(actor.material,MATTER_MATERIAL.MIXED);
  const actorConnectivity=analyzeMatterConnectivity(actorMatterSamples(actor),{identityForCell:()=> 'matter',canConnect:()=>true});
  assert.equal(actorConnectivity.status,'OK');assert.equal(actorConnectivity.components.length,1,'one MatterActor holds one connected component');
  const component=collapse.collapseEvidence.components.find(value=>value.kind==='persistent-mixed-actor');
  assert.ok(component);assert.ok(component.transferredParcelCounts.rock>0&&component.transferredParcelCounts.dirt>0);
  assert.ok(component.componentBounds.dimensions[0]>=16,'the detached slab began across a logical chunk seam');
  assert.notDeepEqual(actor.size,[13,13,13],'actor sample frame derives from the detached component bounds');
  assert.equal(collapse.collapseEvidence.persistentCount,1);assert.equal(collapse.collapseEvidence.transientCount,0);
  assert.equal(collapse.collapseEvidence.status,'COMPLETE');
  assert.equal(collapse.collapseEvidence.deferredCount,0,'the bounded post-transfer pass completes for this fixture');
  assert.equal(collapse.collapseEvidence.components.length,
    collapse.collapseEvidence.persistentCount+collapse.collapseEvidence.transientCount+collapse.collapseEvidence.crumbleCount,
    'every discovered unsupported component is classified and accounted before commit');
  assert.ok(collapse.collapseEvidence.components.length>0);assert.ok(collapse.collapseEvidence.components.every(value=>value.kind));
  assert.ok(collapse.supportEvidence.readChunkIds.length<9,'support analysis remains local to fewer than all resident chunks');
  assert.ok(collapse.supportEvidence.queries.length>=2,'the edited terrain is rechecked after static-to-actor transfer');
  assert.ok(collapse.supportEvidence.queries.slice(1).every(query=>query.status==='COMPLETE'),'every bounded stabilization query completes');
  assert.ok(collapse.supportEvidence.queries[1].workUnits>0,'post-transfer stabilization performs bounded structural work');
  assert.ok(collapse.supportEvidence.postTransferWorkUnits>0);
  const phaseTimeMs=collapse.timings.directEditMs+collapse.timings.supportMs+collapse.timings.classificationMs+
    collapse.timings.extractionMs+collapse.timings.publicationMs;
  assert.ok(collapse.timings.transactionMs>=phaseTimeMs-1,'transaction timing includes preparation and publication');
  assert.ok(collapse.timings.publicationMs>=collapse.timings.persistenceMs,'publication timing includes persistence');
  assert.ok(collapse.collapseChangedSamples.length>0);assert.ok(collapse.collapseDirtyChunkIds.length>0);
  assert.ok(collapse.finalDirtyChunkIds.every(id=>collapse.remeshedChunkIds.includes(id)));
  assert.ok(collapse.supportEvidence.readChunkIds.some(id=>!collapse.remeshedChunkIds.includes(id)),'read-only chunks are reused');
  assert.deepEqual(collapse.finalDirtyChunkIds,[...new Set([...collapse.directDirtyChunkIds,...collapse.collapseDirtyChunkIds])].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})));
  assert.ok(collapse.supportEvidence.workUnits<=TERRAIN_COLLAPSE_POLICY.maxEditWorkUnits);
  assert.equal(collapse.ledger.rock.initial,collapse.ledger.rock.world+collapse.ledger.rock.actors+collapse.ledger.rock.consumed);
  assert.equal(collapse.ledger.dirt.initial,collapse.ledger.dirt.world+collapse.ledger.dirt.actors+collapse.ledger.dirt.consumed);
  assert.equal(collapse.ledger.rock.actors,component.transferredParcelCounts.rock);
  assert.equal(collapse.ledger.dirt.actors,component.transferredParcelCounts.dirt);
  assertActorMaterialLedger(world,world.actors);
  assert.ok(collapse.directConsumedParcelIds.length>0);assert.equal(collapse.collapseConsumedParcelIds.length,0,'persistent detachment does not consume or reward matter');
  for(const globalId of Object.values(actor.parcelIds)){
    const [cellText,probeText]=globalId.split(':'),cell=cellText.split(',').map(Number),probe=Number(probeText),
      window=new TerrainMatterWindow(world,{min:cell,max:cell.map(v=>v+1)});
    assert.equal(world.ledger.owner(cell,probe),actor.id);assert.equal(parcelBits(window,[0,0,0])[probe],false,'transferred world parcels are AIR');
  }
  return {world,collapse,actor};
});

test('mixed MatterActor dirt and rock edits dispatch separately, preserve the other material, and survive reload',async()=>{
  const {world,actor}=await prepareCollapseFixture(),initialRock=world.ledger.audit().rock,initialDirt=world.ledger.audit().dirt;
  const dirtPoint=findActorMaterialPoint(actor,MATTER_MATERIAL.DIRT);assert.ok(dirtPoint);const dirtProposal=world.prepareActorMining(actor.id,actor.contentRevision,dirtPoint,{material:MATTER_MATERIAL.DIRT});
  assert.equal(dirtProposal.status,'PREPARED_INPUT');assert.equal(dirtProposal.actorMining.material,MATTER_MATERIAL.DIRT);
  const dirtResult=await world.publishEdit(dirtProposal);assert.equal(dirtResult.status,'COMMITTED');
  assertActorMaterialLedger(world,world.actors);
  assert.ok(world.ledger.audit().dirt.consumed>initialDirt.consumed);assert.equal(world.ledger.audit().rock.consumed,initialRock.consumed);
  const editedActor=world.actors.find(value=>value.material===MATTER_MATERIAL.MIXED&&
    Object.values(value.parcelMaterials??{}).includes(MATTER_MATERIAL.DIRT)&&Object.values(value.parcelMaterials??{}).includes(MATTER_MATERIAL.ROCK));
  assert.ok(editedActor,'the connected mixed remainder stays one mixed actor after unsupported dirt crumbles');
  assert.equal(dirtResult.event.actorMining.split,true);assert.ok(dirtResult.event.actorMining.crumbledComponents.length>0);
  const rockPoint=findActorMaterialPoint(editedActor,MATTER_MATERIAL.ROCK);assert.ok(rockPoint);
  const rockProposal=world.prepareActorMining(editedActor.id,editedActor.contentRevision,rockPoint,{material:MATTER_MATERIAL.ROCK});
  assert.equal(rockProposal.status,'PREPARED_INPUT');assert.equal(rockProposal.actorMining.material,MATTER_MATERIAL.ROCK);
  assert.equal(rockProposal.actorMining.stress?.visitedNodes>0,true);
  const preRockSamples=actorMatterSamples(editedActor).densities;
  const proposedRockSamples=actorMatterSamples(rockProposal.actors.find(value=>value.id===editedActor.id)).densities;
  assert.ok(proposedRockSamples.some((value,index)=>value!==preRockSamples[index]),'hard-rock cut changes the actor-local resolved scalar');
  const rockResult=await world.publishEdit(rockProposal);assert.equal(rockResult.status,'COMMITTED');
  assertActorMaterialLedger(world,world.actors);
  const postRockActor=world.actors.find(value=>value.id===editedActor.id||value.id.startsWith(`${editedActor.id}/mixed-`));
  assert.ok(postRockActor,'rock response retains an authoritative actor component');
  const postRockSamples=actorMatterSamples(postRockActor).densities;
  assert.ok(postRockActor.contentRevision>editedActor.contentRevision||postRockSamples.some((value,index)=>value!==preRockSamples[index]),
    'hard-rock response changes or structurally advances the moved actor');
  assert.ok(world.ledger.audit().rock.consumed>initialRock.consumed,'the rock strike removes at least one resolved rock parcel');
  assert.equal(world.ledger.audit().rock.consumed-initialRock.consumed,rockResult.event.consumedParcelIds.length,
    'the rock strike credits exactly the removed rock parcels once');
  assert.equal(world.ledger.audit().dirt.consumed,world.rewards.dirt);
  assert.equal(world.ledger.audit().rock.consumed,world.rewards.rock);
  const saved=world.exportSave(),reloaded=await new TerrainChunkWorld().reload(saved),restored=reloaded.actors.find(value=>value.id===postRockActor.id);
  assert.equal(reloaded.revision,world.revision);assert.deepEqual(reloaded.ledger.audit(),world.ledger.audit());
  assertActorMaterialLedger(reloaded,reloaded.actors);
  assert.ok([MATTER_MATERIAL.MIXED,MATTER_MATERIAL.ROCK].includes(restored.material));
  assert.deepEqual(restored.parcelMaterials,postRockActor.parcelMaterials);
  assert.deepEqual(restored.size,actorMatterSamples(restored).size);assert.equal(reloaded.read([0,10,18]).density>=0,true,'reload keeps the excavated cavity open');
});

function assertActorMaterialLedger(world,actors){
  assert.equal(world.ledger.assertActorParcelMaps(actors),true);
  const materialCounts={rock:0,dirt:0};for(const actor of actors)for(const material of Object.values(actor.parcelMaterials??{}))
    materialCounts[material===MATTER_MATERIAL.ROCK?'rock':'dirt']++;
  const audit=world.ledger.audit();assert.equal(materialCounts.rock,audit.rock.actors);assert.equal(materialCounts.dirt,audit.dirt.actors);
  const actor=actors.find(value=>Object.values(value.parcelMaterials??{}).includes(MATTER_MATERIAL.ROCK)&&Object.values(value.parcelMaterials??{}).includes(MATTER_MATERIAL.DIRT));
  if(actor)for(const material of [MATTER_MATERIAL.ROCK,MATTER_MATERIAL.DIRT]){
    const [localKey]=Object.entries(actor.parcelMaterials).find(([,value])=>value===material),[cell,part]=localKey.split(':'),[x,y,z]=cell.split(',').map(Number),probe=Number(part),
      point=[x+((probe&1)?0.75:0.25),y+((probe&2)?0.75:0.25),z+((probe&4)?0.75:0.25)].map((value,axis)=>actor.min[axis]+value*actor.spacing);
    assert.equal(matterMaterialAt(actorMatterSamples(actor),point,actor.parcelMaterials,actor.parcelIds),material,'moved actor targeting follows its authoritative parcel material');
  }
}

test('collapse failures preserve ownership and publication, while incomplete support still accepts direct excavation',async()=>{
  const base=await prepareBeforeCollapse(),save=base.exportSave(),finalCenter=COLLAPSE_EDITS.at(-1),
    makeWorld=async(failAt=null)=>{const world=await new TerrainChunkWorld().reload(save);world.failAt=failAt;return world;};
  for(const failAt of ['support-incomplete']){
    const world=await makeWorld(failAt),proposal=world.prepareEdit(excavateSphere(world,finalCenter,.88,MATTER_MATERIAL.DIRT));
    assert.equal(proposal.status,'PREPARED_INPUT');assert.equal(proposal.supportEvidence.status,'DEFERRED_UNKNOWN_SUPPORT');
    const result=await world.publishEdit(proposal);assert.equal(result.status,'COMMITTED');assert.equal(world.actors.length,0);
    assert.equal(world.revision,save.revision+1);world.ledger.assertBalanced();
  }
  for(const failAt of ['actor-construction','parcel-transfer']){
    const world=await makeWorld(failAt),before=world.ledger.audit(),proposal=world.prepareEdit(excavateSphere(world,finalCenter,.88,MATTER_MATERIAL.DIRT));
    assert.equal(proposal.status,'OWNERSHIP',failAt);assert.deepEqual(world.ledger.audit(),before);assert.equal(world.actors.length,0);
  }
  const world=await makeWorld(),before=world.ledger.audit(),proposal=world.prepareEdit(excavateSphere(world,finalCenter,.88,MATTER_MATERIAL.DIRT));
  assert.equal(proposal.status,'PREPARED_INPUT');
  for(const failAt of ['mesh','collider','actor-mesh','actor-collider','save','ownership','physics-install']){
    world.failAt=failAt;const result=await world.publishEdit(proposal);assert.equal(result.status,'REJECTED',failAt);
    assert.equal(world.revision,save.revision,failAt);assert.deepEqual(world.ledger.audit(),before,failAt);assert.equal(world.actors.length,0,failAt);
    assert.equal(world.history.length,0,'failed collapse does not publish history');
  }
  const installed={terrain:false,actor:false,rolledBack:false},partial=await new TerrainChunkWorld({
    installProducts(){installed.terrain=true;},installActorProducts(){installed.actor=true;},rollbackProducts(){installed.rolledBack=true;},
  }).reload(save);
  partial.failAt='physics-install';const partialProposal=partial.prepareEdit(excavateSphere(partial,finalCenter,.88,MATTER_MATERIAL.DIRT));
  const partialResult=await partial.publishEdit(partialProposal);assert.equal(partialResult.status,'REJECTED');
  assert.deepEqual(installed,{terrain:true,actor:true,rolledBack:true});assert.equal(partial.revision,save.revision);assert.equal(partial.actors.length,0);
  const recovery=await makeWorld(),recoveryProposal=recovery.prepareEdit(excavateSphere(recovery,finalCenter,.88,MATTER_MATERIAL.DIRT));
  recovery.failAt='physics-install';recovery.rollbackProducts=()=>{throw new Error('Injected rollback recovery failure');};
  const recoveryResult=await recovery.publishEdit(recoveryProposal);assert.equal(recoveryResult.status,'REJECTED');assert.equal(recovery.recoveryRequired,true);
  await recovery.reload(save);assert.equal(recovery.recoveryRequired,false);recovery.ledger.assertBalanced();
  world.failAt=null;let directChanges=[];
  for(let z=-15;z<16&&!directChanges.length;z++)for(let y=2;y<13&&!directChanges.length;y++)for(let x=-15;x<16&&!directChanges.length;x++){
    const value=world.read([x,y,z]);if(value.material===MATTER_MATERIAL.DIRT&&value.density<-.1)directChanges=excavateSphere(world,[x*.5,y*.5,z*.5],.5,MATTER_MATERIAL.DIRT);
  }
  assert.ok(directChanges.length);const direct=await world.editSamples(directChanges);assert.equal(direct.status,'COMMITTED');
  const stale=await world.publishEdit(proposal);assert.equal(stale.status,'STALE');world.ledger.assertBalanced();
});
