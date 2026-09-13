import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { FRONTIER_SCENERY_CONFIG, FRONTIER_SCENERY_PLACE_LOOKUP_CAP, FRONTIER_SCENERY_POINT_MEMO_CAP, sampleFrontierSceneryChunk, selectFrontierScenery, createFrontierGroundCoverFilter, createFrontierSceneryBuild, createFrontierSceneryPrepareJob, createFrontierSceneryRecipeCache } from '../src/world/frontierScenery.js';
import { createFrontierSceneryVisual } from '../src/world/frontierSceneryVisual.js';
import { sampleFrontier, sampleFrontierHeight } from '../src/world/frontierTerrain.js';
import { FRONTIER_CALDERA_RESOURCE_ANCHORS, sampleFrontierForageChunk } from '../src/world/frontierEcology.js';
import { FRONTIER_CALDERA_WILDLIFE_ANCHOR, sampleFrontierWildlifeChunk } from '../src/world/frontierWildlife.js';
import { DEFAULT_FRONTIER_WORLD } from '../src/world/frontierWorld.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { sampleFrontierRegionalPlaceChunk } from '../src/world/frontierRegionalPlace.js';
import { hasFrontierLandFootprint } from '../src/world/frontierContinent.js';
import { FRONTIER_SIGNAL_CACHE } from '../src/world/frontierFixedSites.js';
import { overlapsFrontierCalderaClearLane } from '../src/world/frontierCaldera.js';
import { FRONTIER_FUNGAL_CONFIG, overlapsFrontierFungalRoute } from '../src/world/frontierFungalHollow.js';
import { WORLD_DATA } from '../src/world/data/world.generated.js';
import { CAMERA_CONFIG, createCamera } from '../src/game/createCamera.js';
import { CAMERA_CONFIG_FOLLOW } from '../src/game/config.js';
import { createCameraFollow } from '../src/camera/cameraFollow.js';

const chunkGrid = (cx, cz) => {
  const chunks = [];
  for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) chunks.push({ id: `${x},${z}`, cx: x, cz: z });
  return { center: { cx, cz }, chunks };
};

const flatFungalSample = () => ({
  height: 10, contentLand: true, coastDistance: 100, surfaceKind: null,
  habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 1,
  provinceWeights: { lush: 1, sunscar: 0, ironspine: 0 }, fungalWeight: 1,
  habitatWeights: { 'fungal-hollow': 1 },
});
const fungalSceneryOptions = visualAssets => ({
  visualAssets, getHeight: () => 10, getTerrainSample: flatFungalSample,
  sampleForageChunk: () => [], sampleWildlifeChunk: () => [], sampleRegionalPlaceChunk: () => null,
});
const fungalOwnerChunks = [[-58, -25], [-57, -25], [-58, -26], [-57, -26]];
const fixedFungalSpecs = visualAssets => fungalOwnerChunks.flatMap(([cx, cz]) =>
  sampleFrontierSceneryChunk(cx, cz, fungalSceneryOptions(visualAssets)))
  .filter(spec => spec.id.startsWith('f1:s:fungal-hollow:'));

