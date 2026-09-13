import test from 'node:test';
import assert from 'node:assert/strict';
import { FRONTIER_SCENERY_CONFIG, sampleFrontierSceneryChunk, selectFrontierScenery, createFrontierGroundCoverFilter, createFrontierSceneryBuild } from '../src/world/frontierScenery.js';
import { createFrontierSceneryVisual } from '../src/world/frontierSceneryVisual.js';
import { sampleFrontier } from '../src/world/frontierTerrain.js';
import { sampleFrontierForageChunk } from '../src/world/frontierEcology.js';
import { sampleFrontierWildlifeChunk } from '../src/world/frontierWildlife.js';
import { DEFAULT_FRONTIER_WORLD } from '../src/world/frontierWorld.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { WORLD_DATA } from '../src/world/data/world.generated.js';

const chunkGrid = (cx, cz) => {
  const chunks = [];
  for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) chunks.push({ id: `${x},${z}`, cx: x, cz: z });
  return { center: { cx, cz }, chunks };
};

test('one residency build shares a bounded exclusion-recipe cache across selection and ground cover', () => {
  let forageCalls = 0, wildlifeCalls = 0;
  const flatSample = () => ({ height: 3, surfaceKind: 'ordinary', habitatBlend: { wetland: 0, fernUpland: 1 }, provinceInfluence: 0, provinceWeights: null });
  const build = createFrontierSceneryBuild(chunkGrid(-13, -7), {
    getHeight: () => 3,
    getTerrainSample: flatSample,
    visualAssets: [],
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
    assert.equal(groundOwnerChunks.size, 12);
    assert.equal(previousCallsPerDomain, 333, 'equivalent uncached selection and filter work');
    assert.equal(forageCalls, 49);
    assert.equal(wildlifeCalls, 49);
    assert.ok(forageCalls <= 81 && wildlifeCalls <= 81, 'the private 9x9 source envelope is a hard bound');
  } finally { visual.dispose(); }
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
