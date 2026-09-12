import test from 'node:test';
import assert from 'node:assert/strict';
import WORLD_DATA from '../src/world/data/world.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createWildkinGenome } from '../src/creatures/wildkinGenome.js';
import { cloneWildkinIndividual, getWildkinSex, normalizeWildkinIndividual } from '../src/creatures/wildkinIndividual.js';

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

function individual(id, originId, acquiredRunId = 'pair_run', speciesId = 'mossling') {
  return { version: 1, id, speciesId, originId, acquiredRunId,
    genome: speciesId === 'mossling' ? createWildkinGenome(originId) : null };
}

function setupPair() {
  const progress = createFrontierProgress({ resourceDrops: WORLD_DATA.resourceDrops });
  progress.collectResources({ wood: 8, fiber: 8, berries: 3 });
  assert.equal(progress.placeStructure({ id: 'build_pair_bed', type: 'bed', pos: { x: 0, y: 0, z: 5 }, yaw: 0 }).placed, true);
  const parents = [
    individual('wildkin_parent_a', 'f1:w:0:-2:0'),
    individual('wildkin_parent_b', 'f1:w:0:-2:1'),
  ];
  assert.equal(progress.bankRun({}, 0, 'pair_run', { companions: parents }).ok, true);
  assert.equal(progress.assignCampWildkin(parents[0].id, 'build_pair_bed').ok, true);
  for (let count = 0; count < 3; count += 1) assert.equal(progress.feedCampWildkin('build_pair_bed').ok, true);
  assert.equal(progress.setActiveWildkin(parents[1].id).ok, true);
  return { progress, parents };
}

function growYoung(progress) {
  for (let elapsed = 0; elapsed < 120; elapsed += 5) assert.equal(progress.advanceCampBreeding(5).ok, true);
  assert.equal(progress.getCampBreeding().growthSeconds, 120);
}

test('canonical sex is deterministic, staged frontier parents are opposite, and lineage is strict and cloned', () => {
  const raw = individual('wildkin_identity', 'f1:w:0:-2:0');
  const normalized = normalizeWildkinIndividual(raw);
  assert.equal(normalized.sex, 'female');
  assert.equal(getWildkinSex('f1:w:0:-2:1'), 'male');
  assert.equal(normalizeWildkinIndividual({ ...raw, sex: 'unknown' }), null);
  const child = normalizeWildkinIndividual({ ...raw, id: 'wildkin_child', originId: 'bred:9', acquiredRunId: 'camp_breed_9',
    sex: 'male', lineage: { parentIds: ['wildkin_a', 'wildkin_b'], generation: 2 } });
  const copy = cloneWildkinIndividual(child);
  copy.lineage.parentIds[0] = 'changed';
  assert.equal(child.lineage.parentIds[0], 'wildkin_a');
  assert.equal(normalizeWildkinIndividual({ ...raw, lineage: { parentIds: ['same', 'same'], generation: 1 } }), null);
  assert.equal(normalizeWildkinIndividual({ ...raw, lineage: { parentIds: [raw.id, 'wildkin_other'], generation: 1 } }), null);
});

test('pairing resolves one exact offspring and retries begin, growth, and welcome without duplication', () => withStorage(({ fail }) => {
  const { progress, parents } = setupPair();
  const selectedId = progress.getActiveWildkin().id;
  const eligible = progress.getCampBreedingEligibility('build_pair_bed');
  assert.deepEqual(eligible.parentIds, parents.map(parent => parent.id));
  assert.equal(eligible.offspring.lineage.generation, 1);
  assert.deepEqual(eligible.offspring.lineage.parentIds, eligible.parentIds);

  fail(true);
  assert.equal(progress.beginCampBreeding('build_pair_bed').reason, 'storage-write-failed');
  assert.equal(progress.getCampBreeding(), null);
  assert.equal(progress.getCampCare().nourishment, 3, 'failed pairing retains the ready bed');
  fail(false);
  const begun = progress.beginCampBreeding('build_pair_bed');
  assert.equal(begun.ok, true);
  assert.deepEqual(begun.offspring, eligible.offspring, 'retry commits the pre-resolved sequence and child');
  assert.equal(progress.getCampCare(), null);
  assert.equal(progress.getOwnedWildkin().length, 2, 'parents remain owned while the child reserves its slot');
  assert.equal(progress.getActiveWildkin().id, selectedId);
  assert.equal(progress.removeStructure('build_pair_bed').reason, 'bed-occupied');
  assert.equal(progress.assignCampWildkin(parents[0].id, 'build_pair_bed').reason, 'bed-occupied');
  progress.collectResources({ wood: 3, fiber: 5 });
  assert.equal(progress.placeStructure({ id: 'build_other_bed', type: 'bed', pos: { x: 3, y: 0, z: 5 }, yaw: 0 }).placed, true);
  assert.equal(progress.assignCampWildkin(parents[0].id, 'build_other_bed').reason, 'bed-occupied', 'one growing young locks the single nursery even at another bed');
  const copy = progress.getCampBreeding(); copy.offspring.genome.baseColor = 'changed'; copy.parentIds[0] = 'changed';
  assert.deepEqual(progress.getCampBreeding().offspring, eligible.offspring);

  for (const seconds of [0, -1, 5.001, Number.NaN]) assert.equal(progress.advanceCampBreeding(seconds).reason, 'invalid-growth');
  fail(true);
  assert.equal(progress.advanceCampBreeding(5).reason, 'storage-write-failed');
  assert.equal(progress.getCampBreeding().growthSeconds, 0);
  fail(false);
  growYoung(progress);
  assert.equal(progress.welcomeCampYoung('wrong').reason, 'wrong-bed');
  fail(true);
  assert.equal(progress.welcomeCampYoung('build_pair_bed').reason, 'storage-write-failed');
  assert.equal(progress.getOwnedWildkin().length, 2);
  assert.equal(progress.getCampBreeding().growthSeconds, 120, 'failed welcome leaves the exact ready child');
  fail(false);
  const welcomed = progress.welcomeCampYoung('build_pair_bed');
  assert.equal(welcomed.ok, true);
  assert.deepEqual(welcomed.record, eligible.offspring);
  assert.equal(progress.getOwnedWildkin().filter(record => record.id === welcomed.record.id).length, 1);
  assert.deepEqual(progress.getCampCare(), { version: 1, bedId: 'build_pair_bed', wildkinId: welcomed.record.id, nourishment: 0 });
  assert.equal(progress.getActiveWildkin().id, selectedId, 'welcoming does not change the selected adult');
  assert.equal(progress.welcomeCampYoung('build_pair_bed').reason, 'no-young');

  const restored = createFrontierProgress({ resourceDrops: WORLD_DATA.resourceDrops });
  restored.load();
  assert.deepEqual(restored.getOwnedWildkin().find(record => record.id === welcomed.record.id), welcomed.record);
  assert.equal(restored.getCampCare().wildkinId, welcomed.record.id);
}));

