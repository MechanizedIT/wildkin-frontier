import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createResourceSystem } from '../src/resources/resourceSystem.js';

await RAPIER.init();

function physics() {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  return { world, RAPIER };
}
function forage(chunkId = '0:0', index = 0, type = 'tree') {
  return { type, chunkId, placementIndex: index, persistentFinite: true, pos: { x: index * 3, y: 0, z: 0 } };
}

test('generated forage harvests, unloads, and reloads with its stable saved identity', () => {
  const saved = new Map();
  const p = physics();
  const owner = createResourceSystem(new THREE.Scene(), p, [], {
    readPersistentResource: id => saved.get(id),
    commitPersistentResource: (id, remaining) => { saved.set(id, remaining); return { ok: true }; },
  });
  try {
    const [node] = owner.addPlacements([forage()]);
    assert.equal(node.id, 'f1:r:0:0:0');
    assert.equal(owner.applyHit(node), true);
    assert.equal(saved.get(node.id), node.type.maxChunks - 1);
    owner.removePlacementsByChunk('0:0');
    assert.equal(owner.nodes.length, 0);
    assert.equal(p.world.colliders.len(), 0);
    const [restored] = owner.addPlacements([forage()]);
    assert.equal(restored.id, node.id);
    assert.equal(restored.state.remainingChunks, node.type.maxChunks - 1);
    assert.equal(restored.state.nodeState, 'READY');
    assert.equal(restored.chunkMeshes.filter(mesh => mesh.visible).length, node.chunkMeshes.length - 1);
    assert.equal(p.world.colliders.len(), 1);
  } finally { p.world.free(); }
});

test('generated add ignores same resident ID and restores saved depletion as a dormant remnant', () => {
  const saved = new Map([['f1:r:1:2:3', 0]]);
  const p = physics();
  const owner = createResourceSystem(new THREE.Scene(), p, [], { readPersistentResource: id => saved.get(id) });
  try {
    const placement = forage('1:2', 3);
    const first = owner.addPlacements([placement]);
    assert.equal(first.length, 1);
    assert.equal(owner.addPlacements([placement]).length, 0);
    const node = first[0];
    assert.equal(node.id, 'f1:r:1:2:3');
    assert.equal(node.state.remainingChunks, 0);
    assert.equal(node.state.nodeState, 'RESPAWNING');
    assert.equal(node.visualRoot.visible, false);
    assert.equal(node.remnantMesh.visible, true);
    assert.equal(node.collider, null);
    owner.update(1000, { x: 30, y: .5, z: 30 }, 'IDLE');
    owner.resetDepleted();
    assert.equal(node.state.remainingChunks, 0);
    assert.equal(node.remnantMesh.visible, true);
  } finally { p.world.free(); }
});

test('failed persistent forage write has no yield or visible state change', () => {
  const p = physics();
  let yields = 0, particles = 0;
  const owner = createResourceSystem(new THREE.Scene(), p, [], {
    commitPersistentResource: () => ({ ok: false, reason: 'quota' }),
  });
  try {
    const [node] = owner.addPlacements([forage()]);
    const before = node.state.remainingChunks;
    assert.equal(owner.applyHit(node, () => yields++, () => particles++), false);
    assert.equal(node.state.remainingChunks, before);
    assert.equal(node.state.nodeState, 'READY');
    assert.equal(yields, 0);
    assert.equal(particles, 0);
  } finally { p.world.free(); }
});

test('chunk cycles keep resident count bounded and leave authored resource reset behavior unchanged', () => {
  const p = physics();
  const owner = createResourceSystem(new THREE.Scene(), p, [{ id: 'authored', type: 'tree', pos: { x: 20, y: 0, z: 0 } }]);
  try {
    const authored = owner.nodes[0];
    while (authored.state.remainingChunks) assert.equal(owner.applyHit(authored), true);
    owner.resetDepleted();
    assert.equal(authored.state.nodeState, 'READY');
    const originalStep = p.world.step.bind(p.world);
    let steps = 0;
    p.world.step = (...args) => { steps++; return originalStep(...args); };
    for (let cycle = 0; cycle < 6; cycle++) {
      const chunkId = `${cycle}:0`;
      owner.addPlacements([forage(chunkId, 0), forage(chunkId, 1, 'fiber')]);
      assert.equal(steps, cycle * 2 + 1, 'each add batch refreshes Rapier once');
      assert.equal(owner.nodes.length, 3);
      owner.removePlacementsByChunk(chunkId);
      assert.equal(steps, cycle * 2 + 2, 'each removal batch refreshes Rapier once');
      assert.equal(owner.nodes.length, 1);
      assert.equal(owner.nodes[0], authored);
    }
  } finally { p.world.free(); }
});
