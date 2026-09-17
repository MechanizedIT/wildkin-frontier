import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_DATA } from '../src/world/data/world.generated.js';
import { selectFrontierScenery, sampleFrontierSceneryChunk } from '../src/world/frontierScenery.js';
import { ROOTBOUND_FOREST, ROOTBOUND_FOREST_LIMITS, rootboundRouteClearance } from '../src/world/rootboundForest.js';
import { createFrontierSceneryVisual } from '../src/world/frontierSceneryVisual.js';

test('Crown forest keeps its landmark, clear routes and a bounded solid-tree population', () => {
  const residency = { center: { cx: -10, cz: 14 }, chunks: [] };
  for (let z = 12; z <= 16; z++) for (let x = -12; x <= -8; x++) residency.chunks.push({ cx: x, cz: z });
  const specs = selectFrontierScenery(residency, { visualAssets: WORLD_DATA.visualAssets });
  assert.ok(specs.length <= ROOTBOUND_FOREST_LIMITS.total);
  assert.ok(specs.filter(s => s.rootboundTree).length <= ROOTBOUND_FOREST_LIMITS.trees);
  assert.ok(specs.some(s => s.id.endsWith(':heartroot-living-landmark')));
  for (const spec of specs.filter(s => s.rootboundForest)) {
    assert.ok(rootboundRouteClearance(spec.x, spec.z) >= .65 * spec.scale, `${spec.id} leaves the walking lane clear`);
  }
  const trees = specs.filter(s => s.rootboundTree).slice(0, 2);
  const visual = createFrontierSceneryVisual({ specs: trees, visualAssets: WORLD_DATA.visualAssets, canPlaceGroundCover: () => false });
  assert.equal(visual.terrainSurfaces.length, trees.length, 'every displayed tree has a physical trunk');
  assert.ok(visual.terrainSurfaces.every(s => [...s.vertices].every(Number.isFinite)));
  assert.ok(visual.occlusionRoots.length > 0, 'instanced crowns register with player visibility');
  visual.dispose();
});

test('a partial nature kit cannot publish an incomplete authored forest', () => {
  const visualAssets = WORLD_DATA.visualAssets.filter(a => a.id !== 'asset_rootbound_fern');
  assert.equal(sampleFrontierSceneryChunk(-10, 14, { visualAssets }).some(s => s.rootboundForest), false);
});

test('Thornstone Verge uses a sparse, off-route rock shelf as its approach frame', () => {
  const frames = ROOTBOUND_FOREST.filter(spec => spec.key.startsWith('verge-shelf-frame-'));
  assert.equal(frames.length, 5, 'the approach has a bounded set of distinct shelf anchors');
  assert.ok(frames.some(spec => spec.x === -423 && spec.z === 693 && spec.scale >= 2.2), 'a near west midground stone faces the branch approach');
  assert.ok(frames.some(spec => spec.x === -412 && spec.z === 689 && spec.scale >= 1.7), 'a near east midground stone staggers the frame');
  assert.ok(frames.some(spec => spec.x > -410 && spec.z > 690 && spec.scale >= 2.5), 'the far shelf points toward the mineral destination');
  for (const spec of frames) assert.ok(rootboundRouteClearance(spec.x, spec.z) >= 1.15 * spec.scale,
    `${spec.key} stays outside its solid route clearance`);
});

test('Thornstone shelf frames are admitted by the actual chunk scenery path', () => {
  const admitted = [];
  for (let cz = 13; cz <= 14; cz += 1) for (let cx = -9; cx <= -8; cx += 1) {
    admitted.push(...sampleFrontierSceneryChunk(cx, cz, { visualAssets: WORLD_DATA.visualAssets })
      .filter(spec => spec.id.includes(':verge-shelf-frame-')));
  }
  assert.ok(admitted.some(spec => spec.id.endsWith(':verge-shelf-frame-0')), 'west midground frame survives normal scenery admission');
  assert.ok(admitted.some(spec => spec.id.endsWith(':verge-shelf-frame-1')), 'east midground frame survives normal scenery admission');
});

test('Grove background timber is live-admitted outside Trailgloam’s open bowl', () => {
  const intended = ROOTBOUND_FOREST.filter(spec => spec.key.startsWith('grove-fallen-timber-'));
  assert.deepEqual(intended.map(spec => [spec.x, spec.z]), [[-442, 688], [-434, 690]]);
  assert.ok(intended.every(spec => Math.hypot(spec.x + 463, spec.z - 685) > 3.3 + 1.6 * spec.scale),
    'complete log hulls clear Trailgloam’s home apron');
  const admitted = sampleFrontierSceneryChunk(-9, 13, { visualAssets: WORLD_DATA.visualAssets });
  for (const spec of intended) assert.ok(admitted.some(candidate => candidate.id.endsWith(`:${spec.key}`)),
    `${spec.key} survives normal scenery admission`);
});

test('Crown keeps a southward canopy window and an admitted right foreground buttress', () => {
  const crown = sampleFrontierSceneryChunk(-10, 14, { visualAssets: WORLD_DATA.visualAssets });
  assert.equal(crown.filter(spec => spec.rootboundTree && spec.x >= -482 && spec.x <= -458 && spec.z >= 704 && spec.z <= 718).length, 0,
    'the outlook window is free of automatic canopy trunks');
  const buttress = crown.find(spec => spec.id.endsWith(':crown-outlook-right-buttress'));
  assert.ok(buttress, 'the right foreground buttress survives normal scenery admission');
  // asset_rootbound_block_root's unscaled horizontal half-diagonal is 1.146m.
  assert.ok(rootboundRouteClearance(buttress.x, buttress.z) >= 1.146 * buttress.scale,
    'the entire transformed buttress hull remains outside the walking lane');
});
