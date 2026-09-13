import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FRONTIER_OCEAN_CONFIG, createFrontierOceanRuntime } from '../src/world/frontierOceanRuntime.js';

function coastSample(x) {
  const coastDistance = x;
  return {
    coastDistance,
    seaLevel: -2,
    land: coastDistance >= 0,
    contentLand: coastDistance >= 2,
    hasTerrain: coastDistance >= -32,
    waterDepth: Math.max(0, Math.min(5, -coastDistance / 8)),
    inlandDirection: { x: 1, z: 0 },
  };
}

test('one resident window owns at most three coherent ocean draws', (t) => {
  const parent = new THREE.Group();
  const ocean = createFrontierOceanRuntime({ parent, sample: coastSample, chunkSize: 50, radius: 1 });
  t.after(() => ocean.dispose());

  assert.equal(ocean.syncResidency({ center: { cx: 0, cz: 0 } }), true);
  const state = ocean.getDebugState();
  assert.equal(state.windowKey, '0,0');
  assert.equal(state.drawCount, 3, 'water, foam and current band are each one draw');
  assert.ok(state.waterVertices > 0);
  assert.ok(state.foamSegments > 0);
  assert.equal(state.currentStreaks, FRONTIER_OCEAN_CONFIG.maxCurrentStreaks);
  assert.equal(state.wakeSegments, 0);
  assert.equal(state.wakeCapacity, FRONTIER_OCEAN_CONFIG.maxWakeSegments);
  assert.deepEqual(ocean.root.children.map(child => child.name), [
    'frontier_ocean_water', 'frontier_ocean_foam', 'frontier_ocean_currents',
  ]);
  assert.equal(parent.children.includes(ocean.root), true);
});

test('residency changes rebuild once, inland windows release the presentation, and reset disposes geometry', (t) => {
  const parent = new THREE.Group();
  const ocean = createFrontierOceanRuntime({ parent, sample: coastSample, chunkSize: 50, radius: 1 });
  t.after(() => ocean.dispose());
  ocean.syncResidency({ center: { cx: 0, cz: 0 } });
  const geometry = ocean.root.getObjectByName('frontier_ocean_water').geometry;
  let disposed = 0; geometry.addEventListener('dispose', () => { disposed += 1; });
  const rebuilds = ocean.getDebugState().rebuilds;

  assert.equal(ocean.syncResidency({ center: { cx: 0, cz: 0 }, chunks: [] }), false, 'new snapshots for the same center do not rebuild');
  assert.equal(ocean.getDebugState().rebuilds, rebuilds);
  assert.equal(ocean.syncResidency({ center: { cx: 4, cz: 0 } }), true);
  assert.equal(disposed, 1);
  assert.equal(ocean.getDebugState().drawCount, 0, 'a wholly inland window retains no hidden ocean meshes');

  ocean.syncResidency({ center: { cx: 0, cz: 0 } });
  ocean.reset();
  assert.deepEqual(ocean.getDebugState(), {
    windowKey: null, visible: false, drawCount: 0, waterVertices: 0, foamSegments: 0,
    currentStreaks: 0, wakeSegments: 0, wakeCapacity: FRONTIER_OCEAN_CONFIG.maxWakeSegments,
    rebuilds: rebuilds + 2, sampleCalls: ocean.getDebugState().sampleCalls, elapsed: 0,
  });
});

