import { cloneInventory, withdrawLegacy } from './inventoryState.js';
import { addStack, craftStacks, sortStacks, transferStack } from './slotOperations.js';

export const BACKPACK_ID = 'backpack';
export const LEGACY_SUPPLIES_ID = 'legacy_supplies';

// This adapter owns no quantities or save. Frontier progress supplies the current
// inventory and atomic commit; gameplay supplies current physical access checks.
export function createInventoryActions({ catalog, getInventory, commitInventory, canAccessContainer = () => false }) {
  const allowed = id => id === BACKPACK_ID || canAccessContainer(id) === true;
  const container = (inventory, id) => id === BACKPACK_ID ? { id, slots: inventory.pack } : inventory.containers.find(value => value.id === id);
  const assign = (inventory, id, slots) => { if (id === BACKPACK_ID) inventory.pack = slots; else container(inventory, id).slots = slots; };
  const fail = reason => ({ ok: false, reason, added: 0, moved: 0 });
  function commit(inventory, result) {
    const write = commitInventory(inventory);
    return write?.ok ? { ok: true, ...result } : fail(write?.reason ?? 'storage-write-failed');
  }
  function view(id = BACKPACK_ID) {
    if (!allowed(id)) return { ok: false, reason: 'out-of-reach' };
    const inventory = cloneInventory(getInventory());
    if (id === LEGACY_SUPPLIES_ID) return { ok: true, id, label: 'Legacy supplies', quantities: inventory.legacy, withdrawOnly: true };
    const selected = container(inventory, id);
    return selected ? { ok: true, ...selected } : { ok: false, reason: 'unknown-container' };
  }
  function collect(id, count, { gathered = false } = {}) {
    const inventory = cloneInventory(getInventory()), result = addStack(inventory.pack, id, count, catalog);
    if (!result.added) return { ...fail(result.reason), remaining: count };
    inventory.pack = result.slots;
    if (gathered) inventory.totals.gathered = Math.min(Number.MAX_SAFE_INTEGER, inventory.totals.gathered + result.added);
    const saved = commit(inventory, { added: result.added, remaining: result.remaining });
    return saved.ok ? saved : { ...saved, remaining: count };
  }
  function transfer(fromId, fromIndex, toId, { toIndex = null, count = null } = {}) {
    if (!allowed(fromId) || !allowed(toId)) return fail('out-of-reach');
    if (fromId === LEGACY_SUPPLIES_ID || toId === LEGACY_SUPPLIES_ID) return fail('withdraw-only');
    const inventory = cloneInventory(getInventory()), source = container(inventory, fromId), target = container(inventory, toId);
    if (!source || !target) return fail('unknown-container');
    const moved = transferStack(source.slots, target.slots, fromIndex, catalog, { toIndex, count });
    if (!moved.ok) return fail(moved.reason);
    assign(inventory, fromId, moved.source); assign(inventory, toId, moved.target);
    return commit(inventory, { moved: moved.moved, remaining: moved.remaining ?? 0, swapped: !!moved.swapped });
  }
  function sort(id) {
    if (!allowed(id)) return fail('out-of-reach');
    const inventory = cloneInventory(getInventory()), selected = container(inventory, id);
    if (!selected) return fail('unknown-container');
    const result = sortStacks(selected.slots, catalog);
    if (!result.ok) return fail(result.reason);
    assign(inventory, id, result.slots);return commit(inventory, {});
  }
  function craft(cost, outputs, storageId = null) {
    if (storageId === BACKPACK_ID) return fail('duplicate-container');
    if (storageId === LEGACY_SUPPLIES_ID) return fail('withdraw-only');
    if (storageId !== null && !allowed(storageId)) return fail('out-of-reach');
    const inventory = cloneInventory(getInventory()), selected = storageId === null ? null : container(inventory, storageId);
    if (storageId !== null && !selected) return fail('unknown-container');
    const result = craftStacks(inventory.pack, selected?.slots ?? null, cost, outputs, catalog);
    if (!result.ok) return fail(result.reason);
    inventory.pack = result.pack;
    if (selected) selected.slots = result.storage;
    return commit(inventory, {});
  }
  function takeLegacy(id, count) {
    if (!allowed(LEGACY_SUPPLIES_ID)) return fail('out-of-reach');
    const result = withdrawLegacy(getInventory(), id, count, catalog);
    return result.ok ? commit(result.inventory, { moved: result.moved }) : fail(result.reason);
  }
  return { view, collect, transfer, sort, craft, takeLegacy };
}
