import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFrontierDiscoveryRuntime, createFrontierDiscoveryVisual } from '../src/world/frontierDiscoveryRuntime.js';

const discovery = Object.freeze({ id: 'f1:d:3:1:0', chunkId: '3,1' });
const residency = (...ids) => Object.freeze({ center: ids.length ? { cx: 3, cz: 1 } : null, chunks: ids.map(id => ({ id })) });

test('discovery box surfaces are grounded, coherently indexed, and rotate collision offsets with their visual', () => {
  const part = { id: 'part', shape: 'box', color: '#fff', position: { x: 0, y: .5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
  const assets = [
    { id: 'receiver', parts: [part], collision: { shape: 'box', size: { w: 4, h: 2, d: 2 }, offset: { x: 1, y: 1, z: .5 } } },
    { id: 'chest', parts: [part], collision: { shape: 'box', size: { w: 2, h: 1, d: 1 }, offset: { x: .25, y: .5, z: .5 } } },
  ];
  const visual = createFrontierDiscoveryVisual({ visualAssets: assets, discovery: {
    id: 'cache', receiverAssetId: 'receiver', visualAssetId: 'chest', rotY: Math.PI / 2,
    landmarkPos: { x: 10, y: 3, z: 20 }, pos: { x: 13, y: 4, z: 22 },
  } });
  const receiver = visual.terrainSurfaces[0], chest = visual.terrainSurfaces[1];
  assert.equal(receiver.vertices.length, 24); assert.equal(receiver.indices.length, 36);
  assert.equal(Math.max(...receiver.indices), 7);
  assert.equal(Math.min(...receiver.vertices.filter((_value, index) => index % 3 === 1)), 3);
  const chestXs = chest.vertices.filter((_value, index) => index % 3 === 0);
  const chestZs = chest.vertices.filter((_value, index) => index % 3 === 2);
  assert.ok(Math.abs(chestXs.reduce((sum, value) => sum + value, 0) / 8 - 13.5) < 1e-6);
  assert.ok(Math.abs(chestZs.reduce((sum, value) => sum + value, 0) / 8 - 21.75) < 1e-6);
  assert.equal(visual.receiverRoot.rotation.y, Math.PI / 2);
  assert.equal(visual.chestRoot.rotation.y, Math.PI / 2);
  assert.deepEqual(visual.chestRoot.scale.toArray(), [1, 1, 1], 'Signal/default chest keeps canonical visual scale');
  visual.dispose(); visual.dispose();
});

test('grove chest scale shrinks visual, collision dimensions, and rotated collision offset together', () => {
  const part = { id: 'part', shape: 'box', color: '#fff', position: { x: 0, y: .5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
  const visual = createFrontierDiscoveryVisual({
    visualAssets: [{ id: 'chest', parts: [part], collision: {
      shape: 'box', size: { w: 2, h: 1, d: 1 }, offset: { x: .25, y: .5, z: .5 },
    } }],
    discovery: { id: 'grove', visualAssetId: 'chest', uniformScale: .7, rotY: Math.PI / 2, pos: { x: 13, y: 4, z: 22 } },
  });
  const surface = visual.terrainSurfaces[0];
  const xs = surface.vertices.filter((_value, index) => index % 3 === 0);
  const ys = surface.vertices.filter((_value, index) => index % 3 === 1);
  const zs = surface.vertices.filter((_value, index) => index % 3 === 2);
  const span = values => Math.max(...values) - Math.min(...values);
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  assert.deepEqual(visual.chestRoot.scale.toArray(), [.7, .7, .7]);
  assert.ok(Math.abs(span(xs) - .7) < 1e-6, 'rotated depth scales to world X');
  assert.ok(Math.abs(span(ys) - .7) < 1e-6, 'height scales with the visual');
  assert.ok(Math.abs(span(zs) - 1.4) < 1e-6, 'rotated width scales to world Z');
  assert.ok(Math.abs(mean(xs) - 13.35) < 1e-6, 'scaled local Z offset rotates into world X');
  assert.ok(Math.abs(mean(ys) - 4.35) < 1e-6, 'scaled vertical offset matches scaled height');
  assert.ok(Math.abs(mean(zs) - 21.825) < 1e-6, 'scaled local X offset rotates into world Z');
  visual.dispose();
});

test('discovery visual fails clear for invalid per-instance chest scale', () => {
  const asset = { id: 'chest', parts: [], collision: { shape: 'box', size: { w: 1, h: 1, d: 1 } } };
  for (const uniformScale of [0, -1, Infinity, NaN]) {
    assert.throws(() => createFrontierDiscoveryVisual({
      visualAssets: [asset], discovery: { id: 'grove', visualAssetId: 'chest', uniformScale, pos: { x: 0, y: 0, z: 0 } },
    }), /uniformScale must be positive/);
  }
});

test('generated grove discovery can stream as a chest-only visual with one grounded collider', () => {
  const part = { id: 'part', shape: 'box', color: '#fff', position: { x: 0, y: .5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
  const visual = createFrontierDiscoveryVisual({
    visualAssets: [{ id: 'chest', parts: [part], collision: { shape: 'box', size: { w: 2, h: 1, d: 1 } } }],
    discovery: { id: 'f1:d:-5:9:lush-root-cache', visualAssetId: 'chest', pos: { x: -222.6, y: 11.44, z: 479.5 }, rotY: .4 },
  });
  assert.equal(visual.receiverRoot, null);
  assert.equal(visual.group.position.x, -222.6);
  assert.equal(visual.chestRoot.position.length(), 0);
  assert.deepEqual(visual.terrainSurfaces.map(surface => surface.id), ['f1:d:-5:9:lush-root-cache:chest']);
  visual.dispose();
});

test('discovery follows terrain residency with one visual, two colliders, and explicit mechanism lifecycle', () => {
  let snapshot = residency(), created = 0, disposed = 0, invalidations = 0;
  const parent = new THREE.Group(), batches = [], residentIds = [], registered = [], removed = [], occluders = new Set();
  const chestRoot = new THREE.Group(), receiverRoot = new THREE.Group();
  const runtime = createFrontierDiscoveryRuntime({
    parent, discoveries: [discovery], terrainRuntime: { getResidency: () => snapshot },
    lootRegistry: { setResidentDiscoveryIds: ids => residentIds.push([...ids]) },
    physicsWorld: { updateTerrainSurfaces: batch => batches.push(batch) },
    registerLootMechanism: (source, root) => registered.push([source.id, root]),
    unregisterLootMechanism: (id, root) => removed.push([id, root]),
    onVisualAdded: root => occluders.add(root), onVisualRemoving: root => occluders.delete(root),
    onGeometryChanged: () => invalidations++,
    createVisual() {
      created++;
      return { group: new THREE.Group(), chestRoot, receiverRoot,
        terrainSurfaces: [{ id: 'receiver' }, { id: 'chest' }], dispose() { disposed++; } };
    },
  });
  runtime.update();
  assert.equal(created, 0);
  snapshot = residency('3,1'); runtime.update();
  assert.equal(created, 1); assert.equal(parent.children.length, 1);
  assert.deepEqual(batches.at(-1).add.map(item => item.id), ['receiver', 'chest']);
  assert.deepEqual(residentIds.at(-1), [discovery.id]);
  assert.deepEqual(registered, [[discovery.id, chestRoot]]);
  assert.equal(occluders.has(receiverRoot), true);
  assert.equal(runtime.getVisualRoot(discovery.id), chestRoot);
  for (let i = 0; i < 20; i++) runtime.update();
  assert.equal(created, 1, 'unchanged residency does no visual or scene traversal work');
  snapshot = residency(); runtime.update();
  assert.deepEqual(removed, [[discovery.id, chestRoot]]);
  assert.deepEqual(batches.at(-1).remove, ['receiver', 'chest']);
  assert.deepEqual(residentIds.at(-1), []);
  assert.equal(parent.children.length, 0); assert.equal(disposed, 1); assert.equal(occluders.size, 0);
  assert.equal(invalidations, 2);
  runtime.dispose(); runtime.dispose(); runtime.update();
});

test('failed resident construction leaves the prior registry and scene state empty for retry', () => {
  let snapshot = residency('3,1'), attempts = 0;
  const residentIds = [], runtime = createFrontierDiscoveryRuntime({
    discoveries: [discovery], terrainRuntime: { getResidency: () => snapshot },
    lootRegistry: { setResidentDiscoveryIds: ids => residentIds.push(ids) },
    createVisual() { attempts++; if (attempts === 1) throw new Error('fixture'); return { group: new THREE.Group(), chestRoot: new THREE.Group(), receiverRoot: new THREE.Group(), terrainSurfaces: [], dispose() {} }; },
  });
  assert.throws(() => runtime.update(), /fixture/);
  assert.deepEqual(residentIds, []);
  runtime.update();
  assert.equal(runtime.getDebugState().residentId, discovery.id);
  runtime.dispose();
});

test('failed replacement physics disposes the candidate, keeps the resident visual, and retries the snapshot', () => {
  const nextDiscovery = Object.freeze({ id: 'f1:d:4:1:0', chunkId: '4,1' });
  let snapshot = residency('3,1'), failPhysics = false, attempts = 0;
  const parent = new THREE.Group(), disposed = [], registrations = [], removals = [];
  const physicsWorld = { updateTerrainSurfaces() { if (failPhysics) throw new Error('physics-fixture'); } };
  const runtime = createFrontierDiscoveryRuntime({
    parent, discoveries: [discovery, nextDiscovery], terrainRuntime: { getResidency: () => snapshot }, physicsWorld,
    lootRegistry: { setResidentDiscoveryIds() {} },
    registerLootMechanism: source => registrations.push(source.id),
    unregisterLootMechanism: id => removals.push(id),
    createVisual({ discovery: source }) {
      attempts++;
      const group = new THREE.Group();
      return { group, chestRoot: new THREE.Group(), receiverRoot: new THREE.Group(),
        terrainSurfaces: [{ id: `${source.id}:surface` }], dispose() { disposed.push(group); } };
    },
  });
  runtime.update();
  const oldGroup = parent.children[0];
  snapshot = Object.freeze({ center: { cx: 4, cz: 1 }, chunks: [{ id: '4,1' }] });
  failPhysics = true;
  assert.throws(() => runtime.update(), /physics-fixture/);
  assert.deepEqual(parent.children, [oldGroup]);
  assert.equal(runtime.getDebugState().residentId, discovery.id);
  assert.deepEqual(registrations, [discovery.id]);
  assert.deepEqual(removals, []);
  assert.equal(disposed.length, 1);
  assert.notEqual(disposed[0], oldGroup, 'only the rejected candidate is disposed');

  failPhysics = false;
  runtime.update();
  assert.equal(attempts, 3, 'the unchanged snapshot retries after physics failure');
  assert.equal(runtime.getDebugState().residentId, nextDiscovery.id);
  assert.notEqual(parent.children[0], oldGroup);
  assert.deepEqual(registrations, [discovery.id, nextDiscovery.id]);
  assert.deepEqual(removals, [discovery.id]);
  assert.equal(disposed.filter(group => group === oldGroup).length, 1);
  runtime.dispose();
});

test('all definitions in resident chunks coexist and reconcile by bounded chunk-index diffs', () => {
  const second = Object.freeze({ id: 'f1:d:-5:9:lush-root-cache', chunkId: '-5,9' });
  const third = Object.freeze({ id: 'f1:d:-4:9:lush-root-cache', chunkId: '-4,9' });
  let snapshot = residency('3,1', '-5,9');
  const parent = new THREE.Group(), batches = [], residentIds = [], registered = [], removed = [], disposed = [];
  const runtime = createFrontierDiscoveryRuntime({
    parent, discoveries: [discovery, second, third], terrainRuntime: { getResidency: () => snapshot },
    lootRegistry: { setResidentDiscoveryIds: ids => residentIds.push([...ids]) },
    physicsWorld: { updateTerrainSurfaces: batch => batches.push(batch) },
    registerLootMechanism: source => registered.push(source.id),
    unregisterLootMechanism: id => removed.push(id),
    createVisual({ discovery: source }) {
      return { group: new THREE.Group(), chestRoot: new THREE.Group(), receiverRoot: null,
        terrainSurfaces: [{ id: `${source.id}:chest` }], dispose() { disposed.push(source.id); } };
    },
  });
  runtime.update();
  assert.deepEqual(runtime.getDebugState(), { residentId: discovery.id, residentIds: [discovery.id, second.id], colliderCount: 2 });
  assert.deepEqual(residentIds.at(-1), [discovery.id, second.id]);
  assert.deepEqual(registered, [discovery.id, second.id]);
  assert.equal(parent.children.length, 2);

  snapshot = residency('-5,9', '-4,9'); runtime.update();
  assert.deepEqual(batches.at(-1).remove, [`${discovery.id}:chest`]);
  assert.deepEqual(batches.at(-1).add.map(surface => surface.id), [`${third.id}:chest`]);
  assert.deepEqual(runtime.getDebugState().residentIds, [second.id, third.id]);
  assert.deepEqual(removed, [discovery.id]);
  assert.deepEqual(disposed, [discovery.id]);
  assert.equal(runtime.getVisualRoot(second.id) !== null, true, 'overlapping resident remains installed');
  assert.equal(parent.children.length, 2);

  snapshot = residency(); runtime.update();
  assert.deepEqual(residentIds.at(-1), []);
  assert.deepEqual(removed, [discovery.id, second.id, third.id]);
  assert.deepEqual(runtime.getDebugState().residentIds, []);
  runtime.dispose();
});

test('duplicate definitions fail before residency and partial staged construction is disposed for retry', () => {
  assert.throws(() => createFrontierDiscoveryRuntime({ discoveries: [discovery, discovery] }), /duplicate frontier discovery/);
  const second = Object.freeze({ id: 'f1:d:-5:9:lush-root-cache', chunkId: '-5,9' });
  let fail = true, firstDisposals = 0;
  const runtime = createFrontierDiscoveryRuntime({
    discoveries: [discovery, second], terrainRuntime: { getResidency: () => residency('3,1', '-5,9') },
    createVisual({ discovery: source }) {
      if (source.id === second.id && fail) { fail = false; throw new Error('second-fixture'); }
      return { group: new THREE.Group(), chestRoot: new THREE.Group(), receiverRoot: null, terrainSurfaces: [],
        dispose() { if (source.id === discovery.id) firstDisposals++; } };
    },
  });
  assert.throws(() => runtime.update(), /second-fixture/);
  assert.equal(firstDisposals, 1);
  assert.deepEqual(runtime.getDebugState().residentIds, []);
  runtime.update();
  assert.deepEqual(runtime.getDebugState().residentIds, [discovery.id, second.id]);
  runtime.dispose();
});
