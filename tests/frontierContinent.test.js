import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONTIER_CONTINENT_CONFIG,
  FRONTIER_CONTINENT_OUTLINE_BOUNDS,
  createFrontierContinentSampler,
  hasFrontierLandFootprint,
  sampleFrontierContinent,
  sampleFrontierWater,
} from '../src/world/frontierContinent.js';
import { createFrontierChunk, sampleFrontier } from '../src/world/frontierTerrain.js';
import { DEFAULT_FRONTIER_WORLD, frontierDomainSeed, normalizeFrontierWorld } from '../src/world/frontierWorld.js';

const TAU = Math.PI * 2;

function unitHash(seed, key) {
  let value = Math.imul((seed ^ key) >>> 0, 2246822519);
  value = (value ^ (value >>> 13)) >>> 0;
  return value / 0xffffffff;
}

function ellipseRadius(angle, radii) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return 1 / Math.sqrt(cos * cos / radii.x ** 2 + sin * sin / radii.z ** 2);
}

function smoothMaximum(a, b, width) {
  const difference = Math.abs(a - b), maximum = Math.max(a, b);
  return !(width > 0) || difference >= width ? maximum : maximum + (width - difference) ** 2 / (4 * width);
}

// The first coast shipped as this radial field. The production sampler keeps it
// private as an expansion floor; this test copy proves that no prior land is cut.
function legacyCoastDistance(x, z, world = DEFAULT_FRONTIER_WORLD) {
  const seed = frontierDomainSeed(normalizeFrontierWorld(world), 'continent-coast', 0xdebd2186);
  const dx = x - FRONTIER_CONTINENT_CONFIG.center.x, dz = z - FRONTIER_CONTINENT_CONFIG.center.z;
  const radialDistance = Math.hypot(dx, dz), angle = radialDistance > 0 ? Math.atan2(dz, dx) : 0;
  let irregularRadius = ellipseRadius(angle, FRONTIER_CONTINENT_CONFIG.outerRadii);
  for (const harmonic of FRONTIER_CONTINENT_CONFIG.harmonics) {
    const phase = unitHash(seed, harmonic.key) * TAU;
    irregularRadius += harmonic.amplitude * Math.sin(harmonic.frequency * angle + phase);
  }
  const radius = smoothMaximum(ellipseRadius(angle, FRONTIER_CONTINENT_CONFIG.innerRadii),
    irregularRadius, FRONTIER_CONTINENT_CONFIG.smoothMaxWidth);
  return radius - radialDistance;
}

test('authored mainland is about six by seven kilometres with a broad concave southeast gulf', () => {
  assert.deepEqual(FRONTIER_CONTINENT_OUTLINE_BOUNDS, { minX: -3700, maxX: 2300, minZ: -4400, maxZ: 2600 });
  const sampler = createFrontierContinentSampler();
  for (const [x, z, ox, oz] of [
    [-3700, -300, -1, 0], [2300, -3300, 1, 0], [-800, -4400, 0, -1], [1600, 2600, 0, 1],
  ]) {
    assert.ok(Math.abs(sampler(x, z).coastDistance) < 1e-8, `fixed outline extremum ${x},${z}`);
    assert.equal(sampler(x + ox, z + oz).land, false, `one metre beyond ${x},${z}`);
  }

  // One ray from the legacy center crosses old land, the open gulf, the lower
  // arm, then ocean. A single radius(theta) cannot produce these transitions.
  const angle = Math.PI / 4;
  const atRadius = radius => sampler(
    FRONTIER_CONTINENT_CONFIG.center.x + Math.cos(angle) * radius,
    FRONTIER_CONTINENT_CONFIG.center.z + Math.sin(angle) * radius,
  );
  assert.deepEqual([1000, 2000, 3000, 4500].map(radius => atRadius(radius).land), [true, false, true, false]);
  assert.ok(sampler(800, 400).coastDistance < -300, 'the east-facing gulf is broad, not a narrow south notch');

  let landCells = 0;
  const step = 25;
  for (let z = FRONTIER_CONTINENT_OUTLINE_BOUNDS.minZ + step / 2; z < FRONTIER_CONTINENT_OUTLINE_BOUNDS.maxZ; z += step) {
    for (let x = FRONTIER_CONTINENT_OUTLINE_BOUNDS.minX + step / 2; x < FRONTIER_CONTINENT_OUTLINE_BOUNDS.maxX; x += step) {
      if (sampler(x, z).land) landCells += 1;
    }
  }
  const squareKilometres = landCells * step * step / 1_000_000;
  assert.ok(squareKilometres >= 28.5 && squareKilometres <= 30.5, `sampled land area ${squareKilometres} km²`);
});

