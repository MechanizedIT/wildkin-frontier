import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createResourceSystem } from '../src/resources/resourceSystem.js';
import { createPickupSystem } from '../src/resources/pickupSystem.js';
import { createFieldTool } from '../src/tools/fieldTool.js';
import { createVisualAssetResourceType } from '../src/resources/resourceConfig.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { pickupInventoryFixture } from './helpers/pickupInventoryFixture.js';

function withLaunchDirection(value, callback) {
  const original = Math.random;
  Math.random = () => value;
  try { return callback(); } finally { Math.random = original; }
}
function fixture(placement = { type: 'tree', pos: { x: 0, y: 0, z: 0 } }, capacity = 16, inventoryAccess = null) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const inventory = pickupInventoryFixture(undefined, capacity);
  const pickups = createPickupSystem(new THREE.Scene(), { world, RAPIER }, null, null, { inventory: inventoryAccess ?? inventory.inventory });
  const resources = createResourceSystem(new THREE.Scene(), { world, RAPIER }, [{ id: 'source', regionId: 'A', ...placement }], { hasPendingYield: pickups.hasPendingYield });
  return { world, inventory, pickups, resources, node: resources.nodes[0] };
}
await RAPIER.init();

test('auto and held manual deplete tree, rock and fiber without collecting any earlier drop', () => {
  for (const type of ['tree', 'rock', 'fiber']) for (const manual of [false, true]) for (const launch of [0, .25, .5, .75]) {
    const f = fixture({ type, pos: { x: 0, y: 0, z: 0 } });
    try {
      const pos = { x: -1.4, y: .522, z: 0 }, tool = createFieldTool(new THREE.Group());
      let hits = 0;
      const opts = {
        autoHarvestEnabled: !manual, attackHeld: manual, canAttack: true,
        getHarvestTargets: f.resources.getEligibleNodes,
        getManualHarvestTargets: () => f.resources.getManualTargets(pos),
        onUnifiedImpact({ resourceHits }) {
          for (const n of resourceHits) {
            if (withLaunchDirection(launch, () => f.resources.applyHit(n, f.pickups.spawnPickup))) hits++;
          }
        },
      };
      // Deliberately never update/collect pickups: harvesting must not depend on
      // magnet success, launch direction, pack capacity or a collection callback.
      for (let i = 0; i < 300; i++) tool.update(1 / 60, pos, { mode: 'IDLE', speed: 0, facing: { x: 1, z: 0 } }, opts);
      const label = `${type}, manual=${manual}, launch=${launch}`;
      assert.equal(hits, f.node.type.maxChunks, label);
      assert.equal(f.node.state.nodeState, 'RESPAWNING', label);
      assert.equal(f.pickups.getInventory()[f.node.type.resourceId], 0, label);
      assert.deepEqual(f.pickups.getPendingYields()[0].resources, { [f.node.type.resourceId]: hits }, label);
      assert.equal(f.pickups.getCount(), 1, 'one bounded aggregate visual');
      assert.equal(f.pickups.collectPickup(f.pickups.getPickups()[0]), true);
      assert.equal(f.inventory.gathered, hits, label);
    } finally { f.world.free(); }
  }
});

test('scaled rotated visual-asset ore remains targetable after an uncollected hit', () => {
  const type = createVisualAssetResourceType({
    id: 'test_ore', displayName: 'Test Ore',
    collision: { shape: 'box', size: { w: 2.4, h: 1.5, d: 1 }, offset: { x: .6, y: .75, z: -.3 } },
    gameplay: { role: 'harvestable', harvestable: { dropId: 'stone', maxChunks: 3, respawnSeconds: 10, feedbackProfile: 'stone' } },
  });
  const f = fixture({ type: 'rock', resourceType: type, uniformScale: 1.5, rotY: Math.PI / 2, pos: { x: 5, y: 2, z: 7 } });
  try {
    const pos = { x: 4.55, y: 2.522, z: 3.325 };
    for (let i = 0; i < 3; i++) {
      assert.equal(f.resources.isHarvestableInRange(f.node, pos), true);
      assert.equal(f.resources.isHarvestableInRange(f.node, { ...pos, y: -.5 }), false);
      assert.equal(f.resources.applyHit(f.node, f.pickups.spawnPickup), true);
    }
    assert.equal(f.node.state.nodeState, 'RESPAWNING');
    assert.deepEqual(f.pickups.getPendingYields()[0].resources, { stone: 3 });
  } finally { f.world.free(); }
});

