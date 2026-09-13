import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FRONTIER_SCENERY_CONFIG, FRONTIER_SCENERY_PLACE_LOOKUP_CAP, FRONTIER_SCENERY_POINT_MEMO_CAP, sampleFrontierSceneryChunk, selectFrontierScenery, createFrontierGroundCoverFilter, createFrontierSceneryBuild, createFrontierSceneryRecipeCache } from '../src/world/frontierScenery.js';
import { createFrontierSceneryVisual } from '../src/world/frontierSceneryVisual.js';
import { sampleFrontier, sampleFrontierHeight } from '../src/world/frontierTerrain.js';
import { sampleFrontierForageChunk } from '../src/world/frontierEcology.js';
import { sampleFrontierWildlifeChunk } from '../src/world/frontierWildlife.js';
import { DEFAULT_FRONTIER_WORLD } from '../src/world/frontierWorld.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { sampleFrontierRegionalPlaceChunk } from '../src/world/frontierRegionalPlace.js';
import { hasFrontierLandFootprint } from '../src/world/frontierContinent.js';
import { FRONTIER_SIGNAL_CACHE } from '../src/world/frontierFixedSites.js';
import { WORLD_DATA } from '../src/world/data/world.generated.js';

const chunkGrid = (cx, cz) => {
  const chunks = [];
  for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) chunks.push({ id: `${x},${z}`, cx: x, cz: z });
  return { center: { cx, cz }, chunks };
};

test('the Sunscar bloom decor enters scenery as one exact low-prop formation within existing caps', () => {
  const options = { visualAssets: WORLD_DATA.visualAssets };
  const place = sampleFrontierRegionalPlaceChunk(-5, -2, options);
  assert.ok(place);
  const chunkSpecs = sampleFrontierSceneryChunk(-5, -2, options);
  const formation = chunkSpecs.filter(spec => spec.regionalPlaceId === place.id);
  assert.equal(formation.length, 7);
  assert.deepEqual(formation.map(spec => ({
    assetId: spec.assetId, x: spec.x, y: spec.y, z: spec.z, scale: spec.scale, yaw: spec.yaw,
  })), place.scenery.map(spec => ({
    assetId: spec.assetId, x: spec.x, y: spec.y, z: spec.z, scale: spec.scale, yaw: spec.yaw,
  })), 'scenery consumes the authored world transforms without rotating or regrounding them');
  assert.ok(chunkSpecs.some(spec => spec.id === 'f2c:s:-5:-2:seed-19'), 'safe foreground stones retain their established source recipe');
  assert.ok(!chunkSpecs.some(spec => spec.id === 'f2c:s:-5:-2:seed-22'), 'the old overlapping foreground stones remain excluded by the bloom footprint');

  const selected = selectFrontierScenery(chunkGrid(-5, -2), options);
  const selectedFormation = selected.filter(spec => spec.regionalPlaceId === place.id);
  assert.equal(selectedFormation.length, place.scenery.length, 'the nearby formation is admitted whole');
  assert.ok(selected.length <= FRONTIER_SCENERY_CONFIG.maxTotal);
  const nearSelected = selected.filter(spec => {
    const [cx, cz] = spec.chunkId.split(',').map(Number);
    return Math.max(Math.abs(cx + 5), Math.abs(cz + 2)) <= 1;
  });
  assert.ok(nearSelected.length <= FRONTIER_SCENERY_CONFIG.maxNear);
});

test('the Lush grove retains all seven mixed scenery slots as one capped nearby group', () => {
  const options = { visualAssets: WORLD_DATA.visualAssets };
  const place = sampleFrontierRegionalPlaceChunk(-5, 9, options);
  const chunkSpecs = sampleFrontierSceneryChunk(-5, 9, options);
  const formation = chunkSpecs.filter(spec => spec.regionalPlaceId === place.id);
  assert.equal(formation.length, 7);
  assert.deepEqual(formation.map(spec => spec.kind), ['canopy', 'canopy', 'canopy', 'low', 'low', 'low', 'low']);
  assert.deepEqual(formation.map(spec => [spec.assetId, spec.x, spec.y, spec.z, spec.scale, spec.yaw]),
    place.scenery.map(spec => [spec.assetId, spec.x, spec.y, spec.z, spec.scale, spec.yaw]));
  const selected = selectFrontierScenery(chunkGrid(-5, 9), options);
  const selectedFormation = selected.filter(spec => spec.regionalPlaceId === place.id);
  assert.equal(selectedFormation.length, 7, 'the canopy-bearing grove survives as a whole group');
  assert.ok(selected.length <= FRONTIER_SCENERY_CONFIG.maxTotal);
  assert.ok(selected.filter(spec => spec.kind === 'canopy').length <= FRONTIER_SCENERY_CONFIG.maxCanopies);
});

test('one bounded adjacent-owner lookup excludes ordinary scenery and grass across a place boundary', () => {
  let placeCalls = 0;
  const place = Object.freeze({
    id: 'test-boundary-place', cx: -5, cz: -2, kind: 'sunscar-bloom',
    center: Object.freeze({ x: -200.2, z: -70 }), radius: 7,
    scenery: Object.freeze([]), resources: Object.freeze([]),
  });
  const flat = () => ({ height: 3, surfaceKind: 'ordinary', habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 0, provinceWeights: null });
  const options = {
    getHeight: () => 3, getTerrainSample: flat,
    visualAssets: WORLD_DATA.visualAssets,
    sampleForageChunk: () => [], sampleWildlifeChunk: () => [],
    sampleRegionalPlaceChunk: (cx, cz) => { placeCalls++; return cx === -5 && cz === -2 ? place : null; },
  };
  const filter = createFrontierGroundCoverFilter(options);
  for (let index = 0; index < 50; index++) assert.equal(filter(-199.9, -70), false);
  assert.equal(placeCalls, 9, 'the adjacent 3x3 owner neighborhood is sampled once and then reused');
  assert.ok(placeCalls <= FRONTIER_SCENERY_PLACE_LOOKUP_CAP);

  const baseline = sampleFrontierSceneryChunk(-4, -2, { ...options, sampleRegionalPlaceChunk: () => null });
  assert.ok(baseline.length > 0);
  const centeredPlace = { ...place, cx: -4, center: { x: baseline[0].x, z: baseline[0].z }, radius: 7 };
  const excluded = sampleFrontierSceneryChunk(-4, -2, {
    ...options, sampleRegionalPlaceChunk: (cx, cz) => cx === -4 && cz === -2 ? centeredPlace : null,
  });
  assert.ok(excluded.every(spec => Math.hypot(spec.x - centeredPlace.center.x, spec.z - centeredPlace.center.z) >= centeredPlace.radius + .62));
});

