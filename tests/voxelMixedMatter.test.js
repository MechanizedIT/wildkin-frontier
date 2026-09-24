import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '../vendor/rapier.js';
import { createInitialMixedState, mineWorldMatter, mineActorMatter, worldMatterSamples, actorMatterSamples, matterMaterialAt, quantityAudit } from '../lab/voxel/matter-actor.js';
import { validateCellularState, MIXED_CELLULAR_NAMESPACE } from '../lab/voxel/cellular-persistence.js';
import { LabWorldState } from '../lab/voxel/world-state.js';
import { meshMatterSamples } from '../lab/voxel/matter-mesh.js';
import { CellularMatterPhysics } from '../lab/voxel/matter-physics.js';
import { matterPolicyFor, MATTER_MATERIAL } from '../lab/voxel/matter-material-policy.js';
import { actorToWorldPoint, worldToActorDirection, pickActorSurface, readMatterScalar } from '../lab/voxel/matter-target.js';
import { makeMixedMatterSamples } from '../lab/voxel/matter-fixtures.js';
import { parcelBits, parcelMaterial, removeMatterComponents } from '../lab/voxel/matter-ownership.js';

const setup=()=>{
  let state=createInitialMixedState();
  const partial=mineWorldMatter(state,[1.6,2.3,0]);assert.equal(partial.status,'OK',partial.reason);state=partial.state;
  return {state,partial};
};
function digToDetach(){
  const {state:beforeDetach,partial}=setup(),result=mineWorldMatter(beforeDetach,[0,3.6,0]);
  assert.equal(result.status,'OK',result.reason);assert.ok(result.detached>=1);assert.ok(result.state.actors.some(a=>a.material===MATTER_MATERIAL.ROCK));
  return {beforeDetach,state:result.state,partial,result};
}

test('one mixed scalar volume labels rock and dirt without overlapping material ownership',()=>{
  const state=createInitialMixedState(),samples=worldMatterSamples(state),audit=quantityAudit(state);
  assert.equal(state.fixture,'mixed-dirt-supported-rock');assert.equal(MIXED_CELLULAR_NAMESPACE,'wildkin-voxel-lab-cellular-0.5c-mixed-v1');
  assert.ok(samples.densities.some((v,i)=>v<0&&samples.materials[i]===MATTER_MATERIAL.ROCK));
  assert.ok(samples.densities.some((v,i)=>v<0&&samples.materials[i]===MATTER_MATERIAL.DIRT));
  assert.ok(samples.densities.every((v,i)=>(v<0)===(samples.materials[i]!==0)));
  assert.ok(audit.materials.rock.initial>128&&audit.materials.dirt.initial>128);
  assert.equal(audit.balanced,true);assert.equal(state.supportSummary.anchoredRock,true);
  assert.equal(state.supportSummary.anchoredDirt,true);
  assert.equal(validateCellularState(state).fixture,state.fixture);
});

