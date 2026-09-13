import test from 'node:test';
import assert from 'node:assert/strict';
import WORLD_DATA from '../src/world/data/world.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import {
  FRONTIER_REGIONAL_PLACE_RADIUS,
  FRONTIER_REGIONAL_PLACE_RESOURCE_SLOTS,
  hasRegionalPlaceAssets,
  sampleFrontierRegionalPlaceChunk,
} from '../src/world/frontierRegionalPlace.js';
import { sampleFrontier } from '../src/world/frontierTerrain.js';
import { DEFAULT_FRONTIER_WORLD } from '../src/world/frontierWorld.js';

const FLAT_SUNSCAR = () => ({
  height: 9,
  habitatBlend: { wetland: 0, fernUpland: 1 },
  surfaceKind: null,
  provinceKind: 'sunscar',
  provinceInfluence: 1,
  provinceWeights: { lush: 0, sunscar: 1, ironspine: 0 },
});

function macroPlaces(mx, mz, options) {
  const places = [];
  for (let cz = mz * 4; cz < mz * 4 + 4; cz += 1) for (let cx = mx * 4; cx < mx * 4 + 4; cx += 1) {
    const place = sampleFrontierRegionalPlaceChunk(cx, cz, options);
    if (place) places.push(place);
  }
  return places;
}

test('default crystal-bloom witness retains the numerical recipe and one owner chunk', () => {
  const place = sampleFrontierRegionalPlaceChunk(-5, -2);
  assert.ok(Object.isFrozen(place) && Object.isFrozen(place.center) && Object.isFrozen(place.resources) && Object.isFrozen(place.scenery));
  assert.deepEqual({ cx: place.cx, cz: place.cz, kind: place.kind, radius: place.radius, layout: place.layout }, {
    cx: -5, cz: -2, kind: 'sunscar-bloom', radius: 7, layout: 'fan',
  });
  assert.ok(Math.abs(place.center.x - -222.27464418096343) < 1e-12);
  assert.ok(Math.abs(place.center.z - -70.32611524344564) < 1e-12);
  assert.ok(Math.abs(place.yaw - .9577878522286514) < 1e-12);
  assert.deepEqual(place.resources.map(resource => [resource.index, resource.assetId, resource.type, resource.uniformScale]), [
    [200, 'asset_crystal', 'rock', .72],
  ]);
  assert.deepEqual(place.scenery.map(spec => [spec.assetId, spec.scale]), [
    ['asset_fen_stone', .45], ['asset_fen_stone', .45],
    ['asset_cloudflower', .5], ['asset_cloudflower', .5], ['asset_cloudflower', .5],
    ['asset_trail_stones', .56], ['asset_trail_stones', .56],
  ]);
  assert.equal(sampleFrontierRegionalPlaceChunk(-6, -2), null, 'a non-owner chunk in the same macrocell cannot duplicate the place');
  assert.deepEqual(sampleFrontierRegionalPlaceChunk(-5, -2), place);
});

test('each macrocell has at most one owner and another valid seed changes its recipe', () => {
  const options = { getTerrainSample: FLAT_SUNSCAR, getHeight: () => 9 };
  const first = macroPlaces(3, 3, options);
  assert.equal(first.length, 1);
  const alternate = macroPlaces(3, 3, { ...options, world: { edition: DEFAULT_FRONTIER_WORLD.edition, seed: 0x10203040 } });
  assert.equal(alternate.length, 1);
  assert.notDeepEqual(
    { cx: alternate[0].cx, cz: alternate[0].cz, center: alternate[0].center, yaw: alternate[0].yaw, layout: alternate[0].layout },
    { cx: first[0].cx, cz: first[0].cz, center: first[0].center, yaw: first[0].yaw, layout: first[0].layout },
  );
  for (const place of [...first, ...alternate]) {
    assert.ok(place.center.x >= place.cx * 50 + 15 && place.center.x <= place.cx * 50 + 35);
    assert.ok(place.center.z >= place.cz * 50 + 15 && place.center.z <= place.cz * 50 + 35);
  }
});