test('the complete admitted Fungal shelf garden publishes 23 stable supported low props', () => {
  const specs = fixedFungalSpecs(WORLD_DATA.visualAssets);
  assert.equal(specs.length, 23);
  assert.equal(new Set(specs.map(spec => spec.id)).size, 23);
  assert.deepEqual(Object.fromEntries([...new Set(specs.map(spec => spec.assetId))].sort()
    .map(assetId => [assetId, specs.filter(spec => spec.assetId === assetId).length])), {
    asset_fallen_log: 2, asset_fen_stone: 3, asset_mushroom_ring: 6,
    asset_pebble_cluster: 8, asset_trail_stones: 4,
  });
  assert.ok(specs.every(spec => spec.kind === 'low' && spec.y === 10 && spec.groundCover?.fungalWeight === 1));
  const stoneA = specs.find(spec => spec.id === 'f1:s:fungal-hollow:stone-a');
  assert.deepEqual([stoneA?.x, stoneA?.z, stoneA?.scale, stoneA?.yaw], [-2853, -1247.75, .6, .18],
    'the west shelf stone retains the locked inside-view composition');
  const radiusFor = spec => ({ asset_fallen_log: 1.525, asset_fen_stone: 1.14,
    asset_mushroom_ring: 1.05, asset_pebble_cluster: .66, asset_trail_stones: 1.4 }[spec.assetId] * spec.scale);
  assert.ok(specs.every(spec => FRONTIER_FUNGAL_CONFIG.blossoms.every(blossom =>
    Math.hypot(spec.x - blossom.x, spec.z - blossom.z) >= radiusFor(spec) + blossom.footprintRadius)));
  const solids = specs.filter(spec => spec.assetId === 'asset_fen_stone');
  assert.ok(solids.every(spec => !overlapsFrontierFungalRoute(spec.x, spec.z, radiusFor(spec))));
  assert.ok(solids.every(spec => Math.hypot(spec.x - FRONTIER_FUNGAL_CONFIG.outing.thornHome.x,
    spec.z - FRONTIER_FUNGAL_CONFIG.outing.thornHome.z) >= radiusFor(spec) + FRONTIER_FUNGAL_CONFIG.outing.thornHome.radius));

  const integrated = fungalOwnerChunks.flatMap(([cx, cz]) =>
    sampleFrontierSceneryChunk(cx, cz, { visualAssets: WORLD_DATA.visualAssets }))
    .filter(spec => spec.id.startsWith('f1:s:fungal-hollow:'));
  assert.equal(integrated.length, 23);
  assert.ok(integrated.every(spec => hasFootprintSupport(spec.x, spec.z, {
    getHeight: sampleFrontierHeight, radius: radiusFor(spec), maxSlope: .32,
  })), 'the atomic group passes its actual transformed footprint on integrated terrain');
  const visual = createFrontierSceneryVisual({ specs: integrated, visualAssets: WORLD_DATA.visualAssets,
    getHeight: sampleFrontierHeight, canPlaceGroundCover: () => false });
  assert.deepEqual(visual.stats, { canopyCount: 0, lowCount: 23, stoneSolidCount: 3, surfaceCount: 3,
    lowDrawCount: 15, lowTriangleCount: 16842, lowGeometryCount: 5, lowGeometryVertexCount: 10740,
    lowInstanceCount: 23, groundDrawCount: 0, groundClusterCount: 0, groundClusterTriangleCount: 0 });
  visual.dispose();
});

test('Fungal fixed scenery retries atomically after an incomplete exact mesh kit', () => {
  for (const assetId of ['asset_mushroom_ring', 'asset_fallen_log', 'asset_fen_stone', 'asset_trail_stones', 'asset_pebble_cluster']) {
    const withoutAsset = WORLD_DATA.visualAssets.filter(asset => asset.id !== assetId);
    assert.equal(fixedFungalSpecs(withoutAsset).length, 0, `${assetId} absence rejects all 23 props`);
  }
  const fallenLog = WORLD_DATA.visualAssets.find(asset => asset.id === 'asset_fallen_log');
  const malformed = WORLD_DATA.visualAssets.map(asset => asset.id === fallenLog.id ? { ...asset, parts: [{}] } : asset);
  assert.equal(fixedFungalSpecs(malformed).length, 0);

  const cache = createFrontierSceneryRecipeCache();
  const incomplete = createFrontierSceneryBuild(chunkGrid(-58, -25), fungalSceneryOptions(malformed), cache);
  assert.equal(incomplete.specs.some(spec => spec.id.startsWith('f1:s:fungal-hollow:')), false);
  incomplete.releaseTerrainMemo();
  const repaired = createFrontierSceneryBuild(chunkGrid(-58, -25), fungalSceneryOptions(WORLD_DATA.visualAssets), cache);
  assert.equal(repaired.specs.filter(spec => spec.id.startsWith('f1:s:fungal-hollow:')).length, 23,
    'the same recipe cache retries every owner chunk rather than retaining a partial fixed group or infill hole');
  repaired.releaseTerrainMemo();
});

