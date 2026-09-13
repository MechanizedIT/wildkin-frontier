import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONTIER_CONTINENT_CONFIG,
  createFrontierContinentSampler,
  hasFrontierLandFootprint,
  sampleFrontierContinent,
  sampleFrontierWater,
} from '../src/world/frontierContinent.js';
import { createFrontierChunk, sampleFrontier } from '../src/world/frontierTerrain.js';
import { DEFAULT_FRONTIER_WORLD, normalizeFrontierWorld } from '../src/world/frontierWorld.js';

function eastBoundary(sampler, z = FRONTIER_CONTINENT_CONFIG.center.z) {
  let inland = FRONTIER_CONTINENT_CONFIG.center.x, offshore = inland + 1600;
  for (let index = 0; index < 60; index += 1) {
    const middle = (inland + offshore) / 2;
    if (sampler(middle, z).land) inland = middle;
    else offshore = middle;
  }
  return (inland + offshore) / 2;
}

test('seeded irregular coast keeps the protected ellipse and a reachable east-shore witness', () => {
  const sampler = createFrontierContinentSampler();
  for (let index = 0; index < 64; index += 1) {
    const angle = index * Math.PI * 2 / 64;
    const x = FRONTIER_CONTINENT_CONFIG.center.x + Math.cos(angle) * FRONTIER_CONTINENT_CONFIG.innerRadii.x;
    const z = FRONTIER_CONTINENT_CONFIG.center.z + Math.sin(angle) * FRONTIER_CONTINENT_CONFIG.innerRadii.z;
    assert.ok(sampler(x, z).coastDistance >= -1e-9, `protected interior at ${index}`);
  }
  const witness = sampleFrontierContinent(341.89, 100);
  assert.ok(Math.abs(witness.coastDistance) < .02);
  assert.equal(sampleFrontierContinent(325, 100).land, true);
  assert.equal(sampleFrontierContinent(375, 100).hasTerrain, true);
  assert.equal(sampleFrontierContinent(430, 100).hasTerrain, false);
});

test('water profile is shallow at twelve metres, reaches the shelf floor at thirty-two, and stays finite beyond terrain', () => {
  const sampler = createFrontierContinentSampler();
  const boundary = eastBoundary(sampler);
  const shallow = sampleFrontierWater(boundary + 12, FRONTIER_CONTINENT_CONFIG.center.z, { continentSampler: sampler });
  const shelf = sampleFrontierWater(boundary + 32, FRONTIER_CONTINENT_CONFIG.center.z, { continentSampler: sampler });
  const deep = sampleFrontierWater(boundary + 160, FRONTIER_CONTINENT_CONFIG.center.z, { continentSampler: sampler });
  assert.ok(Math.abs(shallow.depth - .75) < 1e-8);
  assert.ok(Math.abs(shelf.depth - 5) < 1e-8);
  assert.ok(Math.abs(deep.depth - 12) < 1e-8);
  assert.deepEqual({ surfaceY: shelf.surfaceY, bedY: shelf.bedY }, { surfaceY: -2, bedY: -7 });
  assert.ok(shallow.inlandDirection.x < -.99);
});

test('world seed changes the irregular edge deterministically without changing the guaranteed interior', () => {
  const otherWorld = normalizeFrontierWorld({ edition: DEFAULT_FRONTIER_WORLD.edition, seed: 0x10203040 });
  const first = createFrontierContinentSampler(otherWorld), repeat = createFrontierContinentSampler(otherWorld);
  assert.deepEqual(first(342, 100), repeat(342, 100));
  assert.notEqual(eastBoundary(first), eastBoundary(createFrontierContinentSampler()));
  assert.ok(first(FRONTIER_CONTINENT_CONFIG.center.x + FRONTIER_CONTINENT_CONFIG.innerRadii.x,
    FRONTIER_CONTINENT_CONFIG.center.z).coastDistance >= 0);
});

test('one shared footprint rule includes the full movement or prop disk and two-metre dry margin', () => {
  const sampler = createFrontierContinentSampler();
  const boundary = eastBoundary(sampler);
  assert.equal(hasFrontierLandFootprint(boundary - 12, FRONTIER_CONTINENT_CONFIG.center.z,
    { radius: 7, continentSampler: sampler }), true);
  assert.equal(hasFrontierLandFootprint(boundary - 8, FRONTIER_CONTINENT_CONFIG.center.z,
    { radius: 7, continentSampler: sampler }), false);
});

test('terrain exposes the coast contract, preserves inland samples, and indexes only complete shelf triangles', () => {
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
