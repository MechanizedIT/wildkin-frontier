import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONTIER_CALDERA_CONFIG,
  overlapsFrontierCalderaClearLane,
  sampleFrontierCalderaFeature,
  sampleFrontierCalderaProfile,
} from '../src/world/frontierCaldera.js';
import { sampleFrontierRegion } from '../src/world/frontierRegion.js';
import { config as terrainConfig, createFrontierChunk, sampleFrontier, sampleFrontierHeight } from '../src/world/frontierTerrain.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';

const height = (x, z) => sampleFrontierHeight(x, z);

test('fixed Caldera geometry has exact outer fade, south breach, and intersection-based clear lane', () => {
  assert.ok(Object.isFrozen(FRONTIER_CALDERA_CONFIG));
  assert.deepEqual(FRONTIER_CALDERA_CONFIG.center, { x: 850, z: -2000 });
  assert.deepEqual(FRONTIER_CALDERA_CONFIG.outerRadius, { x: 58, z: 64 });
  assert.deepEqual(FRONTIER_CALDERA_CONFIG.bowlRefuge, { x: 850, z: -1986, radius: 10 });
  assert.ok(Object.isFrozen(FRONTIER_CALDERA_CONFIG.bowlRefuge));
  assert.deepEqual(FRONTIER_CALDERA_CONFIG.nearButtress.leftToe,
    { x: 847.05, z: -1968.5, radius: .95, feather: 1.1 });
  assert.deepEqual(FRONTIER_CALDERA_CONFIG.nearButtress.rightToe,
    { x: 852.85, z: -1969.5, radius: .77, feather: 1.1 });
  for (const [x, z] of [[792, -2000], [908, -2000], [850, -2064], [850, -1936]]) {
    const feature = sampleFrontierCalderaFeature(x, z);
    assert.equal(feature.outerInfluence, 0);
    assert.equal(feature.rimInfluence, 0);
    assert.equal(feature.zone, null);
    assert.equal(feature.ramp, false);
    assert.equal(feature.clearLane, false);
  }
  assert.equal(sampleFrontierCalderaFeature(Number.NaN, Infinity).outerInfluence, 0);
  const breach = sampleFrontierCalderaFeature(850, -1962);
  assert.equal(breach.zone, 'breach');
  assert.equal(breach.ramp, true);
  assert.equal(breach.clearLane, true);
  assert.equal(overlapsFrontierCalderaClearLane(850, -1962), true);
  assert.equal(overlapsFrontierCalderaClearLane(853, -1962, 1.7), true, 'a flank footprint intersecting the lane is rejected');
  assert.equal(overlapsFrontierCalderaClearLane(845.5, -1972, 1.7), false);
  assert.equal(overlapsFrontierCalderaClearLane(850, -2000), false, 'the reserved lane ends at the bowl entry');
});