test('strong Fungal ordinary recipes favor complete Mooncap and low rubble models while logs stay rare', () => {
  const options = fungalSceneryOptions(WORLD_DATA.visualAssets);
  const chunks = [[-55, -24], [-54, -24], [-55, -25], [-54, -25], [-55, -26], [-54, -26], [-55, -27], [-54, -27]];
  const specs = chunks.flatMap(([cx, cz]) => sampleFrontierSceneryChunk(cx, cz, options));
  assert.equal(specs.length, 48);
  assert.ok(specs.every(spec => ['asset_mushroom_ring', 'asset_fallen_log', 'asset_fen_stone',
    'asset_trail_stones', 'asset_pebble_cluster'].includes(spec.assetId)));
  assert.ok(specs.filter(spec => ['asset_mushroom_ring', 'asset_pebble_cluster'].includes(spec.assetId)).length >= 40);
  assert.ok(specs.filter(spec => spec.assetId === 'asset_fallen_log').length <= 4,
    'the 2.8m log is a rare accent rather than the dominant repeated silhouette');
  assert.equal(specs.some(spec => spec.kind === 'canopy' || ['asset_fen_reed', 'asset_fen_lily'].includes(spec.assetId)), false);
});

test('ordinary Fungal solid stones reserve the complete Thorn home while soft dressing remains eligible', () => {
  const home = FRONTIER_FUNGAL_CONFIG.outing.thornHome;
  const specs = sampleFrontierSceneryChunk(-58, -26, {
    ...fungalSceneryOptions(WORLD_DATA.visualAssets),
    world: { edition: DEFAULT_FRONTIER_WORLD.edition, seed: 69 },
  });
  assert.equal(specs.some(spec => spec.id === 'f2c:s:-58:-26:seed-0'), false,
    'the deterministic Fen stone centered inside the Thorn home is rejected');
  assert.ok(specs.filter(spec => spec.assetId === 'asset_fen_stone').every(spec =>
    Math.hypot(spec.x - home.x, spec.z - home.z) >= 1.14 * spec.scale + home.radius));
  assert.ok(specs.some(spec => spec.id === 'f2c:s:-58:-26:seed-3' && spec.assetId === 'asset_pebble_cluster'),
    'nonblocking low rubble may still dress the home area');
});

