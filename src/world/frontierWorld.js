// One immutable generation identity. Save/runtime owners validate it once;
// domain seeds preserve edition-one output while keeping random streams apart.
export const DEFAULT_FRONTIER_WORLD = Object.freeze({ edition: 1, seed: 0x4f1a2b3c });

export function normalizeFrontierWorld(raw = DEFAULT_FRONTIER_WORLD) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)
    || Object.keys(raw).some(key => !['edition', 'seed'].includes(key))
    || raw.edition !== DEFAULT_FRONTIER_WORLD.edition
    || !Number.isInteger(raw.seed) || raw.seed < 0 || raw.seed > 0xffffffff) {
    throw new Error('invalid-frontier-world');
  }
  return raw.edition === DEFAULT_FRONTIER_WORLD.edition && raw.seed === DEFAULT_FRONTIER_WORLD.seed
    ? DEFAULT_FRONTIER_WORLD : Object.freeze({ edition: raw.edition, seed: raw.seed });
}

function hashDomain(seed, domain) {
  let value = (seed ^ 2166136261) >>> 0;
  for (let index = 0; index < domain.length; index++) value = Math.imul(value ^ domain.charCodeAt(index), 16777619);
  value = Math.imul(value ^ (value >>> 16), 2246822519);
  return (value ^ (value >>> 13)) >>> 0;
}

// The existing generators already contain their own coordinate/salt hashes.
// This supplies a world-specific salt; it does not introduce shared RNG state.
export function frontierDomainSeed(world = DEFAULT_FRONTIER_WORLD, domain, legacySeed = 0) {
  return (legacySeed ^ hashDomain(world.seed, domain) ^ hashDomain(DEFAULT_FRONTIER_WORLD.seed, domain)) >>> 0;
}
