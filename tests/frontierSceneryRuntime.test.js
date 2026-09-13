import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFrontierSceneryRuntime } from '../src/world/frontierSceneryRuntime.js';
import { sampleFrontier } from '../src/world/frontierTerrain.js';
import WORLD_DATA from '../src/world/data/world.js';

const visualAssets = ['asset_verge_canopy', 'asset_verge_canopy_spread', 'asset_verge_canopy_tall', 'asset_fen_reed', 'asset_fen_lily', 'asset_fen_stone', 'asset_mushroom_ring'].map(id => ({ id }));
function residency(cx, cz) {
  const chunks = [];
  for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) chunks.push({ id: `${x},${z}`, cx: x, cz: z });
  return Object.freeze({ center: { cx, cz }, chunks });
}

test('runtime ground cover leaves the staged crystal interaction clear using actual asset roles', () => {
  let checked = false;
  const runtime = createFrontierSceneryRuntime({
    visualAssets: WORLD_DATA.visualAssets,
    terrainRuntime: {
      getResidency: () => residency(0, -5),
      getHeight: (x, z) => sampleFrontier(x, z).height,
      sample: sampleFrontier,
    },
    createVisual({ canPlaceGroundCover }) {
      checked = true;
      assert.equal(canPlaceGroundCover(32, -214), false, 'real staged crystal must exclude grass, even though its point is flat and outside old route guards');
      return { group: new THREE.Group(), terrainSurfaces: [], canopyRoots: [], dispose() {} };
    },
  });
  runtime.update();
  assert.equal(checked, true);
  runtime.dispose();
  assert.deepEqual(runtime.getDebugState().clearanceRecipeCache, { forageCount: 0, wildlifeCount: 0 });
  assert.deepEqual(runtime.getDebugState().sceneryRecipeCache, { ordinaryCount: 0, infillCount: 0 });
});

test('scenery replaces physics and camera registrations only when terrain residency changes', () => {
  let snapshot = residency(0, -2), created = 0, disposed = 0, invalidations = 0;
  const parent = new THREE.Group(), registered = new Set(), batches = [];
  const runtime = createFrontierSceneryRuntime({
    parent, visualAssets,
    terrainRuntime: { getResidency: () => snapshot, getHeight: () => 0, sample: () => ({ height: 0, habitatBlend: { wetland: .65, fernUpland: .35 } }) },
    physicsWorld: { updateTerrainSurfaces: batch => batches.push(batch) },
    onVisualAdded: root => registered.add(root),
    onVisualRemoving: root => registered.delete(root),
    onGeometryChanged: () => invalidations++,
    createVisual({ specs, canPlaceGroundCover }) {
      assert.equal(canPlaceGroundCover(7,-75),false,'runtime injects shared route protection into grass construction');
      created++;
      const group = new THREE.Group(), canopyRoots = specs.filter(spec => spec.kind === 'canopy').map(() => new THREE.Group());
      group.add(...canopyRoots);
      return { group, canopyRoots, terrainSurfaces: specs.filter(spec => spec.kind === 'canopy').map(spec => ({ id: `f2c:${spec.id}:trunk` })),
        dispose() { assert.ok(canopyRoots.every(root => !registered.has(root)), 'unregister before disposing faded models'); disposed++; group.clear(); } };
    },
  });
  runtime.update();
  assert.equal(created, 1);
  assert.ok(runtime.getDebugState().residentCount > 0);
  const firstCache = runtime.getDebugState().clearanceRecipeCache;
  const firstSceneryCache = runtime.getDebugState().sceneryRecipeCache;
  assert.equal(firstSceneryCache.ordinaryCount, 25);
  assert.equal(firstSceneryCache.infillCount, 0, 'the protected starter fixture does not prepare infill');
  assert.ok(firstCache.forageCount > 0 && firstCache.forageCount <= 81);
  assert.ok(firstCache.wildlifeCount > 0 && firstCache.wildlifeCount <= 81);
  assert.equal(parent.children.length, 1);
  const firstIds = [...runtime.getDebugState().residentIds];
  for (let i = 0; i < 60; i++) runtime.update();
  assert.equal(created, 1, 'no per-frame rebuild');
  assert.deepEqual(runtime.getDebugState().clearanceRecipeCache, firstCache, 'no per-frame source generation');
  assert.deepEqual(runtime.getDebugState().sceneryRecipeCache, firstSceneryCache);
  assert.equal(invalidations, 1);
  snapshot = residency(1, -2);
  runtime.update();
  assert.equal(created, 2);
  assert.equal(disposed, 1);
  assert.equal(parent.children.length, 1);
  assert.ok(batches[1].remove.length > 0 && batches[1].add.length > 0, 'one complete replacement batch');
  snapshot = residency(0, -2); runtime.update();
  assert.deepEqual(runtime.getDebugState().residentIds, firstIds, 'return restores the same selected recipes');
  snapshot = { center: null, chunks: [] }; runtime.update();
  assert.equal(parent.children.length, 0, 'Author/other section retires the scene');
  assert.equal(registered.size, 0);
  assert.equal(runtime.getDebugState().colliderCount, 0);
  assert.deepEqual(runtime.getDebugState().clearanceRecipeCache, { forageCount: 0, wildlifeCount: 0 });
  assert.deepEqual(runtime.getDebugState().sceneryRecipeCache, { ordinaryCount: 0, infillCount: 0 });
  const finalBatches = batches.length;
  runtime.dispose(); runtime.dispose(); runtime.update();
  assert.equal(batches.length, finalBatches, 'empty repeated disposal creates no physics work');
  assert.deepEqual(runtime.getDebugState().clearanceRecipeCache, { forageCount: 0, wildlifeCount: 0 });
  assert.deepEqual(runtime.getDebugState().sceneryRecipeCache, { ordinaryCount: 0, infillCount: 0 });
});