test('the Caldera breach composition frames the portrait lane with supported admitted low props', () => {
  const options = { visualAssets: WORLD_DATA.visualAssets };
  const chunks = [[16, -40], [17, -40], [17, -41]];
  const staged = chunks.flatMap(([cx, cz]) => sampleFrontierSceneryChunk(cx, cz, options))
    .filter(spec => spec.id.includes(':stage-caldera-'));
  assert.deepEqual(staged.map(spec => [spec.id, spec.assetId]), [
    ['f2c:s:16:-40:stage-caldera-spire-left', 'asset_ember_spire'],
    ['f2c:s:16:-40:stage-caldera-bloom-left-front', 'asset_ember_bloom'],
    ['f2c:s:16:-40:stage-caldera-bloom-left-back', 'asset_ember_bloom'],
    ['f2c:s:16:-40:stage-caldera-rubble-left', 'asset_pebble_cluster'],
    ['f2c:s:17:-40:stage-caldera-spire-right', 'asset_ember_spire'],
    ['f2c:s:17:-40:stage-caldera-bloom-right-front', 'asset_ember_bloom'],
    ['f2c:s:17:-40:stage-caldera-bloom-right-back', 'asset_ember_bloom'],
    ['f2c:s:17:-40:stage-caldera-rubble-right', 'asset_pebble_cluster'],
    ['f2c:s:17:-41:stage-caldera-spire-rear', 'asset_ember_spire'],
  ]);
  const radiusFor = spec => Math.max(.62,
    { asset_ember_spire: 1.7, asset_ember_bloom: 1.02, asset_pebble_cluster: .66 }[spec.assetId] * spec.scale);
  assert.ok(staged.every(spec => !overlapsFrontierCalderaClearLane(spec.x, spec.z, radiusFor(spec))),
    'every complete prop footprint stays outside the four-metre breach lane');
  assert.ok(staged.every(spec => hasFootprintSupport(spec.x, spec.z, {
    getHeight: sampleFrontierHeight, radius: radiusFor(spec), maxSlope: .12,
  })), 'every fixed Caldera prop has complete support on the bowl or breach bench');
  assert.ok(staged.every(spec => Object.values(FRONTIER_CALDERA_RESOURCE_ANCHORS).every(resource => (
    Math.hypot(spec.x - resource.x, spec.z - resource.z) >= radiusFor(spec) + resource.footprintRadius * resource.uniformScale
  ))), 'the fixed composition clears both authoritative mineral footprints');
  assert.ok(staged.every(spec => Math.hypot(spec.x - FRONTIER_CALDERA_WILDLIFE_ANCHOR.x,
    spec.z - FRONTIER_CALDERA_WILDLIFE_ANCHOR.z) >= radiusFor(spec) + FRONTIER_CALDERA_WILDLIFE_ANCHOR.movementRadius),
  'the fixed composition clears the authoritative Emberhorn movement disk');
  const near = staged.filter(spec => !spec.id.endsWith('stage-caldera-spire-rear'));
  assert.deepEqual(near.map(spec => [spec.x, spec.z, spec.scale]), [
    [847.05, -1968.5, .55], [846.85, -1968.6, .7], [847.25, -1968.2, .55], [846.8, -1968.7, 1.2],
    [852.85, -1969.5, .45], [853.05, -1969.7, .5], [852.65, -1969.9, .42], [852.75, -1969.2, .65],
  ]);
  const witness = { x: 850, z: -1962, y: sampleFrontierHeight(850, -1962) };
  const camera = createCamera(412 / 915);
  createCameraFollow(camera, { position: new THREE.Vector3(witness.x, witness.y + .52, witness.z) },
    CAMERA_CONFIG_FOLLOW, CAMERA_CONFIG).snap();
  camera.updateMatrixWorld();
  const modelHeight = { asset_ember_spire: 3.5, asset_ember_bloom: 1.4024, asset_pebble_cluster: .34 };
  const project = (spec, top = false) => new THREE.Vector3(spec.x,
    spec.y + (top ? modelHeight[spec.assetId] * spec.scale : 0), spec.z).project(camera);
  assert.ok(near.every(spec => [project(spec), project(spec, true)].every(point => (
    Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && Math.abs(point.z) <= 1
  ))), 'every near prop foot and top stays in the configured ordinary 412x915 portrait frustum');
  assert.ok(near.every(spec => spec.groundCover?.calderaWeight > .95 && spec.groundCover.density < .15),
    'near dressing carries sparse Caldera ground-patch metadata into the visual cache path');
  assert.equal(createFrontierGroundCoverFilter(options)(850, -1968), false,
    'scenery ground patches leave the central Caldera route quiet');
  const flatNonCaldera = () => ({ height: 10, contentLand: true, coastDistance: 100, surfaceKind: null,
    habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 0, calderaWeight: 0,
    habitatWeights: { 'emberglass-caldera': 0 } });
  assert.equal(createFrontierGroundCoverFilter({ getHeight: () => 10, getTerrainSample: flatNonCaldera,
    visualAssets: [], sampleForageChunk: () => [], sampleWildlifeChunk: () => [], sampleRegionalPlaceChunk: () => null })(850, -1968), true,
  'the same world coordinates do not impose a Caldera lane on a zero-weight sibling terrain contract');

  const selected = selectFrontierScenery(chunkGrid(17, -40), options);
  assert.ok(staged.every(spec => selected.some(candidate => candidate.id === spec.id)), 'the fixed formation is admitted whole');
  assert.ok(selected.every(spec => ['asset_ember_spire', 'asset_ember_bloom', 'asset_pebble_cluster'].includes(spec.assetId)),
    'the strong Caldera view contains no inherited purple mushroom, reed, lily, or canopy recipe');
  assert.ok(selected.length <= FRONTIER_SCENERY_CONFIG.maxTotal);
});

