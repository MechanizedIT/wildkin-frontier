import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { sampleFrontierDiscoveries } from '../src/world/frontierDiscovery.js';
import { createLootRegistryOverlay } from '../src/world/lootRegistryOverlay.js';
import { createLootSystem } from '../src/world/lootSystem.js';
import { createWorldRegistry } from '../src/world/worldRegistry.js';
import { WORLD_DATA } from '../src/world/data/world.generated.js';

const definitions = sampleFrontierDiscoveries({ visualAssets: WORLD_DATA.visualAssets, lootTables: WORLD_DATA.lootTables });
const groveIds = definitions.filter(chest => chest.opensOnSeal).map(chest => chest.id);

function disk(t) {
  const previous = globalThis.localStorage, values = new Map();
  let failing = false;
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (failing) throw new Error('grove quota fixture'); values.set(key, value); },
    removeItem: key => values.delete(key),
  };
  t.after(() => { globalThis.localStorage = previous; });
  return { fail: value => { failing = value; } };
}

function runtime(id = groveIds[0]) {
  const registry = createLootRegistryOverlay(createWorldRegistry(WORLD_DATA), definitions);
  const progress = createFrontierProgress({ worldRegistry: registry, resourceDrops: WORLD_DATA.resourceDrops });
  progress.load(); // The complete identity catalog must exist before this normalization.
  registry.setResidentDiscoveryIds(id ? [id] : []);
  const chest = registry.getLootChestById(id);
  if (!progress.getActiveRun()) assert.equal(progress.checkpointRun({
    runId: 'grove-loot-lifecycle', startAnchorId: 'gate_camp_frontier', sectionId: 'camp',
    feet: { ...chest.pos }, facingYaw: 0, health: 5, xp: 0, companions: [],
    corePending: false, kills: 0, maxDepth: 0, frontierDeparted: true,
    newWaypoints: [], newBeacons: [],
  }).ok, true);
  const loot = createLootSystem(registry, {
    frontierProgress: progress,
    getActiveSectionId: () => 'camp',
    getPlayerPos: () => ({ ...chest.pos, y: chest.pos.y + .55 }),
    checkAccess: source => ({ ok: !source.opensOnSeal || progress.isPoiCompleted(source.id) }),
  });
  return { registry, progress, loot, chest };
}

test('every finite discovery claim and grove seal survives the real save normalization and reload', t => {
  disk(t);
  const ids = definitions.map(source => source.id);
  let run = runtime();
  const envelope = run.progress.exportSave().payload;
  envelope.progress.claimedLootChestIds = [...ids];
  envelope.progress.completedPoiIds = [...groveIds];
  assert.equal(run.progress.importSave(JSON.stringify(envelope)).ok, true);
  run = runtime();
  const restored = run.progress.exportSave().payload.progress;
  assert.deepEqual(restored.claimedLootChestIds, ids, 'later catalog entries cannot disappear at the persistence cap');
  assert.deepEqual(restored.completedPoiIds, groveIds, 'all saved open seals survive reconstruction');
});

test('distributed grove partial food/flower/crystal rewards and seals survive unloaded reload independently', t => {
  disk(t);
  assert.ok(groveIds.length >= 2, 'real finite catalog supplies multiple distinct groves');
  let run = runtime();
  assert.equal(run.loot.open(run.chest.id).reason, 'locked');
  assert.equal(run.progress.completePoi(run.chest.id), true);
  assert.equal(run.progress.collectResources({ berries: 19, wood: 300 }).ok, true);
  const partial = run.loot.open(run.chest.id);
  assert.equal(partial.ok, true);
  assert.equal(partial.partial, true);
  assert.deepEqual(partial.rewards, { resources: { berries: 1 }, xp: 12 });
  const saved = run.progress.exportSave().payload.progress;
  assert.deepEqual(saved.lootRemainders[run.chest.id], {
    resources: { berries: 5, wildflower: 3, crystal_shard: 2 }, xpCollected: true,
  });
  run.registry.setResidentDiscoveryIds([]);
  run = runtime(groveIds[1]);
  assert.equal(run.progress.isPoiCompleted(groveIds[0]), true);
  assert.equal(run.progress.isPoiCompleted(groveIds[1]), false);
  assert.equal(run.loot.open(groveIds[1]).reason, 'locked');
  assert.deepEqual(run.progress.exportSave().payload.progress.lootRemainders[groveIds[0]], saved.lootRemainders[groveIds[0]]);
  run = runtime(groveIds[0]);
  assert.equal(run.loot.open(run.chest.id).reason, 'full');
  assert.equal(run.progress.spendResources({ wood: 60 }).ok, true);
  const rest = run.loot.open(run.chest.id);
  assert.equal(rest.ok, true);
  assert.equal(rest.partial, false);
  assert.deepEqual(rest.rewards, { resources: { berries: 5, wildflower: 3, crystal_shard: 2 }, xp: 0 });
  run = runtime(groveIds[0]);
  assert.equal(run.loot.open(run.chest.id).reason, 'unavailable');
  assert.equal(run.progress.getActiveRun().xp, 12, 'field XP survives every reload without repeating');
  assert.equal(run.progress.getState().bankedXp, 0, 'field XP remains at risk until Camp return');
  assert.equal(run.progress.exportSave().payload.progress.lootRemainders[run.chest.id], undefined);
});

test('a saved grove seal remains open when a failed loot write rolls back every reward', t => {
  const storage = disk(t), run = runtime();
  assert.equal(run.progress.completePoi(run.chest.id), true);
  const before = run.progress.exportSave().payload;
  storage.fail(true);
  assert.equal(run.loot.open(run.chest.id).ok, false);
  assert.deepEqual(run.progress.exportSave().payload, before);
  storage.fail(false);
  const retry = run.loot.open(run.chest.id);
  assert.equal(retry.ok, true);
  assert.deepEqual(retry.rewards, { resources: { berries: 6, wildflower: 3, crystal_shard: 2 }, xp: 12 });
  assert.equal(run.loot.open(run.chest.id).reason, 'unavailable');
});
