import assert from 'node:assert/strict';
import test from 'node:test';
import WORLD_DATA from '../src/world/data/world.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createWildkinGenome } from '../src/creatures/wildkinGenome.js';
import { getWildkinSex } from '../src/creatures/wildkinIndividual.js';

function withStorage(run) {
  const previous = global.localStorage;
  const values = new Map(); let failWrites = false;
  global.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => {
    if (failWrites) throw new Error('quota'); values.set(key, String(value));
  }, removeItem: key => values.delete(key) };
  try { return run({ values, fail: value => { failWrites = value; } }); } finally { global.localStorage = previous; }
}

function progress() { return createFrontierProgress({ resourceDrops: WORLD_DATA.resourceDrops }); }
function run(runId, companions = []) {
  return { runId, startAnchorId: 'entry', sectionId: 'field', feet: { x: 0, y: 0, z: 0 }, facingYaw: 0,
    health: 4, xp: 0, companions, corePending: false, kills: 0, maxDepth: 0, newWaypoints: [], newBeacons: [] };
}
function mossling(id, originId, acquiredRunId) {
  return { version: 1, id, speciesId: 'mossling', originId, acquiredRunId,
    sex: getWildkinSex(originId), lineage: null, genome: createWildkinGenome(originId) };
}

test('capture persists the exact pending individual and source atomically across reload', () => withStorage(({ fail }) => {
  const first = progress(); const active = run('capture_run');
  assert.equal(first.checkpointRun(active).ok, true);
  const record = mossling('wildkin_a', 'f1:w:0:0:0', 'capture_run');
  fail(true);
  assert.equal(first.commitWildkinCapture(record, [record]).ok, false);
  assert.deepEqual(first.getActiveRun().companions, []);
  assert.equal(first.isWildkinSourceCaptured(record.originId), false);
  fail(false);
  assert.equal(first.commitWildkinCapture(record, [record]).ok, true);
  const restored = progress(); restored.load();
  assert.deepEqual(restored.getActiveRun().companions, [record]);
  assert.equal(restored.isWildkinSourceCaptured(record.originId), true);
  assert.equal(restored.commitWildkinCapture(record, [record]).ok, true, 'the durable capture is retry-idempotent');
}));

test('banking retains two same-species individuals and does not replay a resolved run', () => withStorage(() => {
  const saved = progress();
  const one = mossling('wildkin_one', 'f1:w:1:0:0', 'bank_run');
  const two = mossling('wildkin_two', 'f1:w:1:0:1', 'bank_run');
  const result = saved.bankRun({}, 0, 'bank_run', { companions: [one, two] });
  assert.equal(result.ok, true);
  assert.deepEqual(saved.getOwnedWildkin().map(record => record.id), ['wildkin_one', 'wildkin_two']);
  assert.deepEqual(saved.getState().securedCompanions, ['mossling']);
  assert.equal(saved.getActiveWildkin().id, 'wildkin_one');
  assert.equal(saved.bankRun({}, 0, 'bank_run', { companions: [mossling('wildkin_three', 'f1:w:1:0:2', 'bank_run')] }).added, false);
  assert.equal(saved.getOwnedWildkin().length, 2);
}));

test('death clears pending bonds while preserving selected owned identity and capture history', () => withStorage(() => {
  const saved = progress(); const owned = mossling('wildkin_owned', 'f1:w:2:0:0', 'old_run');
  assert.equal(saved.bankRun({}, 0, 'old_run', { companions: [owned] }).ok, true);
  assert.equal(saved.setActiveWildkin(owned.id).ok, false, 'already active');
  const pending = mossling('wildkin_pending', 'f1:w:2:0:1', 'death_run');
  assert.equal(saved.checkpointRun(run('death_run')).ok, true);
  assert.equal(saved.commitWildkinCapture(pending, [pending]).ok, true);
  assert.equal(saved.endRunWithoutRewards('death_run').ok, true);
  assert.equal(saved.getActiveRun(), null);
  assert.equal(saved.getActiveWildkin().id, owned.id);
  assert.equal(saved.isWildkinSourceCaptured(pending.originId), true);
}));
