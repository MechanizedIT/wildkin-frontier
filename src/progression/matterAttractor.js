// src/progression/matterAttractor.js — the single Phase 4B Camp improvement.
// This is intentionally one concrete upgrade, not a progression framework.

export const MATTER_ATTRACTOR_I = Object.freeze({
  id: "matter_attractor_i",
  displayName: "Matter Attractor I",
  description: "Pickups begin pulling toward you from farther away and travel somewhat faster.",
  cost: Object.freeze({
    wood: 8,
    fiber: 6,
    iron_ore: 4,
  }),
  pickupTuning: Object.freeze({
    magnetRadius: 3.9,
    magnetSpeed: 8.2,
    magnetAccel: 17.5,
  }),
});

export function getMatterAttractorMissing(bankedResources = {}, cost = MATTER_ATTRACTOR_I.cost) {
  const missing = {};
  for (const [resourceId, required] of Object.entries(cost)) {
    const have = Math.max(0, Math.floor(Number(bankedResources[resourceId]) || 0));
    if (have < required) missing[resourceId] = required - have;
  }
  return missing;
}

export function canAffordMatterAttractorI(bankedResources = {}, cost = MATTER_ATTRACTOR_I.cost) {
  return Object.keys(getMatterAttractorMissing(bankedResources, cost)).length === 0;
}

export function validateMatterAttractorCost(resourceDrops = [], cost = MATTER_ATTRACTOR_I.cost) {
  const knownIds = new Set(resourceDrops.map((drop) => drop.id));
  const entries = Object.entries(cost);
  if (entries.length === 0) return false;
  return entries.every(([id, amount]) => knownIds.has(id) && Number.isInteger(amount) && amount > 0);
}

export function getMatterAttractorPickupTuning(owned) {
  return owned ? { ...MATTER_ATTRACTOR_I.pickupTuning } : null;
}

export function getMatterResonatorInteraction({ isCamp, distance, owned, radius = 2.1 } = {}) {
  if (!isCamp || !Number.isFinite(distance) || distance > radius) return null;
  return {
    type: "resonator",
    label: owned ? "MATTER ATTRACTOR I — SYNCED" : "MATTER RESONATOR",
  };
}
