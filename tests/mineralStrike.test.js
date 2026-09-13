import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createMineralStrike, selectMineralStrikeTargets } from '../src/resources/mineralStrike.js';
import { createResourceSystem } from '../src/resources/resourceSystem.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';

await RAPIER.init();

function node(id, resourceId, position, remainingChunks = 4, patch = {}) {
  return {
    id,
    type: { resourceId },
    state: { nodeState: 'READY', remainingChunks, position: { ...position } },
    ...patch,
  };
}

test('selection uses 3D range, active mineral state, distance, and lexical stable-ID ties', () => {
  const pos = { x: 0, y: 1, z: 0 };
  const nodes = [
    node('tie-b', 'iron_ore', { x: 2, y: 1, z: 0 }),
    node('tie-a', 'stone', { x: -2, y: 1, z: 0 }),
    node('nearest', 'crystal_shard', { x: 0, y: 1.5, z: 0 }),
    node('fourth', 'stone', { x: 0, y: 1, z: 3 }),
    node('too-high', 'stone', { x: 0, y: 6, z: 0 }),
    node('wood', 'wood', { x: 0, y: 1, z: 0 }),
    node('depleted', 'stone', { x: 0, y: 1, z: 0 }, 0),
    node('inactive', 'stone', { x: 0, y: 1, z: 0 }, 4, { _regionInactive: true }),
    node('removed', 'stone', { x: 0, y: 1, z: 0 }, 4, { _removed: true }),
  ];
  assert.deepEqual(selectMineralStrikeTargets(nodes, pos).map(candidate => candidate.id), ['nearest', 'tie-a', 'tie-b']);
  assert.deepEqual(selectMineralStrikeTargets(nodes, { x: 0, y: Number.NaN, z: 0 }), []);
});

test('strike bounds ordinary hits per source and reports partial iron truthfully', () => {
  const targets = [
    node('crystal', 'crystal_shard', { x: 1, y: 0, z: 0 }, 2),
    node('iron', 'iron_ore', { x: 2, y: 0, z: 0 }, 5),
    node('rock', 'stone', { x: 3, y: 0, z: 0 }, 4),
  ];
  const calls = [];
  const strike = createMineralStrike({
    getNodes: () => targets,
    applyHit(candidate, options) {
      calls.push([candidate.id, options.feedback]);
      candidate.state.remainingChunks -= 1;
      if (candidate.state.remainingChunks === 0) candidate.state.nodeState = 'RESPAWNING';
      return true;
    },
  });
  assert.deepEqual(strike({ x: 0, y: 0, z: 0 }), { hits: 10, sources: 3, depleted: 2, interrupted: false });
  assert.deepEqual(targets.map(candidate => candidate.state.remainingChunks), [0, 1, 0]);
  assert.deepEqual(calls, [
    ['crystal', false], ['crystal', true],
    ['iron', false], ['iron', false], ['iron', false], ['iron', true],
    ['rock', false], ['rock', false], ['rock', false], ['rock', true],
  ]);
});

test('real harvest lifecycle keeps prior drops and depletion when a later finite save fails', () => {
  const priorStorage = globalThis.localStorage;
  let stored = null;
  let writes = 0;
  let failAfter = Infinity;
  globalThis.localStorage = {
    getItem: () => stored,
    setItem: (_key, value) => {
      writes += 1;
      if (writes > failAfter) throw new Error('quota');
      stored = value;
    },
  };
  const progress = createFrontierProgress();
  progress.load();
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const resources = createResourceSystem(new THREE.Scene(), { world, RAPIER }, [
    { id: 'authored-rock', type: 'rock', pos: { x: 1, y: 0, z: 0 } },
    { type: 'rock', chunkId: '0:0', placementIndex: 7, persistentFinite: true, pos: { x: 2, y: 0, z: 0 } },
  ], {
    readPersistentResource: id => progress.getFrontierResourceRemaining(id),
    commitPersistentResource: (id, remaining) => progress.commitFrontierResourceState(id, remaining),
  });
  try {
    const authored = resources.getNodes().find(candidate => candidate.id === 'authored-rock');
    const finite = resources.getNodes().find(candidate => candidate.id === 'f1:r:0:0:7');
    finite.state.remainingChunks = 2;
    failAfter = writes + 1;
    let drops = 0;
    const feedback = [];
    const strike = createMineralStrike({
      getNodes: resources.getActiveNodes,
      applyHit(candidate, options) {
        feedback.push([candidate.id, options.feedback]);
        return resources.applyHit(candidate, () => { drops += 1; });
      },
    });

    assert.deepEqual(strike({ x: 0, y: 0, z: 0 }), { hits: 5, sources: 2, depleted: 1, interrupted: true });
    assert.equal(drops, 5, 'each committed hit retains its ordinary drop');
    assert.equal(authored.state.remainingChunks, 0);
    assert.equal(authored.state.nodeState, 'RESPAWNING');
    assert.equal(authored.visualRoot.visible, false);
    assert.equal(authored.collider, null);
    assert.equal(finite.state.remainingChunks, 1, 'failed finite write cannot change the live remainder');
    assert.equal(progress.getFrontierResourceRemaining(finite.id), 1);
    assert.ok(finite.collider, 'partially harvested finite source remains physical');
    assert.deepEqual(feedback, [
      ['authored-rock', false], ['authored-rock', false], ['authored-rock', false], ['authored-rock', true],
      [finite.id, false], [finite.id, true],
    ]);

    resources.update(18, { x: 20, y: .5, z: 20 }, 'IDLE');
    assert.equal(authored.state.nodeState, 'READY', 'authored rock keeps its ordinary regrowth');
    assert.equal(authored.state.remainingChunks, authored.type.maxChunks);
    assert.ok(authored.collider, 'authored regrowth restores collision');
  } finally {
    world.free();
    if (priorStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = priorStorage;
  }
});