test('profile is deterministic, seed-variable, bounded, and an exact no-op at zero habitat weight', () => {
  const options = { seed: 1234, baseHeight: 37.25, habitatWeight: 1 };
  const a = sampleFrontierCalderaProfile(850, -2000, options);
  const b = sampleFrontierCalderaProfile(850, -2000, options);
  const changed = sampleFrontierCalderaProfile(850, -2000, { ...options, seed: 4321 });
  assert.deepEqual(a, b);
  assert.notEqual(a.height, changed.height);
  assert.ok(a.height >= 9 && a.height <= 11);
  assert.ok(a.colorRGB.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  const unchanged = sampleFrontierCalderaProfile(850, -2000, { seed: 1234, baseHeight: 37.25, habitatWeight: 0 });
  assert.equal(unchanged.height, 37.25);
  assert.equal(unchanged.colorRGB, null);
  const edgeA = sampleFrontierCalderaProfile(908 - 1e-4, -2000, options);
  const edgeB = sampleFrontierCalderaProfile(908 + 1e-4, -2000, options);
  assert.ok(Math.abs(edgeA.height - edgeB.height) < .001);
  assert.ok(edgeA.colorRGB.every((value, index) => Math.abs(value - edgeB.colorRGB[index]) < .001));
});

test('broad profile replaces temporary ridges with varied charcoal and rust shelves', () => {
  const samples = [];
  for (let z = -2400; z <= -2200; z += 40) for (let x = 650; x <= 1050; x += 40) {
    const sample = sampleFrontierCalderaProfile(x, z, { seed: 1234, baseHeight: 70, habitatWeight: 1 });
    assert.equal(sample.feature.outerInfluence, 0);
    assert.ok(sample.height >= 6 && sample.height <= 24);
    assert.ok(sample.colorRGB.every(value => value >= 0 && value <= .25));
    samples.push(sample.height);
  }
  assert.ok(Math.max(...samples) - Math.min(...samples) > 2, 'low-frequency shelves retain broad variation');

  const local = [];
  for (let z = -1978; z <= -1962; z += 2) for (let x = 836; x <= 864; x += 2) {
    local.push(sampleFrontierCalderaProfile(x, z, { seed: terrainConfig.defaultSeed, baseHeight: 10, habitatWeight: 1 }).colorRGB);
  }
  const luminance = color => color[0] * .2126 + color[1] * .7152 + color[2] * .0722;
  assert.ok(Math.min(...local.map(luminance)) < .055, 'the mouth contains charcoal/slate ground');
  assert.ok(Math.max(...local.map(color => color[0] - color[2])) > .09, '6-15m rust fields remain locally readable');
});

test('default crater has a low bowl, asymmetric high rim, and supported ramp plus outing floor', () => {
  const bowl = height(850, -2000);
  assert.ok(bowl >= 9 && bowl <= 11);
  const rim = [[804, -2000], [896, -2000], [850, -2052]].map(([x, z]) => height(x, z));
  assert.ok(Math.min(...rim) - bowl >= 14);
  assert.ok(Math.max(...rim) - bowl <= 17);
  assert.ok(Math.max(...rim) - Math.min(...rim) > .2, 'rim shoulders are intentionally unequal');
  assert.ok(height(850, -1948) + 8 < Math.min(height(838, -1948), height(862, -1948)), 'south breach cuts between high flanks');

  const leftShoulder = height(FRONTIER_CALDERA_CONFIG.innerShoulder.leftX, -1970);
  const rightShoulder = height(FRONTIER_CALDERA_CONFIG.innerShoulder.rightX, -1970);
  const route = height(850, -1970);
  assert.ok(leftShoulder > route + 4, 'the dominant inner left shoulder supplies visible terrain mass');
  assert.ok(rightShoulder > route + 2.7, 'the smaller right shoulder frames the same near breach');
  assert.ok(leftShoulder > rightShoulder + .8, 'the two near shoulders stay asymmetric');
  for (let z = -1978; z <= -1964; z += 2) for (let x = 848; x <= 852; x += 1) {
    assert.equal(sampleFrontierCalderaFeature(x, z).innerShoulderInfluence, 0,
      `inner shoulder does not enter the 4m clear lane at ${x},${z}`);
  }
  const near = FRONTIER_CALDERA_CONFIG.nearButtress;
  const leftButtressRise = height(near.leftX, near.leftZ) - height(850, near.leftZ);
  const rightButtressRise = height(near.rightX, near.rightZ) - height(850, near.rightZ);
  assert.ok(leftButtressRise >= 1.5 && leftButtressRise <= 3, `left near buttress rise ${leftButtressRise}`);
  assert.ok(rightButtressRise >= 1.5 && rightButtressRise <= 3, `right near buttress rise ${rightButtressRise}`);
  assert.ok(leftButtressRise > rightButtressRise, 'the low near buttresses stay asymmetric');
  for (const toe of [near.leftToe, near.rightToe]) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const x = toe.x + Math.cos(angle) * toe.radius;
      const z = toe.z + Math.sin(angle) * toe.radius;
      assert.ok(sampleFrontierCalderaFeature(x, z).nearButtressInfluence <= 1e-12,
        `toe removes buttress rise across the full prop footprint at ${x},${z}`);
    }
    assert.equal(hasFootprintSupport(toe.x, toe.z, {
      getHeight: height,
      radius: toe.radius,
      maxSlope: .12,
    }), true, `supported prop toe ${toe.x},${toe.z}`);
  }
  for (let dz = -10; dz <= 10; dz += 2) for (let dx = -10; dx <= 10; dx += 2) {
    if (dx * dx + dz * dz <= 100) assert.equal(sampleFrontierCalderaFeature(850 + dx, -1986 + dz).innerShoulderInfluence, 0,
      `inner shoulder does not alter the Emberhorn home disk at ${dx},${dz}`);
  }

  for (const [x, z, radius, maxSlope] of [
    [850, -1962, 2, .28], [846.5, -1976, 1.3, .12], [854, -1980, .93, .12], [850, -1986, 10, .12],
  ]) assert.equal(hasFootprintSupport(x, z, { getHeight: height, radius, maxSlope }), true, `${x},${z}`);

  let maxRampSlope = 0, maxBowlSlope = 0;
  const slope = (x, z) => Math.hypot((height(x + 1, z) - height(x - 1, z)) / 2,
    (height(x, z + 1) - height(x, z - 1)) / 2);
  for (let z = -1980; z <= -1938; z += 1) for (let x = 848; x <= 852; x += 1) {
    maxRampSlope = Math.max(maxRampSlope, slope(x, z));
  }
  for (let z = -2014; z <= -1986; z += 2) for (let x = 838; x <= 862; x += 2) {
    maxBowlSlope = Math.max(maxBowlSlope, slope(x, z));
  }
  assert.ok(maxRampSlope <= .28, `4m clear route slope ${maxRampSlope}`);
  assert.ok(maxBowlSlope <= .12, `24x28m bowl slope ${maxBowlSlope}`);
});

