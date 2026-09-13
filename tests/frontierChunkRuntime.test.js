import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFrontierChunkRuntime } from '../src/world/frontierChunkRuntime.js';
import { FRONTIER_TERRAIN_CONFIG, sampleFrontier, sampleFrontierHeight } from '../src/world/frontierTerrain.js';
import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';
import { DEFAULT_FRONTIER_WORLD, normalizeFrontierWorld } from '../src/world/frontierWorld.js';
import { isSkybreakArea } from '../src/world/frontierLandform.js';
import WORLD_DATA from '../src/world/data/world.js';
import { sampleFrontierForageChunk } from '../src/world/frontierEcology.js';
import { sampleFrontierRegionalPlaceChunk } from '../src/world/frontierRegionalPlace.js';

const GRASS_MAX_XZ_NORM = .6678251760362262;

function grassInstances(group) {
  const grass = group?.getObjectByName('frontier_groundcover');
  if (!grass) return [];
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
  const scale = new THREE.Vector3(), rotation = new THREE.Quaternion();
  return Array.from({ length: grass.count }, (_, index) => {
    grass.getMatrixAt(index, matrix);
    matrix.decompose(position, rotation, scale);
    return { x: position.x + group.position.x, z: position.z + group.position.z, scale: scale.x };
  });
}

function fixture(world) {
  const calls = [];
  const physicsWorld = { updateTerrainSurfaces: batch => { calls.push(batch); } };
  const parent = new THREE.Group();
  return { runtime: createFrontierChunkRuntime({ parent, physicsWorld, world }), calls, parent };
}

test('regional terrain foliage stays bounded and dry while starter tint remains unchanged', () => {
  const { runtime } = fixture();
  runtime.update({ x: 0, z: -90 }, { activeSectionId: 'camp' });
  const starter = runtime.root.getObjectByName('frontier_chunk_0,-2').getObjectByName('frontier_groundcover');
  assert.ok(Array.from(starter.instanceColor.array).every(value => value === 1));
  const starterScales = grassInstances(runtime.root.getObjectByName('frontier_chunk_0,-2')).map(instance => instance.scale);
  assert.ok(starterScales.every(scale => scale >= .38 && scale <= .76), 'starter grass keeps its original scale range');
  runtime.update({ x: -640, z: -335 }, { activeSectionId: 'camp' });
  const sample = runtime.sample(-640, -335);
  assert.equal(sample.provinceKind, 'sunscar');
  assert.ok(sample.provinceInfluence > .99);
  let count = 0, meshes = 0;
  runtime.root.traverse(node => {
    if (node.name !== 'frontier_groundcover') return;
    count += node.count; meshes++;
    assert.ok(node.count <= 96);
    for (let i = 0; i < node.count; i++) assert.ok(node.instanceColor.getX(i) > node.instanceColor.getY(i), 'dry tint offsets the shared green base');
  });
  assert.equal(meshes, 25);
  assert.ok(count > 0 && count < 25 * 48, 'dry ground keeps broad open space at unchanged mesh cap');
  const inlandDry = runtime.root.children.flatMap(grassInstances).filter(instance => {
    const grassSample = runtime.sample(instance.x, instance.z);
    return grassSample.provinceInfluence > 0 && grassSample.coastDistance >= 40 && !isSkybreakArea(instance.x, instance.z, .45);
  });
  assert.ok(inlandDry.every(instance => instance.scale >= .59 && instance.scale <= 1.24), 'inland dry grass uses the readable regional range');
  assert.ok(inlandDry.some(instance => instance.scale > .76), 'inland dry grass can exceed the old maximum');
  runtime.dispose();
});

