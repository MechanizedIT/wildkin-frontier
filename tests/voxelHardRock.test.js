import test from 'node:test';
import assert from 'node:assert/strict';
import { chipHardRock } from '../lab/voxel/matter-hard-rock.js';
import { makeSupportedRockSamples } from '../lab/voxel/matter-fixtures.js';
import { rockDomain } from '../lab/voxel/fracture-field.js';
import { ROCK_PROFILE } from '../lab/voxel/matter-rock-profile.js';
import { mineWorldRock, createInitialRockState, quantityAudit, classifyRockMatterTier } from '../lab/voxel/matter-actor.js';
import { cutRockSamples } from '../lab/voxel/fracture-field.js';
import { parcelBits } from '../lab/voxel/matter-ownership.js';

function probeQuantity(samples){let total=0;for(let z=0;z<samples.size[2]-1;z++)for(let y=0;y<samples.size[1]-1;y++)for(let x=0;x<samples.size[0]-1;x++)
  total+=parcelBits(samples,[x,y,z]).filter(Boolean).length;return total;}

test('hard-rock strike is a deterministic sub-metre irregular chip, not whole-cell deletion',()=>{
  const before=makeSupportedRockSamples(),a={...before,densities:new Float32Array(before.densities),materials:new Uint8Array(before.materials)},
    b={...before,densities:new Float32Array(before.densities),materials:new Uint8Array(before.materials)},domain=rockDomain(9212026);
  const hit=[0,4,-1.55],first=chipHardRock(a,domain,hit,1,ROCK_PROFILE),again=chipHardRock(b,domain,hit,1,ROCK_PROFILE);
  assert.deepEqual([...a.densities],[...b.densities]);assert.deepEqual([...a.materials],[...b.materials]);
  assert.ok(first.changed>0&&first.changed<32);assert.equal(first.removedSamples,again.removedSamples);
  assert.ok(first.radius<.7&&first.radius>ROCK_PROFILE.localChipRadius);
  const oldCell={...before,densities:new Float32Array(before.densities),materials:new Uint8Array(before.materials)},oldQuantity=probeQuantity(oldCell),
    chipQuantity=oldQuantity-probeQuantity(a);cutRockSamples(oldCell,domain,hit);
  assert.ok(oldQuantity-probeQuantity(oldCell)>=chipQuantity*4,'the local chip removes at most one quarter of the old fracture-cell hit here');
  for(let i=0;i<a.densities.length;i++)if(a.densities[i]!==before.densities[i])
    assert.ok(Math.hypot(...before.position(i).map((v,j)=>v-hit[j]))<=first.radius+1e-6);
});

test('accepted chip transition accounts all removed quantity once and preserves the world ledger',()=>{
  const start=createInitialRockState(),result=mineWorldRock(start,[0,4,-1.55]);
  assert.equal(result.status,'OK');assert.ok(result.cut.removedSamples<=2);
  const audit=quantityAudit(result.state);assert.equal(audit.balanced,true);
  assert.equal(audit.consumed,result.state.rewards.stoneUnits);
  assert.equal(audit.total,start.initialQuantity);
});

test('detached rock quantity selects persistent actors, capped temporary shards, or tiny visual debris',()=>{
  assert.equal(classifyRockMatterTier(ROCK_PROFILE.persistentPieceMinProbes),'persistent-matter-actor');
  assert.equal(classifyRockMatterTier(ROCK_PROFILE.temporaryShardMinProbes),'temporary-physics-shard');
  assert.equal(classifyRockMatterTier(ROCK_PROFILE.tinyDebrisMaxProbes),'tiny-debris');
  assert.throws(()=>classifyRockMatterTier(-1),/quantity/);
});