test('material boundary targeting and world edits preserve the untouched material strategy and ledger',()=>{
  const state=createInitialMixedState(),initial=worldMatterSamples(state),rockHit=[0,4.8,0],dirtHit=[1.6,2.3,0];
  assert.equal(matterMaterialAt(initial,rockHit),MATTER_MATERIAL.ROCK);assert.equal(matterMaterialAt(initial,dirtHit),MATTER_MATERIAL.DIRT);
  const dirt=mineWorldMatter(state,dirtHit);assert.equal(dirt.status,'OK',dirt.reason);
  const dirtAfter=worldMatterSamples(dirt.state);
  for(let i=0;i<initial.densities.length;i++)if(initial.materials[i]===MATTER_MATERIAL.ROCK){
    assert.equal(dirtAfter.densities[i],initial.densities[i],'dirt scoop preserves rock samples');
    assert.equal(dirtAfter.materials[i],initial.materials[i]);
  }
  assert.equal(dirt.state.rewards.stoneUnits,0);assert.equal(dirt.state.events.dugUnits.rock,0);
  assert.equal(dirt.state.events.crumbledUnits.rock,0);assert.equal(quantityAudit(dirt.state).materials.rock.initial,
    quantityAudit(dirt.state).materials.rock.world+quantityAudit(dirt.state).materials.rock.actors+quantityAudit(dirt.state).materials.rock.consumed);

  const rock=mineWorldMatter(state,[0,4.8,1.2]);assert.equal(rock.status,'OK',rock.reason);
  const rockAfter=worldMatterSamples(rock.state);
  for(let i=0;i<initial.densities.length;i++)if(initial.materials[i]===MATTER_MATERIAL.DIRT){
    assert.equal(rockAfter.densities[i],initial.densities[i],'stone chip preserves dirt samples');
    assert.equal(rockAfter.materials[i],initial.materials[i]);
  }
  assert.equal(rock.state.events.dugUnits.dirt,0);assert.equal(rock.state.rewards.dirtUnits,0);
  assert.equal(rock.state.events.dugUnits.rock,rock.state.rewards.stoneUnits);assert.ok(rock.stress.visitedNodes>0);
  assert.equal(quantityAudit(rock.state).balanced,true);
});

test('dirt component crumble protects foreign rock samples at a shared boundary',()=>{
  const samples=makeMixedMatterSamples(),[nx,ny]=samples.size;let boundary=null;
  for(let z=0;z<samples.size[2]-1&&!boundary;z++)for(let y=0;y<samples.size[1]-1&&!boundary;y++)for(let x=0;x<samples.size[0]-1&&!boundary;x++){
    const p=[x,y,z],ids=new Set();for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){
      const i=x+dx+nx*((y+dy)+ny*(z+dz));if(samples.densities[i]<0)ids.add(samples.materials[i]);}
    if(ids.has(MATTER_MATERIAL.DIRT)&&ids.has(MATTER_MATERIAL.ROCK))boundary=p;
  }
  assert.ok(boundary,'fixture includes a mixed-material scalar boundary');
  const component={cells:[boundary]},protectedSamples=new Set(),[x,y,z]=boundary;
  for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){
    const i=x+dx+nx*((y+dy)+ny*(z+dz));if(samples.materials[i]===MATTER_MATERIAL.ROCK)protectedSamples.add(i);
  }
  assert.ok(protectedSamples.size>0,'boundary has a rock sample candidate');
  const result=removeMatterComponents(samples,[component],[component],{material:MATTER_MATERIAL.DIRT,protectedSamples});
  for(const i of protectedSamples){assert.equal(result.sample.densities[i],samples.densities[i]);assert.equal(result.sample.materials[i],MATTER_MATERIAL.ROCK);}
});

test('actual dirt occupancy loss transfers a material-preserving unsupported rock without reward',()=>{
  let distant=createInitialMixedState();const irrelevant=mineWorldMatter(distant,[2,1.3,1.5]);assert.equal(irrelevant.status,'OK');
  assert.equal(irrelevant.support.anchoredRock,true);assert.equal(irrelevant.detached,0);
  assert.equal(quantityAudit(irrelevant.state).materials.rock.actors,0);
  const {state,partial,result}=digToDetach(),audit=quantityAudit(state),rock=state.actors.find(a=>a.material===MATTER_MATERIAL.ROCK);
  assert.equal(partial.support.before.anchoredRock,true);assert.equal(partial.support.anchoredRock,true);
  assert.equal(result.support.before.anchoredRock,true);assert.equal(result.support.anchoredRock,false);
  assert.ok(result.cut.removedSamples>0);assert.ok(result.support.workUnits<=12288);
  assert.equal(rock.material,MATTER_MATERIAL.ROCK);assert.ok(rock.densities.some((v,i)=>v<0&&rock.materials[i]===MATTER_MATERIAL.ROCK));
  assert.ok(!rock.densities.some((v,i)=>v<0&&rock.materials[i]===MATTER_MATERIAL.DIRT));
  assert.equal(state.actors.length<=3,true);assert.equal(state.rewards.stoneUnits,0);
  assert.equal(audit.materials.rock.world,0,'the static volume has no duplicate stone');
  assert.equal(audit.materials.rock.actors,Object.values(state.ownership).filter(owner=>owner===rock.id).length);
  assert.equal(audit.materials.rock.initial,audit.materials.rock.world+audit.materials.rock.actors+audit.materials.rock.consumed);
  assert.equal(audit.materials.dirt.initial,audit.materials.dirt.world+audit.materials.dirt.actors+audit.materials.dirt.consumed);
  assert.equal(audit.balanced,true);assert.equal(validateCellularState(state).revision,state.revision);
  assert.ok(result.support.workUnits<3500,'one bounded shared mixed support pass remains near B cost');
});