test('inland grass grows at native ecotone witnesses without crowding nearby forage or the Lush cache', () => {
  const { runtime } = fixture();
  runtime.update({ x: -99.904, z: 219.680 }, { activeSectionId: 'camp' });
  const mixed = grassInstances(runtime.root.getObjectByName('frontier_chunk_-2,4'));
  assert.equal(mixed.length, 30, 'the mixed ecotone keeps its deterministic selection count');
  assert.ok(mixed.every(instance => instance.scale >= .59 && instance.scale <= 1.24));
  assert.ok(mixed.some(instance => instance.scale > .76), 'the ecotone includes readable taller tufts');
  const reserveEdge = runtime.root.children.flatMap(grassInstances).filter(instance => {
    const sample = runtime.sample(instance.x, instance.z);
    return sample.provinceInfluence > 0 && sample.provinceInfluence < .1
      && sample.coastDistance >= 40 && !isSkybreakArea(instance.x, instance.z, .45);
  });
  assert.ok(reserveEdge.length > 0, 'the witness window crosses the regional influence boundary');
  assert.ok(reserveEdge.every(instance => instance.scale >= .377 && instance.scale <= .81), 'low influence blends gradually from the legacy scale');

  const forage = sampleFrontierForageChunk(-2, 4, { visualAssets: WORLD_DATA.visualAssets });
  const forageRadius = resource => ({ tree: 1.35, rock: .9, fiber: .55 })[resource.type] * resource.uniformScale;
  for (const grass of mixed) for (const resource of forage) {
    assert.ok(Math.hypot(grass.x - resource.pos.x, grass.z - resource.pos.z)
      >= GRASS_MAX_XZ_NORM * grass.scale + forageRadius(resource), 'mixed grass remains clear of forage footprints');
  }

  runtime.update({ x: -150, z: 345 }, { activeSectionId: 'camp' });
  const lush = grassInstances(runtime.root.getObjectByName('frontier_chunk_-3,6'));
  assert.equal(lush.length, 78, 'the Lush gap keeps its deterministic selection count');
  assert.ok(lush.every(instance => instance.scale >= .59 && instance.scale <= 1.24));
  assert.ok(lush.some(instance => instance.scale > 1.1), 'the Lush gap reaches the intended portrait-readable range');

  runtime.update({ x: 325, z: 100 }, { activeSectionId: 'camp' });
  const coastGrass = runtime.root.children.flatMap(grassInstances).filter(instance => runtime.sample(instance.x, instance.z).coastDistance < 40);
  assert.ok(coastGrass.length > 0, 'the shore witness contains retained grass');
  assert.ok(coastGrass.every(instance => instance.scale >= .38 && instance.scale <= .76), 'near-shore grass keeps its original scale range');

  const grove = sampleFrontierRegionalPlaceChunk(-5, 9, { visualAssets: WORLD_DATA.visualAssets });
  assert.equal(grove?.kind, 'lush-root-cache');
  runtime.update(grove.center, { activeSectionId: 'camp' });
  const groveGrass = runtime.root.children.flatMap(grassInstances);
  const chestRadius = .851 * grove.chest.scale;
  const stone = grove.scenery.find(part => part.assetId === 'asset_fen_stone');
  const stoneRadius = 1.14 * stone.scale;
  for (const grass of groveGrass) {
    assert.ok(Math.hypot(grass.x - grove.chest.x, grass.z - grove.chest.z)
      >= GRASS_MAX_XZ_NORM * grass.scale + chestRadius, 'grove grass remains clear of the cache footprint');
    assert.ok(Math.hypot(grass.x - stone.x, grass.z - stone.z)
      >= GRASS_MAX_XZ_NORM * grass.scale + stoneRadius, 'grove grass remains clear of the stone footprint');
  }
  runtime.dispose();
});

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

test('authoritative movement prepares one detached axis chunk per call and reuses all five at crossing', () => {
  const { runtime, calls } = fixture();
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp' });
  for (const x of [147, 148, 149, 150, 151]) runtime.update({ x, z: 120 }, { activeSectionId: 'camp', prepare: true });
  const before = runtime.getDebugState();
  assert.equal(before.preparedCount, 5);
  assert.equal(calls.length, 1, 'detached preparation creates no active collider');
  assert.equal(runtime.root.children.length, before.residentCount, 'detached preparation creates no published root');
  runtime.update({ x: 159, z: 120 }, { activeSectionId: 'camp', prepare: true });
  const addedChunkIds = calls[1].add.filter(surface => surface.vertices && !String(surface.id).includes(':')).map(surface => surface.id);
  assert.deepEqual(new Set(addedChunkIds), new Set(before.preparedIds));
  assert.equal(runtime.getDebugState().preparedCount, 0);
  assert.ok(runtime.getDebugState().residentCount <= 25);
  runtime.dispose();
});

