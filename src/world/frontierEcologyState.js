// Persistent identity and finite generated forage scars for the streamed frontier.

import { FRONTIER_TERRAIN_CONFIG } from './frontierTerrain.js';

export const FRONTIER_ECOLOGY_EDITION = 1;
export const MAX_FRONTIER_RESOURCE_RECORDS = 8192;
export const FRONTIER_ECOLOGY_DEFAULT_SEED = FRONTIER_TERRAIN_CONFIG.defaultSeed;
const MAX_CHUNK_COORDINATE = 1_000_000;
const MAX_RESOURCE_INDEX = 8191;

export function createFrontierEcologyState() {
  return { edition: FRONTIER_ECOLOGY_EDITION, seed: FRONTIER_ECOLOGY_DEFAULT_SEED, resources: {} };
}

export function makeFrontierResourceId(cx, cz, index) {
  if (![cx, cz, index].every(Number.isSafeInteger) || Math.abs(cx) > MAX_CHUNK_COORDINATE || Math.abs(cz) > MAX_CHUNK_COORDINATE || index < 0 || index > MAX_RESOURCE_INDEX) return null;
  return `f1:r:${cx}:${cz}:${index}`;
}

function isResourceId(id) {
  if (typeof id !== 'string' || id.length > 128) return false;
  const match = /^f1:r:(-?\d+):(-?\d+):(\d+)$/.exec(id);
  if (!match) return false;
  return makeFrontierResourceId(Number(match[1]), Number(match[2]), Number(match[3])) === id;
}

export function cloneFrontierEcologyState(value) {
  return { edition: value.edition, seed: value.seed, resources: { ...value.resources } };
}

export function normalizeFrontierEcologyState(raw) {
  if (raw === undefined || raw === null) return createFrontierEcologyState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid-ecology');
  if (Object.keys(raw).some((key) => !['edition', 'seed', 'resources'].includes(key))) throw new Error('invalid-ecology');
  if (raw.edition !== FRONTIER_ECOLOGY_EDITION) throw new Error(raw.edition > FRONTIER_ECOLOGY_EDITION ? 'unsupported-ecology-edition' : 'invalid-ecology-edition');
  if (raw.seed !== FRONTIER_ECOLOGY_DEFAULT_SEED) throw new Error('invalid-ecology-seed');
  if (!raw.resources || typeof raw.resources !== 'object' || Array.isArray(raw.resources)) throw new Error('invalid-ecology-resources');
  const ids = Object.keys(raw.resources);
  if (ids.length > MAX_FRONTIER_RESOURCE_RECORDS) throw new Error('ecology-capacity-exceeded');
  const resources = {};
  for (const id of ids) {
    const remaining = raw.resources[id];
    if (!isResourceId(id) || !Number.isSafeInteger(remaining) || remaining < 0) throw new Error('invalid-ecology-resource');
    resources[id] = remaining;
  }
  return { edition: FRONTIER_ECOLOGY_EDITION, seed: FRONTIER_ECOLOGY_DEFAULT_SEED, resources };
}

export function validateFrontierResourceState(id, remainingChunks) {
  if (!isResourceId(id)) return { ok: false, reason: 'invalid-ecology-resource-id' };
  if (!Number.isSafeInteger(remainingChunks) || remainingChunks < 0) return { ok: false, reason: 'invalid-ecology-remaining' };
  return { ok: true };
}