test('moved rock keeps brittle chip/stress behavior and cannot change the dirt ledger',()=>{
  const {state}=digToDetach(),rock=state.actors.find(a=>a.material===MATTER_MATERIAL.ROCK),before=quantityAudit(state),dirtRewards=state.rewards.dirtUnits,
    local=[0,4.8,1.1],result=mineActorMatter(state,rock.id,rock.contentRevision,local);
  assert.equal(result.status,'OK',result.reason);assert.ok(result.cut.removedSamples>0);assert.ok(result.stress.visitedNodes>0);
  assert.notEqual(result.stress,null);assert.equal(result.state.actors.find(a=>a.id===rock.id).material,MATTER_MATERIAL.ROCK);
  const after=quantityAudit(result.state);assert.deepEqual(after.materials.dirt,before.materials.dirt);
  assert.equal(result.state.rewards.dirtUnits,dirtRewards);assert.equal(result.state.events.dugUnits.dirt,state.events.dugUnits.dirt);
  assert.equal(after.materials.rock.initial,after.materials.rock.world+after.materials.rock.actors+after.materials.rock.consumed);
  assert.equal(after.balanced,true);
});

test('mixed pre-detach and moved-actor states survive literal reload with their materials and ledger',()=>{
  const {beforeDetach,state}=digToDetach(),pre=validateCellularState(JSON.parse(JSON.stringify(beforeDetach))),post=validateCellularState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(pre,beforeDetach);assert.deepEqual(post,state);
  assert.equal(pre.actors.length,0);assert.equal(pre.supportSummary.anchoredRock,true);
  assert.ok(post.actors.some(a=>a.material===MATTER_MATERIAL.ROCK));assert.equal(quantityAudit(post).balanced,true);
  assert.equal(worldMatterSamples(post).materials.includes(MATTER_MATERIAL.ROCK),false);
  assert.deepEqual(post.parcelMaterials,beforeDetach.parcelMaterials);
  const corrupt=structuredClone(post);corrupt.actors.find(a=>a.material===1).materials[0]=2;
  assert.throws(()=>validateCellularState(corrupt),/Corrupt/);
});

