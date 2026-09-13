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

function streamingFixture({ failRecipe = false } = {}) {
  let snapshot = residency(0, -2), anticipated = null, clock = 0, failPhysics = false;
  const parent = new THREE.Group(), batches = [], candidates = [], jobs = [];
  function candidate() {
    const result = { group: new THREE.Group(), terrainSurfaces: [{ id: `fixture-${candidates.length}` }],
      canopyRoots: [], disposeCount: 0, dispose() { this.disposeCount++; } };
    candidates.push(result);
    return result;
  }
  const recipeOptions = failRecipe ? { createRecipeJob() {
    return { step() { throw new Error('prepare-fixture'); }, cancel() {}, getState() { return {}; } };
  } } : {};
  const runtime = createFrontierSceneryRuntime({
    parent, visualAssets, now: () => clock++, ...recipeOptions,
    terrainRuntime: { getResidency: () => snapshot, getAnticipatedResidency: () => anticipated,
      getHeight: () => 0, sample: () => ({ height: 0, habitatBlend: { wetland: .7, fernUpland: .3 } }) },
    physicsWorld: { updateTerrainSurfaces(batch) { if (failPhysics) throw new Error('physics-fixture'); batches.push(batch); } },
    createVisual: candidate,
    createVisualJob() {
      const result = candidate();
      let status = 'pending', steps = 0;
      const job = { step() { if (++steps === 7) status = 'complete'; }, getState() { return { status }; },
        cancel() { if (status !== 'transferred' && status !== 'cancelled') { result.dispose(); status = 'cancelled'; } },
        takeResult() { assert.equal(status, 'complete'); status = 'transferred'; return result; }, result };
      jobs.push(job);
      return job;
    },
  });
  runtime.update();
  const prepare = (target = residency(1, -2), phase = 'ready') => {
    anticipated = target;
    let frames = 0;
    for (; frames < 100; frames++) {
      runtime.update();
      if (runtime.getDebugState().streaming.phase === phase) break;
    }
    assert.ok(frames < 100, `preparation reaches ${phase}`);
    return { target, frames };
  };
  return { runtime, parent, batches, candidates, jobs, prepare,
    predict: target => { anticipated = target; },
    publish: target => { snapshot = target; anticipated = null; },
    failPhysics: value => { failPhysics = value; } };
}

test('upcoming scenery stays detached across budgeted frames and transfers exactly once at the matching boundary', () => {
  const f = streamingFixture(), original = f.parent.children[0];
  const { target, frames } = f.prepare();
  assert.ok(frames > 1, 'preparation is spread across existing update calls');
  assert.deepEqual(f.parent.children, [original]);
  assert.equal(f.batches.length, 1, 'speculation never changes physics');
  const prepared = f.jobs[0].result;
  assert.equal(prepared.group.parent, null);
  f.publish(target); f.runtime.update();
  assert.deepEqual(f.parent.children, [prepared.group]);
  assert.equal(f.batches.length, 2);
  assert.equal(f.candidates[0].disposeCount, 1);
  assert.equal(prepared.disposeCount, 0);
  assert.equal(f.runtime.getDebugState().streaming.preparedPublications, 1);
  f.runtime.update();
  assert.equal(f.batches.length, 2);
  f.runtime.dispose(); f.runtime.dispose();
  assert.equal(prepared.disposeCount, 1);
  assert.equal(f.runtime.getDebugState().groundPatchCache.entryCount, 0);
});

test('reversal and inactive retirement cancel partial or ready scenery without changing the published scene early', () => {
  const f = streamingFixture(), original = f.parent.children[0];
  f.prepare(residency(1, -2), 'visual');
  const partial = f.jobs[0].result;
  f.predict(null); f.runtime.update();
  assert.equal(partial.disposeCount, 1);
  assert.deepEqual(f.parent.children, [original]);
  assert.equal(f.batches.length, 1);
  f.prepare(residency(-1, -2));
  const ready = f.jobs.at(-1).result;
  f.publish({ center: null, chunks: [] }); f.runtime.update();
  assert.equal(ready.disposeCount, 1);
  assert.equal(f.candidates[0].disposeCount, 1);
  assert.equal(f.parent.children.length, 0);
  assert.deepEqual(f.runtime.getDebugState().sceneryRecipeCache, { ordinaryCount: 0, infillCount: 0 });
  assert.equal(f.runtime.getDebugState().groundPatchCache.entryCount, 0);
  f.runtime.dispose();
});

test('a rejected prepared physics publication retires only its candidate and permits same-boundary retry', () => {
  const f = streamingFixture(), original = f.parent.children[0];
  const { target } = f.prepare(), rejected = f.jobs[0].result;
  f.publish(target); f.failPhysics(true);
  assert.throws(() => f.runtime.update(), /physics-fixture/);
  assert.deepEqual(f.parent.children, [original]);
  assert.equal(rejected.disposeCount, 1);
  assert.equal(f.candidates[0].disposeCount, 0);
  assert.equal(f.runtime.getDebugState().streaming.preparedPublications, 0);
  f.failPhysics(false); f.runtime.update();
  assert.notEqual(f.parent.children[0], original);
  assert.equal(f.candidates[0].disposeCount, 1);
  f.runtime.dispose();
});

test('arriving early finishes the same partial visual instead of duplicating it or publishing an incomplete graph', () => {
  const f = streamingFixture();
  const { target } = f.prepare(residency(1, -2), 'visual');
  const partial = f.jobs[0].result;
  f.publish(target); f.runtime.update();
  assert.deepEqual(f.parent.children, [partial.group]);
  assert.equal(f.jobs.length, 1);
  assert.equal(f.runtime.getDebugState().streaming.unfinishedPublications, 1);
  assert.equal(partial.disposeCount, 0);
  f.runtime.dispose();
});

test('speculative failure is suppressed for its prediction and ordinary boundary generation remains retryable', () => {
  const f = streamingFixture({ failRecipe: true }), original = f.parent.children[0];
  const target = residency(1, -2);
  f.predict(target);
  f.runtime.update(); f.runtime.update(); f.runtime.update();
  assert.deepEqual(f.parent.children, [original]);
  assert.equal(f.runtime.getDebugState().streaming.preparationFailures, 1);
  f.publish(target); f.runtime.update();
  assert.notEqual(f.parent.children[0], original);
  assert.equal(f.batches.length, 2);
  f.runtime.dispose();
});