test('current streaks move only during visible unpaused presentation updates', (t) => {
  const ocean = createFrontierOceanRuntime({ parent: new THREE.Group(), sample: coastSample, chunkSize: 50, radius: 1 });
  t.after(() => ocean.dispose());
  ocean.syncResidency({ center: { cx: 0, cz: 0 } });
  const mesh = ocean.root.getObjectByName('frontier_ocean_currents');
  const positions = mesh.geometry.getAttribute('position');
  const initial = Array.from(positions.array);

  ocean.update(.1, { playerPosition: { x: 5, y: 2, z: 0 } });
  const moved = Array.from(positions.array);
  assert.notDeepEqual(moved, initial);
  const displacement = { x: moved[0] - initial[0], z: moved[2] - initial[2] };
  assert.ok(displacement.x * 1 + displacement.z * 0 > 0, 'the current cue moves along the published inland push direction');
  ocean.update(5, { paused: true });
  assert.deepEqual(Array.from(positions.array), moved, 'pause freezes the bounded current cue');
  ocean.update(.1, { hidden: true });
  assert.equal(ocean.root.visible, false);
  assert.deepEqual(Array.from(positions.array), moved, 'hidden presentation neither moves nor leaks');
  ocean.update(0, { hidden: false });
  assert.equal(ocean.root.visible, true);
});

test('surface swimming writes a bounded broken wake into the existing current draw only', (t) => {
  const ocean = createFrontierOceanRuntime({ parent: new THREE.Group(), sample: coastSample, chunkSize: 50, radius: 1 });
  t.after(() => ocean.dispose());
  ocean.syncResidency({ center: { cx: 0, cz: 0 } });
  const currents = ocean.root.getObjectByName('frontier_ocean_currents');
  const baseVertexCount = FRONTIER_OCEAN_CONFIG.maxCurrentStreaks * 6;
  assert.equal(currents.geometry.getAttribute('position').count,
    baseVertexCount + FRONTIER_OCEAN_CONFIG.maxWakeSegments * 6, 'wake storage is reserved once at residency build');

  ocean.update(1 / 60, { playerPosition: { x: -4, y: -2, z: 3 }, swimming: false });
  assert.equal(ocean.getDebugState().wakeSegments, 0);
  ocean.update(1 / 60, { playerPosition: { x: -3.9, y: -2, z: 3 }, swimming: true });
  const state = ocean.getDebugState();
  assert.equal(state.drawCount, 3);
  assert.equal(state.wakeSegments, FRONTIER_OCEAN_CONFIG.maxWakeSegments);
  const wake = currents.geometry.getAttribute('position').array.slice(baseVertexCount * 3);
  const wakeX = [], wakeY = [], wakeZ = [];
  for (let index = 0; index < wake.length; index += 3) {
    wakeX.push(wake[index]); wakeY.push(wake[index + 1]); wakeZ.push(wake[index + 2]);
  }
  assert.ok(Math.min(...wakeX) < -5.2 && Math.max(...wakeX) > -3.1, 'the short trail follows behind motion while ripples surround the torso');
  assert.ok(Math.max(...wakeZ) - Math.min(...wakeZ) > 1, 'the wake has visible width rather than becoming a glowing road');
  assert.ok(wakeY.every(y => y >= -2 + .074 && y <= -2 + .082), 'all wake ribbons sit just above the water surface');

  ocean.update(1 / 60, { hidden: true, playerPosition: { x: -3.8, y: -2, z: 3 }, swimming: true });
  assert.equal(ocean.getDebugState().wakeSegments, 0, 'hidden Author/modal presentation clears the reserved wake');
  ocean.update(1 / 60, { playerPosition: { x: -3.7, y: -2, z: 3 }, swimming: false });
  assert.equal(ocean.getDebugState().wakeSegments, 0, 'land movement leaves the wake slice degenerate');
});

test('malformed inland samples fail closed without allocating ocean draws', (t) => {
  const ocean = createFrontierOceanRuntime({ parent: new THREE.Group(), sample: () => ({ land: true, coastDistance: NaN, seaLevel: NaN }) });
  t.after(() => ocean.dispose());
  assert.doesNotThrow(() => ocean.syncResidency({ center: { cx: 0, cz: 0 } }));
  assert.equal(ocean.getDebugState().drawCount, 0);
  assert.equal(ocean.syncResidency(null), true);
  assert.equal(ocean.syncResidency(null), false);
});