test('place lookup cap bounds storage without changing over-cap exclusion semantics', () => {
  let calls = 0;
  const flat = () => ({ height: 3, surfaceKind: 'ordinary', habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 0, provinceWeights: null });
  const place = Object.freeze({
    id: 'over-cap-place', cx: 100, cz: 100, kind: 'sunscar-bloom',
    center: Object.freeze({ x: 5025, z: 5025 }), radius: 7,
    scenery: Object.freeze([]), resources: Object.freeze([]),
  });
  const options = {
    getHeight: () => 3, getTerrainSample: flat,
    visualAssets: WORLD_DATA.visualAssets,
    sampleForageChunk: () => [], sampleWildlifeChunk: () => [],
    sampleRegionalPlaceChunk: (cx, cz) => { calls++; return cx === 100 && cz === 100 ? place : null; },
  };
  const saturated = createFrontierGroundCoverFilter(options);
  for (let index = 0; index < 9; index++) assert.equal(saturated((-20 - index * 4 + .5) * 50, -975), true);
  assert.equal(calls, FRONTIER_SCENERY_PLACE_LOOKUP_CAP, 'nine disjoint neighborhoods fill the bounded cache');
  assert.equal(saturated(5025, 5025), false, 'an uncached place beyond the cap still excludes its footprint');
  assert.equal(createFrontierGroundCoverFilter(options)(5025, 5025), false, 'over-cap result matches a fresh lookup');
});

test('missing or malformed bloom assets leave no reservation, partial group, or ordinary recipe hole', () => {
  const crystal = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_crystal');
  const trail = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_trail_stones');
  const catalogs = [
    WORLD_DATA.visualAssets.filter(asset => asset.id !== 'asset_crystal'),
    WORLD_DATA.visualAssets.map(asset => asset.id === 'asset_crystal'
      ? { ...crystal, collision: { ...crystal.collision, size: { ...crystal.collision.size, w: 2 } } } : asset),
    WORLD_DATA.visualAssets.filter(asset => asset.id !== 'asset_cloudflower'),
    WORLD_DATA.visualAssets.map(asset => asset.id === 'asset_trail_stones' ? { ...trail, parts: [] } : asset),
  ];
  for (const visualAssets of catalogs) {
    const common = {
      visualAssets,
      sampleForageChunk: () => [], sampleWildlifeChunk: () => [],
    };
    const expected = sampleFrontierSceneryChunk(-5, -2, { ...common, sampleRegionalPlaceChunk: () => null });
    const actual = sampleFrontierSceneryChunk(-5, -2, common);
    assert.ok(actual.length > 0 && actual.length <= 6, 'ordinary scenery keeps its established recipe budget');
    assert.ok(actual.every(spec => !spec.regionalPlaceId));
    assert.deepEqual(actual, expected);
  }
});

test('family-specific asset admission keeps grove catalog and scenery reservations in sync', () => {
  const withoutSunscarFlower = WORLD_DATA.visualAssets.filter(asset => asset.id !== 'asset_cloudflower');
  const grove = sampleFrontierRegionalPlaceChunk(-5, 9, { visualAssets: withoutSunscarFlower });
  assert.equal(grove?.kind, 'lush-root-cache');
  assert.equal(sampleFrontierSceneryChunk(-5, 9, { visualAssets: withoutSunscarFlower })
    .filter(spec => spec.regionalPlaceId === grove.id).length, 7);

  const withoutLushCanopy = WORLD_DATA.visualAssets.filter(asset => asset.id !== 'asset_verge_canopy_spread');
  assert.equal(sampleFrontierRegionalPlaceChunk(-5, 9, { visualAssets: withoutLushCanopy }), null);
  assert.equal(sampleFrontierSceneryChunk(-5, 9, { visualAssets: withoutLushCanopy })
    .some(spec => spec.regionalPlaceId?.endsWith(':lush-root-cache')), false);
});

test('one residency build shares a bounded exclusion-recipe cache across selection and ground cover', () => {
  let forageCalls = 0, wildlifeCalls = 0;
  const flatSample = () => ({ height: 3, surfaceKind: 'ordinary', habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 0, provinceWeights: null });
  const build = createFrontierSceneryBuild(chunkGrid(-13, -7), {
    getHeight: () => 3,
    getTerrainSample: flatSample,
    visualAssets: WORLD_DATA.visualAssets,
    sampleRegionalPlaceChunk: () => null,
    sampleForageChunk: () => { forageCalls++; return []; },
    sampleWildlifeChunk: () => { wildlifeCalls++; return []; },
  });
  const groundOwnerChunks = new Set();
  const visual = createFrontierSceneryVisual({
    specs: build.specs,
    visualAssets: [],
    getHeight: () => 3,
    canPlaceGroundCover: (x, z) => {
      groundOwnerChunks.add(`${Math.floor(x / 50)},${Math.floor(z / 50)}`);
      return build.canPlaceGroundCover(x, z);
    },
  });
  try {
    const previousCallsPerDomain = 25 * 9 + groundOwnerChunks.size * 9;
    assert.ok(groundOwnerChunks.size > 0 && groundOwnerChunks.size <= 25);
    assert.ok(previousCallsPerDomain > forageCalls, 'the retained source envelope replaces repeated selection/filter recipes');
    assert.equal(forageCalls, 49);
    assert.equal(wildlifeCalls, 49);
    assert.ok(forageCalls <= 81 && wildlifeCalls <= 81, 'the private 9x9 source envelope is a hard bound');
    const places = build.getRegionalPlaceLookupDebugState();
    assert.ok(places.placeCount > 0 && places.placeCount <= FRONTIER_SCENERY_PLACE_LOOKUP_CAP);
  } finally { visual.dispose(); build.releaseTerrainMemo(); }
  assert.deepEqual(build.getRegionalPlaceLookupDebugState(), { placeCount: 0 }, 'build release clears the place lookup retained by the grass closure');
});

