import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_DATA } from '../src/world/data/world.generated.js';
import { hasFootprintSupport } from '../src/world/frontierPlacement.js';
import { sampleFrontier, sampleFrontierHeight } from '../src/world/frontierTerrain.js';
import { DEFAULT_FRONTIER_WORLD } from '../src/world/frontierWorld.js';
import { FRONTIER_ROOTBOUND_MEADOW_MOSSLING_ANCHOR, sampleFrontierWildlifeChunk } from '../src/world/frontierWildlife.js';

const options = { visualAssets: WORLD_DATA.visualAssets };

test('Rootbound Meadow admits one stable skittish Mossling on its real source disk', () => {
  const anchor = FRONTIER_ROOTBOUND_MEADOW_MOSSLING_ANCHOR;
  const residents = sampleFrontierWildlifeChunk(anchor.cx, anchor.cz, options);
  const mossling = residents.find(candidate => candidate.id === `f1:w:${anchor.cx}:${anchor.cz}:${anchor.index}`);
  assert.ok(mossling, 'the fixed Meadow source is admitted');
  assert.equal(mossling.speciesTag, 'mossling');
  assert.equal(mossling.temperament, 'SKITTISH');
  assert.equal(mossling.visualAssetId, 'asset_wildkin_mossling');
  assert.equal(mossling.homePos.x, anchor.x);
  assert.equal(mossling.homePos.z, anchor.z);
  assert.equal(mossling.roamRadius, 4.4);
  assert.equal(mossling.leashRadius, 8.5);
  assert.equal(hasFootprintSupport(anchor.x, anchor.z, { getHeight: sampleFrontierHeight, radius: 8.5, maxSlope: .32 }), true);
  for (let dx = -8.5; dx <= 8.5; dx += .5) for (let dz = -8.5; dz <= 8.5; dz += .5) {
    if (dx * dx + dz * dz > 8.5 ** 2) continue;
    const height = sampleFrontierHeight(anchor.x + dx, anchor.z + dz);
    for (const [ox, oz] of [[.5, 0], [0, .5]]) {
      if ((dx + ox) ** 2 + (dz + oz) ** 2 > 8.5 ** 2) continue;
      assert.ok(Math.abs(sampleFrontierHeight(anchor.x + dx + ox, anchor.z + dz + oz) - height) / .5 <= .32,
        `fine-grid leash grade at ${dx},${dz}`);
    }
  }
  assert.ok(Math.hypot(anchor.x + 475, anchor.z - 590) > 12, 'the home stays clear of the arrival route center');
  assert.equal(sampleFrontier(anchor.x, anchor.z).habitatId, 'rootbound-wildwood');
});

test('Meadow Mossling is default-world only and does not alter existing Rootbound source identities', () => {
  const anchor = FRONTIER_ROOTBOUND_MEADOW_MOSSLING_ANCHOR;
  const alternate = { edition: DEFAULT_FRONTIER_WORLD.edition, seed: DEFAULT_FRONTIER_WORLD.seed + 1 };
  assert.equal(sampleFrontierWildlifeChunk(anchor.cx, anchor.cz, { ...options, world: alternate })
    .some(candidate => candidate.id === `f1:w:${anchor.cx}:${anchor.cz}:${anchor.index}`), false);
  const baseline = sampleFrontierWildlifeChunk(-10, 13, options).map(candidate => candidate.id);
  assert.ok(baseline.includes('f1:w:-10:13:700'), 'Trailgloam identity remains present');
});
