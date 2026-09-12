import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createPickupSystem } from '../src/resources/pickupSystem.js';
import { createResourceSystem } from '../src/resources/resourceSystem.js';

await RAPIER.init();
const generated = { id: 'f1:r:3:2:0', type: 'tree', chunkId: '3,2', placementIndex: 0, persistentFinite: true, regionId: 'camp', pos: { x: 0, y: 0, z: 0 } };

test('streamed yield follows generated ID through unload/rebind without duplicate material or active pickup', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const pickups = createPickupSystem(new THREE.Scene(), { world, RAPIER });
  const resources = createResourceSystem(new THREE.Scene(), { world, RAPIER }, [], {
    hasPendingYield: pickups.hasPendingYield,
    onResourceResidentAdded: pickups.onResourceResidentAdded,
    onResourceResidentRemoved: pickups.onResourceResidentRemoved,
  });
  try {
    const [first] = resources.addPlacements([generated]);
    assert.equal(resources.applyHit(first, pickups.spawnPickup), true);
    assert.equal(pickups.getCount(), 1);
    resources.removePlacementsByChunk('3,2');
    assert.equal(pickups.getCount(), 0, 'offloaded source has no active visual');
    assert.equal(pickups.getDebug().pendingSources, 1);
    assert.equal(pickups.getPendingYields()[0].streamedOut, true);
    pickups.update(.1, { x: 0, y: .5, z: 0 });
    assert.equal(pickups.getCount(), 0, 'offloaded source does not rematerialize');
    const [reloaded] = resources.addPlacements([generated]);
    assert.equal(pickups.hasPendingYield(reloaded), true);
    assert.equal(resources.applyHit(reloaded, pickups.spawnPickup), true);
    assert.equal(pickups.getDebug().pendingSources, 1);
    assert.deepEqual(pickups.getPendingYields()[0].resources, { wood: 2 });
    assert.ok(pickups.getCount() <= 1);
  } finally { world.free(); }
});

test('authored pickup records retain their ordinary node-key behavior', () => {
  const pickups = createPickupSystem(new THREE.Scene());
  const node = { id: 'authored', regionId: 'camp', type: { resourceId: 'fiber', solid: false, dropOriginHeight: .4 }, state: { position: { x: 0, y: 0, z: 0 } } };
  pickups.spawnPickup(node); pickups.spawnPickup(node);
  assert.equal(pickups.getDebug().pendingSources, 1);
  assert.equal(pickups.hasPendingYield(node), true);
  assert.deepEqual(pickups.getPendingYields()[0].resources, { fiber: 2 });
});