test('shared exclusion recipes preserve selected specs and clearance decisions', () => {
  const residency = chunkGrid(4, -5);
  const options = { getHeight: () => 7.25, getTerrainSample: () => ({ height: 7.25, surfaceKind: 'ordinary', habitatBlend: { wetland: 1, fernUpland: 0 } }) };
  const expectedSpecs = selectFrontierScenery(residency, options);
  const expectedFilter = createFrontierGroundCoverFilter(options);
  const build = createFrontierSceneryBuild(residency, options);
  assert.deepEqual(build.specs, expectedSpecs);
  for (const [x, z] of [[205, -245], [224, -226], [249, -201], [200, -250], [255, -195]]) {
    assert.equal(build.canPlaceGroundCover(x, z), expectedFilter(x, z), `clearance parity at ${x},${z}`);
  }
});

test('a retained recipe cache reuses overlap across signed and diagonal shifts and resets on teleport', () => {
  const flatSample = () => ({ height: 3, surfaceKind: 'ordinary', habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 0, provinceWeights: null });
  const parityOptions = { getHeight: () => 3, getTerrainSample: flatSample, visualAssets: [], sampleForageChunk: () => [], sampleWildlifeChunk: () => [] };
  function shiftedCount(dx, dz, teleport = false) {
    const calls = { forage: 0, wildlife: 0 };
    const options = { ...parityOptions,
      sampleForageChunk: () => { calls.forage++; return []; },
      sampleWildlifeChunk: () => { calls.wildlife++; return []; },
    };
    const cache = createFrontierSceneryRecipeCache();
    const build = (cx, cz) => {
      const resident = chunkGrid(cx, cz);
      const retained = createFrontierSceneryBuild(resident, options, cache);
      const uncached = createFrontierSceneryBuild(resident, parityOptions);
      assert.deepEqual(retained.specs, uncached.specs);
      for (const spec of retained.specs) assert.equal(retained.canPlaceGroundCover(spec.x, spec.z), uncached.canPlaceGroundCover(spec.x, spec.z));
      const state = cache.getDebugState();
      assert.ok(state.forageCount <= 81 && state.wildlifeCount <= 81);
    };
    build(-13, -7);
    assert.deepEqual(calls, { forage: 49, wildlife: 49 });
    calls.forage = calls.wildlife = 0;
    build(teleport ? 8 : -13 + dx, teleport ? 9 : -7 + dz);
    return calls;
  }
  assert.deepEqual(shiftedCount(1, 0), { forage: 7, wildlife: 7 }, 'positive axis samples only the new source column');
  assert.deepEqual(shiftedCount(-1, 0), { forage: 7, wildlife: 7 }, 'negative axis samples only the new source column');
  assert.deepEqual(shiftedCount(1, 1), { forage: 13, wildlife: 13 }, 'diagonal samples only two new source edges');
  assert.deepEqual(shiftedCount(0, 0, true), { forage: 49, wildlife: 49 }, 'teleport prunes the disjoint window before rebuilding');
});

test('completed ordinary and near-only infill recipes retry failures and prune independently', () => {
  const cache = createFrontierSceneryRecipeCache();
  let fail = true;
  const options = {
    getHeight: () => 3,
    getTerrainSample: () => {
      if (fail) throw new Error('retryable terrain sample');
      return { height: 3, surfaceKind: null, habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 0, provinceWeights: null };
    },
    visualAssets: [], sampleRegionalPlaceChunk: () => null,
    sampleForageChunk: () => [], sampleWildlifeChunk: () => [],
  };
  assert.throws(() => createFrontierSceneryBuild(chunkGrid(6, 6), options, cache), /retryable terrain sample/);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 0, infillCount: 0 });

  fail = false;
  const first = createFrontierSceneryBuild(chunkGrid(6, 6), options, cache);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 25, infillCount: 9 });
  const firstIds = first.specs.map(spec => spec.id);
  first.releaseTerrainMemo();

  const repeated = createFrontierSceneryBuild(chunkGrid(6, 6), options, cache);
  assert.deepEqual(repeated.specs.map(spec => spec.id), firstIds);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 25, infillCount: 9 });
  repeated.releaseTerrainMemo();

  const shifted = createFrontierSceneryBuild(chunkGrid(7, 6), options, cache);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 30, infillCount: 12 });
  shifted.releaseTerrainMemo();

  const teleported = createFrontierSceneryBuild(chunkGrid(-8, -8), options, cache);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 25, infillCount: 9 });
  teleported.releaseTerrainMemo();

  const inactive = createFrontierSceneryBuild({ center: null, chunks: [] }, options, cache);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 0, infillCount: 0 });
  inactive.releaseTerrainMemo();
});

test('one exact point memo removes repeated terrain work without changing selected or visible output', () => {
  const resident = chunkGrid(-13, -7);
  function instrumentedOptions() {
    const heightKeys = new Map(), sampleKeys = new Map();
    const hit = (map, x, z) => { const key = `${x},${z}`; map.set(key, (map.get(key) ?? 0) + 1); };
    return {
      heightKeys, sampleKeys,
      options: {
        getHeight: (x, z) => { hit(heightKeys, x, z); return 3; },
        getTerrainSample: (x, z) => {
          hit(sampleKeys, x, z);
          return { height: 3, surfaceKind: 'ordinary', habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 0, provinceWeights: null };
        },
        visualAssets: [],
      },
    };
  }
  const raw = instrumentedOptions();
  const rawSpecs = selectFrontierScenery(resident, raw.options);
  const rawVisual = createFrontierSceneryVisual({ specs: rawSpecs, visualAssets: [], getHeight: raw.options.getHeight,
    canPlaceGroundCover: createFrontierGroundCoverFilter(raw.options) });
  const memo = instrumentedOptions();
  const build = createFrontierSceneryBuild(resident, memo.options);
  const memoVisual = createFrontierSceneryVisual({ specs: build.specs, visualAssets: [], getHeight: build.getHeight,
    canPlaceGroundCover: build.canPlaceGroundCover });
  try {
    assert.deepEqual(build.specs, rawSpecs);
    assert.deepEqual(memoVisual.stats, rawVisual.stats);
    const ground = visual => visual.group.getObjectByName('frontier_scenery_ground_cover');
    assert.deepEqual(Array.from(ground(memoVisual).instanceMatrix.array), Array.from(ground(rawVisual).instanceMatrix.array));
    assert.deepEqual(Array.from(ground(memoVisual).instanceColor.array), Array.from(ground(rawVisual).instanceColor.array));
    const total = maps => [...maps.heightKeys.values(), ...maps.sampleKeys.values()].reduce((sum, count) => sum + count, 0);
    assert.equal([...memo.heightKeys.values()].every(count => count === 1), true);
    assert.ok(Math.max(...memo.sampleKeys.values()) <= 32, 'bounded over-cap footprint probes may recompute without changing output');
    assert.ok(total(raw) - total(memo) > 2_000, 'the fixture removes substantial exact duplicate terrain work');
    const memoState = build.getTerrainMemoDebugState();
    assert.ok(memoState.heightCount > 0 && memoState.heightCount <= FRONTIER_SCENERY_POINT_MEMO_CAP);
    assert.ok(memoState.sampleCount > 0 && memoState.sampleCount <= FRONTIER_SCENERY_POINT_MEMO_CAP);
  } finally {
    rawVisual.dispose(); memoVisual.dispose(); build.releaseTerrainMemo();
  }
  assert.deepEqual(build.getTerrainMemoDebugState(), { heightCount: 0, sampleCount: 0 });
});