test('diagonal anticipation is bounded to nine detached chunks and stationary cancellation releases them', () => {
  const { runtime, calls } = fixture();
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp' });
  for (let value = 146; value <= 155; value++) runtime.update({ x: value, z: value }, { activeSectionId: 'camp', prepare: true });
  assert.equal(runtime.getDebugState().preparedCount, 9);
  assert.equal(calls.length, 1);
  runtime.update({ x: 155, z: 155 }, { activeSectionId: 'camp', prepare: true });
  assert.equal(runtime.getDebugState().preparedCount, 0, 'stationary motion cancels detached anticipation');
  for (let value = 146; value <= 155; value++) runtime.update({ x: value, z: value }, { activeSectionId: 'camp', prepare: true });
  const preparedIds = runtime.getDebugState().preparedIds;
  assert.equal(preparedIds.length, 9);
  runtime.update({ x: 159, z: 159 }, { activeSectionId: 'camp', prepare: true });
  const addedChunkIds = calls[1].add.filter(surface => surface.vertices && !String(surface.id).includes(':')).map(surface => surface.id);
  assert.deepEqual(new Set(addedChunkIds), new Set(preparedIds));
  assert.ok(runtime.getDebugState().residentCount <= 25);
  runtime.dispose();
});

test('failed complete-window physics keeps the published residency and retries without leaked preparation', () => {
  const calls = [];
  let fail = false;
  const physicsWorld = { updateTerrainSurfaces(batch) { calls.push(batch); if (fail) throw new Error('physics-fixture'); } };
  const runtime = createFrontierChunkRuntime({ parent: new THREE.Group(), physicsWorld });
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp' });
  for (const x of [147, 148, 149, 150, 151]) runtime.update({ x, z: 120 }, { activeSectionId: 'camp', prepare: true });
  const snapshot = runtime.getResidency(), groups = [...runtime.root.children], state = runtime.getDebugState();
  fail = true;
  assert.throws(() => runtime.update({ x: 159, z: 120 }, { activeSectionId: 'camp', prepare: true }), /physics-fixture/);
  assert.strictEqual(runtime.getResidency(), snapshot);
  assert.deepEqual(runtime.root.children, groups);
  assert.deepEqual(runtime.getDebugState().center, state.center);
  assert.deepEqual(runtime.getDebugState().residentIds, state.residentIds);
  assert.equal(runtime.getDebugState().preparedCount, 0);
  fail = false;
  runtime.update({ x: 159, z: 120 }, { activeSectionId: 'camp', prepare: true });
  assert.deepEqual(runtime.getDebugState().center, { cx: 3, cz: 2 });
  assert.notStrictEqual(runtime.getResidency(), snapshot);
  assert.ok(runtime.getDebugState().residentCount <= 25);
  runtime.dispose();
});

test('partial incoming geometry construction disposes every candidate and preserves the published window for retry', () => {
  const { runtime, calls } = fixture();
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp' });
  const snapshot = runtime.getResidency(), groups = [...runtime.root.children], state = runtime.getDebugState();
  const originalSetIndex = THREE.BufferGeometry.prototype.setIndex;
  const originalDispose = THREE.BufferGeometry.prototype.dispose;
  const incoming = new Set();
  let incomingCount = 0, disposedIncoming = 0;
  THREE.BufferGeometry.prototype.setIndex = function(index) {
    if (!incoming.has(this) && (this.getAttribute('position')?.count ?? 0) > 600) {
      incoming.add(this);
      incomingCount++;
      if (incomingCount === 3) throw new Error('geometry-fixture');
    }
    return originalSetIndex.call(this, index);
  };
  THREE.BufferGeometry.prototype.dispose = function() {
    if (incoming.has(this)) disposedIncoming++;
    return originalDispose.call(this);
  };
  try {
    assert.throws(() => runtime.update({ x: 159, z: 120 }, { activeSectionId: 'camp' }), /geometry-fixture/);
  } finally {
    THREE.BufferGeometry.prototype.setIndex = originalSetIndex;
    THREE.BufferGeometry.prototype.dispose = originalDispose;
  }
  assert.equal(incomingCount, 3);
  assert.equal(disposedIncoming, 3, 'the failed chunk and both earlier candidates release their owned geometry');
  assert.equal(calls.length, 1, 'an incomplete wanted set never reaches physics');
  assert.strictEqual(runtime.getResidency(), snapshot);
  assert.deepEqual(runtime.root.children, groups);
  assert.deepEqual(runtime.getDebugState().center, state.center);
  assert.deepEqual(runtime.getDebugState().residentIds, state.residentIds);
  runtime.update({ x: 159, z: 120 }, { activeSectionId: 'camp' });
  assert.deepEqual(runtime.getDebugState().center, { cx: 3, cz: 2 });
  assert.equal(calls.length, 2);
  runtime.dispose();
});

