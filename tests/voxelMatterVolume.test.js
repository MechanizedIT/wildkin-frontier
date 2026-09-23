import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldMatterVolume, createActorMatterVolume } from '../lab/voxel/matter-volume.js';

test('world generator, sparse edits and actor snapshot preserve stable sample frame and identities', () => {
  const frame={spacing:.5,offset:[-4,0,2]}, domain='rock:9212026';
  const world=createWorldMatterVolume({id:'world-rock',frame,domain,generator:([x,y,z])=>({density:y<1?-1:1,material:y<1?1:0})});
  assert.equal(world.readDensity([0,0,0]),-1);
  assert.equal(world.readMaterial([0,0,0]),1);
  assert.equal(world.readDomain([0,0,0]),domain);
  const draft=world.makeDraft(); draft.write([0,0,0],{density:1,material:0});
  assert.equal(world.readDensity([0,0,0]),-1,'uncommitted draft cannot mutate authority');
  assert.equal(draft.readDensity([0,0,0]),1);
  const snapshot=draft.snapshotPadded({start:[-1,-1,-1],size:2});
  assert.equal(snapshot.densities.length,64);
  assert.equal(snapshot.materials.length,64);
  assert.equal(snapshot.domains.length,64);
  const actor=createActorMatterVolume({id:'actor-rock',frame,domain,bounds:{min:[-2,-2,-2],max:[1,1,1]},snapshot});
  assert.deepEqual(actor.samplePosition([2,0,-2]),[-3,0,1]);
  assert.equal(actor.readDensity([0,0,0]),1);
  assert.equal(actor.readDensity([0,-1,0]),-1);
  assert.equal(actor.readDomain([0,-1,0]),domain);
});

test('actor bounds reject out-of-range writes and exterior reads remain air', () => {
  const source=createWorldMatterVolume({id:'w',frame:{spacing:.5,offset:[0,0,0]},domain:'rock:1',generator:()=>({density:-1,material:1})});
  const snapshot=source.snapshotPadded({start:[0,0,0],size:2});
  const actor=createActorMatterVolume({id:'a',frame:source.frame,domain:'rock:1',bounds:{min:[-1,-1,-1],max:[2,2,2]},snapshot});
  assert.ok(actor.readDensity([4,0,0])>0);
  assert.throws(()=>actor.makeDraft().write([4,0,0],{density:-1,material:1}),/bounds/);
});
