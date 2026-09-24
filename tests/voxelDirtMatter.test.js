import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDirtBankSamples, makeSupportedRockSamples } from '../lab/voxel/matter-fixtures.js';
import { rockDomain } from '../lab/voxel/fracture-field.js';
import { chipHardRock } from '../lab/voxel/matter-hard-rock.js';
import { ROCK_PROFILE } from '../lab/voxel/matter-rock-profile.js';
import { DIRT_PROFILE } from '../lab/voxel/matter-dirt-profile.js';
import { excavateDirt, resolveDirtSupport } from '../lab/voxel/matter-dirt.js';
import { MATTER_MATERIAL, DIRT_MATTER_POLICY, ROCK_MATTER_POLICY, matterPolicyFor } from '../lab/voxel/matter-material-policy.js';
import { meshMatterSamples } from '../lab/voxel/matter-mesh.js';
import { actorToWorldPoint, worldToActorDirection, pickActorSurface, readMatterScalar } from '../lab/voxel/matter-target.js';
import { createInitialDirtState, createInitialRockState, mineWorldMatter, mineActorMatter,
  quantityAudit, actorMatterSamples } from '../lab/voxel/matter-actor.js';
import { validateCellularState, migrateLegacyHardRockState } from '../lab/voxel/cellular-persistence.js';
import { LabWorldState } from '../lab/voxel/world-state.js';

const domain=rockDomain(9212026),worldDirtHits=[[0,2.8,-1],[0,2.8,-.5]];
function digUntilClod(){
  let state=createInitialDirtState();
  const first=mineWorldMatter(state,worldDirtHits[0]);assert.equal(first.status,'OK',first.reason);state=first.state;
  const second=mineWorldMatter(state,worldDirtHits[1]);assert.equal(second.status,'OK',second.reason);state=second.state;
  assert.equal(second.detached,1);return {state,first,second};
}
function unitsFor(state,owner){return Object.values(state.ownership).filter(value=>value===owner).length;}

test('material registry selects separate rock and dirt responses and rejects unknown matter',()=>{
  assert.equal(matterPolicyFor(MATTER_MATERIAL.ROCK),ROCK_MATTER_POLICY);
  assert.equal(matterPolicyFor(MATTER_MATERIAL.DIRT),DIRT_MATTER_POLICY);
  assert.equal(ROCK_MATTER_POLICY.response,'brittle-stress');
  assert.equal(DIRT_MATTER_POLICY.response,'local-cohesion');
  assert.notEqual(DIRT_MATTER_POLICY.removal,ROCK_MATTER_POLICY.removal);
  assert.equal(matterPolicyFor(99),null);
  const unknown=structuredClone(createInitialDirtState());unknown.materialId=99;
  assert.equal(mineWorldMatter(unknown,[0,2.8,-1]).status,'HOLD');
  assert.equal(mineActorMatter(unknown,'missing',0,[0,0,0]).status,'HOLD');
});

test('dirt bank fixture and deterministic soft scoop remain scalar Surface Nets matter',()=>{
  const a=makeDirtBankSamples(),b=makeDirtBankSamples(),rock=makeSupportedRockSamples();
  assert.deepEqual(a.size,rock.size);assert.equal(a.materials.some(value=>value===MATTER_MATERIAL.DIRT),true);
  const dirtCut=excavateDirt(a,domain,[0,2.8,-1],1,DIRT_PROFILE),repeat=excavateDirt(b,domain,[0,2.8,-1],1,DIRT_PROFILE),
    rockCut=chipHardRock(rock,domain,[0,2.8,-1],1,ROCK_PROFILE);
  assert.deepEqual(Array.from(a.densities),Array.from(b.densities));
  assert.deepEqual(Array.from(a.materials),Array.from(b.materials));
  assert.ok(dirtCut.radius>ROCK_PROFILE.localChipRadius*2);
  assert.ok(dirtCut.changed>rockCut.changed*5,`${dirtCut.changed} vs ${rockCut.changed} samples changed`);
  assert.ok(dirtCut.removedSamples>rockCut.removedSamples*5);
  assert.ok(dirtCut.changed<100,'one shovel action remains localized');
  assert.ok(a.densities.some(value=>value<0&&value>-1)&&a.densities.some(value=>value>0&&value<1),
    'scoop keeps rounded interpolated scalar values instead of deleting a block');
  const mesh=meshMatterSamples(makeDirtBankSamples());
  assert.ok(mesh.indices.length>0);assert.ok(mesh.indices.length/3<8192);
  assert.ok(mesh.colors.some(value=>value>.25),'Surface Nets carries the dirt color');
});