test('negative-edge preparation clears on reversal and reuses five detached chunks on westward crossing', () => {
  const { runtime, calls } = fixture();
  runtime.update({ x: 120, z: 170 }, { activeSectionId: 'camp' });
  for (const x of [103, 102, 101, 100, 99]) runtime.update({ x, z: 170 }, { activeSectionId: 'camp', prepare: true });
  assert.equal(runtime.getDebugState().preparedCount, 5);
  const originalDispose = THREE.BufferGeometry.prototype.dispose;
  let disposals = 0;
  THREE.BufferGeometry.prototype.dispose = function() { disposals++; return originalDispose.call(this); };
  try {
    runtime.update({ x: 100, z: 170 }, { activeSectionId: 'camp', prepare: true });
  } finally {
    THREE.BufferGeometry.prototype.dispose = originalDispose;
  }
  assert.equal(runtime.getDebugState().preparedCount, 0);
  assert.equal(disposals, 5, 'reversing away from the edge releases all detached chunk geometries');
  for (const x of [103, 102, 101, 100, 99, 98]) runtime.update({ x, z: 170 }, { activeSectionId: 'camp', prepare: true });
  const preparedIds = runtime.getDebugState().preparedIds;
  assert.equal(preparedIds.length, 5);
  assert.equal(calls.length, 1, 'negative-edge preparation remains detached from physics');
  runtime.update({ x: 91, z: 170 }, { activeSectionId: 'camp', prepare: true });
  const addedChunkIds = calls[1].add.filter(surface => surface.vertices && !String(surface.id).includes(':')).map(surface => surface.id);
  assert.deepEqual(new Set(addedChunkIds), new Set(preparedIds));
  assert.deepEqual(runtime.getDebugState().center, { cx: 1, cz: 3 });
  assert.ok(runtime.getDebugState().residentCount <= 25);
  runtime.dispose();
});

test('inactive and Author states retire residents in one batch and hide the root', () => {
  const { runtime, calls } = fixture();
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp' });
  runtime.update({ x: 147, z: 120 }, { activeSectionId: 'camp', prepare: true });
  assert.equal(runtime.getDebugState().preparedCount, 1);
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'field' });
  assert.equal(runtime.getDebugState().residentCount, 0);
  assert.equal(runtime.getDebugState().preparedCount, 0);
  assert.equal(runtime.root.visible, false);
  assert.equal(calls[1].remove.length, 24);
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp', authorMode: true });
  assert.equal(calls.length, 2);
  runtime.dispose();
});

test('height query exactly delegates to the shared frontier height sampler', () => {
  const { runtime } = fixture();
  assert.equal(runtime.heightMatchesSample, true);
  assert.deepEqual(Object.getOwnPropertyDescriptor(runtime, 'heightMatchesSample'), {
    value: true, writable: false, enumerable: true, configurable: false,
  });
  for (const [x, z] of [[-125, 24], [87.5, -73]]) {
    assert.equal(runtime.getHeight(x, z), sampleFrontierHeight(x, z));
    assert.equal(runtime.getHeight(x, z), sampleFrontier(x, z).height);
  }
  assert.equal(FRONTIER_TERRAIN_CONFIG.chunkSize, 50);
  runtime.dispose();
});

test('runtime exposes one immutable descriptor and seeds terrain plus built-in foliage', () => {
  const alternate = normalizeFrontierWorld({ edition: 1, seed: 0x13572468 });
  const defaults = fixture(DEFAULT_FRONTIER_WORLD).runtime;
  const repeat = fixture(DEFAULT_FRONTIER_WORLD).runtime;
  const changed = fixture(alternate).runtime;
  for (const runtime of [defaults, repeat, changed]) runtime.update({ x: 120, z: -175 }, { activeSectionId: 'camp' });
  assert.strictEqual(defaults.getWorldDescriptor(), DEFAULT_FRONTIER_WORLD);
  assert.deepEqual(changed.getWorldDescriptor(), alternate);
  assert.equal(Object.isFrozen(changed.getWorldDescriptor()), true);
  assert.equal(defaults.getHeight(112, -184), repeat.getHeight(112, -184));
  assert.notEqual(defaults.getHeight(112, -184), changed.getHeight(112, -184));
  const matrices = runtime => Array.from(runtime.root.getObjectByName('frontier_chunk_2,-4').getObjectByName('frontier_groundcover').instanceMatrix.array);
  assert.deepEqual(matrices(defaults), matrices(repeat));
  assert.notDeepEqual(matrices(defaults), matrices(changed));
  for (const runtime of [defaults, repeat, changed]) runtime.dispose();
});