test('point memo keeps height and sample semantics separate, preserves fallback, and stops growing at its cap', () => {
  const empty = { center: { cx: 5, cz: 5 }, chunks: [] };
  let heightCalls = 0, sampleCalls = 0;
  const build = createFrontierSceneryBuild(empty, {
    getHeight: () => { heightCalls++; return 9; },
    getTerrainSample: () => { sampleCalls++; return { height: 7 }; },
  });
  heightCalls = sampleCalls = 0;
  assert.equal(build.getHeight(1, 2), 9);
  assert.equal(build.getTerrainSample(1, 2).height, 7);
  assert.equal(build.getHeight(1, 2), 9);
  assert.equal(build.getTerrainSample(1, 2).height, 7);
  assert.deepEqual({ heightCalls, sampleCalls }, { heightCalls: 1, sampleCalls: 1 });

  let optedHeightCalls = 0, optedSampleCalls = 0;
  const coalesced = createFrontierSceneryBuild(empty, {
    heightMatchesTerrainSample: true,
    getHeight: () => { optedHeightCalls++; return 9; },
    getTerrainSample: () => { optedSampleCalls++; return { height: 7 }; },
  });
  optedHeightCalls = optedSampleCalls = 0;
  assert.equal(coalesced.getTerrainSample(1, 2).height, 7);
  assert.equal(coalesced.getHeight(1, 2), 7);
  assert.equal(coalesced.getHeight(1, 2), 7);
  assert.deepEqual({ optedHeightCalls, optedSampleCalls }, { optedHeightCalls: 0, optedSampleCalls: 1 });
  assert.deepEqual(coalesced.getTerrainMemoDebugState(), { heightCount: 0, sampleCount: 2 });
  coalesced.releaseTerrainMemo();
  for (let index = 0; index < FRONTIER_SCENERY_POINT_MEMO_CAP + 20; index++) {
    build.getHeight(index + 10, -1);
    build.getTerrainSample(index + 10, -1);
  }
  assert.deepEqual(build.getTerrainMemoDebugState(), { heightCount: FRONTIER_SCENERY_POINT_MEMO_CAP, sampleCount: FRONTIER_SCENERY_POINT_MEMO_CAP });
  build.releaseTerrainMemo();

  let fallbackCalls = 0;
  const fallback = createFrontierSceneryBuild(empty, { getTerrainSample: () => { fallbackCalls++; return { height: 6.5 }; } });
  fallbackCalls = 0;
  assert.equal(fallback.getHeight(3, 4), 6.5);
  assert.equal(fallback.getHeight(3, 4), 6.5);
  assert.equal(fallbackCalls, 1);
  fallback.releaseTerrainMemo();
});

test('Lush-weighted near infill is bounded, deterministic, supported, and keeps ordinary identities', () => {
  const terrain = provinceWeights => () => ({
    height: 3, surfaceKind: null, habitatBlend: { wetland: 0, fernUpland: 1 },
    coastDistance: 100, inlandDirection: { x: 1, z: 0 }, provinceInfluence: 1, provinceWeights,
  });
  const options = provinceWeights => ({
    getHeight: () => 3, getTerrainSample: terrain(provinceWeights), visualAssets: WORLD_DATA.visualAssets,
    sampleRegionalPlaceChunk: () => null, sampleForageChunk: () => [], sampleWildlifeChunk: () => [],
  });
  const resident = { center: { cx: 6, cz: 6 }, chunks: [{ id: '6,6', cx: 6, cz: 6 }] };
  const dry = selectFrontierScenery(resident, options({ lush: 0, sunscar: 0, ironspine: 1 }));
  const blend = selectFrontierScenery(resident, {
    ...options({ lush: 1, sunscar: 0, ironspine: 0 }),
    getTerrainSample: () => ({ ...terrain({ lush: 1, sunscar: 0, ironspine: 0 })(), provinceInfluence: .5 }),
  });
  const lushOptions = options({ lush: 1, sunscar: 0, ironspine: 0 });
  const lush = selectFrontierScenery(resident, lushOptions);
  const infill = specs => specs.filter(spec => spec.id.startsWith('f2c:i:'));
  assert.deepEqual([infill(dry).length, infill(blend).length, infill(lush).length], [64, 160, 256]);
  assert.deepEqual(selectFrontierScenery(resident, lushOptions), lush);
  const cache = createFrontierSceneryRecipeCache();
  const outerFirst = createFrontierSceneryBuild({ center: { cx: 4, cz: 6 }, chunks: resident.chunks }, lushOptions, cache);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 1, infillCount: 0 });
  assert.equal(outerFirst.specs.some(spec => spec.id.startsWith('f2c:i:')), false);
  outerFirst.releaseTerrainMemo();
  const promotedNear = createFrontierSceneryBuild({ center: { cx: 5, cz: 6 }, chunks: resident.chunks }, lushOptions, cache);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 1, infillCount: 1 });
  assert.equal(promotedNear.specs.filter(spec => spec.id.startsWith('f2c:i:')).length, 256);
  promotedNear.releaseTerrainMemo();
  const ordinaryIds = sampleFrontierSceneryChunk(6, 6, lushOptions).map(spec => spec.id);
  assert.deepEqual(lush.filter(spec => !spec.id.startsWith('f2c:i:')).map(spec => spec.id), ordinaryIds);
  assert.equal(new Set(lush.map(spec => spec.id)).size, lush.length);

  const radiusFor = spec => Math.max(.62, ({ asset_cloudflower: .75, asset_trail_stones: 1.4, asset_fen_stone: 1.14,
    asset_mushroom_ring: 1.05, asset_fen_reed: .85, asset_fen_lily: .93 }[spec.assetId] ?? 0) * spec.scale);
  for (const spec of infill(lush)) {
    const radius = radiusFor(spec);
    assert.ok(spec.x >= 300 + radius && spec.x <= 350 - radius && spec.z >= 300 + radius && spec.z <= 350 - radius);
  }
  for (let index = 0; index < lush.length; index++) for (let other = index + 1; other < lush.length; other++) {
    const a = lush[index], b = lush[other];
    if (!a.id.startsWith('f2c:i:') && !b.id.startsWith('f2c:i:')) continue;
    if (a.kind !== 'canopy' && b.kind !== 'canopy' && a.assetId !== 'asset_fen_stone' && b.assetId !== 'asset_fen_stone') continue;
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= radiusFor(a) + radiusFor(b));
  }
});