test('Caldera scenery requires one complete exact prop mesh kit while ordinary dressing admits each asset independently', () => {
  const assetIds = ['asset_ember_spire', 'asset_ember_bloom', 'asset_pebble_cluster'];
  const ownerChunks = [[16, -40], [17, -40], [17, -41]];
  const staged = visualAssets => ownerChunks.flatMap(([cx, cz]) => sampleFrontierSceneryChunk(cx, cz, { visualAssets }))
    .filter(spec => spec.id.includes(':stage-caldera-'));
  assert.equal(staged(WORLD_DATA.visualAssets).length, 9);
  for (const assetId of assetIds) {
    const withoutAsset = WORLD_DATA.visualAssets.filter(asset => asset.id !== assetId);
    assert.equal(staged(withoutAsset).length, 0, `${assetId} absence rejects the complete staged formation`);
    const wrongRole = WORLD_DATA.visualAssets.map(asset => asset.id === assetId
      ? { ...asset, gameplay: { ...asset.gameplay, role: 'harvestable' } } : asset);
    assert.equal(staged(wrongRole).length, 0, `${assetId} wrong role rejects the complete staged formation`);
    const malformedMesh = WORLD_DATA.visualAssets.map(asset => asset.id === assetId ? { ...asset, parts: [{}] } : asset);
    assert.equal(staged(malformedMesh).length, 0, `${assetId} malformed parts reject the complete staged formation`);
  }
  const withoutSpire = WORLD_DATA.visualAssets.filter(asset => asset.id !== 'asset_ember_spire');
  const ordinary = sampleFrontierSceneryChunk(15, -42, { visualAssets: withoutSpire })
    .filter(spec => !spec.id.includes(':stage-caldera-') && assetIds.includes(spec.assetId));
  assert.ok(ordinary.length > 0 && ordinary.every(spec => spec.assetId !== 'asset_ember_spire'),
    'ordinary Caldera props retain individually admitted bloom and rubble when the spire is unavailable');

  const selected = selectFrontierScenery(chunkGrid(17, -40), { visualAssets: WORLD_DATA.visualAssets });
  assert.ok(staged(WORLD_DATA.visualAssets).every(spec => selected.some(candidate => candidate.id === spec.id)),
    'canonical residency selects the whole nine-member staged formation');

  const cache = createFrontierSceneryRecipeCache();
  const incompleteBuild = createFrontierSceneryBuild(chunkGrid(17, -40), { visualAssets: withoutSpire }, cache);
  assert.equal(incompleteBuild.specs.some(spec => spec.id.includes(':stage-caldera-')), false);
  assert.equal(cache.getSceneryDebugState().ordinaryCount, 22,
    'the three incomplete fixed-group owner recipes are not cached as completed arrays');
  incompleteBuild.releaseTerrainMemo();
  const repairedBuild = createFrontierSceneryBuild(chunkGrid(17, -40), { visualAssets: WORLD_DATA.visualAssets }, cache);
  assert.equal(repairedBuild.specs.filter(spec => spec.id.includes(':stage-caldera-')).length, 9,
    'the same cache retries all fixed-group owner recipes after the complete kit is restored');
  assert.equal(cache.getSceneryDebugState().ordinaryCount, 25);
  repairedBuild.releaseTerrainMemo();
});

