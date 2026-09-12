import test from 'node:test';
import assert from 'node:assert/strict';
import {
  config, chunkKey, worldToChunk, sampleFrontier, createFrontierChunk, isCampChunk,
} from '../src/world/frontierTerrain.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysicsWorld } from '../src/physics/createPhysicsWorld.js';
import { createCharacterPhysics } from '../src/physics/createCharacterPhysics.js';
import { sampleFrontierLandform } from '../src/world/frontierLandform.js';

await RAPIER.init();

test('chunk ownership floors negative coordinates and keys are stable', () => {
  assert.deepEqual(worldToChunk(-0.01, -50), { cx: -1, cz: -1 });
  assert.deepEqual(worldToChunk(-50, 50), { cx: -1, cz: 1 });
  assert.equal(chunkKey(-2, 3), '-2,3');
  assert.equal(isCampChunk(-1, -1), true);
  assert.equal(isCampChunk(1, 0), false);
});

test('adjacent chunks have identical shared edge data', () => {
  const left = createFrontierChunk(1, 2, { seed: 1234 });
  const right = createFrontierChunk(2, 2, { seed: 1234 });
  const stride = config.segments + 1;
  for (let iz = 0; iz <= config.segments; iz++) {
    const a = iz * stride + config.segments;
    const b = iz * stride;
    assert.equal(left.vertices[a * 3 + 1], right.vertices[b * 3 + 1]);
    assert.deepEqual(Array.from(left.normals.slice(a * 3, a * 3 + 3)), Array.from(right.normals.slice(b * 3, b * 3 + 3)));
    assert.deepEqual(Array.from(left.colors.slice(a * 3, a * 3 + 3)), Array.from(right.colors.slice(b * 3, b * 3 + 3)));
  }
});

test('camp boundary honors callback and blends smoothly outside the footprint', () => {
  const campHeight = (x, z) => 3 + x * 0.01 - z * 0.005;
  const inside = sampleFrontier(50, 12, { seed: 77, campHeight });
  const edge = sampleFrontier(50.001, 12, { seed: 77, campHeight });
  const outside = sampleFrontier(70, 12, { seed: 77, campHeight });
  assert.equal(inside.height, campHeight(50, 12));
  assert.ok(Math.abs(edge.height - inside.height) < 0.2);
  assert.ok(outside.height >= config.minHeight && outside.height <= config.maxHeight);
});

test('camp callback preserves finite negative and raised heights', () => {
  const campHeight = (x, z) => x < 0 ? -24 : 31;
  assert.equal(sampleFrontier(-20, -20, { campHeight }).height, -24);
  assert.equal(sampleFrontier(20, 20, { campHeight }).height, 31);
});

test('mesh vertices, normals and colors are finite and repeatable', () => {
  const first = createFrontierChunk(-3, 4, { seed: 9001 });
  const second = createFrontierChunk(-3, 4, { seed: 9001 });
  assert.deepEqual(Array.from(first.vertices), Array.from(second.vertices));
  assert.deepEqual(Array.from(first.indices), Array.from(second.indices));
  for (const array of [first.vertices, first.normals, first.colors]) for (const value of array) assert.ok(Number.isFinite(value));
  assert.ok(first.vertices.every((value, i) => i % 3 !== 1 || (value >= config.minHeight && value <= config.maxHeight)));
  assert.notDeepEqual(Array.from(first.vertices), Array.from(createFrontierChunk(-3, 4, { seed: 9002 }).vertices));
});

function vertexAt(chunk, localX, localZ) {
  for (let i = 0; i < chunk.vertices.length; i += 3) {
    if (Math.abs(chunk.vertices[i] - localX) < 1e-5 && Math.abs(chunk.vertices[i + 2] - localZ) < 1e-5) {
      return Array.from(chunk.vertices.slice(i, i + 3));
    }
  }
  return null;
}

test('rocky terrace uses a bounded deterministic mesh while preserving every chunk border', () => {
  const terrace = createFrontierChunk(0, -3, { seed: 77 });
  const repeat = createFrontierChunk(0, -3, { seed: 77 });
  assert.deepEqual(terrace.vertices, repeat.vertices);
  assert.deepEqual(terrace.indices, repeat.indices);
  assert.ok(terrace.indices.length / 3 < 2500);
  assert.deepEqual(terrace.bounds.min.x, 0);
  assert.deepEqual(terrace.bounds.max.x, config.chunkSize);
  for (let p = 0; p <= config.chunkSize; p += 2) {
    assert.equal(vertexAt(terrace, 0, p)[1], vertexAt(createFrontierChunk(-1, -3, { seed: 77 }), 50, p)[1]);
    assert.equal(vertexAt(terrace, 50, p)[1], vertexAt(createFrontierChunk(1, -3, { seed: 77 }), 0, p)[1]);
    assert.equal(vertexAt(terrace, p, 0)[1], vertexAt(createFrontierChunk(0, -4, { seed: 77 }), p, 50)[1]);
    assert.equal(vertexAt(terrace, p, 50)[1], vertexAt(createFrontierChunk(0, -2, { seed: 77 }), p, 0)[1]);
  }
});

