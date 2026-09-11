import { INVENTORY_CONFIG } from './itemCatalog.js';
import { addStack, countItems } from './slotOperations.js';

export const POD_LOCKER_ID = 'pod_locker';
const MAX_CONTAINERS = 65; // One permanent locker plus the existing 64-piece limit.
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
const countIsValid = count => Number.isSafeInteger(count) && count >= 0;

export function createInventoryState() {
  return {
    packTier: 0,
    pack: Array(INVENTORY_CONFIG.packSlots[0]).fill(null),
    containers: [{ id: POD_LOCKER_ID, type: 'pod', label: 'Pod locker', slots: Array(INVENTORY_CONFIG.podSlots).fill(null) }],
    legacy: {},
    totals: { gathered: 0, returned: 0 },
  };
}

export function cloneInventory(inventory) {
  const slots = list => list.map(stack => stack ? { ...stack } : null);
  return { packTier: inventory.packTier, pack: slots(inventory.pack), containers: inventory.containers.map(container => ({ ...container, slots: slots(container.slots) })), legacy: { ...inventory.legacy }, totals: { ...inventory.totals } };
}

function validateSlots(slots, length, catalog) {
  return Array.isArray(slots) && slots.length === length && slots.every(stack => stack === null || (
    stack && typeof stack === 'object' && !Array.isArray(stack) && Object.hasOwn(catalog, stack.id) && countIsValid(stack.count) && stack.count > 0 && stack.count <= catalog[stack.id].stackLimit
  ));
}

// Reject an invalid new-format inventory without silently normalizing away a
// player's items. The save/import owner retains the previous save on failure.
export function readInventoryState(raw, catalog) {
  const fail = reason => ({ ok: false, reason });
  if (!raw || !Number.isInteger(raw.packTier) || !INVENTORY_CONFIG.packSlots[raw.packTier]) return fail('invalid-pack');
  if (!validateSlots(raw.pack, INVENTORY_CONFIG.packSlots[raw.packTier], catalog)) return fail('invalid-pack-stacks');
  if (!Array.isArray(raw.containers) || raw.containers.length < 1 || raw.containers.length > MAX_CONTAINERS) return fail('invalid-containers');
  const seen = new Set();
  for (const container of raw.containers) {
    if (!container || !validId(container.id) || seen.has(container.id)) return fail('invalid-container-id');
    seen.add(container.id);
    const length = { pod: INVENTORY_CONFIG.podSlots, crate: INVENTORY_CONFIG.crateSlots, locker: INVENTORY_CONFIG.lockerSlots }[container.type];
    if (!length || (container.type === 'pod') !== (container.id === POD_LOCKER_ID)) return fail('invalid-container-type');
    if (container.type !== 'pod' && !container.id.startsWith('build_')) return fail('invalid-container-id');
    if (typeof container.label !== 'string' || container.label.length > 48) return fail('invalid-container-label');
    if (!validateSlots(container.slots, length, catalog)) return fail('invalid-container-stacks');
  }
  if (!seen.has(POD_LOCKER_ID)) return fail('missing-pod-locker');
  if (!raw.legacy || typeof raw.legacy !== 'object' || Array.isArray(raw.legacy) || Object.keys(raw.legacy).length > 200) return fail('invalid-legacy-supplies');
  if (Object.entries(raw.legacy).some(([id, count]) => !validId(id) || !countIsValid(count))) return fail('invalid-legacy-supplies');
  if (!countIsValid(raw.totals?.gathered) || !countIsValid(raw.totals?.returned)) return fail('invalid-inventory-totals');
  return { ok: true, inventory: cloneInventory(raw) };
}

// v2 held a small number of potentially very large counters. Fill the finite
// pod locker in bounded work; preserve the remainder as withdraw-only delivery
// quantities rather than expanding millions of stacks or truncating them.
export function migrateLegacyInventory(raw, catalog) {
  const inventory = createInventoryState(), quantities = Object.create(null);
  for (const map of [raw?.bankedResources, raw?.craftedConsumables, raw?.fieldSupplies]) {
    if (!map || typeof map !== 'object' || Array.isArray(map)) continue;
    for (const [id, count] of Object.entries(map)) {
      if (!validId(id) || !countIsValid(count)) return { ok: false, reason: 'invalid-legacy-quantity' };
      if (!count) continue;
      quantities[id] = (quantities[id] ?? 0) + count;
      if (!countIsValid(quantities[id]) || Object.keys(quantities).length > 200) return { ok: false, reason: 'invalid-legacy-quantity' };
    }
  }
  const unknown = [];
  for (const id of Object.keys(quantities).sort()) {
    const count = quantities[id];
    if (!Object.hasOwn(catalog, id)) { inventory.legacy = { ...inventory.legacy, [id]: count }; unknown.push(id); continue; }
    const result = addStack(inventory.containers[0].slots, id, count, catalog);
    inventory.containers[0].slots = result.slots;
    if (result.remaining) inventory.legacy = { ...inventory.legacy, [id]: result.remaining };
  }
  // These are nonspendable milestone statistics. Saturate only the statistic;
  // each independently valid physical quantity above remains preserved exactly.
  const previousResourceTotal = Object.values(raw?.bankedResources ?? {}).filter(countIsValid).reduce((sum, count) => Math.min(Number.MAX_SAFE_INTEGER, sum + count), 0);
  inventory.totals.returned = previousResourceTotal;
  inventory.totals.gathered = previousResourceTotal;
  return { ok: true, inventory, receipt: { quantities: { ...quantities }, unknown, overflow: { ...inventory.legacy } } };
}

export function getPackResources(inventory, catalog) {
  const counts = countItems(inventory.pack);
  return Object.fromEntries(Object.values(catalog).filter(item => item.kind === 'resource').map(item => [item.id, Object.hasOwn(counts, item.id) ? counts[item.id] : 0]));
}

export function getPackEquipment(inventory, catalog) {
  const counts = countItems(inventory.pack), craftedConsumables = {}, fieldSupplies = {};
  for (const item of Object.values(catalog)) {
    if (item.kind === 'consumable') craftedConsumables[item.id] = counts[item.id] ?? 0;
    if (item.kind === 'food' || item.kind === 'taming') fieldSupplies[item.id] = counts[item.id] ?? 0;
  }
  return { craftedConsumables, fieldSupplies };
}

export function withdrawLegacy(inventory, id, count, catalog) {
  const next = cloneInventory(inventory), available = Object.hasOwn(next.legacy, id) ? next.legacy[id] : 0;
  if (!Object.hasOwn(catalog, id) || !countIsValid(count) || !count || count > available) return { ok: false, reason: 'invalid-withdrawal' };
  const result = addStack(next.pack, id, count, catalog);
  if (!result.added) return { ok: false, reason: 'full' };
  next.pack = result.slots; next.legacy[id] -= result.added;
  if (!next.legacy[id]) delete next.legacy[id];
  return { ok: true, inventory: next, moved: result.added };
}
