import test from 'node:test';
import assert from 'node:assert/strict';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { sampleFrontierForageChunk } from '../src/world/frontierEcology.js';
import { sampleFrontierWildlifeChunk } from '../src/world/frontierWildlife.js';
import { createFrontierGroundCoverFilter, sampleFrontierSceneryChunk } from '../src/world/frontierScenery.js';
import { isSkybreakArea } from '../src/world/frontierLandform.js';
import { sampleFrontier } from '../src/world/frontierTerrain.js';

test('footprint support rejects a cliff lip or face but retains a broad cap and lowland', () => {
  const cliff = (x, z) => x < 0 ? 12 : 0;
  assert.equal(hasFootprintSupport(-.25, 0, { getHeight: cliff, radius: 1, maxSlope: .32 }), false, 'ring crosses the upper lip');
  assert.equal(hasFootprintSupport(.25, 0, { getHeight: cliff, radius: 1, maxSlope: .32 }), false, 'ring crosses the lower lip');
  assert.equal(hasFootprintSupport(-4, 0, { getHeight: cliff, radius: 1, maxSlope: .32 }), true, 'adequate cap remains usable');
  assert.equal(hasFootprintSupport(4, 0, { getHeight: cliff, radius: 1, maxSlope: .32 }), true, 'adequate lowland remains usable');
});

test('existing seeded routes retain their placements outside Skybreak', () => {
  assert.ok(sampleFrontierForageChunk(0, -3).length >= 6, 'north approach forage retains its old count');
  assert.deepEqual(sampleFrontierWildlifeChunk(0, -2).map(node => node.originId), ['f1:w:0:-2:0', 'f1:w:0:-2:1', 'f1:w:0:-2:2']);
  assert.ok(sampleFrontierSceneryChunk(0, -2).some(node => node.id.endsWith('stage-tree-west-1')));
  assert.equal(createFrontierGroundCoverFilter()(9, -74), true);
});

test('real Skybreak keeps groundcover and generated content on supported cap or lowland feet', () => {
  const height = (x, z) => sampleFrontier(x, z).height;
  const support = (x, z, radius, maxSlope) => hasFootprintSupport(x, z, { getHeight: height, radius, maxSlope });
  for (const [x, z] of [[12, -229], [20, -161], [-18, -184]]) assert.equal(isSkybreakArea(x, z), true);
  assert.equal(support(-18, -184, .55, .42), false, 'the outer face fails a forage-sized footing');
  assert.equal(support(12, -229, 1.45, .32), true, 'the broad crown supports a canopy-sized footing');
  assert.equal(support(12, -229, 4.9, .32), true, 'the broad crown supports an ordinary Mossling home range');

  const forageRadius = { tree: 1.35, rock: .9, fiber: .55 };
  const sceneryRadius = { canopy: 1.45, low: .62 };
  for (const [cx, cz] of [[-1, -5], [0, -5], [-1, -4], [0, -4]]) {
    for (const node of sampleFrontierForageChunk(cx, cz)) {
      if (isSkybreakArea(node.pos.x, node.pos.z, forageRadius[node.type])) assert.equal(support(node.pos.x, node.pos.z, forageRadius[node.type], .42), true, node.id);
    }
    for (const animal of sampleFrontierWildlifeChunk(cx, cz)) {
      if (isSkybreakArea(animal.homePos.x, animal.homePos.z, 4.9)) assert.equal(support(animal.homePos.x, animal.homePos.z, 4.9, .32), true, animal.originId);
    }
    for (const spec of sampleFrontierSceneryChunk(cx, cz)) {
      if (isSkybreakArea(spec.x, spec.z, sceneryRadius[spec.kind])) assert.equal(support(spec.x, spec.z, sceneryRadius[spec.kind], .32), true, spec.id);
    }
  }
  const groundCover = createFrontierGroundCoverFilter();
  assert.equal(groundCover(-18, -184), false, 'grass does not bridge the outer face');
  assert.equal(groundCover(12, -229), true, 'grass can remain on the broad crown');
});
