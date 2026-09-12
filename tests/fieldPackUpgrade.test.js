import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createItemCatalog } from '../src/inventory/itemCatalog.js';
import { FIELD_PACK_CARTRIDGE_ID as cartridge, FIELD_PACK_FIT_COST } from '../src/base/fieldPackConfig.js';
import { countItems } from '../src/inventory/slotOperations.js';

const resourceDrops = ['wood', 'stone', 'fiber', 'berries', 'constructor', '__proto__'].map(id => ({ id, displayName: id }));
function setup(t, { bench = true, raw = { version: 2, base: { tier: 1, structures: [] } } } = {}) {
  const original = globalThis.localStorage;
  let stored = JSON.stringify(raw), failing = false, writes = 0;
  globalThis.localStorage = { getItem: () => stored, setItem: (_key, value) => { if (failing) throw Error('quota'); stored = value; writes++; } };
  t.after(() => { globalThis.localStorage = original; });
  const progress = createFrontierProgress({ resourceDrops });
  progress.load();
  if (bench) {
    assert.equal(progress.collectResources({ wood: 6, stone: 3, fiber: 2 }).ok, true);
    assert.equal(progress.placeStructure({ id: 'build_pack_bench', type: 'workbench', pos: { x: 0, y: 0, z: 18 }, yaw: 0 }).placed, true);
  }
  return { progress, fail: value => { failing = value; }, saved: () => stored, writes: () => writes };
}
function fund(p, supplies = FIELD_PACK_FIT_COST) { assert.equal(p.collectResources(supplies).ok, true); }
function transferItem(p, from, id, to, options) {
  const slots = p.inventory.view(from).slots;
  return p.inventory.transfer(from, slots.findIndex(stack => stack?.id === id), to, options);
}

test('cartridge is a fixed one-per-slot upgrade and authored resource collisions are rejected', () => {
  const item = createItemCatalog(resourceDrops)[cartridge];
  assert.deepEqual(item, { id: cartridge, name: 'Field-pack cartridge', icon: 'backpack', kind: 'upgrade', stackLimit: 1,
    description:'Fit at a Salvage bench to expand a starter pack to 20 slots.' });
  assert.throws(() => createItemCatalog([{ id: cartridge }]), /conflict/);
});

test('fit appends four empty slots, consumes exact costs and preserves existing positions and equipment', t => {
  const { progress: p } = setup(t);
  fund(p, { stone: 3, medkit: 1, berry_lure: 1, [cartridge]: 1, fiber: 9, wood: 4 });
  assert.equal(p.assignQuickSlot(3, 'medkit').ok, true);
  assert.equal(p.selectQuickSlot(3).ok, true);
  const before = p.getInventoryState(), loadout = p.getLoadout();
  const result = p.fitFieldPack();
  assert.equal(result.fitted, true); assert.equal(result.reason, 'fitted');
  const after = p.getInventoryState();
  assert.equal(after.packTier, 1); assert.equal(after.pack.length, 20);
  assert.deepEqual(after.pack.slice(16), [null, null, null, null]);
  assert.deepEqual(after.pack.slice(0, 3), before.pack.slice(0, 3));
  assert.deepEqual(after.pack[3], null);
  assert.deepEqual(after.pack[4], { id: 'fiber', count: 3 });
  assert.deepEqual(after.pack[5], { id: 'wood', count: 2 });
  assert.deepEqual(after.containers, before.containers);
  assert.deepEqual(after.totals, before.totals);
  assert.deepEqual(p.getLoadout(), loadout);
  assert.equal(p.getState().craftedConsumables.medkit, 1);
  assert.equal(p.getState().fieldSupplies.berry_lure, 1);
  assert.equal(Object.hasOwn(p.getBankedResources(), cartridge), false);
});

test('a placed Salvage bench and full recipe are required without charging partial ingredients', t => {
  const { progress: p } = setup(t, { bench: false });
  fund(p); const before = p.getState();
  assert.equal(p.fitFieldPack().reason, 'station-required'); assert.deepEqual(p.getState(), before);
  fund(p, { wood: 6, stone: 3, fiber: 2 });
  assert.equal(p.placeStructure({ id: 'build_bench', type: 'workbench', pos: { x: 0, y: 0, z: 18 }, yaw: 0 }).placed, true);
  assert.equal(p.spendResources({ fiber: 1 }).ok, true);
  const short = p.getState();
  assert.equal(p.fitFieldPack().reason, 'unaffordable'); assert.deepEqual(p.getState(), short);
});

test('fitting spends pack first and only the selected reachable container', t => {
  const { progress: p } = setup(t);
  fund(p); let reachable = true, selected = null;
  p.setInventoryAccess({ canAccessContainer: () => reachable, getCraftStorageId: () => selected });
  assert.equal(transferItem(p, 'backpack', cartridge, 'pod_locker').ok, true);
  assert.equal(transferItem(p, 'backpack', 'fiber', 'pod_locker', { count: 4 }).ok, true);
  assert.equal(p.getSpendableItemCounts()[cartridge], 0);
  assert.equal(p.fitFieldPack().reason, 'unaffordable');
  selected = 'pod_locker'; reachable = false;
  assert.equal(p.getSpendableItemCounts()[cartridge], 0);
  const before = p.getInventoryState();
  assert.equal(p.fitFieldPack().reason, 'out-of-reach'); assert.deepEqual(p.getInventoryState(), before);
  reachable = true;
  assert.equal(p.getSpendableItemCounts()[cartridge], 1);
  assert.equal(p.getSpendableItemCounts().fiber, 6);
  assert.equal(p.getSpendableResources().fiber, 6);
  assert.equal(p.fitFieldPack().fitted, true);
  assert.equal(p.getSpendableItemCounts()[cartridge], 0);
  assert.equal(p.getSpendableItemCounts().fiber, 0);
});