test('Caldera scenery clears scaled resources plus the full Emberhorn leash', () => {

  const terrain = () => ({
    height: 10, contentLand: true, coastDistance: 100, surfaceKind: null,
    habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 1,
    provinceWeights: { lush: 0, sunscar: 0, ironspine: 1 }, calderaWeight: 1,
    habitatWeights: { 'emberglass-caldera': 1 },
  });
  const base = {
    visualAssets: WORLD_DATA.visualAssets, getHeight: () => 10, getTerrainSample: terrain,
    sampleRegionalPlaceChunk: () => null,
  };
  const nearScaledCrystal = sampleFrontierSceneryChunk(16, -40, {
    ...base,
    sampleForageChunk: () => [{ type: 'rock', visualAsset: { id: 'asset_crystal' }, uniformScale: 1,
      pos: { x: 848.75, z: -1968.5 } }],
    sampleWildlifeChunk: () => [],
  });
  assert.equal(nearScaledCrystal.some(spec => spec.id.endsWith('stage-caldera-spire-left')), false,
    'the spire clears the crystal by both complete scaled footprints rather than the legacy point allowance');
  const nearLeash = sampleFrontierSceneryChunk(16, -40, {
    ...base,
    sampleForageChunk: () => [],
    sampleWildlifeChunk: () => [{ homePos: { x: 847.05, z: -1978.8 }, roamRadius: 4.5, leashRadius: 10 }],
  });
  assert.equal(nearLeash.some(spec => spec.id.endsWith('stage-caldera-spire-left')), false,
    'the spire clears the full ten-metre Emberhorn leash plus its own rendered footprint');
});

