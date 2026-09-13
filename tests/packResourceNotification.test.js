import test from 'node:test';
import assert from 'node:assert/strict';
import WORLD_DATA from '../src/world/data/world.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createWildkinGenome } from '../src/creatures/wildkinGenome.js';

const piece = (id, type, x) => ({ id: `build_${id}`, type, pos: { x, y: 0, z: 5 }, yaw: 0 });

test('committed pack resource deltas notify craft, build, feed, and plant through one boundary', () => {
  const previousStorage = global.localStorage;
  const values = new Map();
  let failWrites = false;
  global.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { if (failWrites) throw new Error('quota'); values.set(key, String(value)); },
    removeItem: key => values.delete(key),
  };
  try {
    const notices = [];
    const progress = createFrontierProgress({
      resourceDrops: WORLD_DATA.resourceDrops,
      onPackResourcesChanged: counts => notices.push({ ...counts }),
    });
    assert.equal(progress.collectResources({ wood: 40, fiber: 20, berries: 20 }).ok, true);
    notices.length = 0;

    const expectNotice = (act, succeeds) => {
      const before = notices.length;
      const result = act();
      assert.equal(succeeds(result), true);
      assert.equal(notices.length, before + 1);
      assert.deepEqual(notices.at(-1), progress.getPackResourceCounts());
    };

    expectNotice(() => progress.craftFieldSupply('berry_lure'), result => result.crafted);
    expectNotice(() => progress.placeStructure(piece('nursery', 'bed', -3)), result => result.placed);
    expectNotice(() => progress.placeStructure(piece('garden', 'berry_garden', 3)), result => result.placed);

    const originId = 'notice-mossling-origin';
    const mossling = { version: 1, id: 'notice-mossling', speciesId: 'mossling', originId, acquiredRunId: 'notice-run', genome: createWildkinGenome(originId) };
    const beforeNonInventory = notices.length;
    assert.equal(progress.bankRun({}, 0, 'notice-run', { companions: [mossling] }).ok, true);
    assert.equal(progress.assignCampWildkin(mossling.id, 'build_nursery').ok, true);
    assert.equal(notices.length, beforeNonInventory, 'successful non-inventory commits do not refresh carried resources');

    expectNotice(() => progress.feedCampWildkin('build_nursery'), result => result.ok);
    expectNotice(() => progress.plantCampCrop('build_garden'), result => result.ok);

    const beforeFailure = notices.length;
    failWrites = true;
    assert.equal(progress.craftFieldSupply('berry_lure').crafted, false);
    assert.equal(notices.length, beforeFailure, 'failed saves roll back without publishing transient counts');

    failWrites = false;
    progress.setInventoryAccess({ canAccessContainer: id => id === 'pod_locker', getCraftStorageId: () => 'pod_locker' });
    for (const id of ['berries', 'fiber']) {
      const slots = progress.inventory.view('backpack').slots;
      const index = slots.findIndex(stack => stack?.id === id);
      assert.ok(index >= 0);
      assert.equal(progress.inventory.transfer('backpack', index, 'pod_locker').ok, true);
    }
    notices.length = 0;
    assert.equal(progress.craftFieldSupply('berry_lure').crafted, true);
    assert.equal(notices.length, 0, 'storage-only ingredient spend leaves carried resource counts unchanged');
  } finally {
    global.localStorage = previousStorage;
  }
});