test('Rapier moves the unsupported rock on bounded proxies and the moved surface remains targetable',async()=>{
  await RAPIER.init();const {state}=digToDetach(),physics=new CellularMatterPhysics(RAPIER),world=worldMatterSamples(state),rock=state.actors.find(a=>a.material===1);
  try{
    physics.installWorld(physics.prepareWorld(meshMatterSamples(world),state.revision));
    const products=state.actors.map(actor=>physics.prepareActor(actor,meshMatterSamples(actorMatterSamples(actor)),matterPolicyFor(actor.material).profile));
    assert.ok(products.every(product=>product.hullCount>=1&&product.hullCount<=8&&product.colliders.length<=8));physics.installActors(products);
    const initial=physics.pose(rock.id);for(let i=0;i<300;i++)physics.step();const moved=physics.pose(rock.id),translation=Math.hypot(...moved.position.map((v,i)=>v-initial.position[i])),q=moved.rotation,
      rotation=2*Math.acos(Math.min(1,Math.abs(q.w)));
    assert.ok(translation>.5,`rock movement ${translation}`);assert.ok(rotation>.25,`rock rotation ${rotation}`);
    const outward=worldToActorDirection(moved,[0,0,1]),surface=actorToWorldPoint(moved,[0,4.8,1.25]),origin=surface.map((v,i)=>v+outward[i]*3),direction=outward.map(v=>-v),
      liveActor={id:rock.id,contentRevision:rock.contentRevision,poseRevision:rock.poseRevision,pose:moved,readDensity:p=>readMatterScalar(actorMatterSamples(rock),p)},
      hit=pickActorSurface([liveActor],{originRelative:origin,direction,maxDistance:6});
    assert.ok(hit,`moved surface was not targetable at ${JSON.stringify(moved)}`);assert.equal(hit.actorId,rock.id);
    assert.equal(world.materials.includes(MATTER_MATERIAL.ROCK),false,'old static pose is empty');
    const posed=structuredClone(state),posedRock=posed.actors.find(actor=>actor.id===rock.id);Object.assign(posedRock,moved);posedRock.poseRevision++;
    const target={...liveActor,poseRevision:posedRock.poseRevision,pose:moved},movedHit=pickActorSurface([target],{originRelative:origin,direction,maxDistance:6}),
      localDirection=worldToActorDirection(moved,direction),localHit=movedHit.localPoint.map((v,i)=>v+localDirection[i]*.12),mined=mineActorMatter(posed,rock.id,rock.contentRevision,localHit);
    assert.equal(mined.status,'OK',mined.reason);assert.ok(mined.stress.visitedNodes>0);
    assert.deepEqual(quantityAudit(mined.state).materials.dirt,quantityAudit(state).materials.dirt);
    assert.ok(physics.actors.size<=3);assert.ok(products.reduce((n,product)=>n+product.colliders.length,0)<=24);
  }finally{physics.dispose();}
});

test('cross-material actor preparation, persistence, stale and ownership failures roll back atomically',async()=>{
  const {state:before}=setup(),expected=before.revision,operationResult=mineWorldMatter(before,[0,3.6,0],{material:MATTER_MATERIAL.DIRT});
  assert.equal(operationResult.status,'OK');assert.ok(operationResult.state.actors.some(a=>a.material===1));
  for(const failure of ['mesh','proxy','persist','stale','ownership']){
    let saved=before,disposed=0;const store={save:async next=>{if(failure==='persist')throw new Error('Injected persistence failure');validateCellularState(next);saved=structuredClone(next);}};
    const owner=new LabWorldState(store,before),old=structuredClone(owner.state),bad=structuredClone(operationResult.state);
    if(failure==='ownership'){const key=Object.keys(bad.ownership).find(k=>bad.ownership[k].startsWith('rock-'));bad.parcelMaterials[key]=MATTER_MATERIAL.DIRT;}
    const operation=()=>owner.transactPrepared({expectedRevision:expected,propose:()=>({status:'OK',state:failure==='ownership'?bad:structuredClone(operationResult.state)}),
      prepare:async(next,own)=>{for(const actor of next.actors.filter(a=>a.material===1||a.material===2)){own({actor:actor.id});
        if(failure==='mesh')throw new Error('Injected actor mesh failure');
        if(failure==='proxy')throw new Error('Injected actor proxy failure');}
        return {revision:failure==='stale'?next.revision-1:next.revision};},
      validate:(next,prepared)=>prepared.revision===next.revision,install:()=>{},discard:()=>disposed++});
    if(failure==='stale')assert.equal((await operation()).status,'STALE');
    else await assert.rejects(operation(),failure==='ownership'?/Corrupt|invariant/:failure==='persist'?/Injected persistence/:/Injected actor/);
    assert.deepEqual(owner.state,old);assert.deepEqual(saved,old);assert.equal(quantityAudit(owner.state).balanced,true);
    if(failure!=='persist'&&failure!=='ownership')assert.ok(disposed>0);
  }
});