test('the Sunscar bloom decor enters scenery as one exact low-prop formation within existing caps', () => {
  const witnessChunk = { cx: -35, cz: 4 };
  const options = { visualAssets: WORLD_DATA.visualAssets };
  const place = sampleFrontierRegionalPlaceChunk(witnessChunk.cx, witnessChunk.cz, options);
  assert.ok(place);
  assert.equal(sampleFrontier(place.center.x, place.center.z).habitatId, 'sunscar-desert');
  const chunkSpecs = sampleFrontierSceneryChunk(witnessChunk.cx, witnessChunk.cz, options);
  const formation = chunkSpecs.filter(spec => spec.regionalPlaceId === place.id);
  assert.equal(formation.length, 7);
  assert.deepEqual(formation.map(spec => ({
    assetId: spec.assetId, x: spec.x, y: spec.y, z: spec.z, scale: spec.scale, yaw: spec.yaw,
  })), place.scenery.map(spec => ({
    assetId: spec.assetId, x: spec.x, y: spec.y, z: spec.z, scale: spec.scale, yaw: spec.yaw,
  })), 'scenery consumes the authored world transforms without rotating or regrounding them');
  const ordinary = chunkSpecs.filter(spec => !spec.regionalPlaceId);
  const withoutPlace = sampleFrontierSceneryChunk(witnessChunk.cx, witnessChunk.cz, { ...options, sampleRegionalPlaceChunk: () => null });
  assert.ok(ordinary.length > 0 && ordinary.length < withoutPlace.length, 'the place reserves only its overlap from ordinary scenery');
  assert.ok(ordinary.every(spec => withoutPlace.some(candidate => candidate.id === spec.id)), 'safe ordinary source identities remain intact');
  assert.ok(ordinary.every(spec => Math.hypot(spec.x - place.center.x, spec.z - place.center.z) >= place.radius + .62));

  const selected = selectFrontierScenery(chunkGrid(witnessChunk.cx, witnessChunk.cz), options);
  const selectedFormation = selected.filter(spec => spec.regionalPlaceId === place.id);
  assert.equal(selectedFormation.length, place.scenery.length, 'the nearby formation is admitted whole');
  assert.ok(selected.length <= FRONTIER_SCENERY_CONFIG.maxTotal);
  const nearSelected = selected.filter(spec => {
    const [cx, cz] = spec.chunkId.split(',').map(Number);
    return Math.max(Math.abs(cx - witnessChunk.cx), Math.abs(cz - witnessChunk.cz)) <= 1;
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
  const witnessChunk = { cx: -34, cz: -4 };
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
    const expected = sampleFrontierSceneryChunk(witnessChunk.cx, witnessChunk.cz, { ...common, sampleRegionalPlaceChunk: () => null });
    const actual = sampleFrontierSceneryChunk(witnessChunk.cx, witnessChunk.cz, common);
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

test('incremental preparation drains to the exact synchronous recipe with bounded work', () => {
  const residency = { center: { cx: 6, cz: 6 }, chunks: [{ id: '6,6', cx: 6, cz: 6 }] };
  const options = {
    getHeight: () => 3,
    getTerrainSample: () => ({ height: 3, surfaceKind: null, coastDistance: 100,
      habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 1,
      provinceWeights: { lush: 1, sunscar: 0, ironspine: 0 } }),
    visualAssets: WORLD_DATA.visualAssets, sampleRegionalPlaceChunk: () => null,
    sampleForageChunk: () => [], sampleWildlifeChunk: () => [],
  };
  const baseline = selectFrontierScenery(residency, options);
  const cache = createFrontierSceneryRecipeCache();
  const job = createFrontierSceneryPrepareJob(residency, options, cache);
  for (const budget of [0, -1, NaN, Infinity]) {
    assert.deepEqual(job.step(budget), { done: false, cancelled: false, failed: false, work: 0,
      totalWork: 0, preparedOrdinary: 0, preparedInfill: 0 });
  }
  let calls = 0, last;
  while (!(last = job.step(8)).done) {
    assert.ok(last.work > 0 && last.work <= 8);
    assert.ok(++calls < 100);
  }
  assert.ok(last.work <= 8);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 1, infillCount: 1 });
  const prepared = createFrontierSceneryBuild(residency, options, cache);
  assert.deepEqual(prepared.specs, baseline);
  prepared.releaseTerrainMemo();
  assert.deepEqual(job.step(8), { ...job.getState(), work: 0 }, 'completed jobs are inert');
});

test('partial prepare cancellation and failure never publish an infill recipe and remain retryable', () => {
  const residency = { center: { cx: 6, cz: 6 }, chunks: [{ id: '6,6', cx: 6, cz: 6 }] };
  let fail = false, terrainCalls = 0;
  const options = {
    getHeight: () => { if (fail) throw new Error('retryable incremental height'); return 3; },
    getTerrainSample: () => {
      terrainCalls++;
      if (fail) throw new Error('retryable incremental terrain');
      return { height: 3, surfaceKind: null, coastDistance: 100,
        habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 1,
        provinceWeights: { lush: 1, sunscar: 0, ironspine: 0 } };
    },
    visualAssets: WORLD_DATA.visualAssets, sampleRegionalPlaceChunk: () => null,
    sampleForageChunk: () => [], sampleWildlifeChunk: () => [],
  };
  const cache = createFrontierSceneryRecipeCache();
  const cancelled = createFrontierSceneryPrepareJob(residency, options, cache);
  cancelled.step(1); // complete the ordinary recipe
  cancelled.step(1); // initialize, but do not publish, the infill recipe
  cancelled.step(5);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 1, infillCount: 0 });
  const beforeCancel = terrainCalls;
  assert.deepEqual(cancelled.cancel(), { done: false, cancelled: true, failed: false, work: 0,
    totalWork: 7, preparedOrdinary: 1, preparedInfill: 0 });
  cancelled.step(8);
  assert.equal(terrainCalls, beforeCancel, 'cancelled jobs release their local work and remain inert');

  const failed = createFrontierSceneryPrepareJob(residency, options, cache);
  failed.step(4);
  fail = true;
  assert.throws(() => failed.step(1), /retryable incremental/);
  assert.equal(failed.getState().failed, true);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 1, infillCount: 0 });
  fail = false;

  const retry = createFrontierSceneryPrepareJob(residency, options, cache);
  let retryState;
  while (!(retryState = retry.step(16)).done) assert.ok(retryState.work <= 16);
  assert.deepEqual(cache.getSceneryDebugState(), { ordinaryCount: 1, infillCount: 1 });
  const synchronous = selectFrontierScenery(residency, options);
  const prepared = createFrontierSceneryBuild(residency, options, cache);
  assert.deepEqual(prepared.specs, synchronous);
  prepared.releaseTerrainMemo();
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
  assert.deepEqual(contour.map(spec => [spec.id, spec.assetId]), [
    ['f2c:s:6:2:seed-1', 'asset_trail_stones'],
    ['f2c:s:6:2:seed-3', 'asset_fen_stone'],
    ['f2c:s:6:2:seed-4', 'asset_trail_stones'],
  ]);
  const center = sampleFrontier(325, 125), inward = center.inlandDirection;
  const anchor = { x: 325 + inward.x * (8 - center.coastDistance), z: 125 + inward.z * (8 - center.coastDistance) };
  const tangent = { x: -inward.z, z: inward.x };
  const offsets = contour.map(spec => (spec.x - anchor.x) * tangent.x + (spec.z - anchor.z) * tangent.z);
  const westCluster = offsets.filter(offset => offset < 0), eastCluster = offsets.filter(offset => offset > 0);
  assert.deepEqual([westCluster.length, eastCluster.length], [1, 2]);
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

  const witnessChunk = { cx: -44, cz: -8 };
  const witness = sampleFrontierSceneryChunk(witnessChunk.cx, witnessChunk.cz, { visualAssets: WORLD_DATA.visualAssets });
  assert.equal(sampleFrontier((witnessChunk.cx + .5) * 50, (witnessChunk.cz + .5) * 50).habitatId, 'sunscar-desert');
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
  assert.ok(witness.every(spec => Math.abs(spec.groundCover.density - .18) < 1e-9));
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

