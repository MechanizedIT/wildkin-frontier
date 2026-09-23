import test from 'node:test';
import assert from 'node:assert/strict';
import { LabWorldState } from '../lab/voxel/world-state.js';
import { createInitialRockState, mineWorldRock } from '../lab/voxel/matter-actor.js';

function harness(failure){
  const original=createInitialRockState(),products={revision:0},disposed=[];
  const store={save:async()=>{if(failure==='idb')throw new Error('IndexedDB abort');}};
  const owner=new LabWorldState(store,original);
  const operation=()=>owner.transactPrepared({expectedRevision:0,propose:s=>mineWorldRock(s,[.5,1.5,0]),
    prepare:async(next,own)=>{const gpu=own({kind:'gpu'});
      if(failure==='worker')throw new Error('worker failed');
      const collider=own({kind:'collider'});if(failure==='collider')throw new Error('collider allocation failed');
      return {revision:failure==='stale-worker'?-1:next.revision,gpu,collider};},
    validate:(next,prepared)=>prepared.revision===next.revision,
    install:(prepared,next)=>{products.revision=next.revision;},discard:value=>disposed.push(value.kind)});
  return {owner,original,products,disposed,operation};
}
for(const failure of ['worker','collider','idb','stale-worker'])test(`${failure} leaves old matter and products authoritative`,async()=>{
  const h=harness(failure);
  if(failure==='stale-worker')assert.equal((await h.operation()).status,'STALE');else await assert.rejects(h.operation());
  assert.deepEqual(h.owner.state,h.original);assert.equal(h.products.revision,0);assert.equal(h.owner.state.rewards.stoneUnits,0);
  assert.ok(h.disposed.length>=1);
});
test('stale world or actor revision cannot publish or retire matter',async()=>{
  const h=harness();assert.equal((await h.owner.transactPrepared({expectedRevision:1,propose:()=>{throw Error('should not run');}})).status,'STALE');
  const committed=await h.operation();assert.equal(committed.status,'OK');assert.equal(h.owner.state.revision,1);assert.equal(h.products.revision,1);
  assert.equal((await h.operation()).status,'STALE');
});
