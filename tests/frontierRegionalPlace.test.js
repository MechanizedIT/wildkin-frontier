import test from 'node:test';
import assert from 'node:assert/strict';
import WORLD_DATA from '../src/world/data/world.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import {
  FRONTIER_REGIONAL_PLACE_RADIUS,
  FRONTIER_REGIONAL_PLACE_RESOURCE_SLOTS,
  FRONTIER_GROVE_CATALOG_CHUNK_BOUNDS,
  hasLushRootCacheAssets,
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

test('Lush grove compositions stay in their registered catalog domain while outer mineral places remain available', () => {
  assert.deepEqual(FRONTIER_GROVE_CATALOG_CHUNK_BOUNDS, { minCx: -42, maxCx: 13, minCz: -57, maxCz: 20 });
  assert.ok(Object.isFrozen(FRONTIER_GROVE_CATALOG_CHUNK_BOUNDS));
  const lush = () => ({ ...FLAT_SUNSCAR(), provinceKind: 'lush', provinceWeights: { lush: 1, sunscar: 0, ironspine: 0 }, coastDistance: 100 });
  const options = { visualAssets: WORLD_DATA.visualAssets, getHeight: () => 9 };
  const outsideWindows = [
    { x: 14, z: 5 }, { x: -60, z: -40 }, { x: -40, z: -75 }, { x: -20, z: 21 },
  ];
  for (const start of outsideWindows) {
    let mineralPlaces = 0;
    for (let dz = 0; dz < 16; dz++) for (let dx = 0; dx < 16; dx++) {
      const cx = start.x + dx, cz = start.z + dz;
      assert.equal(sampleFrontierRegionalPlaceChunk(cx, cz, { ...options, getTerrainSample: lush }), null,
        `no unregistered root cache at ${cx},${cz}`);
      if (sampleFrontierRegionalPlaceChunk(cx, cz, { ...options, getTerrainSample: FLAT_SUNSCAR })) mineralPlaces++;
    }
    assert.ok(mineralPlaces > 0, `ordinary mineral places continue beyond ${start.x},${start.z}`);
  }
  assert.equal(sampleFrontierRegionalPlaceChunk(-5, 9, { ...options, getTerrainSample: lush })?.kind, 'lush-root-cache');
});

test('default Lush owner becomes one supported deterministic root cache without changing its owner recipe', () => {
  const options = { visualAssets: WORLD_DATA.visualAssets };
  const place = sampleFrontierRegionalPlaceChunk(-5, 9, options);
  assert.deepEqual(sampleFrontierRegionalPlaceChunk(-5, 9, options), place);
  assert.ok(Object.isFrozen(place) && Object.isFrozen(place.chest));
  assert.deepEqual({ id: place.id, cx: place.cx, cz: place.cz, kind: place.kind, layout: place.layout, radius: place.radius }, {
    id: 'f1:p:-5:9:lush-root-cache', cx: -5, cz: 9, kind: 'lush-root-cache', layout: 'root-grove', radius: 7,
  });
  assert.deepEqual(place.center, { x: -222.58139716172158, z: 479.47494398673877 });
  assert.equal(place.yaw, .6658765729756316);
  assert.deepEqual(place.resources, []);
  assert.deepEqual(place.scenery.map(part => [part.assetId, part.kind, part.scale]), [
    ['asset_verge_canopy_spread', 'canopy', .65],
    ['asset_verge_canopy', 'canopy', .62],
    ['asset_verge_canopy_tall', 'canopy', .42],
    ['asset_fallen_log', 'low', .55], ['asset_fallen_log', 'low', .55],
    ['asset_fen_stone', 'low', .42], ['asset_ruin_arch', 'low', .45],
  ]);
  assert.deepEqual(place.chest, {
    x: -221.5929992648261, z: 480.7331449235579, yaw: .6658765729756316, scale: .7,
  });
  const expectedLocal = [
    ['canopy-left', -2.2, 2.8, -.2], ['canopy-right', 1.9, 2.7, .15], ['canopy-rear', .15, -.5, .1],
    ['log-left', -1.45, 3.25, -.55], ['log-right', 1.45, 3.35, .55],
    ['stone', 1.35, 1, .2], ['ruin-arch', -1.4, 1.2, 0],
  ];
  const cos = Math.cos(place.yaw), sin = Math.sin(place.yaw);
  for (const [key, x, z, yaw] of expectedLocal) {
    const part = place.scenery.find(candidate => candidate.key.endsWith(`:${key}`));
    const dx = part.x - place.center.x, dz = part.z - place.center.z;
    assert.ok(Math.abs((dx * cos - dz * sin) - x) < 1e-12, `${key} local x`);
    assert.ok(Math.abs((dx * sin + dz * cos) - z) < 1e-12, `${key} local z`);
    assert.ok(Math.abs(part.yaw - (place.yaw + yaw)) < 1e-12, `${key} local yaw`);
  }
  for (const key of ['log-left', 'log-right']) {
    const part = place.scenery.find(candidate => candidate.key.endsWith(`:${key}`));
    const dx = part.x - place.center.x, dz = part.z - place.center.z;
    const localX = dx * cos - dz * sin;
    assert.ok(Math.abs(localX) > 1.525 * part.scale + .5, `${key} leaves the center approach lane open`);
  }
  const height = (x, z) => sampleFrontier(x, z).height;
  assert.equal(hasFootprintSupport(place.center.x, place.center.z, {
    getHeight: height, radius: FRONTIER_REGIONAL_PLACE_RADIUS, maxSlope: .28,
  }), true);
  for (const part of [...place.scenery, place.chest]) {
    assert.equal(Number.isFinite(height(part.x, part.z)), true);
  }
  assert.equal(hasFootprintSupport(place.chest.x, place.chest.z, {
    getHeight: height, radius: .851 * place.chest.scale, maxSlope: .28,
  }), true, 'scaled chest footprint remains supported independently');
});

test('Lush root cache requires pure dry terrain, whole support, and its exact admitted stateless kit', () => {
  assert.equal(hasLushRootCacheAssets(WORLD_DATA.visualAssets), true);
  for (const id of ['asset_verge_canopy', 'asset_verge_canopy_spread', 'asset_verge_canopy_tall', 'asset_fallen_log', 'asset_fen_stone', 'asset_ruin_arch']) {
    assert.equal(hasLushRootCacheAssets(WORLD_DATA.visualAssets.filter(asset => asset.id !== id)), false, id);
  }
  const lush = () => ({
    ...FLAT_SUNSCAR(), provinceKind: 'lush', provinceWeights: { lush: 1, sunscar: 0, ironspine: 0 }, coastDistance: 100,
  });
  assert.equal(sampleFrontierRegionalPlaceChunk(-5, 9, {
    visualAssets: WORLD_DATA.visualAssets, getTerrainSample: () => ({ ...lush(), provinceWeights: { lush: .799, sunscar: .201, ironspine: 0 } }), getHeight: () => 9,
  }), null);
  assert.equal(sampleFrontierRegionalPlaceChunk(-5, 9, {
    visualAssets: WORLD_DATA.visualAssets, getTerrainSample: () => ({ ...lush(), coastDistance: 1 }), getHeight: () => 9,
  }), null);
  assert.equal(sampleFrontierRegionalPlaceChunk(-5, 9, {
    visualAssets: WORLD_DATA.visualAssets, getTerrainSample: lush, getHeight: x => x,
  }), null);
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