test('priority thinning admits at most one owner in every local 3x3 chunk window', () => {
  const options = { getTerrainSample: FLAT_SUNSCAR, getHeight: () => 9 };
  for (const [centerCx, centerCz] of [[23, -32], [-23, -32], [-32, 23], [-17, -19], [31, 31]]) {
    const places = [];
    for (let cz = centerCz - 1; cz <= centerCz + 1; cz += 1) for (let cx = centerCx - 1; cx <= centerCx + 1; cx += 1) {
      const place = sampleFrontierRegionalPlaceChunk(cx, cz, options);
      if (place) places.push(place);
    }
    assert.ok(places.length <= 1, `${centerCx},${centerCz} has ${places.length} place owners`);
  }
  assert.deepEqual(
    [[22, -31]],
    (() => {
      const places = [];
      for (let cz = -33; cz <= -31; cz += 1) for (let cx = 22; cx <= 24; cx += 1) {
        const place = sampleFrontierRegionalPlaceChunk(cx, cz, options);
        if (place) places.push([place.cx, place.cz]);
      }
      return places;
    })(),
    'the audited formerly dense neighborhood resolves to one stable winner',
  );
});

test('places fail closed on province, surface, whole support, exact reserve, and Signal Cache clearance', () => {
  assert.equal(sampleFrontierRegionalPlaceChunk(-5, -2, { getTerrainSample: () => ({ ...FLAT_SUNSCAR(), provinceInfluence: .949 }) }), null);
  assert.equal(sampleFrontierRegionalPlaceChunk(-5, -2, { getTerrainSample: () => ({
    ...FLAT_SUNSCAR(), provinceWeights: { lush: .36, sunscar: .64, ironspine: 0 },
  }) }), null, 'reserve fade alone cannot admit a mixed-province place');
  assert.equal(sampleFrontierRegionalPlaceChunk(-5, -2, { getTerrainSample: () => ({ ...FLAT_SUNSCAR(), surfaceKind: 'ledge' }) }), null);
  assert.equal(sampleFrontierRegionalPlaceChunk(-5, -2, { getTerrainSample: FLAT_SUNSCAR, getHeight: x => x }), null);
  assert.equal(sampleFrontierRegionalPlaceChunk(-5, -2, {
    getTerrainSample: () => ({ ...FLAT_SUNSCAR(), coastDistance: 1 }), getHeight: () => 9,
  }), null, 'the full seven-metre place stays beyond the dry shoreline margin');
  assert.equal(macroPlaces(-1, -1, { getTerrainSample: FLAT_SUNSCAR, getHeight: () => 9 }).length, 0, 'the protected Camp/Skybreak corridor remains exact even with injected regional terrain');
  for (let cz = -2; cz <= 3; cz += 1) for (let cx = 1; cx <= 5; cx += 1) {
    const place = sampleFrontierRegionalPlaceChunk(cx, cz, { getTerrainSample: FLAT_SUNSCAR, getHeight: () => 9 });
    if (place) assert.ok(Math.hypot(place.center.x - 170, place.center.z - 50) >= 30);
  }
});

test('one shared asset gate requires the real finite crystal and every usable decor asset', () => {
  const ids = ['asset_crystal', 'asset_fen_stone', 'asset_cloudflower', 'asset_trail_stones'];
  const assets = WORLD_DATA.visualAssets.filter(asset => ids.includes(asset.id));
  assert.equal(hasRegionalPlaceAssets(assets), true);
  for (const missingId of ids) assert.equal(hasRegionalPlaceAssets(assets.filter(asset => asset.id !== missingId)), false, missingId);
  const rejects = (label, mutate) => {
    const malformed = structuredClone(assets);
    mutate(malformed);
    assert.equal(hasRegionalPlaceAssets(malformed), false, label);
  };
  rejects('chunk count', catalog => { catalog.find(asset => asset.id === 'asset_crystal').gameplay.harvestable.maxChunks = 5; });
  rejects('feedback profile', catalog => { catalog.find(asset => asset.id === 'asset_crystal').gameplay.harvestable.feedbackProfile = 'fiber'; });
  rejects('respawn time', catalog => { catalog.find(asset => asset.id === 'asset_crystal').gameplay.harvestable.respawnSeconds = 27; });
  rejects('collider offset', catalog => { catalog.find(asset => asset.id === 'asset_crystal').collision.offset.x = 100; });
  rejects('empty parts', catalog => { catalog.find(asset => asset.id === 'asset_trail_stones').parts = []; });
  rejects('non-renderable part', catalog => { catalog.find(asset => asset.id === 'asset_trail_stones').parts = [{}]; });
  rejects('invalid mesh index', catalog => {
    const part = catalog.find(asset => asset.id === 'asset_cloudflower').parts[0];
    part.geometry.indices[0] = part.geometry.positions.length / 3;
  });
});

