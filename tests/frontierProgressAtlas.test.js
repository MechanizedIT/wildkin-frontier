import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrontierProgress } from '../src/save/frontierProgress.js';

const resourceDrops = ['wood', 'stone'].map(id => ({ id, displayName: id }));
function fixture() {
  let stored = null, writes = 0, fail = false;
  globalThis.localStorage = {
    getItem: () => stored,
    setItem: (_key, value) => { if (fail) throw new Error('quota'); stored = value; writes++; },
  };
  const progress = createFrontierProgress({ resourceDrops });
  progress.load();
  return { progress, snapshot: () => stored, writes: () => writes, fail: value => { fail = value; } };
}

test('atlas reveal is atomic, idempotent, and exposes a stable immutable snapshot until commit', () => {
  const f = fixture(), p = f.progress;
  const initial = p.getFrontierAtlasState();
  assert.strictEqual(p.getFrontierAtlasState(), initial);
  const beforeWrites = f.writes();
  assert.deepEqual(p.revealFrontierAt({ x: -1, z: 1 }), { ok: true, changed: true, reason: null });
  const committed = p.getFrontierAtlasState();
  assert.notStrictEqual(committed, initial); assert.equal(Object.isFrozen(committed.chunks), true);
  assert.equal(f.writes(), beforeWrites + 1);
  assert.deepEqual(p.revealFrontierAt({ x: -1, z: 1 }), { ok: true, changed: false, reason: null });
  assert.equal(f.writes(), beforeWrites + 1, 'a known cell does not rewrite storage');
  const disk = f.snapshot(); f.fail(true);
  assert.deepEqual(p.revealFrontierAt({ x: 20, z: 1 }), { ok: false, changed: false, reason: 'storage-write-failed' });
  assert.strictEqual(p.getFrontierAtlasState(), committed, 'failed persistence never exposes an unsaved cell');
  assert.equal(f.snapshot(), disk);
});

test('atlas coverage survives reload and malformed/future imported atlas is rejected without changing it', () => {
  const f = fixture(), p = f.progress;
  assert.equal(p.revealFrontierAt({ x: 51, z: -1 }).ok, true);
  const payload = p.exportSave().payload;
  const reload = createFrontierProgress({ resourceDrops }); reload.load();
  assert.deepEqual(reload.getFrontierAtlasState(), p.getFrontierAtlasState());
  const before = p.getFrontierAtlasState();
  const future = structuredClone(payload); future.progress.atlas.edition = 2;
  assert.equal(p.importSave(future).ok, false);
  assert.strictEqual(p.getFrontierAtlasState(), before);
  const malformed = structuredClone(payload); malformed.progress.atlas.chunks = { 'f1:a:0:0': 0 };
  assert.equal(p.importSave(malformed).ok, false);
  assert.strictEqual(p.getFrontierAtlasState(), before);
});