test('bounded seed variation is deterministic, changes local outline, and stays valid', () => {
  const otherWorld = normalizeFrontierWorld({ edition: DEFAULT_FRONTIER_WORLD.edition, seed: 0x10203040 });
  const first = createFrontierContinentSampler(otherWorld), repeat = createFrontierContinentSampler(otherWorld);
  assert.deepEqual(first(1800, 1000), repeat(1800, 1000));
  assert.notEqual(first(1800, 1000).coastDistance, createFrontierContinentSampler()(1800, 1000).coastDistance);
  for (const seed of [0, 1, 2, 3, 0x10203040, 0x7fffffff, 0xdeadbeef, 0xffffffff]) {
    const sampler = createFrontierContinentSampler(normalizeFrontierWorld({ edition: DEFAULT_FRONTIER_WORLD.edition, seed }));
    for (const [x, z] of [[-3700, -300], [2300, -3000], [-800, -4400], [1600, 2600], [800, 400]]) {
      const sample = sampler(x, z);
      assert.ok(Number.isFinite(sample.coastDistance));
      assert.ok(Number.isFinite(sample.inlandDirection.x) && Number.isFinite(sample.inlandDirection.z));
    }
  }
});

test('the new outline preserves the complete legacy land envelope and named witnesses', () => {
  const sampler = createFrontierContinentSampler();
  for (let index = 0; index < 180; index += 1) {
    const angle = index * TAU / 180;
    const direction = { x: Math.cos(angle), z: Math.sin(angle) };
    let low = 0, high = 2200;
    for (let pass = 0; pass < 50; pass += 1) {
      const middle = (low + high) / 2;
      const distance = legacyCoastDistance(
        FRONTIER_CONTINENT_CONFIG.center.x + direction.x * middle,
        FRONTIER_CONTINENT_CONFIG.center.z + direction.z * middle,
      );
      if (distance >= 0) low = middle; else high = middle;
    }
    for (const radius of [0, low * .5, low]) {
      const x = FRONTIER_CONTINENT_CONFIG.center.x + direction.x * radius;
      const z = FRONTIER_CONTINENT_CONFIG.center.z + direction.z * radius;
      assert.ok(sampler(x, z).coastDistance >= legacyCoastDistance(x, z) - 1e-7, `legacy land at angle ${angle}`);
    }
  }
  for (const [name, x, z] of [
    ['Camp', 0, 0], ['starter route', 0, -100], ['Skybreak northwest', -34, -249],
    ['Skybreak southeast', 49, -152], ['Signal receiver', 170, 50],
    ['Signal chest', 171.8, 52.8], ['Lush grove center', -222.5814, 479.4749],
    ['Lush grove chest', -221.593, 480.7331], ['Sunscar place', -222.5, -70],
  ]) assert.ok(sampler(x, z).coastDistance > 0, `${name} stays on land`);
  assert.ok(Math.abs(sampleFrontierContinent(341.89, 100).coastDistance) < .02, 'the proven Camp-side shore stays exact');
});

test('nearest-edge direction points toward increasing signed coast distance', () => {
  const sampler = createFrontierContinentSampler();
  const sample = sampler(1800, 1000);
  assert.ok(sample.coastDistance > 0 && sample.coastDistance < 40);
  const length = Math.hypot(sample.inlandDirection.x, sample.inlandDirection.z);
  assert.ok(Math.abs(length - 1) < 1e-10);
  const inward = sampler(1800 + sample.inlandDirection.x * 2, 1000 + sample.inlandDirection.z * 2);
  const outward = sampler(1800 - sample.inlandDirection.x * 2, 1000 - sample.inlandDirection.z * 2);
  assert.ok(inward.coastDistance > sample.coastDistance + 1.9);
  assert.ok(outward.coastDistance < sample.coastDistance - 1.9);
});

