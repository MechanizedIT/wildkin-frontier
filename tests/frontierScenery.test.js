import test from 'node:test';
import assert from 'node:assert/strict';
import { FRONTIER_SCENERY_CONFIG, sampleFrontierSceneryChunk, selectFrontierScenery } from '../src/world/frontierScenery.js';
import { sampleFrontier } from '../src/world/frontierTerrain.js';
import { sampleFrontierForageChunk } from '../src/world/frontierEcology.js';
import { sampleFrontierWildlifeChunk } from '../src/world/frontierWildlife.js';

const chunkGrid = (cx, cz) => {
  const chunks = [];
  for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) chunks.push({ id: `${x},${z}`, cx: x, cz: z });
  return { center: { cx, cz }, chunks };
};

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

test('the curated north route keeps three west/north canopies and eight damp east details', () => {
  const staged = [
    ...sampleFrontierSceneryChunk(-1, -2),
    ...sampleFrontierSceneryChunk(0, -2),
    ...sampleFrontierSceneryChunk(0, -3),
  ].filter(spec => spec.id.includes(':stage-'));
  assert.equal(staged.filter(spec => spec.kind === 'canopy').length, 3);
  assert.equal(staged.filter(spec => spec.kind === 'low').length, 8);
  assert.ok(staged.filter(spec => spec.kind === 'canopy').every(spec => spec.x <= 6));
  assert.ok(staged.filter(spec => spec.kind === 'low' && spec.assetId !== 'asset_mushroom_ring').every(spec => spec.x >= 8.7 && spec.x <= 9.1));
  const mushroom = staged.find(spec => spec.assetId === 'asset_mushroom_ring');
  assert.deepEqual({ x: mushroom.x, z: mushroom.z, scale: mushroom.scale }, { x: 5.2, z: -77.4, scale: .8 });
  assert.ok(staged.filter(spec => spec.assetId === 'asset_fen_stone').every(spec => spec.scale <= .32));
  assert.ok(staged.filter(spec => spec.assetId === 'asset_fen_reed').every(spec => spec.scale <= .5));
  const nearTree = staged.find(spec => spec.id.endsWith('stage-tree-west-1'));
  assert.deepEqual({ assetId: nearTree.assetId, x: nearTree.x, z: nearTree.z, scale: nearTree.scale }, { assetId: 'asset_verge_canopy', x: 5.2, z: -78.5, scale: .75 });
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
    const routeClearance = spec.kind === 'canopy' || spec.assetId === 'asset_fen_stone' ? 1.65 : 1.6;
    for (let i = 1; i < route.length; i++) assert.ok(segmentDistance(spec, route[i - 1], route[i]) >= routeClearance);
    for (const node of sampleFrontierForageChunk(cx, cz)) assert.ok(Math.hypot(spec.x - node.pos.x, spec.z - node.pos.z) >= 3.2);
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