test('all witness parts and its open approach have support and solid footprints do not overlap', () => {
  const place = sampleFrontierRegionalPlaceChunk(-5, -2);
  const height = (x, z) => sampleFrontier(x, z).height;
  const radii = { asset_crystal: 1.3, asset_fen_stone: 1.14, asset_cloudflower: 1.02, asset_trail_stones: 1.57 };
  assert.equal(hasFootprintSupport(place.center.x, place.center.z, { getHeight: height, radius: FRONTIER_REGIONAL_PLACE_RADIUS, maxSlope: .28 }), true);
  const parts = [
    ...place.resources.map(part => ({ ...part, scale: part.uniformScale })),
    ...place.scenery,
  ];
  for (const part of parts) assert.equal(hasFootprintSupport(part.x, part.z, {
    getHeight: height, radius: radii[part.assetId] * part.scale, maxSlope: .28,
  }), true, part.key ?? String(part.index));
  const approach = {
    x: place.center.x + Math.sin(place.yaw) * 4.8,
    z: place.center.z + Math.cos(place.yaw) * 4.8,
  };
  assert.equal(hasFootprintSupport(approach.x, approach.z, { getHeight: height, radius: 1.15, maxSlope: .28 }), true);
  for (const part of parts) assert.ok(Math.hypot(part.x - approach.x, part.z - approach.z) > 1.15 + radii[part.assetId] * part.scale, part.key ?? String(part.index));
  const rearLeft = place.scenery.find(part => part.key.endsWith(':rear-stone-left'));
  assert.ok(Math.abs(rearLeft.x - (place.center.x + -1.78 * Math.cos(place.yaw) + -1.58 * Math.sin(place.yaw))) < 1e-12);
  assert.ok(Math.abs(rearLeft.z - (place.center.z - -1.78 * Math.sin(place.yaw) + -1.58 * Math.cos(place.yaw))) < 1e-12);
  assert.ok(place.scenery.every(part => Math.abs(part.x - place.center.x) <= 3.5 && Math.abs(part.z - place.center.z) <= 3.5), 'the final pocket stays compact');
  for (let i = 0; i < parts.length; i += 1) for (let j = i + 1; j < parts.length; j += 1) {
    const a = parts[i], b = parts[j];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > radii[a.assetId] * a.scale + radii[b.assetId] * b.scale);
  }
});

test('cleft places use only reserved crystal slots 200 and 201 and keep resources physically separate', () => {
  let cleft = null;
  for (let mz = 2; mz < 20 && !cleft; mz += 1) for (let mx = 2; mx < 20 && !cleft; mx += 1) {
    cleft = macroPlaces(mx, mz, { getTerrainSample: FLAT_SUNSCAR, getHeight: () => 9 }).find(place => place.layout === 'cleft') ?? null;
  }
  assert.ok(cleft);
  assert.deepEqual(FRONTIER_REGIONAL_PLACE_RESOURCE_SLOTS, { main: 200, outer: 201 });
  assert.deepEqual(cleft.resources.map(resource => resource.index), [200, 201]);
  assert.ok(cleft.resources.every(resource => resource.assetId === 'asset_crystal'));
  const [main, outer] = cleft.resources;
  assert.ok(Math.hypot(main.x - outer.x, main.z - outer.z) > 1.3 * (main.uniformScale + outer.uniformScale));
  const radii = { asset_crystal: 1.3, asset_fen_stone: 1.14, asset_cloudflower: 1.02, asset_trail_stones: 1.57 };
  const parts = [...cleft.resources.map(part => ({ ...part, scale: part.uniformScale })), ...cleft.scenery];
  for (let i = 0; i < parts.length; i += 1) for (let j = i + 1; j < parts.length; j += 1) {
    const a = parts[i], b = parts[j];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > radii[a.assetId] * a.scale + radii[b.assetId] * b.scale);
  }
  assert.ok(cleft.resources.length <= 2);
});