test('the shared lily envelope rejects an ordinary placement whose authored footprint crosses a lip', () => {
  const sample = () => ({ height: 3, surfaceKind: null, habitatBlend: { wetland: 1, fernUpland: 0 },
    provinceInfluence: 1, provinceWeights: { lush: 1, sunscar: 0, ironspine: 0 } });
  const options = { getHeight: () => 3, getTerrainSample: sample, visualAssets: WORLD_DATA.visualAssets,
    sampleRegionalPlaceChunk: () => null, sampleForageChunk: () => [], sampleWildlifeChunk: () => [] };
  const baseline = sampleFrontierSceneryChunk(2, 2, options);
  const lily = baseline.find(spec => spec.assetId === 'asset_fen_lily');
  assert.ok(lily);
  const radius = Math.max(.62, .93 * lily.scale);
  const lipHeight = (x, z) => Math.abs(Math.hypot(x - lily.x, z - lily.z) - radius) < 1e-6 ? 3 + radius * .33 : 3;
  const guarded = sampleFrontierSceneryChunk(2, 2, { ...options, getHeight: lipHeight });
  assert.equal(guarded.some(spec => spec.id === lily.id), false);
});

test('content recipes replay for one world descriptor and redistribute for another without changing source ID formats', () => {
  const alternate = { edition: 1, seed: 0x6d2b79a1 };
  const defaultRecipes = {
    forage: sampleFrontierForageChunk(3, 2, { world: DEFAULT_FRONTIER_WORLD }),
    wildlife: sampleFrontierWildlifeChunk(1, -1, { world: DEFAULT_FRONTIER_WORLD }),
    scenery: sampleFrontierSceneryChunk(4, -5, { world: DEFAULT_FRONTIER_WORLD }),
  };
  const alternateRecipes = {
    forage: sampleFrontierForageChunk(3, 2, { world: alternate }),
    wildlife: sampleFrontierWildlifeChunk(1, -1, { world: alternate }),
    scenery: sampleFrontierSceneryChunk(4, -5, { world: alternate }),
  };
  assert.deepEqual(sampleFrontierForageChunk(3, 2, { world: alternate }), alternateRecipes.forage);
  assert.deepEqual(sampleFrontierWildlifeChunk(1, -1, { world: alternate }), alternateRecipes.wildlife);
  assert.deepEqual(sampleFrontierSceneryChunk(4, -5, { world: alternate }), alternateRecipes.scenery);
  assert.notDeepEqual(alternateRecipes.forage, defaultRecipes.forage);
  assert.notDeepEqual(alternateRecipes.wildlife, defaultRecipes.wildlife);
  assert.notDeepEqual(alternateRecipes.scenery, defaultRecipes.scenery);
  assert.ok([...alternateRecipes.forage, ...alternateRecipes.wildlife].every(node => (node.originId ?? node.id).startsWith('f1:')));
});

test('wide grass patches preserve Camp, routes, terrace and resource/creature feet', () => {
  const filter = createFrontierGroundCoverFilter();
  for (const [x,z] of [[0,0],[0,-54],[7,-75],[24,-120],[7,-85],[20,-95]]) {
    assert.equal(filter(x,z),false,`protected grass point ${x},${z}`);
  }
  const forage = sampleFrontierForageChunk(0,-2);
  assert.ok(forage.length);
  for (const node of forage) assert.equal(filter(node.pos.x,node.pos.z),false);
  assert.equal(filter(9,-74),true,'soft plants may grow beside the route within the wider habitat patch');
  assert.equal(filter(NaN,0),false);
  const steep = createFrontierGroundCoverFilter({getHeight:(x,z)=>x});
  assert.equal(steep(9,-74),false,'wide patch edges cannot cross steep ground');
});

test('alternate-world grass exclusions honor that world’s forage and wildlife placements', () => {
  const world = { edition: 1, seed: 0x6d2b79a1 };
  const filter = createFrontierGroundCoverFilter({ world });
  const forage = sampleFrontierForageChunk(0, -2, { world });
  const wildlife = sampleFrontierWildlifeChunk(0, -2, { world });
  assert.ok(forage.length && wildlife.length);
  assert.ok(forage.every(node => filter(node.pos.x, node.pos.z) === false));
  assert.ok(wildlife.every(node => filter(node.homePos.x, node.homePos.z) === false));
});

test('ordinary scenery keeps its attempt budget but emits no wet-footprint props', () => {
  const wet = () => ({ height: -2, coastDistance: -1, habitatBlend: { wetland: 0, fernUpland: 1 }, surfaceKind: null });
  assert.deepEqual(sampleFrontierSceneryChunk(12, 12, { getTerrainSample: wet, getHeight: () => -2 }), []);
});

