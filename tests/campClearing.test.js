import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createCampClearing } from '../src/base/campClearing.js';
import { CAMP_DEBRIS_IDS } from '../src/base/campLayout.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createResourceSystem } from '../src/resources/resourceSystem.js';
import { createPickupSystem } from '../src/resources/pickupSystem.js';

await RAPIER.init();
const debrisId = CAMP_DEBRIS_IDS[0];
const far = { x: 50, y: .522, z: 50 };
function fixture(run) {
  const previousStorage = globalThis.localStorage, values = new Map(), worlds = [];
  let fail = false;
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (fail) throw Error('quota'); values.set(key, value); },
  };
  function createRuntime({ hidden = false, camp = true } = {}) {
    const progress = createFrontierProgress(); progress.load();
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 }); worlds.push(world);
    const physics = { world, RAPIER };
    const pickups = createPickupSystem(new THREE.Scene(), physics, null, null, {
      inventory: { getResources: progress.getPackResourceCounts, collect: progress.collectResources, spend: progress.spendResources },
    });
    const resources = createResourceSystem(new THREE.Scene(), physics, [
      { id: debrisId, type: 'tree', regionId: 'camp', pos: { x: 0, y: 0, z: 0 } },
      { id: 'ordinary_tree', type: 'tree', regionId: 'frontier', pos: { x: 10, y: 0, z: 0 } },
    ], { hasPendingYield: pickups.hasPendingYield });
    const notices = [], clearing = createCampClearing({ progress, resources, initialHidden: hidden, isCamp: () => camp, notify: (...args) => notices.push(args) });
    return { progress, world, pickups, resources, clearing, notices, node: resources.nodes[0], setCamp: value => { camp = value; } };
  }
  try { run(createRuntime, value => { fail = value; }); }
  finally { for (const world of worlds) world.free(); globalThis.localStorage = previousStorage; }
}
function hit(f, onDrop = () => {}) {
  if (!f.clearing.beforeHit(f.node)) return false;
  const applied = f.resources.applyHit(f.node, node => { onDrop(node); f.pickups.spawnPickup(node); });
  if (applied) f.clearing.afterHit(f.node);
  return applied;
}

test('Camp final save failure preserves the last chunk/drop; retry commits before impact and masks after yield exactly once', () => fixture((createRuntime, fail) => {
  const f = createRuntime(), { node, progress, resources, pickups } = f;
  while (node.state.remainingChunks > 1) assert.equal(hit(f), true);
  const before = progress.getState(), pending = pickups.getPendingYields();
  assert.deepEqual(pending[0].resources, { wood: node.type.maxChunks - 1 });
  fail(true);
  for (let i = 0; i < 2; i++) {
    assert.equal(hit(f, () => assert.fail('failed save cannot emit the final drop')), false);
    assert.equal(node.state.remainingChunks, 1);
    assert.equal(node.state.nodeState, 'READY');
    assert.equal(node.group.visible, true);
    assert.ok(node.collider);
    assert.deepEqual(progress.getState(), before);
    assert.deepEqual(pickups.getPendingYields(), pending);
  }
  assert.equal(f.notices.filter(n => n[0] === 'Could not save').length, 1, 'failed repeated swings keep one bounded warning');
  fail(false);
  let finalDrops = 0;
  assert.equal(hit(f, current => {
    finalDrops++;
    assert.deepEqual(progress.getBaseState().layout.clearedDebrisIds, [debrisId], 'save accepted before final impact');
    assert.equal(current._removed, false, 'resource remains live until the final drop is emitted');
  }), true);
  assert.equal(finalDrops, 1);
  assert.equal(node.state.remainingChunks, 0);
  assert.equal(node._removed, true);
  assert.equal(node.group.visible, false);
  assert.equal(node.collider, null);
  assert.deepEqual(pickups.getPendingYields()[0].resources, { wood: node.type.maxChunks });
  assert.equal(hit(f, () => finalDrops++), false);
  assert.equal(finalDrops, 1);
  assert.equal(pickups.collectPickup(pickups.getPickups()[0]), true);
  assert.equal(progress.getPackResourceCounts().wood, node.type.maxChunks);
  assert.equal(progress.getInventoryState().totals.gathered, node.type.maxChunks);
  resources.resetDepleted(); resources.update(1000, far, 'IDLE');
  assert.equal(node._removed, true);
  assert.equal(node.state.remainingChunks, 0);
}));

test('saved clear masks rebuilt resources, Author suppresses clearing, and Play restores the mask without losing collected yield', () => fixture(createRuntime => {
  const original = createRuntime();
  while (original.node.state.remainingChunks) assert.equal(hit(original), true);
  assert.equal(original.pickups.collectPickup(original.pickups.getPickups()[0]), true);
  const f = createRuntime();
  assert.deepEqual(f.progress.getBaseState().layout.clearedDebrisIds, [debrisId]);
  assert.equal(f.node._removed, true);
  assert.equal(f.node.collider, null);
  assert.equal(f.resources.getActiveNodes().includes(f.node), false);
  assert.equal(f.progress.getPackResourceCounts().wood, original.node.type.maxChunks);
  f.clearing.update(.01, { hidden: true });
  assert.equal(f.node._removed, false);
  f.resources.resetDepleted(); f.resources.update(.1, far, 'IDLE');
  assert.equal(f.node.group.visible, true);
  assert.ok(f.node.collider);
  assert.equal(hit(f), false, 'Author cannot commit harvesting progress');
  f.clearing.update(.01, { hidden: false });
  assert.equal(f.node._removed, true);
  assert.equal(f.node.group.visible, false);
  assert.equal(f.node.collider, null);
  f.resources.setActiveRegions(['frontier']); f.resources.setActiveRegions(['camp']);
  f.resources.resetDepleted(); f.resources.update(1000, far, 'IDLE'); f.clearing.update(.3);
  assert.equal(f.node._removed, true);
  assert.equal(f.pickups.getCount(), 0);
  assert.equal(f.progress.getPackResourceCounts().wood, original.node.type.maxChunks);
  const authorAtBoot = createRuntime({ hidden: true });
  assert.equal(authorAtBoot.node._removed, false);
  assert.equal(hit(authorAtBoot), false);
  authorAtBoot.clearing.update(.01, { hidden: false });
  assert.equal(authorAtBoot.node._removed, true);
}));

test('Camp clearing guards apply only to Camp debris and cannot advance it outside Camp', () => fixture(createRuntime => {
  const f = createRuntime({ camp: false });
  assert.equal(hit(f), false);
  assert.equal(f.node.state.remainingChunks, f.node.type.maxChunks);
  assert.equal(f.clearing.beforeHit(f.resources.nodes[1]), true, 'ordinary resource harvesting keeps its existing owner');
  f.setCamp(true);
  assert.equal(hit(f), true);
  assert.deepEqual(f.progress.getBaseState().layout.clearedDebrisIds, []);
}));