test('region and terrain expose one Caldera result with full and height-only parity', () => {
  for (const [x, z] of [[850, -2000], [850, -1980], [850, -1962], [838, -1948], [862, -1948], [850, -1936]]) {
    const region = sampleFrontierRegion(x, z);
    const full = sampleFrontier(x, z);
    assert.equal(region.habitatId, 'emberglass-caldera');
    assert.equal(region.calderaWeight, 1);
    assert.equal(full.height, sampleFrontierHeight(x, z));
    assert.equal(full.calderaWeight, 1);
    assert.equal(full.habitatFeatureKind, full.habitatFeatureInfluence > 0 ? 'emberglass-caldera' : null);
    assert.ok(Number.isFinite(full.height));
    assert.ok(full.groundColorRGB.every(Number.isFinite));
  }
  const outside = sampleFrontier(-425, 650);
  assert.equal(outside.calderaWeight, 0);
  assert.equal(outside.habitatFeatureKind, null);
  assert.equal(outside.habitatFeatureZone, null);
  assert.equal(outside.habitatFeatureInfluence, 0);
  assert.equal(outside.habitatFeatureRamp, false);
  assert.equal(outside.habitatFeatureClearLane, false);
});

test('all crater chunks share exact mesh, color, query, and collider-field borders', () => {
  const chunks = new Map();
  const get = (cx, cz) => {
    const key = `${cx},${cz}`;
    if (!chunks.has(key)) chunks.set(key, createFrontierChunk(cx, cz));
    return chunks.get(key);
  };
  const stride = terrainConfig.segments + 1;
  for (let cz = -42; cz <= -39; cz += 1) for (let cx = 15; cx <= 18; cx += 1) {
    const chunk = get(cx, cz);
    const centerIndex = (Math.floor(terrainConfig.segments / 2) * stride + Math.floor(terrainConfig.segments / 2)) * 3;
    const wx = chunk.origin.x + chunk.vertices[centerIndex], wz = chunk.origin.z + chunk.vertices[centerIndex + 2];
    assert.equal(chunk.vertices[centerIndex + 1], Math.fround(sampleFrontierHeight(wx, wz)));
    if (cx < 18) {
      const east = get(cx + 1, cz);
      for (let iz = 0; iz <= terrainConfig.segments; iz += 1) {
        const a = (iz * stride + terrainConfig.segments) * 3, b = iz * stride * 3;
        assert.equal(chunk.vertices[a + 1], east.vertices[b + 1]);
        assert.deepEqual(Array.from(chunk.colors.slice(a, a + 3)), Array.from(east.colors.slice(b, b + 3)));
      }
    }
    if (cz < -39) {
      const north = get(cx, cz + 1);
      for (let ix = 0; ix <= terrainConfig.segments; ix += 1) {
        const a = (terrainConfig.segments * stride + ix) * 3, b = ix * 3;
        assert.equal(chunk.vertices[a + 1], north.vertices[b + 1]);
        assert.deepEqual(Array.from(chunk.colors.slice(a, a + 3)), Array.from(north.colors.slice(b, b + 3)));
      }
    }
  }
});
