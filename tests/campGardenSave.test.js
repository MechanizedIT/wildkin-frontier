import test from 'node:test';
import assert from 'node:assert/strict';
import WORLD_DATA from '../src/world/data/world.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createWildkinGenome } from '../src/creatures/wildkinGenome.js';

function withStorage(run) {
  const previous = global.localStorage;
  const values = new Map(); let failWrites = false;
  global.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { if (failWrites) throw new Error('quota'); values.set(key, String(value)); },
    removeItem: key => values.delete(key),
  };
  try { return run({ values, fail: value => { failWrites = value; } }); }
  finally { global.localStorage = previous; }
}

function mossling(id = 'wildkin_gardener') {
  const originId = `${id}:origin`;
  return { version: 1, id, speciesId: 'mossling', originId, acquiredRunId: 'garden_run', genome: createWildkinGenome(originId) };
}

function setupGarden({ plotX = 3, bedX = null, berries = 8 } = {}) {
  const progress = createFrontierProgress({ resourceDrops: WORLD_DATA.resourceDrops });
  progress.collectResources({ wood: 20, fiber: 20, berries });
  if (bedX !== null) {
    assert.equal(progress.placeStructure({ id: 'build_garden_bed', type: 'bed', pos: { x: bedX, y: 0, z: 5 }, yaw: 0 }).placed, true);
  }
  assert.equal(progress.placeStructure({ id: 'build_berry_plot', type: 'berry_garden', pos: { x: plotX, y: 0, z: 5 }, yaw: 0 }).placed, true);
  return progress;
}

function growRipe(progress) {
  for (let elapsed = 0; elapsed < 90; elapsed += 5) assert.equal(progress.advanceCampCrop(5).ok, true);
  assert.equal(progress.getCampCrop().growthSeconds, 90);
}

test('planting spends one pack berry and bounded active-play growth rolls back failed checkpoints', () => withStorage(({ fail }) => {
  const progress = setupGarden();
  const before = progress.getPackResourceCounts().berries;
  const planted = progress.plantCampCrop('build_berry_plot');
  assert.equal(planted.ok, true);
  assert.deepEqual(planted.crop, { version: 1, plotId: 'build_berry_plot', growthSeconds: 0 });
  assert.equal(progress.getPackResourceCounts().berries, before - 1);
  assert.equal(progress.removeStructure('build_berry_plot').reason, 'crop-planted');
  for (const seconds of [0, -1, 5.001, Number.NaN]) {
    assert.equal(progress.advanceCampCrop(seconds).reason, 'invalid-growth');
  }

  fail(true);
  assert.equal(progress.advanceCampCrop(5).reason, 'storage-write-failed');
  assert.equal(progress.getCampCrop().growthSeconds, 0, 'a failed growth checkpoint is rolled back');
  fail(false);
  assert.equal(progress.advanceCampCrop(5).ok, true);
  for (let elapsed = 5; elapsed < 90; elapsed += 5) progress.advanceCampCrop(5);
  assert.equal(progress.getCampCrop().growthSeconds, 90);
  assert.deepEqual(progress.advanceCampCrop(1), {
    ok: true, changed: false, reason: 'ready',
    crop: { version: 1, plotId: 'build_berry_plot', growthSeconds: 90 },
    stageTransition: false, ready: true,
  });
}));

