import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FRONTIER_WORLD, normalizeFrontierWorld, frontierDomainSeed } from '../src/world/frontierWorld.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';

const resourceDrops = ['wood', 'stone'].map(id => ({ id, displayName: id }));
function fixture() {
  const disk = new Map();
  let fail = false;
  globalThis.localStorage = {
    getItem: key => disk.get(key) ?? null,
    setItem: (key, value) => { if (fail) throw new Error('quota'); disk.set(key, value); },
    removeItem: key => disk.delete(key),
  };
  const progress = createFrontierProgress({ resourceDrops });
  progress.load();
  return { progress, disk, fail: value => { fail = value; } };
}

test('world descriptors detach mutable input and reject unsupported generator identities', () => {
  const raw = { edition: 1, seed: 42 };
  const world = normalizeFrontierWorld(raw);
  raw.seed = 7;
  assert.equal(world.seed, 42);
  assert.ok(Object.isFrozen(world));
  assert.strictEqual(normalizeFrontierWorld(), DEFAULT_FRONTIER_WORLD);
  for (const invalid of [null, [], { edition: 2, seed: 42 }, { edition: 1, seed: -1 },
    { edition: 1, seed: 1.5 }, { edition: 1, seed: 0x100000000 }, { edition: 1, seed: 42, extra: true }]) {
    assert.throws(() => normalizeFrontierWorld(invalid), /invalid-frontier-world/);
  }
});

test('independent seed domains replay without a shared random cursor and retain default salts', () => {
  const world = normalizeFrontierWorld({ edition: 1, seed: 42 });
  const terrain = frontierDomainSeed(world, 'terrain', 17);
  frontierDomainSeed(world, 'scenery', 17);
  assert.equal(frontierDomainSeed(world, 'terrain', 17), terrain);
  assert.notEqual(terrain, frontierDomainSeed(world, 'wildlife', 17));
  assert.notEqual(terrain, frontierDomainSeed({ edition: 1, seed: 43 }, 'terrain', 17));
  assert.equal(frontierDomainSeed(DEFAULT_FRONTIER_WORLD, 'terrain', 17), 17);
});

test('saved generation identity stays immutable across atlas and ecology commits, reload, import and clear', () => {
  const f = fixture(), p = f.progress;
  const world = p.getWorldDescriptor();
  assert.ok(Object.isFrozen(world));
  assert.equal(p.revealFrontierAt({ x: 51, z: -1 }).ok, true);
  assert.equal(p.commitFrontierResourceState('f1:r:0:-2:0', 0).ok, true);
  const payload = p.exportSave().payload;
  const reloaded = createFrontierProgress({ resourceDrops }); reloaded.load();
  assert.strictEqual(reloaded.getWorldDescriptor(), world);
  assert.deepEqual(reloaded.getFrontierAtlasState(), p.getFrontierAtlasState());
  assert.equal(reloaded.getFrontierResourceRemaining('f1:r:0:-2:0'), 0);
  assert.equal(p.importSave(payload).ok, true);
  assert.strictEqual(p.getWorldDescriptor(), world);
  const externalState = p.getState();
  externalState.atlas.seed = 7;
  externalState.ecology.seed = 8;
  assert.strictEqual(p.getWorldDescriptor(), world);
  p.clear();
  assert.strictEqual(p.getWorldDescriptor(), world);
});

test('foreign or mismatched saved worlds and failed writes cannot replace current discoveries or identity', () => {
  const f = fixture(), p = f.progress;
  p.revealFrontierAt({ x: 51, z: -1 });
  p.commitFrontierResourceState('f1:r:0:-2:0', 0);
  const world = p.getWorldDescriptor(), atlas = p.getFrontierAtlasState();
  const before = p.exportSave().payload, disk = [...f.disk];
  for (const fields of [['atlas'], ['ecology'], ['atlas', 'ecology']]) {
    const foreign = structuredClone(before);
    for (const field of fields) foreign.progress[field].seed = 42;
    assert.equal(p.importSave(foreign).ok, false);
    assert.strictEqual(p.getWorldDescriptor(), world);
    assert.strictEqual(p.getFrontierAtlasState(), atlas);
    assert.equal(p.getFrontierResourceRemaining('f1:r:0:-2:0'), 0);
    assert.deepEqual([...f.disk], disk);
  }
  f.fail(true);
  assert.equal(p.importSave(before).ok, false);
  assert.equal(p.revealFrontierAt({ x: 100, z: 1 }).ok, false);
  assert.strictEqual(p.getWorldDescriptor(), world);
  assert.strictEqual(p.getFrontierAtlasState(), atlas);
  assert.deepEqual([...f.disk], disk);
});