test('first digging stays static, nearby loose dirt crumbles, then one large clod transfers without a reward',()=>{
  const {state,first,second}=digUntilClod(),audit=quantityAudit(state),clod=state.actors[0];
  assert.equal(first.detached,0);assert.equal(first.state.actors.length,0);
  assert.ok(first.crumble.units>0);assert.equal(first.stress,null);
  assert.equal(second.detached,1);assert.equal(clod.material,MATTER_MATERIAL.DIRT);assert.equal(clod.structure,null);
  assert.ok(second.support.localCells<=DIRT_PROFILE.maxLocalCrumbleWork);
  assert.ok(second.support.window.high.every((value,i)=>value+1<=DIRT_PROFILE.supportWindowIntervals));
  assert.equal(state.retired.length,0);
  assert.ok(audit.balanced);assert.equal(audit.materials.dirt.initial,3899);
  assert.equal(audit.materials.dirt.initial,audit.materials.dirt.world+audit.materials.dirt.actors+audit.materials.dirt.consumed);
  assert.equal(audit.materials.dirt.consumed,state.events.dugUnits.dirt+state.events.crumbledUnits.dirt);
  assert.equal(state.rewards.stoneUnits,0);assert.equal(state.rewards.dirtUnits,audit.materials.dirt.consumed);
  assert.equal(state.events.dugUnits.rock,0);assert.equal(state.events.crumbledUnits.rock,0);
});

test('bounded support crumbles a tiny unsupported dirt island and holds over-budget windows',()=>{
  const sample=makeDirtBankSamples(),nx=sample.size[0],corner=[10,10,10];
  for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){
    const p=[corner[0]+dx,corner[1]+dy,corner[2]+dz],i=p[0]+nx*(p[1]+sample.size[1]*p[2]);sample.densities[i]=-.8;sample.materials[i]=MATTER_MATERIAL.DIRT;
  }
  const result=resolveDirtSupport(sample,[2,5,2],DIRT_PROFILE,{anchor:( [,y])=>y===0});
  assert.equal(result.status,'OK');assert.ok(result.crumbledProbeUnits>0);assert.ok(result.workCells<=DIRT_PROFILE.maxLocalCrumbleWork);
  assert.ok(result.support.components.some(component=>component.anchored),'the supported bank remains connected to its base');
  const limited=resolveDirtSupport(makeDirtBankSamples(),[0,2.8,-1],{...DIRT_PROFILE,maxLocalCrumbleWork:100});
  assert.equal(limited.status,'HOLD');assert.match(limited.reason,/support work budget/);
});