test('save failure rolls back both physical sources, pack capacity, equipment and expedition snapshot', t => {
  const f = setup(t), p = f.progress;
  fund(p); p.setInventoryAccess({ canAccessContainer: () => true, getCraftStorageId: () => 'pod_locker' });
  assert.equal(transferItem(p, 'backpack', cartridge, 'pod_locker').ok, true);
  const live = { runId: 'run_pack', startAnchorId: 'entry', sectionId: 'section_1', feet: { x: 0, y: 0, z: 24 }, facingYaw: 0, health: 4, xp: 5, companions: [], corePending: false, kills: 0, maxDepth: 1, newWaypoints: [], newBeacons: [] };
  p.setRunSnapshotProvider(() => live); assert.equal(p.checkpointRun().ok, true);
  const before = p.getState(), saved = f.saved(); live.xp = 9;
  f.fail(true); const result = p.fitFieldPack();
  assert.equal(result.fitted, false); assert.deepEqual(p.getState(), before); assert.equal(f.saved(), saved);
  f.fail(false); assert.equal(p.fitFieldPack().fitted, true);
  assert.equal(p.getActiveRun().xp, 9); assert.equal(JSON.parse(f.saved()).inventory.packTier, 1);
});

test('fitted capacity and cartridge ownership survive literal load and export/import without a new ledger', t => {
  const { progress: p } = setup(t); fund(p, { ...FIELD_PACK_FIT_COST, [cartridge]: 2 });
  assert.equal(p.fitFieldPack().fitted, true);
  const expected = p.getState(), exported = p.exportSave().payload;
  assert.equal(exported.gameVersion, 3); assert.equal(Object.hasOwn(exported.progress, 'blueprints'), false);
  p.load(); assert.deepEqual(p.getState(), expected);
  p.clear(); assert.equal(p.importSave(exported).ok, true); assert.deepEqual(p.getState(), expected);
  assert.equal(p.getSpendableItemCounts()[cartridge], 1);
});

for (const [tier, slots] of [[1, 20], [2, 24]]) test(`existing ${slots}-slot packs are never downgraded or charged again`, t => {
  const f = setup(t, { bench: false }), p = f.progress; fund(p);
  const exported = p.exportSave().payload;
  exported.progress.inventory.packTier = tier;
  exported.progress.inventory.pack.push(...Array(slots - 16).fill(null));
  assert.equal(p.importSave(exported).ok, true);
  const before = p.getState(), writes = f.writes();
  assert.equal(p.fitFieldPack().reason, 'already-fitted'); assert.equal(p.fitFieldPack().fitted, false);
  assert.deepEqual(p.getState(), before); assert.equal(f.writes(), writes);
  p.setInventoryAccess({ canAccessContainer: () => true });
  assert.equal(transferItem(p, 'backpack', cartridge, 'pod_locker').ok, true);
  assert.equal(transferItem(p, 'pod_locker', cartridge, 'backpack', { toIndex: slots - 1 }).ok, true);
  p.load(); assert.equal(p.getInventoryState().pack.length, slots);
  assert.deepEqual(p.getInventoryState().pack[slots - 1], { id: cartridge, count: 1 });
});

test('stack-one cartridges transfer intact, reject oversized imported stacks and remain recoverable from full loot', t => {
  const { progress: p } = setup(t, { bench: false });
  fund(p, { [cartridge]: 2 });
  assert.deepEqual(p.getInventoryState().pack.slice(0, 2), [{ id: cartridge, count: 1 }, { id: cartridge, count: 1 }]);
  p.setInventoryAccess({ canAccessContainer: () => true });
  assert.equal(transferItem(p, 'backpack', cartridge, 'pod_locker').ok, true);
  assert.equal(transferItem(p, 'pod_locker', cartridge, 'backpack', { toIndex: 5 }).ok, true);
  const before = p.getState(), invalid = p.exportSave().payload;
  invalid.progress.inventory.pack[5].count = 2;
  assert.equal(p.importSave(invalid).ok, false); assert.deepEqual(p.getState(), before);
  p.clear(); fund(p, { wood: 320 });
  const rewards = { resources: { [cartridge]: 1 }, xp: 0 };
  assert.equal(p.claimLootRewards('survey_cartridge', null, rewards).reason, 'full');
  assert.equal(p.getLootChestAvailability('survey_cartridge', null).available, true);
  assert.equal(p.spendResources({ wood: 20 }).ok, true);
  assert.equal(p.claimLootRewards('survey_cartridge', null, rewards).ok, true);
  assert.equal(countItems(p.getInventoryState().pack)[cartridge], 1);
  assert.equal(p.claimLootRewards('survey_cartridge', null, rewards).reason, 'unavailable');
});

test('all-item affordability retains safe zero counts for authored object-property resource IDs', t => {
  const { progress: p } = setup(t, { bench: false });
  for (const id of ['constructor', '__proto__', cartridge, 'medkit']) assert.equal(p.getSpendableItemCounts()[id], 0);
  fund(p, Object.fromEntries([['constructor', 2], ['__proto__', 1], ['medkit', 1]]));
  assert.equal(p.getSpendableItemCounts().constructor, 2); assert.equal(p.getSpendableItemCounts().__proto__, 1);
  assert.equal(p.getSpendableItemCounts().medkit, 1); assert.equal(Object.hasOwn(p.getSpendableResources(), 'medkit'), false);
});
