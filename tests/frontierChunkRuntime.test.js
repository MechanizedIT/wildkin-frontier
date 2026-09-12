import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFrontierChunkRuntime } from '../src/world/frontierChunkRuntime.js';
import { FRONTIER_TERRAIN_CONFIG, sampleFrontier } from '../src/world/frontierTerrain.js';
import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';

function fixture() {
  const calls = [];
  const physicsWorld = { updateTerrainSurfaces: batch => { calls.push(batch); } };
  const parent = new THREE.Group();
  return { runtime: createFrontierChunkRuntime({ parent, physicsWorld }), calls, parent };
}

test('loads a bounded five-by-five frontier window while reserving Camp chunks', () => {
  const { runtime, calls } = fixture();
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp' });
  const state = runtime.getDebugState();
  assert.equal(state.residentCount, 24);
  assert.ok(state.residentCount <= 25);
  assert.equal(state.residentIds.includes('0,0'), false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].add.length, 24);
  assert.ok(calls[0].add.every(surface => surface.sectionId === 'camp'));
  runtime.dispose();
});

test('loads incoming support before retiring a shifted window and ignores edge wiggle', () => {
  const { runtime, calls } = fixture();
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp' });
  runtime.update({ x: 149, z: 120 }, { activeSectionId: 'camp' });
  assert.equal(calls.length, 1, 'center hysteresis avoids an allocation churn near an edge');
  runtime.update({ x: 159, z: 120 }, { activeSectionId: 'camp' });
  assert.equal(calls.length, 2);
  assert.ok(calls[1].add.length > 0);
  assert.ok(calls[1].remove.length > 0);
  runtime.dispose();
});

test('inactive and Author states retire residents in one batch and hide the root', () => {
  const { runtime, calls } = fixture();
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp' });
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'field' });
  assert.equal(runtime.getDebugState().residentCount, 0);
  assert.equal(runtime.root.visible, false);
  assert.equal(calls[1].remove.length, 24);
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp', authorMode: true });
  assert.equal(calls.length, 2);
  runtime.dispose();
});

test('height query exactly delegates to the shared frontier sampler', () => {
  const { runtime } = fixture();
  for (const [x, z] of [[-125, 24], [87.5, -73]]) assert.equal(runtime.getHeight(x, z), sampleFrontier(x, z).height);
  assert.equal(FRONTIER_TERRAIN_CONFIG.chunkSize, 50);
  runtime.dispose();
});

test('Camp query preserves the authored negative surface height', () => {
  const campSurface = { water: [{ x: 0, z: 0, rx: 20, rz: 20, depth: .7 }] };
  const runtime = createFrontierChunkRuntime({ parent: new THREE.Group(), campSurface });
  assert.equal(runtime.getHeight(0, 0), getSurfaceHeight(campSurface, 0, 0));
  assert.equal(runtime.getHeight(0, 0), -.7);
  runtime.dispose();
});

test('disposal releases residents, root and shared visual resources once', () => {
  const { runtime, calls, parent } = fixture();
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp' });
  runtime.dispose(); runtime.dispose();
  assert.equal(runtime.getDebugState().residentCount, 0);
  assert.equal(parent.children.includes(runtime.root), false);
  assert.equal(calls.filter(call => call.remove?.length).length, 1);
});

test('unloaded foliage releases its instance buffer exactly once', () => {
  const { runtime } = fixture();
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp' });
  const chunk = runtime.root.getObjectByName('frontier_chunk_0,1');
  const foliage = chunk.getObjectByName('frontier_groundcover');
  let disposals = 0;
  foliage.dispose = () => { disposals++; };
  runtime.update({ x: 260, z: 120 }, { activeSectionId: 'camp' });
  runtime.dispose();
  assert.equal(disposals, 1);
});
