import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createResourceSystem } from '../src/resources/resourceSystem.js';
import { createVisualAssetResourceType } from '../src/resources/resourceConfig.js';
import { createPickupSystem } from '../src/resources/pickupSystem.js';
import { pickupInventoryFixture } from './helpers/pickupInventoryFixture.js';

await RAPIER.init();
const far = { x: 50, y: .522, z: 50 };
const near = { x: -1.4, y: .522, z: 0 };
function fixture(placement = {}) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const physics = { world, RAPIER };
  const inventory = pickupInventoryFixture();
  const pickups = createPickupSystem(new THREE.Scene(), physics, null, null, { inventory: inventory.inventory });
  const resources = createResourceSystem(new THREE.Scene(), physics, [
    { id: 'debris', type: 'tree', regionId: 'camp', pos: { x: 0, y: 0, z: 0 }, ...placement },
    { id: 'ordinary', type: 'tree', regionId: 'frontier', pos: { x: 12, y: 0, z: 0 } },
  ], { hasPendingYield: pickups.hasPendingYield });
  return { world, resources, pickups, inventory, node: resources.nodes[0], sibling: resources.nodes[1] };
}
function assertMasked(f) {
  const { resources: r, node: n } = f;
  assert.equal(n.group.visible, false);
  assert.equal(n.haloMesh.visible, false);
  assert.equal(n.respawnGroup.visible, false);
  assert.equal(n.collider, null);
  assert.equal(n.remnantCollider, null);
  assert.equal(r.isHarvestableInRange(n, near), false);
  assert.equal(r.canAutoHarvestNow(n, near, 'IDLE'), false);
  assert.deepEqual(r.getManualTargets(near), []);
  assert.deepEqual(r.getEligibleNodes(near, 'IDLE'), []);
  assert.deepEqual(r.getHaloTargets(near, 'IDLE'), []);
  assert.equal(r.isRespawnVisible(n, near), false);
  assert.equal(r.applyHit(n, () => assert.fail('masked resource must not yield')), false);
  assert.equal(r.getActiveNodes().includes(n), false);
}
function rayAt(world, x = 0) {
  return world.castRay(new RAPIER.Ray({ x, y: .3, z: -3 }, { x: 0, y: 0, z: 1 }), 6, true);
}

test('Camp mask blocks all harvesting and lifecycle paths across resource families', () => {
  const assetType = createVisualAssetResourceType({
    id: 'test_debris', displayName: 'Debris',
    collision: { shape: 'box', size: { w: 2.4, h: 1.5, d: 1 }, offset: { x: .6, y: .75, z: -.3 } },
    gameplay: { role: 'harvestable', harvestable: { dropId: 'stone', maxChunks: 3, respawnSeconds: 10, feedbackProfile: 'stone' } },
  });
  for (const placement of [
    { type: 'tree' }, { type: 'rock' }, { type: 'fiber' },
    { type: 'rock', resourceType: assetType, uniformScale: 1.5, rotY: Math.PI / 2 },
  ]) {
    const f = fixture(placement);
    try {
      const r = f.resources, n = f.node;
      r.applyHit(n);
      const remaining = n.state.remainingChunks;
      r.setRemovedResourceIds(['debris']);
      assertMasked(f);
      assert.equal(r.getActiveNodeCount(), 1);
      r.resetDepleted(); r.update(1000, near, 'IDLE');
      r.setActiveRegions(['frontier']); r.setActiveRegions(['camp']);
      r.update(1000, near, 'IDLE'); r.resetDepleted();
      assertMasked(f);
      assert.equal(r.getActiveNodeCount(), 0);
      assert.equal(n.state.remainingChunks, remaining);
      r.setActiveRegions(null); r.update(.1, far, 'IDLE');
      assert.equal(r.getActiveNodeCount(), 1);
      assert.equal(f.sibling.state.remainingChunks, f.sibling.type.maxChunks);
      assert.equal(f.sibling.group.visible, true);
      assert.ok(f.sibling.collider);
      assert.ok(rayAt(f.world, 12), 'ordinary sibling remains physically present');
    } finally { f.world.free(); }
  }
});