test('crop reload is immutable and load/import reject invalid or missing plot records', () => withStorage(({ values }) => {
  const progress = setupGarden();
  progress.plantCampCrop('build_berry_plot');
  progress.advanceCampCrop(4.25);
  const copy = progress.getCampCrop(); copy.growthSeconds = 90; copy.plotId = 'changed';
  assert.equal(progress.getCampCrop().growthSeconds, 4.25);

  const restored = createFrontierProgress({ resourceDrops: WORLD_DATA.resourceDrops });
  restored.load();
  assert.deepEqual(restored.getCampCrop(), { version: 1, plotId: 'build_berry_plot', growthSeconds: 4.25 });
  const envelope = restored.exportSave().payload;
  for (const [mutate, reason] of [
    [candidate => { candidate.progress.campCrop.growthSeconds = 91; }, 'invalid-camp-crop'],
    [candidate => { candidate.progress.campCrop.plotId = 'build_missing'; }, 'invalid-camp-crop-plot'],
  ]) {
    const candidate = structuredClone(envelope); mutate(candidate);
    assert.equal(restored.importSave(candidate).reason, reason);
    assert.equal(restored.getCampCrop().growthSeconds, 4.25, 'rejected import preserves the live crop');
  }

  const invalidStored = structuredClone(envelope.progress);
  invalidStored.base.structures = invalidStored.base.structures.filter(record => record.id !== 'build_berry_plot');
  values.set(restored.getStorageKey(), JSON.stringify(invalidStored));
  const failedLoad = createFrontierProgress({ resourceDrops: WORLD_DATA.resourceDrops });
  failedLoad.load();
  assert.equal(failedLoad.getStorageStatus().reason, 'invalid-camp-crop-plot');
  assert.equal(failedLoad.getCampCrop(), null);
}));

test('ripe harvest is all-or-nothing across storage failure and pack capacity', () => withStorage(({ fail }) => {
  const progress = setupGarden();
  progress.plantCampCrop('build_berry_plot');
  growRipe(progress);
  const before = progress.getPackResourceCounts().berries;
  fail(true);
  assert.equal(progress.harvestCampCrop('build_berry_plot').reason, 'storage-write-failed');
  assert.equal(progress.getPackResourceCounts().berries, before);
  assert.equal(progress.getCampCrop().growthSeconds, 90);
  fail(false);
  const harvested = progress.harvestCampCrop('build_berry_plot');
  assert.deepEqual({ ok: harvested.ok, yield: harvested.yield, bloomTended: harvested.bloomTended }, { ok: true, yield: 3, bloomTended: false });
  assert.equal(progress.getPackResourceCounts().berries, before + 3);
  assert.equal(progress.getCampCrop(), null);
  assert.equal(progress.removeStructure('build_berry_plot').removed, true);

  const full = setupGarden({ berries: 1 });
  full.plantCampCrop('build_berry_plot');
  growRipe(full);
  full.collectResources({ berries: 20, wood: 400 });
  assert.equal(full.getInventoryState().pack.every(Boolean), true, 'fixture fills every pack slot');
  assert.equal(full.getPackResourceCounts().berries, 20);
  assert.equal(full.harvestCampCrop('build_berry_plot').reason, 'output-full');
  assert.equal(full.getPackResourceCounts().berries, 20);
  assert.equal(full.getCampCrop().growthSeconds, 90, 'a full pack leaves the ripe crop intact');
}));

test('Bloom-tended yield derives from full care, owned Mossling, and the six-metre bed distance', () => withStorage(() => {
  const tended = setupGarden({ bedX: -3, plotX: 3, berries: 8 });
  assert.equal(tended.bankRun({}, 0, 'garden_run', { companions: [mossling()] }).ok, true);
  assert.equal(tended.assignCampWildkin('wildkin_gardener', 'build_garden_bed').ok, true);
  for (let count = 0; count < 3; count++) assert.equal(tended.feedCampWildkin('build_garden_bed').ok, true);
  assert.equal(tended.plantCampCrop('build_berry_plot').ok, true);
  growRipe(tended);
  assert.deepEqual(tended.getCampCropHarvest(), { yield: 4, bloomTended: true }, 'six metres is inclusive');
  assert.equal(tended.harvestCampCrop('build_berry_plot').yield, 4);

  const outside = setupGarden({ bedX: -3.01, plotX: 3, berries: 8 });
  assert.equal(outside.bankRun({}, 0, 'garden_run', { companions: [mossling()] }).ok, true);
  outside.assignCampWildkin('wildkin_gardener', 'build_garden_bed');
  for (let count = 0; count < 3; count++) outside.feedCampWildkin('build_garden_bed');
  outside.plantCampCrop('build_berry_plot');
  assert.deepEqual(outside.getCampCropHarvest(), { yield: 3, bloomTended: false }, 'distance beyond six metres gets the ordinary yield');
}));