test('left terrace ramp is broad and gentle while south and right lips remain real cliffs', () => {
  let steepestRamp = 0;
  for (const x of [22, 24, 26]) for (let z = -128; z < -116; z += 1) {
    steepestRamp = Math.max(steepestRamp, Math.atan(Math.abs(sampleFrontier(x, z + 1).height - sampleFrontier(x, z).height)) * 180 / Math.PI);
  }
  assert.ok(steepestRamp < 25, `ramp slope ${steepestRamp.toFixed(2)}° stays walkable`);
  assert.ok(sampleFrontier(32, -133).height - sampleFrontier(32, -123.9).height > 2.7);
  assert.ok(sampleFrontier(41.9, -133).height - sampleFrontier(42.1, -133).height > 2.7);
  const cliffColor = sampleFrontier(32, -124.04).groundColorRGB;
  assert.ok(Math.max(...cliffColor) - Math.min(...cliffColor) < 0.09, 'the exposed face is muted gray');
});

test('ramp crown joins the grassy shelf without an analytic trough', () => {
  const route = [];
  for (let x = 24; x <= 32; x += 0.25) {
    route.push(sampleFrontier(x, -133).height);
    assert.equal(sampleFrontierLandform(x, -133).heightOffset, 3, `route height at x=${x}`);
  }
  let largestLocalDip = 0;
  for (let i = 1; i < route.length - 1; i++) {
    largestLocalDip = Math.max(largestLocalDip, Math.min(route[i - 1], route[i + 1]) - route[i]);
  }
  assert.ok(largestLocalDip < 0.03, `largest crown join dip was ${largestLocalDip.toFixed(3)}m`);
  const join = sampleFrontier(27, -133).height;
  assert.ok(Math.abs(join - (sampleFrontier(26, -133).height + sampleFrontier(28, -133).height) / 2) < 0.12);
});

function terracePhysics(t) {
  const physics = createPhysicsWorld(RAPIER, { terrainSurfaces: [], groundPatches: [{ collisionEnabled: false }], obstacles: [], platforms: [], boundaries: [] });
  t.after(() => physics.world.free());
  physics.updateTerrainSurfaces({ add: [{ ...createFrontierChunk(0, -3), sectionId: 'field' }] });
  return physics;
}

test('Rapier walks the ramp grounded, then a south-lip step becomes airborne and lands below', t => {
  const physics = terracePhysics(t);
  const half = 1.04 / 2;
  const rampStart = { x: 24, z: -114 };
  const ramp = createCharacterPhysics(RAPIER, physics.world, { ...rampStart, y: sampleFrontier(rampStart.x, rampStart.z).height + half + 0.03 });
  let groundedSteps = 0;
  for (let i = 0; i < 240; i++) {
    const result = ramp.move({ x: 0, y: -0.08, z: -0.1 });
    if (result.grounded) groundedSteps++;
  }
  assert.ok(groundedSteps > 230, `ramp remains grounded for ${groundedSteps}/240 steps`);
  assert.ok(ramp.getPosition().z < -128, `ramp reaches its upper shelf at z=${ramp.getPosition().z.toFixed(2)}`);

  const top = { x: 32, z: -127 };
  const cliff = createCharacterPhysics(RAPIER, physics.world, { ...top, y: sampleFrontier(top.x, top.z).height + half + 0.03 });
  const startFeet = cliff.getPosition().y - half;
  let airborne = false, landedFeet = null, vy = -0.2;
  for (let i = 0; i < 240; i++) {
    vy -= 12 / 60;
    const result = cliff.move({ x: 0, y: vy / 60, z: i < 45 ? 0.12 : 0 });
    if (!result.grounded) airborne = true;
    if (airborne && result.grounded) { landedFeet = cliff.getPosition().y - half; break; }
  }
  assert.equal(airborne, true, 'the narrow lip does not become a long slide');
  assert.ok(landedFeet !== null, 'the character lands in the lower clearing');
  assert.ok(startFeet - landedFeet > 2.6 && startFeet - landedFeet < 3.8, `actual drop was ${(startFeet - landedFeet).toFixed(2)}m`);
});