test('full pack and failed writes never stop depletion or discard hit/bonus rewards; collection retries once space returns', () => {
  for (const reason of ['full', 'storage-write-failed']) {
    const f = fixture(undefined, 1);
    try {
      if (reason === 'full') f.inventory.slots = [{ id: 'wood', count: 20 }];
      else f.inventory.fail = true;
      const total = f.node.type.maxChunks * 2;
      while (f.node.state.remainingChunks) {
        assert.equal(f.resources.applyHit(f.node, n => { f.pickups.spawnPickup(n); f.pickups.spawnPickup(n); }), true);
        assert.equal(f.pickups.collectPickup(f.pickups.getPickups()[0]), false);
      }
      const drop = f.pickups.getPickups()[0];
      assert.equal(drop.lastCollectionReason, reason);
      assert.equal(f.node.state.nodeState, 'RESPAWNING');
      assert.equal(f.inventory.gathered, 0);
      assert.deepEqual(f.pickups.getPendingYields()[0].resources, { wood: total });
      f.inventory.fail = false; f.inventory.slots = [{ id: 'wood', count: 18 }];
      assert.equal(f.pickups.collectPickup(drop), false);
      assert.equal(f.inventory.gathered, 2);
      assert.deepEqual(f.pickups.getPendingYields()[0].resources, { wood: total - 2 });
      assert.equal(f.pickups.spendInventory({ wood: total - 2 }), true);
      assert.equal(f.pickups.collectPickup(drop), true);
      assert.equal(f.pickups.collectPickup(drop), false);
      assert.equal(f.inventory.gathered, total);
      assert.equal(f.pickups.getInventory().wood, 20);
    } finally { f.world.free(); }
  }
});

test('distant ordinary drops remain on the ground until approached, independent of source reach', () => {
  const f = fixture(), pos = { x: -1.4, y: .522, z: 0 };
  try {
    while (f.node.state.remainingChunks) withLaunchDirection(0, () => f.resources.applyHit(f.node, f.pickups.spawnPickup));
    for (let i = 0; i < 180; i++) f.pickups.update(1 / 60, pos);
    assert.equal(f.node.state.nodeState, 'RESPAWNING');
    assert.equal(f.pickups.hasPendingYield(f.node), true);
    assert.equal(f.pickups.getInventory().wood, 0);
    const p = f.pickups.getPickups()[0];
    assert(p.pos.distanceTo(new THREE.Vector3(pos.x, pos.y, pos.z)) > 2.4);
    const near = { x: p.pos.x + 1, y: .522, z: p.pos.z };
    for (let i = 0; i < 120; i++) f.pickups.update(1 / 60, near);
    assert.equal(f.pickups.getInventory().wood, f.node.type.maxChunks);
    assert.equal(f.pickups.hasPendingYield(f.node), false);
  } finally { f.world.free(); }
});

test('literal owner reload preserves committed partial pickups, rebuilds ordinary nodes and never banks uncollected drops', () => {
  const previousStorage = globalThis.localStorage;
  let saved = null, fail = false;
  globalThis.localStorage = { getItem: () => saved, setItem: (_key, value) => { if (fail) throw Error('quota'); saved = value; } };
  let f, rebuilt;
  try {
    const progress = createFrontierProgress(); progress.load(); progress.collectResources({ wood: 318 });
    const access = p => ({ getResources: p.getPackResourceCounts, collect: p.collectResources, spend: p.spendResources });
    f = fixture(undefined, 16, access(progress));
    while (f.node.state.remainingChunks) f.resources.applyHit(f.node, f.pickups.spawnPickup);
    const p = f.pickups.getPickups()[0];
    fail = true; assert.equal(f.pickups.collectPickup(p), false);
    assert.equal(JSON.parse(saved).inventory.totals.gathered, 0);
    fail = false; assert.equal(f.pickups.collectPickup(p), false);
    assert.equal(progress.getPackResourceCounts().wood, 320);
    assert.deepEqual(f.pickups.getPendingYields()[0].resources, { wood: 3 });
    const reloaded = createFrontierProgress(); reloaded.load();
    rebuilt = fixture(undefined, 16, access(reloaded));
    assert.equal(reloaded.getPackResourceCounts().wood, 320);
    assert.equal(reloaded.getInventoryState().totals.gathered, 2);
    assert.equal(rebuilt.pickups.getDebug().pendingSources, 0);
    assert.equal(rebuilt.node.state.nodeState, 'READY');
    assert.equal(rebuilt.node.state.remainingChunks, rebuilt.node.type.maxChunks);
    // Existing reload policy rebuilds transient world actors and their drops;
    // it must never materialize unaccepted field yields into the saved pack.
  } finally { f?.world.free(); rebuilt?.world.free(); globalThis.localStorage = previousStorage; }
});