test('ownership audit tracks dirt and stone quantities independently',()=>{
  const rock=createInitialRockState(),dirt=createInitialDirtState(),rockResult=mineWorldMatter(rock,[.5,1.5,0]),dirtResult=mineWorldMatter(dirt,worldDirtHits[0]);
  assert.equal(rockResult.status,'OK');assert.equal(dirtResult.status,'OK');
  const stone=quantityAudit(rockResult.state).materials.rock,soil=quantityAudit(dirtResult.state).materials.dirt;
  assert.ok(stone.consumed>0);assert.ok(soil.consumed>0);
  assert.equal(rockResult.state.rewards.dirtUnits,0);assert.equal(dirtResult.state.rewards.stoneUnits,0);
  assert.equal(stone.initial,stone.world+stone.actors+stone.consumed);
  assert.equal(soil.initial,soil.world+soil.actors+soil.consumed);
  const mixed=structuredClone(rock),key=Object.keys(mixed.ownership)[0];mixed.parcelMaterials[key]=MATTER_MATERIAL.DIRT;
  mixed.ownership[key]='consumed';mixed.rewards.dirtUnits=1;mixed.events.dugUnits.dirt=1;
  const audit=quantityAudit(mixed);assert.equal(audit.balanced,true);
  assert.equal(audit.materials.rock.initial,rock.initialQuantity-1);assert.equal(audit.materials.dirt.consumed,1);
});

test('prior A.4 rock saves migrate to explicit material accounting without changing rock ownership',()=>{
  const legacy=structuredClone(mineWorldMatter(createInitialRockState(),[.5,1.5,0]).state);delete legacy.materialId;delete legacy.fixture;delete legacy.parcelMaterials;delete legacy.events;
  delete legacy.rewards.dirtUnits;
  for(const actor of legacy.actors)delete actor.material;
  const loaded=validateCellularState(migrateLegacyHardRockState(legacy));
  assert.equal(loaded.materialId,MATTER_MATERIAL.ROCK);assert.equal(loaded.fixture,'rock-boulder');
  assert.ok(Object.values(loaded.parcelMaterials).every(material=>material===MATTER_MATERIAL.ROCK));
  assert.equal(loaded.events.dugUnits.rock,loaded.rewards.stoneUnits);
  assert.equal(loaded.events.crumbledUnits.rock,0);
  assert.equal(quantityAudit(loaded).balanced,true);
});

test('moved and rotated dirt clod is targeted at its pose, recursively dug, and reloads its identity',()=>{
  let state=digUntilClod().state,actor=state.actors[0];actor.position=[4,1,3];actor.rotation={x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2};actor.poseRevision++;
  const pose={position:actor.position,rotation:actor.rotation},sample=actorMatterSamples(actor),candidate={id:actor.id,contentRevision:actor.contentRevision,
    pose,poseRevision:actor.poseRevision,readDensity:point=>readMatterScalar(sample,point)};
  const localOrigin=[0,3.5,-5],localDirection=[0,0,1],worldOrigin=actorToWorldPoint(pose,localOrigin),worldNext=actorToWorldPoint(pose,localOrigin.map((v,i)=>v+localDirection[i])),
    direction=worldNext.map((v,i)=>v-worldOrigin[i]),hit=pickActorSurface([candidate],{originRelative:worldOrigin,direction,maxDistance:10});
  assert.ok(hit);assert.equal(hit.actorId,actor.id);assert.ok(Math.hypot(...hit.worldPoint.map((v,i)=>v-worldOrigin[i]))<10);
  assert.equal(pickActorSurface([candidate],{originRelative:[0,3.5,-5],direction:[0,0,1],maxDistance:8}),null,'old bank pose misses the moved clod');
  const localDirectionAfter=worldToActorDirection(pose,direction),localHit=hit.localPoint.map((v,i)=>v+localDirectionAfter[i]*.12),before=unitsFor(state,actor.id),
    edit=mineActorMatter(state,actor.id,actor.contentRevision,localHit);
  assert.equal(edit.status,'OK',edit.reason);state=edit.state;
  actor=state.actors.find(value=>value.id===actor.id);assert.ok(actor);assert.equal(actor.material,MATTER_MATERIAL.DIRT);
  assert.ok(unitsFor(state,actor.id)<before);assert.ok(quantityAudit(state).balanced);
  const restored=validateCellularState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.retired,state.retired);assert.equal(restored.actors[0].id,actor.id);assert.equal(restored.actors[0].material,MATTER_MATERIAL.DIRT);
  assert.deepEqual(restored.actors[0].position,actor.position);assert.deepEqual(restored.actors[0].rotation,actor.rotation);
  assert.deepEqual(quantityAudit(restored),quantityAudit(state));
});

