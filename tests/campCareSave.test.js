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

function mossling(id, originId = `${id}:origin`) {
  return { version: 1, id, speciesId: 'mossling', originId, acquiredRunId: 'care_run', genome: createWildkinGenome(originId) };
}

function setup() {
  const progress = createFrontierProgress({ resourceDrops: WORLD_DATA.resourceDrops });
  progress.collectResources({ wood: 12, fiber: 12, berries: 4 });
  assert.equal(progress.placeStructure({ id: 'build_nursery', type: 'bed', pos: { x: 0, y: 0, z: 5 }, yaw: 0 }).placed, true);
  assert.equal(progress.bankRun({}, 0, 'care_run', { companions: [mossling('wildkin_care')] }).ok, true);
  return progress;
}

test('care assignment validates the physical bed and owned Mossling without changing active identity', () => withStorage(({ fail }) => {
  const progress = setup();
  const activeId = progress.getActiveWildkin().id;
  assert.equal(progress.assignCampWildkin('missing', 'build_nursery').reason, 'unknown-wildkin');
  assert.equal(progress.assignCampWildkin('wildkin_care', 'missing').reason, 'unknown-bed');
  fail(true);
  assert.equal(progress.assignCampWildkin('wildkin_care', 'build_nursery').reason, 'storage-write-failed');
  assert.equal(progress.getCampCare(), null, 'failed assignment rolls back');
  fail(false);
  assert.equal(progress.assignCampWildkin('wildkin_care', 'build_nursery').ok, true);
  assert.equal(progress.getActiveWildkin().id, activeId);
  assert.equal(progress.assignCampWildkin('wildkin_care', 'build_nursery').reason, 'already-assigned');
  const copy = progress.getCampCare(); copy.nourishment = 99; copy.wildkinId = 'changed';
  assert.deepEqual(progress.getCampCare(), { version: 1, bedId: 'build_nursery', wildkinId: 'wildkin_care', nourishment: 0 });
}));

test('feeding spends one raw pack berry atomically, retries safely, and caps nourishment', () => withStorage(({ fail }) => {
  const progress = setup();
  assert.equal(progress.placeStructure({ id: 'build_second_bed', type: 'bed', pos: { x: 3, y: 0, z: 5 }, yaw: 0 }).placed, true);
  progress.assignCampWildkin('wildkin_care', 'build_nursery');
  const before = progress.getPackResourceCounts().berries;
  fail(true);
  assert.equal(progress.feedCampWildkin('build_nursery').reason, 'storage-write-failed');
  assert.equal(progress.getPackResourceCounts().berries, before);
  assert.equal(progress.getCampCare().nourishment, 0);
  fail(false);
  for (let nourishment = 1; nourishment <= 3; nourishment++) {
    assert.equal(progress.feedCampWildkin('build_nursery').ok, true);
    assert.equal(progress.getCampCare().nourishment, nourishment);
    if (nourishment === 1) {
      assert.equal(progress.assignCampWildkin('wildkin_care', 'build_second_bed').reason, 'release-required');
      assert.equal(progress.getCampCare().nourishment, 1, 'reassignment cannot reset nourishment');
    }
  }
  const after = progress.getPackResourceCounts().berries;
  assert.equal(after, before - 3, 'care uses pack berries without creating cargo or another inventory');
  assert.equal(progress.feedCampWildkin('build_nursery').reason, 'nourished');
  assert.equal(progress.getPackResourceCounts().berries, after, 'a nourished Mossling is not charged');
  assert.equal(progress.feedCampWildkin('build_other').reason, 'wrong-bed');
}));

test('occupied beds require release, and care survives reload as a defensive copy', () => withStorage(() => {
  const progress = setup();
  progress.assignCampWildkin('wildkin_care', 'build_nursery');
  progress.feedCampWildkin('build_nursery');
  assert.equal(progress.removeStructure('build_nursery').reason, 'bed-occupied');

  const restored = createFrontierProgress({ resourceDrops: WORLD_DATA.resourceDrops });
  restored.load();
  assert.deepEqual(restored.getCampCare(), { version: 1, bedId: 'build_nursery', wildkinId: 'wildkin_care', nourishment: 1 });
  assert.equal(restored.releaseCampWildkin('wrong').reason, 'wrong-bed');
  assert.equal(restored.releaseCampWildkin('build_nursery').ok, true);
  assert.equal(restored.getCampCare(), null);
  assert.equal(restored.removeStructure('build_nursery').removed, true);
}));

test('load/import rejects care that references a missing bed, missing Mossling, or invalid nourishment', () => withStorage(({ values }) => {
  const progress = setup();
  progress.assignCampWildkin('wildkin_care', 'build_nursery');
  const envelope = progress.exportSave().payload;
  const invalidStored = structuredClone(envelope.progress);
  invalidStored.campCare.bedId = 'build_missing';
  values.set(progress.getStorageKey(), JSON.stringify(invalidStored));
  const failedLoad = createFrontierProgress({ resourceDrops: WORLD_DATA.resourceDrops });
  failedLoad.load();
  assert.equal(failedLoad.getStorageStatus().reason, 'invalid-camp-care-bed');
  assert.equal(failedLoad.getCampCare(), null);

  for (const [patch, reason] of [
    [{ wildkinId: 'wildkin_missing' }, 'invalid-camp-care-wildkin'],
    [{ nourishment: 4 }, 'invalid-camp-care'],
  ]) {
    const candidate = structuredClone(envelope);
    Object.assign(candidate.progress.campCare, patch);
    assert.equal(progress.importSave(candidate).reason, reason);
    assert.equal(progress.getCampCare().wildkinId, 'wildkin_care', 'rejected import preserves current care');
  }
}));
