import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialRockState, mineWorldRock, mineActorRock, actorRockSamples, quantityAudit } from '../lab/voxel/matter-actor.js';
import { validateCellularState, CELLULAR_NAMESPACE } from '../lab/voxel/cellular-persistence.js';
import { LabWorldState } from '../lab/voxel/world-state.js';

const splitHits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],
  [0,4,-1.5],[0,3,1],[0,4.5,-1.5],[0,5.5,1],[0,2.5,1],[0,3.5,1.5]];
test('cellular save shape survives each rock stage and preserves lineage, fields and quantity',async()=>{
  assert.notEqual(CELLULAR_NAMESPACE,'wildkin-voxel-lab-smooth-0.5');
  let stored=JSON.stringify(createInitialRockState()),state=JSON.parse(stored);
  assert.deepEqual(state.world,{densityEdits:{},structure:{hitSequence:0,stress:{},broken:[]}},'initial world remains generator-backed with an empty deterministic structure');
  const saveReload=next=>{validateCellularState(next);stored=JSON.stringify(next);const loaded=validateCellularState(JSON.parse(stored));assert.deepEqual(loaded,next);assert.equal(quantityAudit(loaded).balanced,true);return loaded;};
  state=saveReload(mineWorldRock(state,[0,4,-1.55]).state);
  assert.ok(Object.keys(state.world.densityEdits).length>0,'damage is persisted as sparse deltas');
  assert.ok(!('densities' in state.world),'world save has no full scalar snapshot');
  let worldResult;
  for(const hit of [[.5,1.5,0],[-.5,1.5,0],[.5,1.5,0],[-.5,1.5,0],[0,1.5,.5]]){
    worldResult=mineWorldRock(state,hit);assert.equal(worldResult.status,'OK',worldResult.reason);state=saveReload(worldResult.state);
  }
  assert.equal(worldResult.detached,1);
  const parent=state.actors[0];state=saveReload(mineActorRock(state,parent.id,parent.contentRevision,[1.55,4,0]).state);
  assert.ok(state.actors[0].structure.hitSequence>0&&Object.keys(state.actors[0].structure.stress).length>0,'actor bond stress survives serialization');
  for(const hit of splitHits){const actor=state.actors[0],result=mineActorRock(state,actor.id,actor.contentRevision,hit);
    assert.ok(['OK','NO_HIT'].includes(result.status));state=result.state;if(result.split)break;}
  assert.equal(state.actors.length,2);state=saveReload(state);
  assert.ok(state.actors.every(a=>a.densities.length===13**3&&a.domain.id===parent.domain.id),'children retain bounded local fields and fracture identity');
  assert.ok(state.actors.every(a=>a.structure.hitSequence>0&&Object.keys(a.structure.stress).length>0),'children retain their local structural history');
  assert.ok(state.retired.includes(parent.id));assert.ok(state.actors.every(a=>a.parentId===parent.id));
  const child=state.actors[0],samples=actorRockSamples(child);let changed;
  for(let i=0;i<samples.densities.length;i++)if(samples.densities[i]<0){const r=mineActorRock(state,child.id,child.contentRevision,samples.position(i));if(r.status==='OK'){changed=r.state;break;}}
  assert.ok(changed);state=saveReload(changed);
  assert.ok(state.actors.every(a=>a.lineageRootId===parent.lineageRootId));
  const badQuat=structuredClone(state);badQuat.actors[0].rotation.w=.2;assert.throws(()=>validateCellularState(badQuat));
  const badVersion=structuredClone(state);badVersion.version='phase0-v1';assert.throws(()=>validateCellularState(badVersion));
  let durable=JSON.stringify(state);const owner=new LabWorldState({save:async s=>{validateCellularState(s);durable=JSON.stringify(s);}},state);
  const pose=parent;const delayed=await owner.saveCellularPoses([{id:pose.id,contentRevision:pose.contentRevision,position:[99,99,99],rotation:pose.rotation,
    linearVelocity:[0,0,0],angularVelocity:[0,0,0],sleepState:'ACTIVE'}]);
  assert.equal(delayed,false);assert.deepEqual(JSON.parse(durable),state);assert.ok(!owner.state.actors.some(a=>a.id===parent.id));
});

test('literal reload retains nested fractured children and their uncredited residual quantity',()=>{
  let state=createInitialRockState();
  for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0],[.5,1.5,0],[-.5,1.5,0],[0,1.5,.5]]){
    const result=mineWorldRock(state,hit);assert.equal(result.status,'OK',result.reason);state=result.state;
  }
  let actor=state.actors[0];state=mineActorRock(state,actor.id,actor.contentRevision,[1.55,4,0]).state;
  for(const hit of [[0,4,0],[0,4,-.5]]){actor=state.actors[0];const result=mineActorRock(state,actor.id,actor.contentRevision,hit);
    assert.equal(result.status,'OK',result.reason);state=result.state;if(result.split)break;}
  assert.equal(state.actors.length,2);
  const parent=state.actors[0],rewardBefore=state.rewards.stoneUnits,recursive=mineActorRock(state,parent.id,parent.contentRevision,[0,4,0]);
  assert.equal(recursive.split,true);assert.equal(recursive.state.rewards.stoneUnits,rewardBefore);
  const reloaded=validateCellularState(JSON.parse(JSON.stringify(recursive.state)));
  assert.deepEqual(reloaded,recursive.state);assert.equal(quantityAudit(reloaded).balanced,true);
  assert.equal(reloaded.retired.includes(parent.id),true);
  assert.ok(reloaded.actors.filter(a=>a.parentId===parent.id).every(a=>Object.keys(a.structure.stress).length>0));
});
