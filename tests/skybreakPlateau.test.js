import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { createPhysicsWorld } from '../src/physics/createPhysicsWorld.js';
import { createCharacterPhysics } from '../src/physics/createCharacterPhysics.js';
import { createFrontierChunk, sampleFrontier } from '../src/world/frontierTerrain.js';
import {
  SKYBREAK_BOUNDS, SKYBREAK_ROUTE, isSkybreakArea, sampleFrontierLandform,
} from '../src/world/frontierLandform.js';

await RAPIER.init();

const height = (x, z) => sampleFrontier(x, z).height;

test('Skybreak owns a bounded organic plateau footprint away from the preserved terrace', () => {
  assert.deepEqual(SKYBREAK_BOUNDS, { minX: -34, maxX: 49, minZ: -249, maxZ: -152 });
  assert.equal(isSkybreakArea(12, -228), true);
  assert.equal(isSkybreakArea(-35, -228), false);
  assert.equal(isSkybreakArea(-35, -228, 1), true);
  assert.equal(isSkybreakArea(32, -148), false, 'the old terrace stays outside Skybreak ownership');
  assert.equal(sampleFrontierLandform(32, -148).kind, null);
});

test('the true-ground route rises to a dominant crown and returns on a separate broad shelf', () => {
  const base = height(4, -153);
  const crown = height(12, -228);
  assert.ok(crown - base >= 25 && crown - base <= 40, `relief ${(crown - base).toFixed(2)}m`);
  assert.ok(crown >= 34 && crown <= 37, `crown y=${crown.toFixed(2)}`);

  let steepestDirectionalGrade = 0;
  for (let i = 1; i < SKYBREAK_ROUTE.length; i += 1) {
    const a = SKYBREAK_ROUTE[i - 1], b = SKYBREAK_ROUTE[i];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const ux = (b.x - a.x) / length, uz = (b.z - a.z) / length;
    const samples = Math.ceil(length * 2);
    for (let j = 1; j < samples; j += 1) {
      const t = j / samples, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const directional = Math.abs(height(x + ux * .35, z + uz * .35) - height(x - ux * .35, z - uz * .35)) / .7;
      steepestDirectionalGrade = Math.max(steepestDirectionalGrade, directional);
    }
  }
  assert.ok(steepestDirectionalGrade < .78, `route grade ${steepestDirectionalGrade.toFixed(3)} stays below the 40° controller proof`);

  const tableCores = [[4, -166], [-7, -184], [5, -204], [29, -213], [36, -188], [12, -228]];
  for (const [x, z] of tableCores) {
    const center = sampleFrontierLandform(x, z).heightOffset;
    let broadTopSamples = 0;
    for (let i = 0; i < 16; i += 1) {
      const angle = i * Math.PI / 8;
      const sample = sampleFrontierLandform(x + Math.cos(angle) * 4, z + Math.sin(angle) * 3).heightOffset;
      if (Math.abs(sample - center) < .8) broadTopSamples += 1;
    }
    assert.ok(broadTopSamples >= 8, `broad table core at ${x},${z} retains ${broadTopSamples}/16 rim samples outside local joins`);
  }
  for (const [x, z] of [[-20, -200], [20, -190], [-20, -215], [20, -175], [-4, -220]]) {
    assert.equal(sampleFrontierLandform(x, z).heightOffset, 0, `open lowland finger at ${x},${z}`);
  }

  const west = height(-7, -184), westGround = height(-22, -184);
  const east = height(29, -213), eastGround = height(45, -213);
  assert.ok(west - westGround > 4, 'west landing is part of a raised eroded shoulder');
  assert.ok(east - eastGround > 5, 'east return reads as raised mass rather than a painted path');
});

function skybreakPhysics(t) {
  const physics = createPhysicsWorld(RAPIER, {
    terrainSurfaces: [], groundPatches: [{ collisionEnabled: false }], obstacles: [], platforms: [], boundaries: [],
  });
  t.after(() => physics.world.free());
  const surfaces = [[0, -3], [-1, -4], [0, -4], [-1, -5], [0, -5]]
    .map(([cx, cz]) => ({ ...createFrontierChunk(cx, cz), sectionId: 'field' }));
  physics.updateTerrainSurfaces({ add: surfaces });
  return physics;
}

test('real Rapier walks from ordinary ground to the crown and down the east return', t => {
  const physics = skybreakPhysics(t);
  const half = 1.04 / 2;
  const start = { x: 4, z: -150 };
  const character = createCharacterPhysics(RAPIER, physics.world, { ...start, y: height(start.x, start.z) + half + .03 });
  const route = [start, ...SKYBREAK_ROUTE];
  let grounded = 0, steps = 0, crownFeet = null;
  for (let i = 1; i < route.length; i += 1) {
    const target = route[i];
    let guard = 0;
    while (guard++ < 700) {
      const position = character.getPosition();
      const dx = target.x - position.x, dz = target.z - position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < .18) break;
      const stride = Math.min(.11, distance);
      const result = character.move({ x: dx / distance * stride, y: -.09, z: dz / distance * stride });
      grounded += result.grounded ? 1 : 0;
      steps += 1;
    }
    assert.ok(guard < 700, `reached route node ${i}`);
    if (target.x === 12 && target.z === -228) crownFeet = character.getPosition().y - half;
  }
  const finish = character.getPosition();
  assert.ok(crownFeet !== null && crownFeet > 34, `physical crown feet ${crownFeet?.toFixed(2)}`);
  const exit = SKYBREAK_ROUTE.at(-1);
  assert.ok(Math.hypot(finish.x - exit.x, finish.z - exit.z) < .3, 'the east return reaches separate ordinary ground');
  assert.ok(grounded / steps > .97, `grounded ${grounded}/${steps} route steps`);
});

test('a crown-side departure becomes a real Rapier drop and lands on its fused shoulder', t => {
  const physics = skybreakPhysics(t);
  const half = 1.04 / 2;
  const start = { x: 12, z: -228 };
  const character = createCharacterPhysics(RAPIER, physics.world, { ...start, y: height(start.x, start.z) + half + .03 });
  const startFeet = character.getPosition().y - half;
  let airborne = false, landedFeet = null, verticalVelocity = 0;
  for (let i = 0; i < 420; i += 1) {
    verticalVelocity -= 12 / 60;
    const result = character.move({ x: 0, y: verticalVelocity / 60, z: i < 180 ? -.105 : 0 });
    if (!result.grounded) airborne = true;
    const currentFeet = character.getPosition().y - half;
    if (airborne && result.grounded && startFeet - currentFeet > 7) { landedFeet = currentFeet; break; }
  }
  assert.equal(airborne, true);
  assert.ok(landedFeet !== null, 'the character lands on supported terrain after leaving the cap');
  assert.ok(startFeet - landedFeet > 7, `physical drop ${(startFeet - landedFeet).toFixed(2)}m`);
});
