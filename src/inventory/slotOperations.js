// Pure proposals. The save owner commits the returned arrays once, or keeps the
// originals on storage failure. No DOM, persistence or global inventory here.
const clone = slots => slots.map(stack => stack ? { ...stack } : null);
const indexIn = (slots, index) => Number.isInteger(index) && index >= 0 && index < slots.length;
const validCount = count => Number.isSafeInteger(count) && count > 0;
const own = (object, key) => Object.hasOwn(object, key) ? object[key] : undefined;
const quantity = (counts, id) => own(counts, id) ?? 0;

export function countItems(slots) {
  const counts = Object.create(null);
  for (const stack of slots) if (stack) counts[stack.id] = (counts[stack.id] ?? 0) + stack.count;
  return { ...counts };
}

export function addStack(slots, id, count, catalog) {
  const next = clone(slots), limit = own(catalog, id)?.stackLimit;
  if (!validCount(count) || !validCount(limit)) return { slots: next, added: 0, remaining: count, reason: 'invalid-item' };
  let remaining = count;
  for (const stack of next) {
    if (stack?.id !== id) continue;
    const moved = Math.min(remaining, Math.max(0, limit - stack.count));
    stack.count += moved; remaining -= moved;
    if (!remaining) break;
  }
  for (let i = 0; remaining && i < next.length; i++) {
    if (next[i]) continue;
    const moved = Math.min(remaining, limit);
    next[i] = { id, count: moved }; remaining -= moved;
  }
  return { slots: next, added: count - remaining, remaining, reason: remaining ? 'full' : null };
}

export function removeItems(slots, cost) {
  const next = clone(slots), counts = countItems(next), entries = Object.entries(cost ?? {});
  if (entries.some(([id, count]) => !validCount(count) || quantity(counts, id) < count)) return { ok: false, slots: next, reason: 'missing-items' };
  for (const [id, count] of entries) {
    let remaining = count;
    // Spend smaller matching stacks first so equivalent pack arrangements have
    // the same chance to free an output slot when crafting.
    const indices = next.map((stack, index) => stack?.id === id ? index : -1).filter(index => index >= 0).sort((a, b) => next[a].count - next[b].count || a - b);
    for (const i of indices) {
      if (!remaining) break;
      const moved = Math.min(remaining, next[i].count);
      next[i].count -= moved; remaining -= moved;
      if (!next[i].count) next[i] = null;
    }
  }
  return { ok: true, slots: next };
}

// A destination index means drag/tap placement: merge, place or full-stack swap.
// No destination means transfer into existing partial stacks, then empty slots.
// Pass the same array as source/target for within-container rearrangement.
export function transferStack(source, target, fromIndex, catalog, { toIndex = null, count = null } = {}) {
  const same = source === target, from = clone(source), to = same ? from : clone(target);
  const fail = reason => ({ ok: false, source: clone(source), target: same ? clone(source) : clone(target), moved: 0, reason });
  if (!indexIn(from, fromIndex) || !from[fromIndex]) return fail('empty-source');
  const stack = from[fromIndex], amount = count ?? stack.count;
  if (!validCount(amount) || amount > stack.count || !own(catalog, stack.id)) return fail('invalid-count');
  if (same && (toIndex === null || toIndex === fromIndex)) return fail('same-slot');
  let moved = 0;
  if (toIndex === null) {
    const addition = addStack(to, stack.id, amount, catalog);
    moved = addition.added;
    to.splice(0, to.length, ...addition.slots);
  } else {
    if (!indexIn(to, toIndex)) return fail('invalid-destination');
    const destination = to[toIndex];
    if (destination && destination.id !== stack.id) {
      if (amount !== stack.count) return fail('partial-swap');
      from[fromIndex] = { ...destination }; to[toIndex] = { ...stack };
      return { ok: true, source: from, target: to, moved: amount, swapped: true };
    }
    moved = Math.min(amount, Math.max(0, catalog[stack.id].stackLimit - (destination?.count ?? 0)));
    if (moved) to[toIndex] = { id: stack.id, count: (destination?.count ?? 0) + moved };
  }
  if (!moved) return fail('full');
  stack.count -= moved;
  if (!stack.count) from[fromIndex] = null;
  return { ok: true, source: from, target: to, moved, remaining: amount - moved };
}

export function sortStacks(slots, catalog) {
  const next = Array(slots.length).fill(null);
  const entries = Object.entries(countItems(slots)).sort(([a], [b]) => a.localeCompare(b));
  let result = next;
  for (const [id, count] of entries) {
    const added = addStack(result, id, count, catalog);
    if (added.remaining) return { ok: false, slots: clone(slots), reason: 'invalid-stacks' };
    result = added.slots;
  }
  return { ok: true, slots: result };
}

// The pack is first; the optional explicitly selected local container supplies
// remaining ingredients. Output always goes to the pack after costs are removed.
export function craftStacks(pack, storage, cost, outputs, catalog) {
  const originalPack = clone(pack), originalStorage = storage ? clone(storage) : null;
  const fail = reason => ({ ok: false, pack: originalPack, storage: originalStorage, reason });
  if (storage === pack) return fail('duplicate-container');
  let nextPack = clone(pack), nextStorage = storage ? clone(storage) : null;
  const packCounts = countItems(nextPack), storageCounts = nextStorage ? countItems(nextStorage) : {};
  const packCost = {}, storageCost = {};
  for (const [id, count] of Object.entries(cost ?? {})) {
    if (!own(catalog, id) || !validCount(count)) return fail('invalid-recipe');
    const carried = Math.min(count, quantity(packCounts, id)), stored = count - carried;
    if (quantity(storageCounts, id) < stored) return fail('missing-items');
    if (carried) Object.defineProperty(packCost, id, { value: carried, enumerable: true });
    if (stored) Object.defineProperty(storageCost, id, { value: stored, enumerable: true });
  }
  nextPack = removeItems(nextPack, packCost).slots;
  if (nextStorage) nextStorage = removeItems(nextStorage, storageCost).slots;
  for (const [id, count] of Object.entries(outputs ?? {})) {
    const added = addStack(nextPack, id, count, catalog);
    if (added.reason === 'invalid-item') return fail('invalid-recipe');
    if (added.remaining) return fail('output-full');
    nextPack = added.slots;
  }
  return { ok: true, pack: nextPack, storage: nextStorage };
}
