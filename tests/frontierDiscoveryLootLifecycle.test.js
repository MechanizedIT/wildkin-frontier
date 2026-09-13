import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { sampleFrontierDiscoveries } from '../src/world/frontierDiscovery.js';
import { createLootRegistryOverlay } from '../src/world/lootRegistryOverlay.js';
import { createLootSystem } from '../src/world/lootSystem.js';
import { createWorldRegistry } from '../src/world/worldRegistry.js';
import { WORLD_DATA } from '../src/world/data/world.generated.js';

function storage(t) {
  const previous = globalThis.localStorage, values = new Map();
  let failing = false;
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (failing) throw new Error('quota-fixture'); values.set(key, value); },
    removeItem: key => values.delete(key),
  };
  t.after(() => { globalThis.localStorage = previous; });
  return { values, fail: value => { failing = value; } };
}

function runtime() {
  const discoveries = sampleFrontierDiscoveries({ visualAssets: WORLD_DATA.visualAssets, lootTables: WORLD_DATA.lootTables });
  const registry = createLootRegistryOverlay(createWorldRegistry(WORLD_DATA), discoveries);
  const progress = createFrontierProgress({ worldRegistry: registry, resourceDrops: WORLD_DATA.resourceDrops });
  progress.load();
  registry.setResidentDiscoveryIds(discoveries.map(source => source.id));
  const source = discoveries[0];
  const loot = createLootSystem(registry, {
    frontierProgress: progress,
    getActiveSectionId: () => source.sectionId,
    getPlayerPos: () => ({ ...source.pos, y: source.pos.y + .55 }),
  });
  return { discoveries, registry, progress, loot, source };
}

test('Signal Cache full-pack retry, streaming unload, and save normalization share one stable loot identity', t => {
  const { values } = storage(t);
  let run = runtime();
  assert.equal(run.progress.collectResources({ wood: 320 }).ok, true);
  assert.equal(run.loot.open(run.source.id).reason, 'full');
  assert.equal(run.progress.getLootChestAvailability(run.source.id, null).available, true);
  assert.equal(run.progress.spendResources({ wood: 20 }).ok, true);
  const claim = run.loot.open(run.source.id);
  assert.equal(claim.ok, true);
  assert.deepEqual(claim.rewards, { resources: { iron_ore: 2 }, xp: 8 });

  run.registry.setResidentDiscoveryIds([]);
  assert.deepEqual(run.registry.getLootChestsForSection('camp').filter(source => source.id === run.source.id), []);
  assert.equal(run.registry.getLootChestById(run.source.id).id, run.source.id, 'persistent validation remains resident-independent');

  const key = [...values.keys()][0], persisted = JSON.parse(values.get(key));
  persisted.claimedLootChestIds.push('stale_discovery_fixture');
  values.set(key, JSON.stringify(persisted));
  run = runtime();
  const claimed = run.progress.exportSave().payload.progress.claimedLootChestIds;
  assert.equal(claimed.includes(run.source.id), true);
  assert.equal(claimed.includes('stale_discovery_fixture'), false);
  assert.equal(run.loot.open(run.source.id).reason, 'unavailable');
});

test('Signal Cache failed storage commit retains reward ownership for a clean retry', t => {
  const disk = storage(t), run = runtime();
  const before = run.progress.exportSave().payload;
  disk.fail(true);
  assert.equal(run.loot.open(run.source.id).ok, false);
  assert.deepEqual(run.progress.exportSave().payload, before);
  assert.equal(run.progress.getLootChestAvailability(run.source.id, null).available, true);
  disk.fail(false);
  const retry = run.loot.open(run.source.id);
  assert.equal(retry.ok, true);
  assert.deepEqual(retry.rewards, { resources: { iron_ore: 2 }, xp: 8 });
});

test('Signal Cache partial iron remainder persists through unload and reload without repeating XP', t => {
  storage(t);
  let run = runtime();
  assert.equal(run.progress.collectResources({ iron_ore: 19, wood: 300 }).ok, true);
  const partial = run.loot.open(run.source.id);
  assert.equal(partial.ok, true); assert.equal(partial.partial, true);
  assert.deepEqual(partial.rewards, { resources: { iron_ore: 1 }, xp: 8 });
  let saved = run.progress.exportSave().payload.progress;
  assert.deepEqual(saved.lootRemainders[run.source.id], { resources: { iron_ore: 1 }, xpCollected: true });
  assert.equal(saved.claimedLootChestIds.includes(run.source.id), false);

  run.registry.setResidentDiscoveryIds([]);
  run = runtime();
  assert.equal(run.loot.open(run.source.id).reason, 'full');
  assert.equal(run.progress.spendResources({ wood: 20 }).ok, true);
  const remainder = run.loot.open(run.source.id);
  assert.equal(remainder.ok, true); assert.equal(remainder.partial, false);
  assert.deepEqual(remainder.rewards, { resources: { iron_ore: 1 }, xp: 0 });
  saved = run.progress.exportSave().payload.progress;
  assert.equal(saved.lootRemainders[run.source.id], undefined);
  assert.equal(saved.claimedLootChestIds.includes(run.source.id), true);
  run = runtime();
  assert.equal(run.loot.open(run.source.id).reason, 'unavailable');
});