test('coastal stone slots follow the dry contour, frame a central exit, and skip unavailable kit pieces', () => {
  const specs = sampleFrontierSceneryChunk(6, 2, { visualAssets: WORLD_DATA.visualAssets });
  const contour = specs.filter(spec => /^f2c:s:6:2:seed-[0-4]$/.test(spec.id));
  assert.equal(contour.length, 5);
  assert.deepEqual(contour.map(spec => spec.assetId), [
    'asset_fen_stone', 'asset_trail_stones', 'asset_trail_stones', 'asset_fen_stone', 'asset_trail_stones',
  ]);
  const center = sampleFrontier(325, 125), inward = center.inlandDirection;
  const anchor = { x: 325 + inward.x * (8 - center.coastDistance), z: 125 + inward.z * (8 - center.coastDistance) };
  const tangent = { x: -inward.z, z: inward.x };
  const offsets = contour.map(spec => (spec.x - anchor.x) * tangent.x + (spec.z - anchor.z) * tangent.z);
  const westCluster = offsets.filter(offset => offset < 0), eastCluster = offsets.filter(offset => offset > 0);
  assert.deepEqual([westCluster.length, eastCluster.length], [3, 2]);
  assert.ok(Math.min(...eastCluster) - Math.max(...westCluster) >= 12,
    'two readable subclusters preserve a central shore exit wider than three metres');
  assert.ok(Math.max(...offsets) - Math.min(...offsets) >= 12, 'the formation reads along the shoreline rather than as one pile');
  assert.ok(contour.filter(spec => spec.assetId === 'asset_fen_stone')
    .every(spec => spec.scale >= 2.2 && spec.scale <= 2.8), 'Fen stones carry the readable one-metre-class silhouettes');
  for (const spec of contour) {
    const radius = (spec.assetId === 'asset_fen_stone' ? 1.14 : 1.4) * spec.scale;
    const terrain = sampleFrontier(spec.x, spec.z);
    assert.ok(terrain.coastDistance >= 4 && terrain.coastDistance <= 12);
    assert.equal(hasFrontierLandFootprint(spec.x, spec.z, { radius }), true);
    assert.equal(hasFootprintSupport(spec.x, spec.z, { getHeight: (x, z) => sampleFrontier(x, z).height,
      radius, maxSlope: .32 }), true);
  }
  const withoutFen = sampleFrontierSceneryChunk(6, 2, {
    visualAssets: WORLD_DATA.visualAssets.filter(asset => asset.id !== 'asset_fen_stone'),
  });
  assert.equal(withoutFen.some(spec => spec.assetId === 'asset_fen_stone'), false);
  assert.ok(withoutFen.filter(spec => spec.assetId === 'asset_trail_stones').length >= 2);
});

test('chunk recipes are deterministic, terrain-grounded, and habitat-dithered', () => {
  const flatWet = { getHeight: () => 7.25, getTerrainSample: () => ({ height: 7.25, habitatBlend: { wetland: 1, fernUpland: 0 } }) };
  const first = sampleFrontierSceneryChunk(4, -5, flatWet);
  assert.deepEqual(sampleFrontierSceneryChunk(4, -5, flatWet), first);
  assert.ok(first.length >= 2);
  assert.ok(first.every(spec => spec.y === 7.25 && Number.isFinite(spec.yaw) && Number.isFinite(spec.scale)));
  assert.ok(first.filter(spec => spec.kind === 'low').every(spec => ['asset_fen_reed', 'asset_fen_lily', 'asset_fen_stone'].includes(spec.assetId)));

  const flatDry = { getHeight: () => 3, getTerrainSample: () => ({ height: 3, habitatBlend: { wetland: 0, fernUpland: 1 } }) };
  const dry = sampleFrontierSceneryChunk(4, -5, flatDry);
  assert.ok(dry.filter(spec => spec.kind === 'low').every(spec => ['asset_mushroom_ring', 'asset_trail_stones'].includes(spec.assetId)));
  assert.equal(sampleFrontierSceneryChunk(0, 0, flatWet).length, 0, 'Camp chunks remain scenery-free');
});

test('regional scenery keeps legacy output at zero influence and makes the Sunscar witness sparse and treeless', () => {
  const legacySample = () => ({ height: 4, habitatBlend: { wetland: 0, fernUpland: 1 }, surfaceKind: null });
  const reservedSample = () => ({ ...legacySample(), provinceKind: 'sunscar', provinceInfluence: 0, provinceWeights: { lush: 0, sunscar: 1, ironspine: 0 } });
  assert.deepEqual(
    sampleFrontierSceneryChunk(4, -5, { getTerrainSample: reservedSample }),
    sampleFrontierSceneryChunk(4, -5, { getTerrainSample: legacySample }),
  );

  const witness = sampleFrontierSceneryChunk(-13, -7, { visualAssets: WORLD_DATA.visualAssets });
  assert.ok(witness.length >= 4 && witness.length <= 6);
  assert.equal(witness.some(spec => spec.kind === 'canopy'), false);
  assert.ok(witness.every(spec => ['asset_trail_stones', 'asset_fen_stone'].includes(spec.assetId)));
  const trailStones = witness.filter(spec => spec.assetId === 'asset_trail_stones');
  assert.ok(trailStones.every(spec => spec.scale >= 1.08));
  assert.ok(trailStones.filter(spec => spec.scale >= 1.3).length >= Math.ceil(trailStones.length * .66));
  assert.ok(witness.every(spec => {
    const height = sampleFrontier(spec.x, spec.z).height;
    const neighborHeights = [
      sampleFrontier(spec.x - 8, spec.z).height, sampleFrontier(spec.x + 8, spec.z).height,
      sampleFrontier(spec.x, spec.z - 8).height, sampleFrontier(spec.x, spec.z + 8).height,
    ];
    const neighboringHigh = Math.max(...neighborHeights);
    const localRelief = neighboringHigh - Math.min(height, ...neighborHeights);
    return localRelief < .05 || neighboringHigh - height >= .25;
  }), 'Sunscar anchors sit in a basin or at a rib toe instead of uniform scatter');
  assert.ok(witness.every(spec => spec.groundCover.density >= .18 && spec.groundCover.density < .182));
  assert.ok(witness.every(spec => spec.groundCover.dryWeight > .95 && spec.groundCover.influence === 1));
});

test('ground-cover exclusions use the same injected province sample as regional forage', () => {
  const terrain = () => ({
    height: 4,
    habitatBlend: { wetland: 0, fernUpland: 1 },
    surfaceKind: null,
    provinceInfluence: 1,
    provinceWeights: { lush: 0, sunscar: 1, ironspine: 0 },
  });
  const options = { getHeight: () => 4, getTerrainSample: terrain, visualAssets: WORLD_DATA.visualAssets };
  const forage = sampleFrontierForageChunk(4, -5, options);
  const filter = createFrontierGroundCoverFilter(options);
  assert.ok(forage.length > 0);
  assert.ok(forage.every(node => filter(node.pos.x, node.pos.z) === false));
});