test('Camp query preserves the authored negative surface height', () => {
  const campSurface = { water: [{ x: 0, z: 0, rx: 20, rz: 20, depth: .7 }] };
  const runtime = createFrontierChunkRuntime({ parent: new THREE.Group(), campSurface });
  assert.equal(runtime.getHeight(0, 0), getSurfaceHeight(campSurface, 0, 0));
  assert.equal(runtime.getHeight(0, 0), -.7);
  const alternate = createFrontierChunkRuntime({ parent: new THREE.Group(), campSurface,
    world: normalizeFrontierWorld({ edition: 1, seed: 0x13572468 }) });
  assert.equal(alternate.getHeight(0, 0), -.7);
  alternate.dispose();
  runtime.dispose();
});

test('disposal releases residents, root and shared visual resources once', () => {
  const { runtime, calls, parent } = fixture();
  runtime.update({ x: 120, z: 120 }, { activeSectionId: 'camp' });
  runtime.update({ x: 147, z: 120 }, { activeSectionId: 'camp', prepare: true });
  assert.equal(runtime.getDebugState().preparedCount, 1);
  runtime.dispose(); runtime.dispose();
  assert.equal(runtime.getDebugState().residentCount, 0);
  assert.equal(runtime.getDebugState().preparedCount, 0);
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

test('Skybreak terrain grass keeps its old scale, complete footprint support, and limited shadow casters', () => {
  const { runtime } = fixture();
  runtime.update({ x: 10, z: -200 }, { activeSectionId: 'camp' });
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion();
  let checked = 0, culledChunks = 0, shadowChunks = 0;
  for (const group of runtime.root.children) {
    const ground = group.getObjectByName('frontier_ground');
    if (ground?.castShadow) shadowChunks++;
    const grass = group.getObjectByName('frontier_groundcover');
    if (!grass) continue;
    if (grass.count < 96) culledChunks++;
    for (let index = 0; index < grass.count; index++) {
      grass.getMatrixAt(index, matrix); point.setFromMatrixPosition(matrix).add(group.position);
      if (!isSkybreakArea(point.x, point.z, .45)) continue;
      checked++;
      matrix.decompose(point, rotation, scale); point.add(group.position);
      assert.ok(scale.x >= .38 && scale.x <= .76, 'Skybreak keeps its original grass range');
      const center = runtime.getHeight(point.x, point.z);
      assert.ok(Math.abs(center - point.y) < .0001, 'visible grass rests on shared terrain');
      for (let direction = 0; direction < 8; direction++) {
        const angle = direction * Math.PI / 4;
        const edge = runtime.getHeight(point.x + Math.cos(angle) * .45, point.z + Math.sin(angle) * .45);
        assert.ok(Math.abs(edge - center) <= .45 * .65 + .0001, 'visible grass does not cross a cliff lip');
      }
    }
  }
  assert.ok(checked > 0, 'useful supported grass remains in the region');
  const shelfGrass = grassInstances(runtime.root.getObjectByName('frontier_chunk_0,-3'));
  const shelfFronds = shelfGrass.filter(instance => [[28.5,-125],[30,-125],[35.5,-125],[38.5,-125],[41,-125],
    [27,-121.8],[29,-121.8],[37,-121.8],[40.5,-121.8],[28,-135],[40.5,-138],[28,-143],[38,-143]]
    .some(([x, z]) => Math.hypot(instance.x - x, instance.z - z) < .001));
  assert.ok(shelfFronds.length > 0, 'authored shelf fronds remain present');
  assert.ok(shelfFronds.every(instance => instance.scale >= 1.12 && instance.scale <= 1.5), 'authored shelf fronds retain their original scale range');
  assert.ok(culledChunks > 0, 'unsupported grass was actually removed');
  assert.equal(shadowChunks, 4, 'only the four tall-landform chunks cast terrain shadows');
  runtime.dispose();
});
