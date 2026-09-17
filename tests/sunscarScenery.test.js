import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { selectFrontierScenery, sampleFrontierSceneryChunk, createFrontierSceneryBuild, createFrontierSceneryPrepareJob, createFrontierSceneryRecipeCache } from '../src/world/frontierScenery.js';
import { WORLD_DATA } from '../src/world/data/world.generated.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/sunscar-scenery-checkpoint.json', import.meta.url)));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const grid = (cx, cz) => {
  const chunks = [];
  for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) chunks.push({ id: `${x},${z}`, cx: x, cz: z });
  return { center: { cx, cz }, chunks };
};

test('Sunscar room cleanup removes only the reviewed records after allocation and preserves alternate worlds and Camp', () => {
  for (const row of fixture.cases) {
    const options = { world: row.world, visualAssets: WORLD_DATA.visualAssets };
    const selected = selectFrontierScenery(grid(row.cx, row.cz), options);
    assert.equal(selected.length, row.afterCount);
    assert.equal(hash(selected), row.expectedAfterHash, 'all retained records, transforms and selection order match the prior checkpoint');
    assert.equal(hash(sampleFrontierSceneryChunk(row.cx, row.cz, options)), row.ordinaryHash, 'ordinary recipes remain available unchanged to infill/exclusion owners');
  }
});

test('Sunscar prepared residency uses the same cleanup without refilling removed slots', () => {
  const row = fixture.cases.find(row => row.cx === -40 && row.cz === 0);
  const residency = grid(row.cx, row.cz), options = { world: row.world, visualAssets: WORLD_DATA.visualAssets };
  const cache = createFrontierSceneryRecipeCache();
  const job = createFrontierSceneryPrepareJob(residency, options, cache);
  for (let steps = 0; !job.getState().done && steps < 10000; steps++) job.step(128);
  assert.equal(job.getState().done, true);
  assert.equal(job.getState().failed, false);
  const build = createFrontierSceneryBuild(residency, options, cache);
  try {
    assert.equal(hash(build.specs), row.expectedAfterHash);
    assert.equal(build.specs.length, row.beforeCount - 12);
  } finally {
    build.releaseTerrainMemo();
    cache.clear();
  }
});
