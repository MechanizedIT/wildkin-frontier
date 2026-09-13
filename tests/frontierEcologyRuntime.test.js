import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createResourceSystem } from '../src/resources/resourceSystem.js';
import { createFrontierEcologyRuntime } from '../src/world/frontierEcologyRuntime.js';

await RAPIER.init();
test('ecology runtime follows terrain residency without duplicate churn and retires residents', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const resources = createResourceSystem(new THREE.Scene(), { world, RAPIER }, []);
  let snapshot = { center: { cx: 2, cz: 2 }, chunks: [{ id: '2,2', cx: 2, cz: 2, origin: { x: 100, z: 100 } }] };
  const terrainRuntime = { getResidency: () => snapshot, getHeight: () => 1 };
  const runtime = createFrontierEcologyRuntime({ terrainRuntime, resourceSystem: resources });
  try {
    runtime.update();
    const count = resources.nodes.length;
    assert.ok(count >= 6 && count <= 8);
    runtime.update(); assert.equal(resources.nodes.length, count);
    snapshot = { center: { cx: 3, cz: 2 }, chunks: [{ id: '3,2', cx: 3, cz: 2, origin: { x: 150, z: 100 } }] };
    runtime.update();
    assert.ok(resources.nodes.every(node => node.chunkId === '3,2'));
    snapshot = { center: null, chunks: [] }; runtime.update();
    assert.equal(resources.nodes.length, 0);
    runtime.dispose();
  } finally { world.free(); }
});

test('a five-by-five terrain snapshot admits only the center three-by-three forage window', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const resources = createResourceSystem(new THREE.Scene(), { world, RAPIER }, []);
  const chunks = [];
  for (let cz = 0; cz < 5; cz++) for (let cx = 0; cx < 5; cx++) chunks.push({ id: `${cx},${cz}`, cx, cz, origin: { x: cx * 50, z: cz * 50 } });
  const snapshot = Object.freeze({ center: Object.freeze({ cx: 2, cz: 2 }), chunks: Object.freeze(chunks) });
  const runtime = createFrontierEcologyRuntime({ terrainRuntime: { getResidency: () => snapshot, getHeight: () => 1 }, resourceSystem: resources });
  try {
    runtime.update();
    assert.equal(runtime.getDebugState().residentChunkCount, 9);
    assert.ok(resources.nodes.length <= 72);
    assert.ok(resources.nodes.every(node => Math.abs(Number(node.chunkId.split(',')[0]) - 2) <= 1 && Math.abs(Number(node.chunkId.split(',')[1]) - 2) <= 1));
  } finally { runtime.dispose(); world.free(); }
});

test('harvestable berry recipes retain their asset type, drop, and chunk count', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const resources = createResourceSystem(new THREE.Scene(), { world, RAPIER }, []);
  const berry = { id: 'asset_berry_bush', displayName: 'Berry Bush', parts: [{ id: 'leaf', shape: 'sphere', color: '#558844', position: { x: 0, y: .4, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }], gameplay: { role: 'harvestable', harvestable: { dropId: 'berries', maxChunks: 4, respawnSeconds: 12, feedbackProfile: 'fiber' } } };
  const snapshot = { center: { cx: 3, cz: 2 }, chunks: [{ id: '3,2', cx: 3, cz: 2, origin: { x: 150, z: 100 } }] };
  const terrainRuntime = {
    getResidency: () => snapshot,
    getHeight: () => 1,
    sample: () => ({ height: 1, habitatBlend: { wetland: 1, fernUpland: 0 }, provinceInfluence: 0 }),
  };
  const runtime = createFrontierEcologyRuntime({ terrainRuntime, resourceSystem: resources, visualAssets: [berry] });
  try {
    runtime.update();
    const node = resources.nodes.find(candidate => candidate.type.resourceId === 'berries');
    assert.ok(node);
    assert.equal(node.type.maxChunks, 4);
    assert.equal(node.type.id, 'asset:asset_berry_bush');
  } finally { runtime.dispose(); world.free(); }
});

test('regional straw tint reaches the generic fiber instance materials', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const resources = createResourceSystem(new THREE.Scene(), { world, RAPIER }, []);
  const snapshot = { center: { cx: 4, cz: -5 }, chunks: [{ id: '4,-5', cx: 4, cz: -5, origin: { x: 200, z: -250 } }] };
  const terrainRuntime = {
    getResidency: () => snapshot,
    getHeight: () => 1,
    sample: () => ({
      height: 1,
      habitatBlend: { wetland: 0, fernUpland: 1 },
      surfaceKind: null,
      provinceInfluence: 1,
      provinceWeights: { lush: 0, sunscar: 1, ironspine: 0 },
    }),
  };
  const runtime = createFrontierEcologyRuntime({ terrainRuntime, resourceSystem: resources });
  try {
    runtime.update();
    const fiber = resources.nodes.find(node => node.state.typeId === 'fiber');
    assert.ok(fiber);
    assert.ok(fiber.feedbackMaterials.length > 0);
    assert.ok(fiber.feedbackMaterials.every(({ material }) => material.color.getHexString() === 'b89545'));
  } finally { runtime.dispose(); world.free(); }
});

test('real Rapier generated forage restores a committed harvest after resident unload and revisit', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const saved = new Map();
  const resources = createResourceSystem(new THREE.Scene(), { world, RAPIER }, [], {
    readPersistentResource: id => saved.get(id),
    commitPersistentResource: (id, remaining) => { saved.set(id, remaining); return { ok: true }; },
  });
  let snapshot = { center: { cx: 3, cz: 2 }, chunks: [{ id: '3,2', cx: 3, cz: 2, origin: { x: 150, z: 100 } }] };
  const runtime = createFrontierEcologyRuntime({ terrainRuntime: { getResidency: () => snapshot, getHeight: () => 1 }, resourceSystem: resources });
  try {
    runtime.update();
    const node = resources.nodes[0], remaining = node.state.remainingChunks - 1;
    assert.equal(resources.applyHit(node), true);
    assert.equal(saved.get(node.id), remaining);
    snapshot = { center: null, chunks: [] }; runtime.update();
    snapshot = { center: { cx: 3, cz: 2 }, chunks: [{ id: '3,2', cx: 3, cz: 2, origin: { x: 150, z: 100 } }] }; runtime.update();
    assert.equal(resources.nodes.find(candidate => candidate.id === node.id).state.remainingChunks, remaining);
  } finally { runtime.dispose(); world.free(); }
});
