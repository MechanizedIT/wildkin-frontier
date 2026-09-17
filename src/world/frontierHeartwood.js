import { DEFAULT_FRONTIER_WORLD, normalizeFrontierWorld } from './frontierWorld.js';

// Rotation-one Heartwood rooms are a finite terrain accent inside the retained
// Camp circuit. This module deliberately knows only frozen source witnesses;
// it never samples ecology or wildlife, avoiding terrain → ecology recursion.
export const FRONTIER_HEARTWOOD_CONFIG = Object.freeze({
  bounds: Object.freeze({ minX: -20, maxX: 12, minZ: -96, maxZ: -50 }),
  maxBankHeight: 1.15,
});

const RESOURCE_EXCLUSIONS = Object.freeze([
  [-4.681, -58.906, 4.15], [-4.165, -61.915, 3.95], [-28.426, -57.327, 3.95],
  [20.822, -60.911, 3.95], [17.523, -60.111, 3.95], [18.67, -63.39, 3.95],
  [-13.916, -83.928, 3.95], [-16.862, -82.506, 3.95], [-16.718, -85.94, 3.95],
  [-12.915, -95.516, 4.7], [-16.236, -94.487, 4.2], [17.174, -96.563, 3.95],
  [14.364, -95.332, 3.95], [6.8, -91.37, 3.95],
]);
const HOME_EXCLUSIONS = Object.freeze([[7, -85, 11.6], [20, -95, 11.6], [17, -79, 11.6]]);
const PROTECTED_EXCLUSIONS = Object.freeze([...RESOURCE_EXCLUSIONS, ...HOME_EXCLUSIONS]);
const BANKS = Object.freeze([
  [-8.4, -70.8, 4.9, 7.7, .72],
  [-18.2, -75.0, 4.5, 5.7, .92], [-3.5, -78.6, 3.8, 6.2, .78],
  [-8.0, -91.8, 4.9, 3.4, .52],
]);

const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const isDefaultWorld = world => {
  const normalized = normalizeFrontierWorld(world ?? DEFAULT_FRONTIER_WORLD);
  return normalized.edition === DEFAULT_FRONTIER_WORLD.edition && normalized.seed === DEFAULT_FRONTIER_WORLD.seed;
};

function protectedFade(x, z) {
  let keep = 1;
  for (const [px, pz, radius] of PROTECTED_EXCLUSIONS) {
    const distance = Math.hypot(x - px, z - pz);
    // Keep the full support disk level and feather its external edge.
    keep *= smooth((distance - radius) / 1.8);
  }
  return keep;
}

function bankAt(x, z, cx, cz, rx, rz, height) {
  const q = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
  return q >= 1 ? 0 : height * (1 - smooth(q));
}

export function sampleFrontierHeartwoodProfile(x, z, { world = DEFAULT_FRONTIER_WORLD } = {}) {
  if (!isDefaultWorld(world) || x < FRONTIER_HEARTWOOD_CONFIG.bounds.minX || x > FRONTIER_HEARTWOOD_CONFIG.bounds.maxX
    || z < FRONTIER_HEARTWOOD_CONFIG.bounds.minZ || z > FRONTIER_HEARTWOOD_CONFIG.bounds.maxZ) {
    return Object.freeze({ active: false, heightOffset: 0, influence: 0 });
  }
  const raw = BANKS.reduce((total, bank) => total + bankAt(x, z, ...bank), 0);
  const influence = protectedFade(x, z);
  const heightOffset = Math.min(FRONTIER_HEARTWOOD_CONFIG.maxBankHeight, raw) * influence;
  return Object.freeze({ active: heightOffset > 1e-4, heightOffset, influence });
}

export function heartwoodProtectedSupport(x, z) { return protectedFade(x, z) < 1e-6; }
