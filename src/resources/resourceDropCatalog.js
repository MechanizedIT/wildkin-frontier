export const DEFAULT_RESOURCE_DROPS = Object.freeze([
  Object.freeze({ id: "wood", displayName: "Wood", color: "#8d5a2b" }),
  Object.freeze({ id: "stone", displayName: "Stone", color: "#9a9a9a" }),
  Object.freeze({ id: "fiber", displayName: "Fiber", color: "#6abf69" }),
]);

export function getResourceDrops(resourceDrops) {
  return Array.isArray(resourceDrops) && resourceDrops.length
    ? resourceDrops
    : DEFAULT_RESOURCE_DROPS;
}

export function makeEmptyResourceMap(resourceDrops) {
  const out = {};
  for (const drop of getResourceDrops(resourceDrops)) out[drop.id] = 0;
  return out;
}

export function normalizeResourceMap(value, resourceDrops, { keepUnknown = false } = {}) {
  const out = makeEmptyResourceMap(resourceDrops);
  if (!value || typeof value !== "object") return out;
  const known = new Set(Object.keys(out));
  for (const [id, amount] of Object.entries(value)) {
    if (!keepUnknown && !known.has(id)) continue;
    const finite = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
    out[id] = Math.max(0, finite | 0);
  }
  return out;
}

export function findResourceDrop(resourceDrops, id) {
  return getResourceDrops(resourceDrops).find((drop) => drop.id === id) ?? null;
}
