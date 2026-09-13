import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONTIER_FUNGAL_CONFIG,
  overlapsFrontierFungalOuting,
  overlapsFrontierFungalRoute,
  sampleFrontierFungalFeature,
  sampleFrontierFungalProfile,
} from '../src/world/frontierFungalHollow.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { sampleFrontierRegion } from '../src/world/frontierRegion.js';
import { createFrontierChunk, sampleFrontier, sampleFrontierHeight, worldToChunk } from '../src/world/frontierTerrain.js';

function meshHeightAt(chunk, x, z) {
  const localX = x - chunk.origin.x, localZ = z - chunk.origin.z;
  const xs = chunk.grid.xs, zs = chunk.grid.zs;
  const cell = (axis, value) => {
    let index = 0;
    while (index < axis.length - 2 && axis[index + 1] < value) index += 1;
    return index;
  };
  const ix = cell(xs, localX), iz = cell(zs, localZ), stride = xs.length;
  const tx = (localX - xs[ix]) / (xs[ix + 1] - xs[ix]);
  const tz = (localZ - zs[iz]) / (zs[iz + 1] - zs[iz]);
  const a = chunk.vertices[(iz * stride + ix) * 3 + 1];
  const b = chunk.vertices[(iz * stride + ix + 1) * 3 + 1];
  const c = chunk.vertices[((iz + 1) * stride + ix) * 3 + 1];
  const d = chunk.vertices[((iz + 1) * stride + ix + 1) * 3 + 1];
  return tx + tz <= 1 ? a + (b - a) * tx + (c - a) * tz
    : b * (1 - tz) + c * (1 - tx) + d * (tx + tz - 1);
}

function chunksFor(points) {
  const chunks = new Map();
  for (const point of points) {
    const { cx, cz } = worldToChunk(point.x, point.z), key = `${cx},${cz}`;
    if (!chunks.has(key)) chunks.set(key, createFrontierChunk(cx, cz));
  }
  return chunks;
}

function meshSampler(chunks) {
  return (x, z) => {
    const { cx, cz } = worldToChunk(x, z);
    return meshHeightAt(chunks.get(`${cx},${cz}`) ?? createFrontierChunk(cx, cz), x, z);
  };
}

test('Fungal geometry exposes fixed branches, outing content, and intersection predicates', () => {
  const config = FRONTIER_FUNGAL_CONFIG;
  assert.equal(config.habitatId, 'fungal-hollow');
  assert.deepEqual(config.blossoms.map(entry => [entry.index, entry.cx, entry.cz]), [
    [400, -57, -25], [401, -58, -25], [402, -57, -26], [403, -58, -26],
  ]);
  assert.deepEqual(config.outing.thornHome, { index: 450, cx: -58, cz: -26, x: -2868, z: -1260, radius: 10 });
  assert.equal(Object.isFrozen(config.branches[0].points[0]), true);
  assert.equal(overlapsFrontierFungalOuting(-2881, -1250), false);
  assert.equal(overlapsFrontierFungalOuting(-2881, -1250, .01), true);
  assert.equal(overlapsFrontierFungalRoute(-2850, -1232), true);
  assert.equal(overlapsFrontierFungalRoute(-2854, -1232, 1), false);
  assert.equal(overlapsFrontierFungalRoute(config.outing.thornHome.x, config.outing.thornHome.z,
    config.outing.thornHome.radius), false);
  assert.equal(overlapsFrontierFungalOuting(config.outing.thornHome.x, config.outing.thornHome.z,
    config.outing.thornHome.radius), true);
  assert.ok(Math.hypot(config.outing.thornHome.x - config.blossoms[3].x,
    config.outing.thornHome.z - config.blossoms[3].z) < config.outing.thornHome.radius);
  assert.equal(overlapsFrontierFungalRoute(NaN, Infinity, -1), false);
});

