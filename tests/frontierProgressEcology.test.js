import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { makeFrontierResourceId, FRONTIER_ECOLOGY_DEFAULT_SEED, MAX_FRONTIER_RESOURCE_RECORDS } from '../src/world/frontierEcologyState.js';

function setup(raw = null) {
  let value = raw ? JSON.stringify(raw) : null, fail = false;
  globalThis.localStorage = { getItem: () => value, setItem: (_key, next) => { if (fail) throw Error('quota'); value = next; } };
  const progress = createFrontierProgress(); progress.load();
  return { progress, saved: () => value, fail: v => { fail = v; } };
}

test('finite forage scar commits, reloads, and repeats idempotently', () => {
  const f = setup(), id = makeFrontierResourceId(-3, 4, 0);
  assert.deepEqual(f.progress.getFrontierEcologyState().resources, {});
  assert.equal(f.progress.commitFrontierResourceState(id, 6).changed, true);
  assert.equal(f.progress.commitFrontierResourceState(id, 6).changed, false);
  const reloaded = createFrontierProgress(); reloaded.load();
  assert.equal(reloaded.getFrontierEcologyState().resources[id], 6);
  assert.equal(JSON.parse(f.saved()).ecology.seed, FRONTIER_ECOLOGY_DEFAULT_SEED);
});

test('malformed or future ecology rejects import and leaves active save unchanged', () => {
  const f = setup(), id = makeFrontierResourceId(0, 0, 0);
  f.progress.commitFrontierResourceState(id, 2);
  const before = f.progress.getFrontierEcologyState(), saved = f.saved();
  const envelope = f.progress.exportSave().payload;
  for (const ecology of [
    { edition: 2, seed: FRONTIER_ECOLOGY_DEFAULT_SEED, resources: {} },
    { edition: 1, seed: FRONTIER_ECOLOGY_DEFAULT_SEED, resources: { bad: 3 } },
  ]) {
    const bad = structuredClone(envelope); bad.progress.ecology = ecology;
    assert.equal(f.progress.importSave(bad).ok, false);
    assert.deepEqual(f.progress.getFrontierEcologyState(), before);
    assert.equal(f.saved(), saved);
  }
});

test('capacity and storage failure never drop or partially write scars', () => {
  const f = setup();
  const full = f.progress.exportSave().payload;
  full.progress.ecology.resources = Object.fromEntries(Array.from({ length: MAX_FRONTIER_RESOURCE_RECORDS }, (_, i) => [makeFrontierResourceId(i, 0, 0), 1]));
  assert.equal(f.progress.importSave(full).ok, true);
  const fullBefore = f.progress.getFrontierEcologyState();
  assert.equal(f.progress.commitFrontierResourceState(makeFrontierResourceId(0, 1, 0), 1).reason, 'ecology-capacity-exceeded');
  assert.deepEqual(f.progress.getFrontierEcologyState(), fullBefore);
  f.fail(true);
  const id = makeFrontierResourceId(0, 0, 0);
  assert.equal(f.progress.commitFrontierResourceState(id, 9).reason, 'storage-write-failed');
  assert.equal(f.progress.getFrontierEcologyState().resources[id], 1);
});