test('breeding import validates the bed, parents, exact child lineage, and monotonic sequence', () => withStorage(() => {
  const { progress } = setupPair();
  progress.collectResources({ wood: 3, fiber: 5 });
  assert.equal(progress.placeStructure({ id: 'build_other_bed', type: 'bed', pos: { x: 3, y: 0, z: 5 }, yaw: 0 }).placed, true);
  progress.beginCampBreeding('build_pair_bed');
  progress.advanceCampBreeding(5);
  const envelope = progress.exportSave().payload;
  for (const [mutate, reason] of [
    [candidate => { candidate.progress.base.structures = []; }, 'invalid-camp-breeding-bed'],
    [candidate => { candidate.progress.campBreeding.parentIds[1] = 'wildkin_missing'; }, 'invalid-camp-breeding-parents'],
    [candidate => { candidate.progress.campBreeding.offspring.lineage.generation = 3; }, 'invalid-camp-breeding-offspring'],
    [candidate => { const genome = candidate.progress.campBreeding.offspring.genome; genome.baseColor = genome.baseColor === 'clay' ? 'fern' : 'clay'; }, 'invalid-camp-breeding-offspring'],
    [candidate => { candidate.progress.nextCampBreedingSequence = 1; }, 'invalid-camp-breeding-sequence'],
    [candidate => { candidate.progress.campCare = { version: 1, bedId: 'build_other_bed', wildkinId: 'wildkin_parent_a', nourishment: 0 }; }, 'invalid-camp-breeding-care'],
    [candidate => {
      for (let index = 0; index < 61; index += 1) candidate.progress.ownedWildkin.push(individual(`wildkin_import_${index}`, `import:${index}`, `import_run_${index}`, 'tidefin'));
      const pending = individual('wildkin_import_pending', 'import:pending', 'import_pending', 'tidefin');
      candidate.progress.activeRun = { runId: 'import_pending', startAnchorId: 'camp_gate', sectionId: 'camp', feet: { x: 0, y: .6, z: 0 }, facingYaw: 0,
        health: 6, xp: 0, companions: [pending], corePending: false, kills: 0, maxDepth: 0, frontierDeparted: false, newWaypoints: [], newBeacons: [] };
    }, 'invalid-camp-breeding-capacity'],
  ]) {
    const candidate = structuredClone(envelope); mutate(candidate);
    assert.equal(progress.importSave(candidate).reason, reason);
    assert.equal(progress.getCampBreeding().growthSeconds, 5, 'rejected import preserves current breeding');
  }
}));

test('a growing child reserves the final owned slot from banking and field capture', () => withStorage(() => {
  const { progress } = setupPair();
  const envelope = progress.exportSave().payload;
  for (let index = 0; index < 61; index += 1) {
    envelope.progress.ownedWildkin.push(individual(`wildkin_capacity_${index}`, `capacity:${index}`, `capacity_run_${index}`, 'tidefin'));
  }
  assert.equal(progress.importSave(envelope).ok, true);
  assert.equal(progress.getOwnedWildkin().length, 63);
  assert.equal(progress.beginCampBreeding('build_pair_bed').ok, true);

  const banked = individual('wildkin_overflow_bank', 'overflow:bank', 'overflow_bank', 'tidefin');
  assert.equal(progress.bankRun({}, 0, 'overflow_bank', { companions: [banked] }).reason, 'wildkin-owned-capacity');
  const run = { runId: 'overflow_capture', startAnchorId: 'camp_gate', sectionId: 'camp',
    feet: { x: 0, y: .6, z: 0 }, facingYaw: 0, health: 6, xp: 0, companions: [], corePending: false,
    kills: 0, maxDepth: 0, frontierDeparted: false, newWaypoints: [], newBeacons: [] };
  assert.equal(progress.checkpointRun(run).ok, true);
  const captured = individual('wildkin_overflow_capture', 'overflow:capture', 'overflow_capture', 'tidefin');
  assert.equal(progress.commitWildkinCapture(captured, [captured]).reason, 'wildkin-owned-capacity');
  assert.equal(progress.getOwnedWildkin().length, 63);
  assert.equal(progress.getCampBreeding().offspring.id, 'wildkin_bred_1');
}));