test('branch union, unequal near banks, and neutral exterior are bounded and continuous', () => {
  for (const branch of FRONTIER_FUNGAL_CONFIG.branches) {
    const [x, z] = branch.points[Math.floor(branch.points.length / 2)];
    assert.equal(sampleFrontierFungalFeature(x, z).hollowWeight, 1, branch.id);
  }
  const left = sampleFrontierFungalFeature(-2856.5, -1249.5);
  const right = sampleFrontierFungalFeature(-2844, -1254);
  assert.equal(left.nearBankLeft, 1);
  assert.equal(right.nearBankRight, 1);
  assert.notEqual(FRONTIER_FUNGAL_CONFIG.nearBanks.left.rise, FRONTIER_FUNGAL_CONFIG.nearBanks.right.rise);
  const junction = FRONTIER_FUNGAL_CONFIG.branches[0].points[3];
  assert.equal(sampleFrontierFungalFeature(...junction).hollowWeight, 1);
  const around = [-.02, -.01, 0, .01, .02].map(dx => sampleFrontierFungalFeature(junction[0] + dx, junction[1]).hollowWeight);
  assert.ok(Math.max(...around) - Math.min(...around) < 1e-4);
  assert.deepEqual(sampleFrontierFungalFeature(-2500, -1250), {
    active: false, nearestBranchId: null, branchDistance: 0, tangentX: 0, tangentZ: 0,
    progress: 0, edgeInfluence: 0, hollowWeight: 0, shelfWeight: 0, buttressWeight: 0, branchButtress: 0,
    junctionWeight: 0, outingWeight: 0, route: false,
  });
});

test('Fungal profile is deterministic, seed-characterful, colored, and exact at zero weight', () => {
  const options = { seed: 1234, baseHeight: 12.75, habitatWeight: 1 };
  const a = sampleFrontierFungalProfile(-2898, -1220, options);
  assert.deepEqual(a, sampleFrontierFungalProfile(-2898, -1220, options));
  const changed = sampleFrontierFungalProfile(-2898, -1220, { ...options, seed: 4321 });
  assert.notEqual(a.height, changed.height);
  assert.notDeepEqual(a.colorRGB, changed.colorRGB);
  assert.ok(a.colorRGB[1] > a.colorRGB[0] && a.colorRGB[2] > a.colorRGB[0], 'teal/olive remains distinct from generic Lush');
  const floor = sampleFrontierFungalProfile(-2887, -1270, options).colorRGB;
  const bank = sampleFrontierFungalProfile(-2856.5, -1249.5, options).colorRGB;
  assert.ok(floor[2] > floor[0] * 2, 'branch floor reads teal');
  assert.ok(bank[0] > bank[2] * 1.5, 'near bank reads olive');
  assert.deepEqual(sampleFrontierFungalProfile(-2898, -1220, { seed: 7, baseHeight: 37.25, habitatWeight: 0 }), {
    height: 37.25, colorRGB: null, weight: 0, feature: sampleFrontierFungalFeature(-2898, -1220),
  });
});

test('local branch displacement fades to zero at every finite feature bound', () => {
  const bounds = FRONTIER_FUNGAL_CONFIG.bounds, epsilon = 1e-4;
  const pairs = [
    [[bounds.minX - epsilon, -1250], [bounds.minX + epsilon, -1250]],
    [[bounds.maxX - epsilon, -1250], [bounds.maxX + epsilon, -1250]],
    [[-2850, bounds.minZ - epsilon], [-2850, bounds.minZ + epsilon]],
    [[-2850, bounds.maxZ - epsilon], [-2850, bounds.maxZ + epsilon]],
  ];
  for (const [outside, inside] of pairs) {
    const a = sampleFrontierFungalProfile(...outside, { seed: 77, baseHeight: 12, habitatWeight: 1 });
    const b = sampleFrontierFungalProfile(...inside, { seed: 77, baseHeight: 12, habitatWeight: 1 });
    assert.ok(Math.abs(a.height - b.height) < 1e-4, `${outside}/${inside}`);
    assert.ok((b.feature.hollowWeight ?? 0) < 1e-8);
    assert.ok((b.feature.buttressWeight ?? 0) < 1e-8);
  }
});

test('region and terrain publish one Fungal blend and feature metadata only at actual influence', () => {
  const region = sampleFrontierRegion(-2850, -1250);
  const terrain = sampleFrontier(-2850, -1250);
  assert.equal(region.habitatId, 'fungal-hollow');
  assert.equal(region.fungalWeight, 1);
  assert.equal(terrain.fungalWeight, 1);
  assert.equal(terrain.habitatFeatureKind, 'fungal-hollow');
  assert.ok(terrain.habitatFeatureInfluence > 0);
  assert.equal(sampleFrontierHeight(-2850, -1250), terrain.height);
  const elsewhere = sampleFrontier(-425, 650);
  assert.equal(elsewhere.fungalWeight, 0);
  assert.equal(elsewhere.fungalFeature, null);
  assert.notEqual(elsewhere.habitatFeatureKind, 'fungal-hollow');
});

