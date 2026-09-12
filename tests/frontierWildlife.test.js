import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCreatureSystem } from '../src/creatures/creatureSystem.js';
import { createWildkinGenome } from '../src/creatures/wildkinGenome.js';
import { sampleFrontierWildlifeChunk } from '../src/world/frontierWildlife.js';
import { createFrontierWildlifeRuntime } from '../src/world/frontierWildlifeRuntime.js';

function residency(cx, cz) {
  const chunks = [];
  for (let z = cz - 2; z <= cz + 2; z += 1) for (let x = cx - 2; x <= cx + 2; x += 1) chunks.push({ id: `${x},${z}`, cx: x, cz: z });
  return Object.freeze({ center: Object.freeze({ cx, cz }), chunks: Object.freeze(chunks) });
}

function owner() {
  const actors = [];
  return {
    actors,
    getCreatures: () => actors,
    getAllAliveCreatures: () => actors,
    addGeneratedCreatures: (spawns) => {
      const added = spawns.filter((spawn) => !actors.some((actor) => actor.state.id === spawn.id)).map((spawn) => ({ state: { ...spawn } }));
      actors.push(...added); return added;
    },
    removeGeneratedCreaturesByChunk: (chunkId) => {
      for (let index = actors.length - 1; index >= 0; index -= 1) if (actors[index].state.generatedChunkId === chunkId) actors.splice(index, 1);
    },
    removeGeneratedCreatureByOrigin: (originId) => {
      const index = actors.findIndex((actor) => actor.state.originId === originId);
      return index < 0 ? null : actors.splice(index, 1)[0];
    },
  };
}

test('frontier Mossling sources have stable IDs, a deterministic genome, and staged safe north placement', () => {
  const [first] = sampleFrontierWildlifeChunk(0, -2);
  const [again] = sampleFrontierWildlifeChunk(0, -2);
  assert.equal(first.originId, 'f1:w:0:-2:0');
  assert.deepEqual(first.pos, { x: 7, y: first.pos.y, z: -85 });
  assert.deepEqual({ roam: first.roamRadius, leash: first.leashRadius, fleeLeash: first.fleeLeashRadius }, { roam: 2.6, leash: 4.2, fleeLeash: 3.5 });
  assert.deepEqual(first.genome, createWildkinGenome(first.originId, 'fen'));
  assert.deepEqual(again, first);
});

test('runtime bounds live sources, retires unloaded chunks, and never restores a captured source', () => {
  let snapshot = residency(0, -2);
  const captured = new Set();
  const creatures = owner();
  const runtime = createFrontierWildlifeRuntime({ terrainRuntime: { getResidency: () => snapshot }, creatureSystem: creatures, isSourceCaptured: (id) => captured.has(id) });
  runtime.update();
  assert.ok(creatures.actors.length > 0 && creatures.actors.length <= 4);
  const target = creatures.actors[0].state;
  const sibling = creatures.actors.find((actor) => actor.state.originId !== target.originId)?.state;
  captured.add(target.originId);
  runtime.update();
  assert.equal(creatures.actors.some((actor) => actor.state.originId === target.originId), false, 'capture is checked without residency change');
  assert.equal(creatures.actors.some((actor) => actor.state.originId === sibling?.originId), true, 'capturing one source leaves its resident sibling intact');
  snapshot = residency(8, 8); runtime.update();
  assert.ok(creatures.actors.length <= 4);
  snapshot = residency(0, -2); runtime.update();
  assert.equal(creatures.actors.some((actor) => actor.state.originId === target.originId), false, 'captured source stays absent after revisit');
  runtime.dispose();
  assert.equal(creatures.actors.length, 0);
});

test('runtime does not exceed the four generated-resident cap', () => {
  const creatures = owner();
  for (let index = 0; index < 4; index += 1) creatures.actors.push({ state: { id: `existing-${index}`, isGeneratedResident: true, generatedChunkId: `old-${index}`, isDead: index === 0 } });
  const runtime = createFrontierWildlifeRuntime({ terrainRuntime: { getResidency: () => residency(0, -2) }, creatureSystem: creatures });
  runtime.update();
  assert.equal(creatures.actors.length, 4);
  runtime.dispose();
});

test('a chunk fills its remaining stable source when a cap slot later opens', () => {
  const creatures = owner();
  for (let index = 0; index < 3; index += 1) creatures.actors.push({ state: { id: `existing-${index}`, isGeneratedResident: true, generatedChunkId: `old-${index}` } });
  const runtime = createFrontierWildlifeRuntime({ terrainRuntime: { getResidency: () => residency(0, -2) }, creatureSystem: creatures });
  runtime.update();
  assert.deepEqual(creatures.actors.filter((actor) => actor.state.originId).map((actor) => actor.state.originId), ['f1:w:0:-2:0']);
  creatures.actors.splice(0, 1);
  runtime.update();
  assert.deepEqual(creatures.actors.filter((actor) => actor.state.originId).map((actor) => actor.state.originId).sort(), ['f1:w:0:-2:0', 'f1:w:0:-2:1']);
  runtime.dispose();
});

test('generated creature retirement disposes only generated residents and reset retains authored lifecycle', () => {
  const authored = { id: 'authored', type: 'rusher', pos: { x: 0, y: 0, z: 0 }, regionId: 'camp' };
  const system = createCreatureSystem(new THREE.Scene(), null, null, { spawns: [authored] });
  const [generated] = system.addGeneratedCreatures([{ id: 'f1:w:0:-2:0', originId: 'f1:w:0:-2:0', generatedChunkId: '0,-2', isGeneratedResident: true, type: 'rusher', pos: { x: 10, y: 0, z: -85 }, regionId: 'camp', genome: createWildkinGenome('f1:w:0:-2:0', 'fen') }]);
  assert.equal(generated.state.isGeneratedResident, true);
  system.setFieldTamingIntent(generated.state.id, { hold: true });
  system.removeGeneratedCreaturesByChunk('0,-2');
  assert.equal(system._creatures.length, 1);
  assert.equal(system._creatures[0].state.id, 'authored');
  system.reset();
  assert.equal(system._creatures.length, 1);
  assert.equal(system._creatures[0].state.aiState, 'ROAM');
  system.dispose();
});

test('staged Mossling flee remains autonomous but turns back at its local boundary', () => {
  const system = createCreatureSystem(new THREE.Scene(), null, null, { spawns: [{
    id: 'f1:w:0:-2:0', originId: 'f1:w:0:-2:0', isGeneratedResident: true, type: 'rusher',
    pos: { x: 0, y: 0, z: 0 }, temperament: 'SKITTISH', speciesTag: 'mossling', noticeRadius: 7,
    roamRadius: 2.6, leashRadius: 4.2, fleeLeashRadius: 3.5,
  }] });
  system.setPlayerPos({ x: 0, y: .5, z: -1 }); system.setPlayerState({ mode: 'RUN', speed: 3 });
  for (let frame = 0; frame < 100; frame += 1) system.update(.1);
  const state = system._creatures[0].state;
  assert.ok(Math.hypot(state.pos.x - state.homePos.x, state.pos.z - state.homePos.z) <= 3.9, 'one movement step may cross the 3.5 local boundary before RETURN takes over');
  assert.equal(state.aiState, 'RETURN');
  system.dispose();
});