test('repeated dirt digging consumes a moved clod once and keeps its retired parent retired after reload',()=>{
  let state=digUntilClod().state,actor=state.actors[0];actor.position=[4,1,3];actor.rotation={x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2};
  const recursiveHits=[[0,3.5,-1.595],[1,4.5,-.437],[1,4.5,-1.899],[-.992,4,-1.5]];
  for(const hit of recursiveHits){
    actor=state.actors[0];assert.ok(actor);const result=mineActorMatter(state,actor.id,actor.contentRevision,hit);
    assert.equal(result.status,'OK',result.reason);state=result.state;
  }
  assert.deepEqual(state.actors,[]);assert.deepEqual(state.retired,['dirt-2']);
  const audit=quantityAudit(state);assert.ok(audit.balanced);assert.equal(audit.materials.dirt.actors,0);
  assert.equal(audit.materials.dirt.consumed,state.events.dugUnits.dirt+state.events.crumbledUnits.dirt);
  const reloaded=validateCellularState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(reloaded.actors,[]);assert.deepEqual(reloaded.retired,['dirt-2']);assert.deepEqual(quantityAudit(reloaded),audit);
});

function failureHarness(failure){
  const initial=mineWorldMatter(createInitialDirtState(),worldDirtHits[0]).state,original=structuredClone(initial),disposed=[],products={revision:initial.revision,actors:[]};
  const owner=new LabWorldState({save:async next=>{if(failure==='ownership')validateCellularState(next);if(failure==='persist')throw new Error('persistence write failed');}},initial);
  const operation=()=>owner.transactPrepared({expectedRevision:initial.revision,
    propose:current=>{const proposal=mineWorldMatter(current,worldDirtHits[1]);if(failure==='ownership')proposal.state.ownership[Object.keys(proposal.state.ownership)[0]]='ghost';return proposal;},
    prepare:async(next,own,proposal)=>{
      own({kind:'static-mesh'});if(failure==='mesh')throw new Error('detached clod mesh preparation failed');
      const actors=[];for(const actor of next.actors){const mesh=own({kind:'clod-mesh',id:actor.id});
        if(failure==='clod-mesh')throw new Error('detached clod mesh preparation failed');
        const proxy=own({kind:'clod-proxy',id:actor.id});if(failure==='proxy')throw new Error('clod collider preparation failed');actors.push({mesh,proxy,id:actor.id});}
      return {revision:failure==='stale'?-1:next.revision,actors};
    },
    validate:(next,prepared)=>prepared.revision===next.revision,
    install:(prepared,next)=>{products.revision=next.revision;products.actors=prepared.actors.map(value=>value.id);},
    discard:value=>disposed.push(value.kind)});
  return {initial,original,owner,products,disposed,operation};
}

for(const failure of ['clod-mesh','proxy','persist','stale','ownership'])test(`dirt ${failure} failure leaves static matter, rewards and actors authoritative`,async()=>{
  const h=failureHarness(failure);
  if(failure==='stale')assert.equal((await h.operation()).status,'STALE');
  else await assert.rejects(h.operation(),failure==='ownership'?/Corrupt cellular quantity ledger/:undefined);
  assert.deepEqual(h.owner.state,h.original);assert.deepEqual(h.products,{revision:h.initial.revision,actors:[]});
  assert.equal(h.owner.state.actors.length,0);assert.deepEqual(h.owner.state.retired,[]);assert.equal(h.owner.state.rewards.dirtUnits,h.original.rewards.dirtUnits);
  assert.equal(quantityAudit(h.owner.state).balanced,true);assert.ok(h.disposed.includes('static-mesh'));
  if(failure==='proxy'||failure==='persist'||failure==='stale')assert.ok(h.disposed.includes('clod-proxy'));
});