test('both six-metre routes and fixed life footprints remain supported by analytic terrain', () => {
  const config = FRONTIER_FUNGAL_CONFIG;
  for (const route of [config.outing.approach, config.outing.returnRoute]) {
    for (let index = 0; index < route.length - 1; index += 1) {
      const [ax, az] = route[index], [bx, bz] = route[index + 1];
      const length = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / length, nz = (bx - ax) / length;
      for (let step = 0; step <= Math.ceil(length / 2); step += 1) {
        const t = step / Math.ceil(length / 2);
        for (const offset of [-3, 0, 3]) {
          const x = ax + (bx - ax) * t + nx * offset, z = az + (bz - az) * t + nz * offset;
          assert.equal(hasFootprintSupport(x, z, { getHeight: sampleFrontierHeight, radius: .8, maxSlope: .28 }), true);
        }
      }
    }
  }
  assert.equal(hasFootprintSupport(config.outing.thornHome.x, config.outing.thornHome.z, {
    getHeight: sampleFrontierHeight, radius: config.outing.thornHome.radius, maxSlope: .32, gridStep: 2,
  }), true);
  for (const blossom of config.blossoms) assert.equal(hasFootprintSupport(blossom.x, blossom.z, {
    getHeight: sampleFrontierHeight, radius: blossom.footprintRadius, maxSlope: .18,
  }), true, String(blossom.index));
});

test('two-metre rendered triangles retain route and fixed-life grounding', () => {
  const config = FRONTIER_FUNGAL_CONFIG;
  const points = [...config.blossoms, config.outing.thornHome,
    ...config.outing.approach.map(([x, z]) => ({ x, z })), ...config.outing.returnRoute.map(([x, z]) => ({ x, z }))];
  const chunks = chunksFor(points), getMeshHeight = meshSampler(chunks);
  for (const point of [...config.blossoms, config.outing.thornHome]) {
    assert.ok(Math.abs(sampleFrontierHeight(point.x, point.z) - getMeshHeight(point.x, point.z)) < .04, String(point.index));
  }
  for (const route of [config.outing.approach, config.outing.returnRoute]) {
    for (let index = 0; index < route.length - 1; index += 1) {
      const [ax, az] = route[index], [bx, bz] = route[index + 1];
      const length = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / length, nz = (bx - ax) / length;
      for (let step = 0; step <= Math.ceil(length / 2); step += 1) {
        const t = step / Math.ceil(length / 2);
        for (const offset of [-3, 0, 3]) {
          const x = ax + (bx - ax) * t + nx * offset, z = az + (bz - az) * t + nz * offset;
          assert.equal(hasFootprintSupport(x, z, { getHeight: getMeshHeight, radius: .8, maxSlope: .28 }), true);
        }
      }
    }
  }
});

test('two broad shelf toes support the repaired 23-prop composition on rendered triangles', () => {
  const specs = [
    [-2853.55,-1240,1.2,1.05],[-2854,-1248.5,1.3,1.05],[-2854.2,-1251.5,1.1,1.05],
    [-2846.4,-1243.5,1.3,1.05],[-2846.15,-1247,1.45,1.05],[-2846.4,-1251,1.2,1.05],
    [-2853.75,-1241.7,.82,1.525],[-2846.15,-1247.8,.86,1.525],
    [-2853,-1247.75,.6,1.14],[-2846.75,-1252,.7,1.14],[-2858.25,-1249,.58,1.14],
    [-2850.55,-1240.1,.72,1.4],[-2849.65,-1244,.68,1.4],[-2849.4,-1247.6,.72,1.4],[-2850.25,-1250.8,.66,1.4],
    [-2852.7,-1241.4,1.1,.66],[-2854.2,-1243,1.1,.66],[-2853.3,-1248.2,.95,.66],
    [-2845.9,-1246.2,1.08,.66],[-2847,-1250.6,1,.66],[-2854,-1246.8,.85,.66],
    [-2846.7,-1252,.82,.66],[-2853.4,-1250.6,.78,.66],
  ];
  const chunks = chunksFor(specs.map(([x, z]) => ({ x, z })));
  const getMeshHeight = meshSampler(chunks);
  const solidIndices = new Set([8, 9, 10]);
  for (let index = 0; index < specs.length; index += 1) {
    const [x, z, scale, baseRadius] = specs[index];
    assert.equal(hasFootprintSupport(x, z, { getHeight: sampleFrontierHeight,
      radius: scale * baseRadius, maxSlope: .32 }), true, `analytic ${index}`);
    if (solidIndices.has(index)) assert.equal(hasFootprintSupport(x, z, { getHeight: getMeshHeight,
      radius: scale * baseRadius, maxSlope: .32 }), true, String(index));
    assert.ok(Math.abs(sampleFrontierHeight(x, z) - getMeshHeight(x, z)) < .12, `grounding ${index}`);
  }
});
