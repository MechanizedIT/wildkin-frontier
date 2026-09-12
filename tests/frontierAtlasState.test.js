import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFrontierAtlasState, getFrontierAtlasCell, makeFrontierAtlasChunkId,
  normalizeFrontierAtlasState, revealFrontierAtlasCell, MAX_FRONTIER_ATLAS_CHUNKS,
} from '../src/world/frontierAtlasState.js';
import { createFrontierAtlasSurvey } from '../src/world/frontierAtlasSurvey.js';

test('atlas uses stable signed chunk identities and 25-bit masks across negative cell boundaries', () => {
  assert.equal(makeFrontierAtlasChunkId(-1, 0), 'f1:a:-1:0');
  assert.deepEqual(getFrontierAtlasCell({ x: -0.01, z: -0.01 }), {
    ok: true, chunkId: 'f1:a:-1:-1', cx: -1, cz: -1, localX: 4, localZ: 4, bit: 24, mask: 1 << 24,
  });
  const first = revealFrontierAtlasCell(createFrontierAtlasState(), { x: -0.01, z: -0.01 });
  assert.equal(first.ok, true); assert.equal(first.patch.mask, 1 << 24);
  const again = revealFrontierAtlasCell({ ...createFrontierAtlasState(), chunks: { [first.patch.chunkId]: first.patch.mask } }, { x: -0.01, z: -0.01 });
  assert.deepEqual({ ok: again.ok, changed: again.changed }, { ok: true, changed: false });
  assert.equal(getFrontierAtlasCell({ x: 1_000_000, z: -1_000_000 }).ok, true);
  assert.equal(getFrontierAtlasCell({ x: 1_000_000.01, z: 0 }).reason, 'invalid-atlas-position');
});

test('atlas rejects malformed and future persisted state and refuses capacity overflow', () => {
  assert.throws(() => normalizeFrontierAtlasState({ edition: 2, seed: 0x4f1a2b3c, chunks: {} }), /unsupported-atlas-edition/);
  assert.throws(() => normalizeFrontierAtlasState({ edition: 1, seed: 0x4f1a2b3c, chunks: { 'f1:a:0:0': 0 } }), /invalid-atlas-chunk/);
  const chunks = {};
  for (let index = 0; index < MAX_FRONTIER_ATLAS_CHUNKS; index++) chunks[`f1:a:${index - 20_000}:0`] = 1;
  const result = revealFrontierAtlasCell({ edition: 1, seed: 0x4f1a2b3c, chunks }, { x: 1_000_000, z: 1_000_000 });
  assert.deepEqual({ ok: result.ok, reason: result.reason }, { ok: false, reason: 'atlas-capacity-exceeded' });
});

test('survey calls the save owner for new cells only and backs off failed saves for two seconds', () => {
  const calls = [], blocked = [];
  let fail = true;
  const survey = createFrontierAtlasSurvey({
    progress: { revealFrontierAt: position => { calls.push(position); return fail ? { ok: false, reason: 'storage-write-failed' } : { ok: true, changed: true }; } },
    onBlocked: reason => blocked.push(reason),
  });
  survey.update(.1, { x: 1, z: 1 });
  survey.update(1.9, { x: 9, z: 9 });
  assert.equal(calls.length, 1); assert.deepEqual(blocked, ['storage-write-failed']);
  fail = false; survey.update(.1, { x: 9, z: 9 });
  assert.equal(calls.length, 2);
  survey.update(1, { x: 9, z: 9 });
  assert.equal(calls.length, 2, 'same committed cell does not request another write');
  survey.update(1, { x: 11, z: 9 }, { enabled: false });
  assert.equal(calls.length, 2, 'disabled/Author composition does not reveal');
});
