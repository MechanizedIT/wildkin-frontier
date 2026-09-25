import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialRockState, createInitialMixedState, mineWorldMatter, mineWorldRock, mineActorRock, actorRockSamples, quantityAudit } from '../lab/voxel/matter-actor.js';
import { MATTER_MATERIAL } from '../lab/voxel/matter-material-policy.js';
import { analyzeMatterConnectivity } from '../lab/voxel/matter-connectivity.js';
import { validateCellularState } from '../lab/voxel/cellular-persistence.js';
import { actorToWorldPoint } from '../lab/voxel/matter-target.js';

const splitHits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],
  [0,4,-1.5],[0,3,1],[0,4.5,-1.5],[0,5.5,1],[0,2.5,1],[0,3.5,1.5]];
test('rock survives world damage, detaches once, takes a secondary hit, splits and a child takes another hit',()=>{
  let state=createInitialRockState(),original=state.initialQuantity;
  let result;
  for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0],[.5,1.5,0],[-.5,1.5,0],[0,1.5,.5]]){
    result=mineWorldRock(state,hit);assert.equal(result.status,'OK',result.reason);state=result.state;
  }
  assert.equal(result.detached,1);
  assert.equal(state.actors.length,1);assert.equal(quantityAudit(state).initial,original);
  const parentId=state.actors[0].id,parentRevision=state.actors[0].contentRevision;
  assert.equal(mineActorRock(state,parentId,parentRevision+1,[1.55,4,0]).status,'STALE');
  result=mineActorRock(state,parentId,parentRevision,[1.55,4,0]);assert.equal(result.status,'OK');assert.equal(result.split,false);state=result.state;
  assert.equal(state.actors[0].id,parentId);assert.equal(state.actors[0].contentRevision,parentRevision+1);
  state.actors[0].linearVelocity=[1,2,3];state.actors[0].angularVelocity=[0,.5,1];
  let splittingParent;
  for(const hit of splitHits){const actor=state.actors[0];result=mineActorRock(state,actor.id,actor.contentRevision,hit);
    assert.ok(['OK','NO_HIT'].includes(result.status),`${hit}: ${result.reason}`);if(result.split)splittingParent=actor;state=result.state;if(result.split)break;}
  assert.equal(result.split,true);assert.equal(state.actors.length,2);
  assert.ok(state.retired.includes(parentId));assert.ok(state.actors.every(a=>a.parentId===parentId&&a.domain.id==='rock:9212026'));
  const oldCOM=actorToWorldPoint(splittingParent,splittingParent.localCOM);
  for(const piece of state.actors){
    const childCOM=actorToWorldPoint(piece,piece.localCOM),r=childCOM.map((v,i)=>v-oldCOM[i]),w=splittingParent.angularVelocity,v=splittingParent.linearVelocity;
    const inherited=[v[0]+w[1]*r[2]-w[2]*r[1],v[1]+w[2]*r[0]-w[0]*r[2],v[2]+w[0]*r[1]-w[1]*r[0]];
    assert.ok(piece.linearVelocity.every((n,i)=>Math.abs(n-inherited[i])<1e-6),'child inherits v + angular velocity cross offset');
  }
  const child=state.actors[0],sample=actorRockSamples(child);let childResult;
  for(let i=0;i<sample.densities.length;i++)if(sample.densities[i]<0){childResult=mineActorRock(state,child.id,child.contentRevision,sample.position(i));if(childResult.status==='OK')break;}
  assert.equal(childResult?.status,'OK','at least one child scalar hit must work');
  assert.notDeepEqual(childResult.state.actors.find(a=>a.id===child.id)?.densities,child.densities);
  assert.equal(quantityAudit(childResult.state).balanced,true);
  assert.equal(quantityAudit(childResult.state).initial,original);
});

test('ordinary actor edit separates disconnected scalar components even without a structural fracture',()=>{
  let state=createInitialMixedState();state=mineWorldMatter(state,[1.6,2.3,0]).state;
  state=mineWorldMatter(state,[0,3.6,0],{material:MATTER_MATERIAL.DIRT}).state;
  const parent=state.actors[0];
  // Reproduce the owner's observed state: two visible scalar islands were
  // still serialized under the same MatterActor. The isolated patch is an
  // opt-in fixture corruption, not a production topology edit.
  for(let z=10;z<=12;z++)for(let y=10;y<=12;y++)for(let x=10;x<=12;x++){
    const i=x+13*(y+13*z);parent.densities[i]=-1;parent.materials[i]=MATTER_MATERIAL.ROCK;
  }
  assert.throws(()=>validateCellularState(state),/disconnected matter actor/);
  const result=mineActorRock(state,parent.id,parent.contentRevision,[2.5,5.5,2.5]);
  assert.equal(result.status,'OK',result.reason);assert.equal(result.fracture,false);assert.equal(result.split,true);
  assert.equal(result.state.actors.length,2);assert.ok(result.state.retired.includes(parent.id));
  assert.equal(quantityAudit(result.state).balanced,true);
  for(const actor of result.state.actors){
    const connectivity=analyzeMatterConnectivity(actorRockSamples(actor));assert.equal(connectivity.status,'OK');assert.equal(connectivity.components.length,1);
  }
  assert.equal(validateCellularState(result.state).actors.length,2,'persistence rejects no retained multi-component actor');
});
