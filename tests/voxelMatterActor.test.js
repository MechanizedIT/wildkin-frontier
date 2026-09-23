import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialRockState, mineWorldRock, mineActorRock, actorRockSamples, quantityAudit } from '../lab/voxel/matter-actor.js';
import { actorToWorldPoint } from '../lab/voxel/matter-target.js';

const splitHits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],
  [0,4,-1.5],[0,3,1],[0,4.5,-1.5],[0,5.5,1],[0,2.5,1],[0,3.5,1.5]];
test('rock survives world damage, detaches once, takes a secondary hit, splits and a child takes another hit',()=>{
  let state=createInitialRockState(),original=state.initialQuantity;
  let side=mineWorldRock(state,[0,4,-1.55]);assert.equal(side.status,'OK');state=side.state;
  let result=mineWorldRock(state,[.5,1.5,0]);assert.equal(result.status,'OK');assert.equal(result.detached,0);state=result.state;
  result=mineWorldRock(state,[-.5,1.5,0]);assert.equal(result.status,'OK');assert.equal(result.detached,1);state=result.state;
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