test('water profile retains metre-based shallow, shelf, and deep bands at the authored coast', () => {
  const sampler = createFrontierContinentSampler();
  const shallow = sampleFrontierWater(-3712, -300, { continentSampler: sampler });
  const shelf = sampleFrontierWater(-3732, -300, { continentSampler: sampler });
  const deep = sampleFrontierWater(-3860, -300, { continentSampler: sampler });
  assert.ok(Math.abs(shallow.depth - .75) < 1e-8);
  assert.ok(Math.abs(shelf.depth - 5) < 1e-8);
  assert.ok(Math.abs(deep.depth - 12) < 1e-8);
  assert.deepEqual({ surfaceY: shelf.surfaceY, bedY: shelf.bedY }, { surfaceY: -2, bedY: -7 });
  assert.ok(shallow.inlandDirection.x > .99);
});

test('one shared footprint rule includes the full movement or prop disk and dry margin', () => {
  const sampler = createFrontierContinentSampler();
  let oceanX = -4000, landX = -3000;
  for (let pass = 0; pass < 60; pass += 1) {
    const middle = (oceanX + landX) / 2;
    if (sampler(middle, -600).land) landX = middle; else oceanX = middle;
  }
  const boundaryX = (oceanX + landX) / 2;
  const edge = sampler(boundaryX, -600).inlandDirection;
  const pointAt = distance => ({ x: boundaryX + edge.x * distance, z: -600 + edge.z * distance });
  const supported = pointAt(12), clipped = pointAt(8);
  assert.equal(hasFrontierLandFootprint(supported.x, supported.z, { radius: 7, continentSampler: sampler }), true);
  assert.equal(hasFrontierLandFootprint(clipped.x, clipped.z, { radius: 7, continentSampler: sampler }), false);
});

test('terrain exposes the coast contract and indexes only complete shelf triangles', () => {
  const camp = sampleFrontier(0, 0);
  assert.ok(camp.coastDistance > 90 && camp.land && camp.contentLand && camp.hasTerrain);
  assert.equal(camp.height, sampleFrontier(0, 0).height);
  const shore = sampleFrontier(342, 100);
  assert.equal(shore.seaLevel, -2);
  assert.ok(Math.abs(shore.height + 2) < .02);
  assert.ok(Number.isFinite(shore.waterDepth) && Number.isFinite(shore.inlandDirection.x));

  const mixed = createFrontierChunk(7, 2);
  assert.ok(mixed.indices.length > 0);
  assert.ok(mixed.indices.length < (mixed.grid.xs.length - 1) * (mixed.grid.zs.length - 1) * 6);
  for (const index of mixed.indices) {
    const x = mixed.origin.x + mixed.vertices[index * 3];
    const z = mixed.origin.z + mixed.vertices[index * 3 + 2];
    assert.ok(sampleFrontier(x, z).coastDistance >= -32,
      `indexed shelf vertex ${x},${z} stays inside the declared terrain extent`);
  }
  const offshoreDistances = [...new Set(Array.from(mixed.indices, index => {
    const x = mixed.origin.x + mixed.vertices[index * 3];
    const z = mixed.origin.z + mixed.vertices[index * 3 + 2];
    return Math.max(0, -sampleFrontier(x, z).coastDistance);
  }))];
  assert.ok(Math.max(...offshoreDistances) >= 29, 'the conservative cell boundary retains roughly thirty metres of usable shelf');
  const ocean = createFrontierChunk(10, 2);
  assert.equal(ocean.indices.length, 0);
  for (const values of [ocean.vertices, ocean.normals, ocean.colors]) {
    for (const value of values) assert.ok(Number.isFinite(value));
  }
  assert.ok(Number.isFinite(ocean.bounds.min.y) && Number.isFinite(ocean.bounds.max.y));
});
