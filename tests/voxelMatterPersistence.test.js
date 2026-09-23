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
  assert.deepEqual(state.world,{densityEdits:{}},'initial world remains generator-backed');
  const saveReload=next=>{validateCellularState(next);stored=JSON.stringify(next);const loaded=validateCellularState(JSON.parse(stored));assert.deepEqual(loaded,next);assert.equal(quantityAudit(loaded).balanced,true);return loaded;};
  state=saveReload(mineWorldRock(state,[0,4,-1.55]).state);
  assert.ok(Object.keys(state.world.densityEdits).length>0,'damage is persisted as sparse deltas');
  assert.ok(!('densities' in state.world),'world save has no full scalar snapshot');
  state=saveReload(mineWorldRock(state,[.5,1.5,0]).state);
  state=saveReload(mineWorldRock(state,[-.5,1.5,0]).state);
  const parent=state.actors[0];state=saveReload(mineActorRock(state,parent.id,parent.contentRevision,[1.55,4,0]).state);
  for(const hit of splitHits){const actor=state.actors[0],result=mineActorRock(state,actor.id,actor.contentRevision,hit);
    assert.ok(['OK','NO_HIT'].includes(result.status));state=result.state;if(result.split)break;}
  assert.equal(state.actors.length,2);state=saveReload(state);
  assert.ok(state.actors.every(a=>a.densities.length===13**3&&a.domain.id===parent.domain.id),'children retain bounded local fields and fracture identity');
  const child=state.actors[0],samples=actorRockSamples(child);let changed;
  for(let i=0;i<samples.densities.length;i++)if(samples.densities[i]<0){const r=mineActorRock(state,child.id,child.contentRevision,samples.position(i));if(r.status==='OK'){changed=r.state;break;}}
  assert.ok(changed);state=saveReload(changed);
  assert.ok(state.retired.includes(parent.id));assert.ok(state.actors.every(a=>a.parentId===parent.id));
  const badQuat=structuredClone(state);badQuat.actors[0].rotation.w=.2;assert.throws(()=>validateCellularState(badQuat));
  const badVersion=structuredClone(state);badVersion.version='phase0-v1';assert.throws(()=>validateCellularState(badVersion));
  let durable=JSON.stringify(state);const owner=new LabWorldState({save:async s=>{validateCellularState(s);durable=JSON.stringify(s);}},state);
  const pose=parent;const delayed=await owner.saveCellularPoses([{id:pose.id,contentRevision:pose.contentRevision,position:[99,99,99],rotation:pose.rotation,
    linearVelocity:[0,0,0],angularVelocity:[0,0,0],sleepState:'ACTIVE'}]);
  assert.equal(delayed,false);assert.deepEqual(JSON.parse(durable),state);assert.ok(!owner.state.actors.some(a=>a.id===parent.id));
});