test('a failed scenery construction retains the old resident and can retry the same snapshot', () => {
  let snapshot = residency(0, -2), fail = false, attempts = 0, heightCalls = 0, failedHeight = null;
  const parent = new THREE.Group();
  const runtime = createFrontierSceneryRuntime({ parent, visualAssets,
    terrainRuntime: { getResidency: () => snapshot, getHeight: () => { heightCalls++; return 0; }, sample: () => ({ height: 0, habitatBlend: { wetland: .7, fernUpland: .3 } }) },
    createVisual({ getHeight }) {
      attempts++; getHeight(123, 456);
      if (fail) { failedHeight = getHeight; throw new Error('fixture'); }
      return { group: new THREE.Group(), terrainSurfaces: [], canopyRoots: [], dispose() {} };
    },
  });
  runtime.update(); const oldGroup = parent.children[0];
  snapshot = residency(1, -2); fail = true;
  assert.throws(() => runtime.update(), /fixture/);
  const callsAfterFailure = heightCalls;
  failedHeight(123, 456);
  assert.equal(heightCalls, callsAfterFailure + 1, 'failed visual construction releases its point memo');
  assert.equal(parent.children[0], oldGroup);
  fail = false; runtime.update();
  assert.equal(attempts, 3);
  assert.notEqual(parent.children[0], oldGroup);
  runtime.dispose();
});

test('a failed physics replacement disposes the new visual and preserves the old resident for retry', () => {
  let snapshot = residency(0, -2), failPhysics = false, attempts = 0;
  const parent = new THREE.Group(), disposed = [];
  const physicsWorld = { updateTerrainSurfaces() { if (failPhysics) throw new Error('physics-fixture'); } };
  const runtime = createFrontierSceneryRuntime({ parent, visualAssets, physicsWorld,
    terrainRuntime: { getResidency: () => snapshot, getHeight: () => 0, sample: () => ({ height: 0, habitatBlend: { wetland: .7, fernUpland: .3 } }) },
    createVisual() {
      attempts++;
      const group = new THREE.Group();
      return { group, terrainSurfaces: [{ id: `surface-${attempts}` }], canopyRoots: [], dispose() { disposed.push(group); } };
    },
  });
  runtime.update();
  const oldGroup = parent.children[0], oldIds = runtime.getDebugState().residentIds;
  snapshot = residency(1, -2); failPhysics = true;
  assert.throws(() => runtime.update(), /physics-fixture/);
  assert.equal(attempts, 2);
  assert.deepEqual(parent.children, [oldGroup]);
  assert.deepEqual(runtime.getDebugState().residentIds, oldIds);
  assert.equal(disposed.length, 1);
  assert.notEqual(disposed[0], oldGroup, 'only the rejected visual is disposed');

  failPhysics = false; runtime.update();
  assert.equal(attempts, 3, 'the unchanged residency retries after the failed commit');
  assert.notEqual(parent.children[0], oldGroup);
  assert.equal(disposed.filter(group => group === oldGroup).length, 1);
  runtime.dispose();
});