test('protected starter and staged Skybreak identities remain exact while finite outer geography stays bounded', () => {
  const starterIds = selectFrontierScenery(chunkGrid(0, -2)).map(spec => spec.id);
  assert.equal(starterIds.some(id => id.startsWith('f2c:i:')), false, 'starter remains outside dense infill');
  assert.equal(starterIds.length, 26);
  assert.equal(createHash('sha256').update(JSON.stringify(starterIds)).digest('hex'),
    '0c740db352a0f532b203b5c85fe0433002a55531fcde4d3e175d0cc50af886b6');

  const skybreakIds = selectFrontierScenery(chunkGrid(0, -4)).map(spec => spec.id);
  assert.equal(skybreakIds.some(id => id.startsWith('f2c:i:')), false, 'Skybreak remains outside dense infill');
  assert.equal(skybreakIds.length, 26);
  const protectedSkybreakIds = skybreakIds.filter(id => id.includes(':stage-'));
  assert.equal(protectedSkybreakIds.length, 19);
  assert.equal(createHash('sha256').update(JSON.stringify(protectedSkybreakIds)).digest('hex'),
    '83fb784237499248b0b5dcabb460882d433cf1cde93daf0395ee6a463b249a30');

  const coastResidency = chunkGrid(6, 2);
  const coast = selectFrontierScenery(coastResidency);
  const coastIds = coast.map(spec => spec.id);
  assert.equal(coastIds.some(id => id.startsWith('f2c:i:')), false, 'the authored coast window remains outside dense infill');
  assert.ok(coastIds.length > 0 && coastIds.length <= FRONTIER_SCENERY_CONFIG.maxTotal,
    'expanded-coast selection remains populated and respects the global residency cap');
  const coastNearCount = coast.filter(spec => {
    const [cx, cz] = spec.chunkId.split(',').map(Number);
    return Math.max(Math.abs(cx - coastResidency.center.cx), Math.abs(cz - coastResidency.center.cz)) <= 1;
  }).length;
  assert.ok(coastNearCount <= FRONTIER_SCENERY_CONFIG.maxNear, 'expanded-coast selection respects the near residency cap');
  assert.deepEqual(selectFrontierScenery({ ...coastResidency, chunks: [...coastResidency.chunks].reverse() })
    .map(spec => spec.id), coastIds, 'expanded-coast selection remains deterministic across residency enumeration');
  const coastStones = coast.filter(spec => ['asset_fen_stone', 'asset_trail_stones'].includes(spec.assetId));
  assert.ok(coastStones.length > 0, 'the expanded coast retains supported stone dressing');
  assert.ok(coastStones.every(spec => hasFrontierLandFootprint(spec.x, spec.z, {
    radius: (spec.assetId === 'asset_fen_stone' ? 1.14 : 1.4) * spec.scale,
  })), 'every selected coast stone keeps its full rendered footprint on land');
});