test('the curated north route keeps three west/north canopies and eight damp east details', () => {
  const staged = [
    ...sampleFrontierSceneryChunk(-1, -2),
    ...sampleFrontierSceneryChunk(0, -2),
    ...sampleFrontierSceneryChunk(0, -3),
  ].filter(spec => spec.id.includes(':stage-'));
  assert.equal(staged.filter(spec => spec.kind === 'canopy').length, 3);
  assert.equal(staged.filter(spec => spec.kind === 'low').length, 8);
  assert.ok(staged.filter(spec => spec.kind === 'canopy').every(spec => spec.x <= 6));
  assert.ok(staged.filter(spec => spec.kind === 'low' && !['asset_mushroom_ring', 'asset_fen_stone'].includes(spec.assetId)).every(spec => spec.x >= 8.7 && spec.x <= 9.1));
  const mushroom = staged.find(spec => spec.assetId === 'asset_mushroom_ring');
  assert.deepEqual({ x: mushroom.x, z: mushroom.z, scale: mushroom.scale }, { x: 5.2, z: -77.4, scale: .8 });
  assert.ok(staged.filter(spec => spec.assetId === 'asset_fen_stone').every(spec => spec.scale <= .32));
  assert.ok(staged.filter(spec => spec.assetId === 'asset_fen_reed').every(spec => spec.scale <= .5));
  const nearTree = staged.find(spec => spec.id.endsWith('stage-tree-west-1'));
  assert.deepEqual({ assetId: nearTree.assetId, x: nearTree.x, z: -78.5, scale: nearTree.scale }, { assetId: 'asset_verge_canopy', x: 4.85, z: -78.5, scale: .82 });
});

test('Skybreak stages a supported supply thicket, cap-only cloudflowers, and three loose east descent stone groups', () => {
  const chunks = [[-1, -4], [0, -5], [0, -4]];
  const options = { visualAssets: WORLD_DATA.visualAssets };
  const staged = chunks.flatMap(([cx, cz]) => sampleFrontierSceneryChunk(cx, cz, options).filter(spec => spec.id.includes(':stage-skybreak-')));
  assert.equal(staged.length, 18);
  assert.ok(staged.every(spec => spec.id.includes(':stage-skybreak-')));
  assert.equal(staged.filter(spec => spec.id.includes('berry') || spec.id.includes('fiber')).length, 6);
  assert.deepEqual(staged.filter(spec => spec.id.includes('berry')).map(spec => spec.assetId).sort(), ['asset_fen_reed', 'asset_mushroom_ring', 'asset_verge_canopy_spread']);
  const cloudflowers = staged.filter(spec => spec.assetId === 'asset_cloudflower');
  assert.equal(cloudflowers.length, 3);
  assert.ok(cloudflowers.every(spec => sampleFrontier(spec.x, spec.z).surfaceKind === 'skybreak-cap'));
  const mossling = sampleFrontierWildlifeChunk(0, -5).find(animal => animal.homePos.x === 9.5 && animal.homePos.z === -231.5);
  assert.ok(mossling, 'the staged crown resident anchors the soft-flower exception');
  const distanceFromMossling = (spec) => Math.hypot(spec.x - mossling.homePos.x, spec.z - mossling.homePos.z);
  assert.ok(cloudflowers.every(spec => distanceFromMossling(spec) >= 3.1));
  assert.ok(cloudflowers.some(spec => distanceFromMossling(spec) < mossling.roamRadius + 2.5), 'only cap flowers may share the resident’s ordinary roaming ground');
  assert.ok(staged.filter(spec => !cloudflowers.includes(spec)).every(spec => distanceFromMossling(spec) >= mossling.roamRadius + 2.5), 'solid and non-cap scenery retain the established wildlife guard');
  const trailGroups = staged.filter(spec => spec.assetId === 'asset_trail_stones');
  assert.equal(trailGroups.length, 9);
  assert.ok(trailGroups.every(spec => spec.kind === 'low'));
  assert.deepEqual([...new Set(trailGroups.map(spec => spec.id.match(/stones-(high|mid|low)/)?.[1]))].sort(), ['high', 'low', 'mid']);
  const radiusFor = { asset_cloudflower: .75, asset_trail_stones: 1.4, asset_mushroom_ring: 1.05, asset_fen_reed: .85 };
  const height = (x, z) => sampleFrontier(x, z).height;
  for (const spec of staged) {
    const radius = Math.max(spec.kind === 'canopy' ? 1.45 : .62, (radiusFor[spec.assetId] ?? 0) * spec.scale);
    assert.equal(hasFootprintSupport(spec.x, spec.z, { getHeight: height, radius, maxSlope: .32 }), true, `${spec.id} retains full scaled footprint support`);
  }
  const resources = chunks.flatMap(([cx, cz]) => sampleFrontierForageChunk(cx, cz, options));
  for (const spec of staged) for (const resource of resources) assert.ok(Math.hypot(spec.x - resource.pos.x, spec.z - resource.pos.z) >= 3.2, `${spec.id} clears staged resource ${resource.id}`);
  for (const [cx, cz] of chunks) assert.ok(sampleFrontierSceneryChunk(cx, cz, options).length <= 9, `${cx},${cz} retains the Skybreak per-chunk recipe cap`);
});

test('accepted scenery stays clear of forage, wildlife roaming, Camp apron, route, and terrace', () => {
  const specs = [-3, -2, -1].flatMap(cz => [-1, 0, 1].flatMap(cx => sampleFrontierSceneryChunk(cx, cz)));
  const route = [[0, -56], [7, -68], [7, -85], [20, -95], [24, -118]];
  const segmentDistance = (p, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / lengthSq));
    return Math.hypot(p.x - a[0] - dx * t, p.z - a[1] - dz * t);
  };
  for (const spec of specs) {
    const [cx, cz] = spec.chunkId.split(',').map(Number);
    assert.equal(Math.floor(spec.x / 50), cx); assert.equal(Math.floor(spec.z / 50), cz);
    assert.ok(spec.x < -56 || spec.x > 56 || spec.z < -56 || spec.z > 56);
    assert.ok(!(spec.x >= 18 && spec.x <= 46 && spec.z >= -150 && spec.z <= -108));
    const routeClearance = spec.kind === 'canopy' || spec.assetId === 'asset_fen_stone' ? 2.1 : 1.15;
    for (let i = 1; i < route.length; i++) assert.ok(segmentDistance(spec, route[i - 1], route[i]) >= routeClearance);
    for (let fz = cz - 1; fz <= cz + 1; fz++) for (let fx = cx - 1; fx <= cx + 1; fx++) {
      for (const node of sampleFrontierForageChunk(fx, fz)) assert.ok(Math.hypot(spec.x - node.pos.x, spec.z - node.pos.z) >= 3.2, `${spec.id} clears neighboring forage ${node.id}`);
    }
    for (let wz = cz - 1; wz <= cz + 1; wz++) for (let wx = cx - 1; wx <= cx + 1; wx++) {
      for (const animal of sampleFrontierWildlifeChunk(wx, wz)) assert.ok(Math.hypot(spec.x - animal.homePos.x, spec.z - animal.homePos.z) >= animal.roamRadius + 2.5);
    }
    const h = (x, z) => sampleFrontier(x, z).height;
    const slope = Math.hypot((h(spec.x + .8, spec.z) - h(spec.x - .8, spec.z)) / 1.6, (h(spec.x, spec.z + .8) - h(spec.x, spec.z - .8)) / 1.6);
    assert.ok(slope <= .32 + 1e-9);
  }
});

