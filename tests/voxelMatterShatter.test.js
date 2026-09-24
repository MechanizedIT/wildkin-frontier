import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '../vendor/rapier.js';
import { createInitialRockState, mineWorldRock, actorRockSamples, quantityAudit } from '../lab/voxel/matter-actor.js';
import { removedRockField, partitionRockShatter } from '../lab/voxel/matter-shatter.js';
import { ROCK_PROFILE } from '../lab/voxel/matter-rock-profile.js';
import { rockDomain } from '../lab/voxel/fracture-field.js';
import { meshRockSamples } from '../lab/voxel/matter-mesh.js';
import { CellularRockPhysics } from '../lab/voxel/matter-physics.js';
import { makeRockSamples } from '../lab/voxel/fracture-field.js';

test('rock bite partitions consumed matter into bounded material-aware display pieces with one exact reward credit',()=>{
  const start=createInitialRockState(),cut=mineWorldRock(start,[0,4,-1.55]);assert.equal(cut.status,'OK');
  const shatter=cut.shatter;assert.equal(shatter.status,'OK');assert.ok(shatter.pieces.length>1);
  assert.ok(shatter.pieces.length<=ROCK_PROFILE.maxPooledVisualDebris);
  assert.ok(shatter.pieces.filter(p=>p.kind==='transient-physical').length<=ROCK_PROFILE.maxTransientShardBodies);
  assert.ok(shatter.pieces.every(p=>p.material===ROCK_PROFILE.material));
  assert.equal(shatter.pieces.reduce((n,p)=>n+p.creditedQuantity,0),shatter.quantity);
  assert.equal(shatter.quantity,cut.state.rewards.stoneUnits-start.rewards.stoneUnits);
  assert.equal(quantityAudit(cut.state).balanced,true);
  const field=removedRockField(actorRockSamples(start.world),[actorRockSamples(cut.state.world)]);
  const exceeded=partitionRockShatter(field,rockDomain(9212026),{...ROCK_PROFILE,maxTransientShardBodies:0});
  assert.equal(exceeded.status,'OK');assert.ok(exceeded.pieces.length<=ROCK_PROFILE.maxPooledVisualDebris);
  assert.ok(exceeded.pieces.every(piece=>piece.probes<ROCK_PROFILE.shardMinProbes||piece.probes>ROCK_PROFILE.shardMaxProbes));
});
test('temporary Rapier shard proxy separates, rebases, expires, and cannot carry a resource reward',async()=>{
  await RAPIER.init();const cut=mineWorldRock(createInitialRockState(),[0,4,-1.55]);
  const shard={...makeRockSamples(),position:[0,4,0],rotation:{x:0,y:0,z:0,w:1},linearVelocity:[0,0,0],angularVelocity:[0,0,0],
    localHit:[0,0,0],material:ROCK_PROFILE.material,creditedQuantity:0};
  const mesh=meshRockSamples(shard),physics=new CellularRockPhysics(RAPIER);
  try{
    const product=physics.prepareShard('test-shard',shard,mesh);assert.ok(product);
    physics.installShard(product);const initial=physics.shardPose('test-shard');
    for(let i=0;i<15;i++)physics.step();const moved=physics.shardPose('test-shard');assert.ok(moved);
    assert.ok(Math.hypot(...moved.position.map((v,i)=>v-initial.position[i]))>.05);
    physics.shiftOrigin([128,64,-128]);const rebased=physics.shardPose('test-shard');
    assert.ok(rebased.position.every((v,i)=>Math.abs(v-moved.position[i])<.001));
    let expired=false;for(let i=0;i<240;i++)expired ||=physics.step().includes('test-shard');
    assert.equal(expired,true);assert.equal(physics.shards.size,0);
    assert.equal(quantityAudit(cut.state).balanced,true);
    assert.equal(product.creditedQuantity,0);assert.equal(quantityAudit(cut.state).balanced,true);
  }finally{physics.dispose();}
});
