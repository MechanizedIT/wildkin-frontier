import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFrontierSceneryRuntime } from '../src/world/frontierSceneryRuntime.js';

const visualAssets = ['asset_verge_canopy', 'asset_verge_canopy_spread', 'asset_verge_canopy_tall', 'asset_fen_reed', 'asset_fen_lily', 'asset_fen_stone', 'asset_mushroom_ring'].map(id => ({ id }));
function residency(cx, cz) {
  const chunks = [];
  for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) chunks.push({ id: `${x},${z}`, cx: x, cz: z });
  return Object.freeze({ center: { cx, cz }, chunks });
}

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
  assert.equal(parent.children.length, 1);
  const firstIds = [...runtime.getDebugState().residentIds];
  for (let i = 0; i < 60; i++) runtime.update();
  assert.equal(created, 1, 'no per-frame rebuild');
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
  const finalBatches = batches.length;
  runtime.dispose(); runtime.dispose(); runtime.update();
  assert.equal(batches.length, finalBatches, 'empty repeated disposal creates no physics work');
});

test('a failed scenery construction retains the old resident and can retry the same snapshot', () => {
  let snapshot = residency(0, -2), fail = false, attempts = 0;
  const parent = new THREE.Group();
  const runtime = createFrontierSceneryRuntime({ parent, visualAssets,
    terrainRuntime: { getResidency: () => snapshot, getHeight: () => 0, sample: () => ({ height: 0, habitatBlend: { wetland: .7, fernUpland: .3 } }) },
    createVisual() { attempts++; if (fail) throw new Error('fixture'); return { group: new THREE.Group(), terrainSurfaces: [], canopyRoots: [], dispose() {} }; },
  });
  runtime.update(); const oldGroup = parent.children[0];
  snapshot = residency(1, -2); fail = true;
  assert.throws(() => runtime.update(), /fixture/);
  assert.equal(parent.children[0], oldGroup);
  fail = false; runtime.update();
  assert.equal(attempts, 3);
  assert.notEqual(parent.children[0], oldGroup);
  runtime.dispose();
});