test('residency selection enforces density, outer silhouettes, and stable center transitions', () => {
  const residency = chunkGrid(0, -2), selected = selectFrontierScenery(residency);
  assert.deepEqual(selectFrontierScenery({ ...residency, chunks: [...residency.chunks].reverse() }), selected, 'residency enumeration order does not affect selection');
  const near = selected.filter(spec => {
    const [cx, cz] = spec.chunkId.split(',').map(Number);
    return Math.max(Math.abs(cx - residency.center.cx), Math.abs(cz - residency.center.cz)) <= 1;
  });
  const outer = selected.filter(spec => !near.includes(spec));
  assert.ok(near.length <= FRONTIER_SCENERY_CONFIG.maxNear);
  assert.ok(outer.length <= FRONTIER_SCENERY_CONFIG.maxOuterDesired && outer.length <= FRONTIER_SCENERY_CONFIG.maxOuter);
  assert.ok(selected.length <= FRONTIER_SCENERY_CONFIG.maxTotal);
  assert.ok(selected.filter(spec => spec.kind === 'canopy').length <= FRONTIER_SCENERY_CONFIG.maxCanopies);
  assert.ok(outer.every(spec => spec.kind === 'canopy'));
  assert.ok([...new Set(outer.map(spec => spec.chunkId))].length === outer.length, 'outer chunks contribute at most one silhouette');

  const chunk = { id: '2,-2', cx: 2, cz: -2 };
  const nearVersion = selectFrontierScenery({ center: { cx: 1, cz: -2 }, chunks: [chunk] });
  const outerVersion = selectFrontierScenery({ center: { cx: 0, cz: -2 }, chunks: [chunk] });
  assert.equal(outerVersion.length, 1);
  assert.deepEqual(nearVersion.find(spec => spec.id === outerVersion[0].id), outerVersion[0], 'near/outer density reuses the exact world placement');
});

test('default-world scenery and ground cover preserve the fixed Signal receiver and chest', () => {
  const selected = selectFrontierScenery(chunkGrid(3, 1), { visualAssets: WORLD_DATA.visualAssets });
  const fixed = [
    { x: FRONTIER_SIGNAL_CACHE.x, z: FRONTIER_SIGNAL_CACHE.z },
    { x: FRONTIER_SIGNAL_CACHE.x + FRONTIER_SIGNAL_CACHE.chestOffset.x,
      z: FRONTIER_SIGNAL_CACHE.z + FRONTIER_SIGNAL_CACHE.chestOffset.z },
  ];
  const authoredRadius = {
    asset_cloudflower: .75, asset_trail_stones: 1.4, asset_fen_stone: 1.14,
    asset_mushroom_ring: 1.05, asset_fen_reed: .85, asset_fen_lily: .93,
  };
  for (const spec of selected) {
    const radius = Math.max(spec.kind === 'canopy' ? 1.45 : .62, (authoredRadius[spec.assetId] ?? 0) * spec.scale);
    for (const site of fixed) assert.ok(
      Math.hypot(spec.x - site.x, spec.z - site.z) >= FRONTIER_SIGNAL_CACHE.sceneryClearance + radius,
      `${spec.id} clears the fixed Signal object by its rendered footprint`,
    );
  }

  const emptyFlat = {
    getHeight: () => 3,
    getTerrainSample: () => ({ height: 3, surfaceKind: null, habitatBlend: { wetland: 0, fernUpland: 1 } }),
    sampleForageChunk: () => [], sampleWildlifeChunk: () => [], sampleRegionalPlaceChunk: () => null,
  };
  const groundCover = createFrontierGroundCoverFilter(emptyFlat);
  for (const site of fixed) {
    assert.equal(groundCover(site.x, site.z), false);
    assert.equal(groundCover(site.x + FRONTIER_SIGNAL_CACHE.sceneryClearance + .38 - .01, site.z), false);
  }
  const alternateGroundCover = createFrontierGroundCoverFilter({
    ...emptyFlat, world: { edition: DEFAULT_FRONTIER_WORLD.edition, seed: DEFAULT_FRONTIER_WORLD.seed + 1 },
  });
  assert.equal(alternateGroundCover(FRONTIER_SIGNAL_CACHE.x, FRONTIER_SIGNAL_CACHE.z), true,
    'the fixed edition-one site does not reserve alternate generated worlds');
});

test('protected starter, Skybreak and coast residencies retain their exact legacy selections', () => {
  const fixtures = [
    ['starter', 0, -2, 26, '0c740db352a0f532b203b5c85fe0433002a55531fcde4d3e175d0cc50af886b6'],
    ['Skybreak', 0, -4, 26, 'df0945c1bfd1579cb86b8591fd844d8846ed7a4cb5d87c55a16c0a624708dc16'],
    ['coast', 6, 2, 20, '8f1cf5b2207864a29d78befa3d93c8763054b334986987c6b15c96735809e514'],
  ];
  for (const [name, cx, cz, count, expectedHash] of fixtures) {
    const ids = selectFrontierScenery(chunkGrid(cx, cz)).map(spec => spec.id);
    assert.equal(ids.some(id => id.startsWith('f2c:i:')), false, `${name} remains outside dense infill`);
    assert.equal(ids.length, count);
    assert.equal(createHash('sha256').update(JSON.stringify(ids)).digest('hex'), expectedHash);
  }
});