test('mask changes batch broadphase refresh and safe repeated restoration never duplicates colliders', () => {
  const f = fixture();
  try {
    const r = f.resources, originalStep = f.world.step.bind(f.world);
    let steps = 0;
    f.world.step = (...args) => { steps++; return originalStep(...args); };
    assert.ok(rayAt(f.world));
    r.setRemovedResourceIds(['debris', 'ordinary']);
    assert.equal(steps, 1, 'one refresh for both actual collider removals');
    assert.equal(f.world.colliders.len(), 0);
    assert.equal(rayAt(f.world), null, 'removed collider leaves the actual query broadphase');
    r.setRemovedResourceIds(new Set(['debris', 'ordinary', 'unknown']));
    assert.equal(steps, 1, 'reapplying the same effective mask does no physics work');
    for (let i = 0; i < 3; i++) {
      r.setRemovedResourceIds([]);
      assert.equal(f.world.colliders.len(), 0, 'restoration waits for a player position');
      r.update(.1, { x: 0, y: .522, z: 0 }, 'IDLE');
      assert.equal(f.node.collider, null, 'occupied resource cannot become solid');
      assert.equal(f.node.group.visible, true);
      assert.ok(f.sibling.collider);
      r.update(.1, far, 'IDLE');
      assert.ok(f.node.collider);
      assert.ok(rayAt(f.world), 'restored collider is immediately queryable');
      assert.equal(f.world.colliders.len(), 2);
      r.setRemovedResourceIds([]); r.update(.1, far, 'IDLE');
      assert.equal(f.world.colliders.len(), 2);
      r.setRemovedResourceIds(['debris', 'ordinary']);
      assert.equal(f.world.colliders.len(), 0);
    }
  } finally { f.world.free(); }
});

test('clearing a mask while region inactive restores on activation and honors authored visibility/collision', () => {
  for (const placement of [{}, { visibleInPlay: false, collisionEnabled: false }]) {
    const f = fixture(placement);
    try {
      const r = f.resources;
      r.setRemovedResourceIds(['debris']);
      r.setActiveRegions(['frontier']);
      r.setRemovedResourceIds([]);
      r.update(.1, far, 'IDLE');
      assert.equal(f.node.group.visible, false);
      assert.equal(f.node.collider, null);
      r.setActiveRegions(['camp']);
      r.update(.1, far, 'IDLE');
      assert.equal(f.node.group.visible, placement.visibleInPlay !== false);
      assert.equal(Boolean(f.node.collider), placement.collisionEnabled !== false);
      r.setActiveRegions(null); r.update(.1, far, 'IDLE');
      assert.equal(f.world.colliders.len(), placement.collisionEnabled === false ? 1 : 2);
    } finally { f.world.free(); }
  }
});

test('completed Camp debris stays removed after collection/reset/time while final-hit drops remain collectible', () => {
  const f = fixture();
  try {
    const r = f.resources, n = f.node;
    while (n.state.remainingChunks) assert.equal(r.applyHit(n, f.pickups.spawnPickup), true);
    assert.equal(n.state.nodeState, 'RESPAWNING');
    const timer = n.state.respawnRemaining;
    r.setRemovedResourceIds(['debris']);
    assertMasked(f);
    assert.equal(f.pickups.hasPendingYield(n), true);
    assert.equal(f.pickups.collectPickup(f.pickups.getPickups()[0]), true);
    assert.equal(f.inventory.gathered, n.type.maxChunks);
    assert.equal(f.pickups.hasPendingYield(n), false);
    r.resetDepleted(); r.update(timer + 100, near, 'IDLE');
    r.setActiveRegions(['frontier']); r.setActiveRegions(['camp']);
    r.resetDepleted(); r.update(timer + 100, near, 'IDLE');
    assertMasked(f);
    assert.equal(n.state.nodeState, 'RESPAWNING');
    assert.equal(n.state.respawnRemaining, timer);
    r.setRemovedResourceIds([]); r.resetDepleted();
    r.update(.1, { x: 0, y: .522, z: 0 }, 'IDLE');
    assert.equal(n.state.nodeState, 'READY');
    assert.equal(n.collider, null);
    r.update(.1, far, 'IDLE');
    assert.ok(n.collider);
    r.setRemovedResourceIds(['debris']);
    assertMasked(f);
    assert.equal(f.inventory.gathered, n.type.maxChunks);
  } finally { f.world.free(); }
});
