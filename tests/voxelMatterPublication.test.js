import test from 'node:test';
import assert from 'node:assert/strict';
import { LabWorldState } from '../lab/voxel/world-state.js';
import { createInitialRockState, mineWorldRock, mineActorRock, quantityAudit } from '../lab/voxel/matter-actor.js';
import { validateCellularState } from '../lab/voxel/cellular-persistence.js';

const fractureHits=[[0,4,0],[0,4,-.5],[0,3,0],[0,5,0],[0,4.5,-.5],[0,5.5,0],
  [0,4,-1.5],[0,3,1],[0,4.5,-1.5],[0,5.5,1],[0,2.5,1],[0,3.5,1.5]];

function fractureFixture(){
  let state=createInitialRockState(),result;
  for(const hit of [[0,4,-1.55],[.5,1.5,0],[-.5,1.5,0],[.5,1.5,0],[-.5,1.5,0],[0,1.5,.5]]){
    result=mineWorldRock(state,hit);assert.equal(result.status,'OK',result.reason);state=result.state;
  }
  assert.equal(state.actors.length,1,'fixture has one detached actor');
  let actor=state.actors[0];result=mineActorRock(state,actor.id,actor.contentRevision,[1.55,4,0]);
  assert.equal(result.status,'OK');state=result.state;
  for(const hit of fractureHits){
    actor=state.actors[0];result=mineActorRock(state,actor.id,actor.contentRevision,hit);
    assert.ok(['OK','NO_HIT'].includes(result.status),result.reason);if(result.split)return {state,actorId:actor.id,hit};state=result.state;
  }
  assert.fail('deterministic fixture did not reach structural fracture');
}

const fractured=fractureFixture();

function fractureHarness(failure){
  const original=structuredClone(fractured.state),parentId=fractured.actorId,products={revision:original.revision,actorIds:original.actors.map(a=>a.id)},disposed=[];
  const store={save:async next=>{if(failure==='ownership')validateCellularState(next);if(failure==='persist')throw new Error('IndexedDB abort');}};
  const owner=new LabWorldState(store,original);
  const operation=()=>owner.transactPrepared({expectedRevision:original.revision,
    propose:s=>{const proposal=mineActorRock(s,parentId,s.actors.find(a=>a.id===parentId).contentRevision,fractured.hit);
      assert.equal(proposal.status,'OK');assert.equal(proposal.split,true);assert.ok(proposal.state.retired.includes(parentId));
      assert.equal(quantityAudit(proposal.state).balanced,true);
      if(failure==='ownership')proposal.state.ownership[Object.keys(proposal.state.ownership)[0]]=parentId;
      return proposal;},
    prepare:async(next,own,proposal)=>{assert.ok(proposal.split);const prepared=[];
      for(const actor of next.actors){const mesh=own({kind:'child-mesh',id:actor.id});if(failure==='mesh')throw new Error('child mesh preparation failed');
        const collider=own({kind:'child-collider',id:actor.id});prepared.push({id:actor.id,mesh,collider});if(failure==='collider')throw new Error('child collider preparation failed');}
      return {revision:failure==='stale-worker'?-1:next.revision,prepared};},
    validate:(next,prepared)=>prepared.revision===next.revision,
    install:(prepared,next)=>{products.revision=next.revision;products.actorIds=prepared.prepared.map(item=>item.id);},
    discard:value=>disposed.push(value)});
  return {owner,original,products,disposed,operation,parentId};
}

function harness(failure){
  const original=createInitialRockState(),products={revision:0},disposed=[];
  const store={save:async()=>{if(failure==='idb')throw new Error('IndexedDB abort');}};
  const owner=new LabWorldState(store,original);
  const operation=()=>owner.transactPrepared({expectedRevision:0,propose:s=>mineWorldRock(s,[.5,1.5,0]),
    prepare:async(next,own,proposal)=>{const gpu=own({kind:'gpu'});
      if(failure==='worker')throw new Error('worker failed');
      const collider=own({kind:'collider'});if(failure==='collider')throw new Error('collider allocation failed');
      if(proposal.shatter?.pieces.length)own({kind:'shard-body'});
      if(failure==='shard')throw new Error('shard collider allocation failed');
      return {revision:failure==='stale-worker'?-1:next.revision,gpu,collider};},
    validate:(next,prepared)=>prepared.revision===next.revision,
    install:(prepared,next)=>{products.revision=next.revision;},discard:value=>disposed.push(value.kind)});
  return {owner,original,products,disposed,operation};
}
for(const failure of ['worker','collider','shard','idb','stale-worker'])test(`${failure} leaves old matter and products authoritative`,async()=>{
  const h=harness(failure);
  if(failure==='stale-worker')assert.equal((await h.operation()).status,'STALE');else await assert.rejects(h.operation());
  assert.deepEqual(h.owner.state,h.original);assert.equal(h.products.revision,0);assert.equal(h.owner.state.rewards.stoneUnits,0);
  assert.ok(h.disposed.length>=1);
  if(['shard','idb','stale-worker'].includes(failure))assert.ok(h.disposed.includes('shard-body'));
});
test('stale world or actor revision cannot publish or retire matter',async()=>{
  const h=harness();assert.equal((await h.owner.transactPrepared({expectedRevision:1,propose:()=>{throw Error('should not run');}})).status,'STALE');
  const committed=await h.operation();assert.equal(committed.status,'OK');assert.equal(h.owner.state.revision,1);assert.equal(h.products.revision,1);
  assert.equal((await h.operation()).status,'STALE');
});

for(const failure of ['mesh','collider','persist','stale-worker','ownership'])test(`fracture ${failure} failure keeps parent ownership and products authoritative`,async()=>{
  const h=fractureHarness(failure),beforeOwnership=structuredClone(h.owner.state.ownership),beforeRewards=structuredClone(h.owner.state.rewards),
    beforeRetired=[...h.owner.state.retired],beforeActorIds=h.owner.state.actors.map(actor=>actor.id);
  if(failure==='stale-worker')assert.equal((await h.operation()).status,'STALE');
  else await assert.rejects(h.operation(),failure==='ownership'?/Corrupt cellular quantity ledger/:undefined);
  assert.deepEqual(h.owner.state,h.original);assert.deepEqual(h.owner.state.ownership,beforeOwnership);assert.deepEqual(h.owner.state.rewards,beforeRewards);
  assert.deepEqual(h.owner.state.retired,beforeRetired);assert.deepEqual(h.owner.state.actors.map(actor=>actor.id),beforeActorIds);
  assert.deepEqual(h.products,{revision:h.original.revision,actorIds:beforeActorIds});
  assert.equal(quantityAudit(h.owner.state).balanced,true);assert.ok(!h.owner.state.retired.includes(h.parentId));
  if(failure!=='ownership')assert.ok(h.disposed.length>0,'prepared child products are discarded on precommit failure');
});
