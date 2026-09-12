// Compact, personal survey coverage for the generated frontier.  This module is
// deliberately renderer-free: callers can reveal cells without learning which
// other cells have been surveyed.

import { FRONTIER_TERRAIN_CONFIG } from './frontierTerrain.js';

export const FRONTIER_ATLAS_EDITION = 1;
export const FRONTIER_ATLAS_DEFAULT_SEED = FRONTIER_TERRAIN_CONFIG.defaultSeed;
export const FRONTIER_ATLAS_CELL_SIZE = 10;
export const FRONTIER_ATLAS_CELLS_PER_CHUNK = FRONTIER_TERRAIN_CONFIG.chunkSize / FRONTIER_ATLAS_CELL_SIZE;
export const FRONTIER_ATLAS_REVEAL_RADIUS = 18;
export const MAX_FRONTIER_ATLAS_CHUNKS = 16_384;
export const FRONTIER_ATLAS_WORLD_LIMIT = 1_000_000;
const MAX_CHUNK_COORDINATE = FRONTIER_ATLAS_WORLD_LIMIT / FRONTIER_TERRAIN_CONFIG.chunkSize;
const MAX_MASK = (1 << (FRONTIER_ATLAS_CELLS_PER_CHUNK ** 2)) - 1;

function hasOwn(object, key) { return Object.hasOwn(object, key); }

export function createFrontierAtlasState() {
  return { edition: FRONTIER_ATLAS_EDITION, seed: FRONTIER_ATLAS_DEFAULT_SEED, chunks: {} };
}

export function makeFrontierAtlasChunkId(cx, cz) {
  if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cz)
    || Math.abs(cx) > MAX_CHUNK_COORDINATE || Math.abs(cz) > MAX_CHUNK_COORDINATE) return null;
  return `f1:a:${cx}:${cz}`;
}

export function parseFrontierAtlasChunkId(id) {
  if (typeof id !== 'string' || id.length > 128) return null;
  const match = /^f1:a:(-?\d+):(-?\d+)$/.exec(id);
  if (!match) return null;
  const cx = Number(match[1]), cz = Number(match[2]);
  return makeFrontierAtlasChunkId(cx, cz) === id ? { cx, cz } : null;
}

export function getFrontierAtlasCell(position) {
  const x = position?.x, z = position?.z;
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > FRONTIER_ATLAS_WORLD_LIMIT || Math.abs(z) > FRONTIER_ATLAS_WORLD_LIMIT) {
    return { ok: false, reason: 'invalid-atlas-position' };
  }
  const chunkSize = FRONTIER_TERRAIN_CONFIG.chunkSize;
  const cx = Math.floor(x / chunkSize), cz = Math.floor(z / chunkSize);
  const chunkId = makeFrontierAtlasChunkId(cx, cz);
  if (!chunkId) return { ok: false, reason: 'invalid-atlas-position' };
  const localX = Math.floor((x - cx * chunkSize) / FRONTIER_ATLAS_CELL_SIZE);
  const localZ = Math.floor((z - cz * chunkSize) / FRONTIER_ATLAS_CELL_SIZE);
  // The position bounds and floor chunking make these values 0..4.  Keep the
  // explicit check so a future chunk-size change cannot write a bad bit.
  if (localX < 0 || localX >= FRONTIER_ATLAS_CELLS_PER_CHUNK || localZ < 0 || localZ >= FRONTIER_ATLAS_CELLS_PER_CHUNK) {
    return { ok: false, reason: 'invalid-atlas-position' };
  }
  const bit = localZ * FRONTIER_ATLAS_CELLS_PER_CHUNK + localX;
  return { ok: true, chunkId, cx, cz, localX, localZ, bit, mask: 1 << bit };
}

export function cloneFrontierAtlasState(value) {
  return { edition: value.edition, seed: value.seed, chunks: { ...value.chunks } };
}

export function normalizeFrontierAtlasState(raw) {
  if (raw === undefined || raw === null) return createFrontierAtlasState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid-atlas');
  if (Object.keys(raw).some((key) => !['edition', 'seed', 'chunks'].includes(key))) throw new Error('invalid-atlas');
  if (raw.edition !== FRONTIER_ATLAS_EDITION) throw new Error(raw.edition > FRONTIER_ATLAS_EDITION ? 'unsupported-atlas-edition' : 'invalid-atlas-edition');
  if (raw.seed !== FRONTIER_ATLAS_DEFAULT_SEED) throw new Error('invalid-atlas-seed');
  if (!raw.chunks || typeof raw.chunks !== 'object' || Array.isArray(raw.chunks)) throw new Error('invalid-atlas-chunks');
  const ids = Object.keys(raw.chunks);
  if (ids.length > MAX_FRONTIER_ATLAS_CHUNKS) throw new Error('atlas-capacity-exceeded');
  const chunks = {};
  for (const id of ids) {
    const mask = raw.chunks[id];
    if (!parseFrontierAtlasChunkId(id) || !Number.isSafeInteger(mask) || mask <= 0 || mask > MAX_MASK) throw new Error('invalid-atlas-chunk');
    chunks[id] = mask;
  }
  return { edition: FRONTIER_ATLAS_EDITION, seed: FRONTIER_ATLAS_DEFAULT_SEED, chunks };
}

// Return a compact patch rather than mutating its argument.  Progress owns
// applying and persisting that patch atomically.
export function revealFrontierAtlasCell(atlas, position) {
  if (!atlas || typeof atlas !== 'object' || Array.isArray(atlas)) return { ok: false, changed: false, reason: 'invalid-atlas' };
  if (atlas.edition !== FRONTIER_ATLAS_EDITION) return { ok: false, changed: false, reason: atlas.edition > FRONTIER_ATLAS_EDITION ? 'unsupported-atlas-edition' : 'invalid-atlas-edition' };
  if (atlas.seed !== FRONTIER_ATLAS_DEFAULT_SEED) return { ok: false, changed: false, reason: 'invalid-atlas-seed' };
  if (!atlas.chunks || typeof atlas.chunks !== 'object' || Array.isArray(atlas.chunks)) return { ok: false, changed: false, reason: 'invalid-atlas-chunks' };
  const cell = getFrontierAtlasCell(position);
  if (!cell.ok) return { ok: false, changed: false, reason: cell.reason };
  const previousMask = atlas.chunks[cell.chunkId] ?? 0;
  if (!Number.isSafeInteger(previousMask) || previousMask < 0 || previousMask > MAX_MASK) return { ok: false, changed: false, reason: 'invalid-atlas-chunk' };
  if ((previousMask & cell.mask) !== 0) return { ok: true, changed: false, reason: null, cell };
  if (!hasOwn(atlas.chunks, cell.chunkId) && Object.keys(atlas.chunks).length >= MAX_FRONTIER_ATLAS_CHUNKS) {
    return { ok: false, changed: false, reason: 'atlas-capacity-exceeded', cell };
  }
  return { ok: true, changed: true, reason: null, cell, patch: { chunkId: cell.chunkId, mask: previousMask | cell.mask } };
}

// The map has no sight-line simulation yet: surveying a player position reveals
// nearby 10 m cells whose centers sit inside the current 18 m field radius.
export function revealFrontierAtlasRadius(atlas, position, radius = FRONTIER_ATLAS_REVEAL_RADIUS) {
  const origin = getFrontierAtlasCell(position);
  if (!origin.ok) return { ok: false, changed: false, reason: origin.reason };
  if (!Number.isFinite(radius) || radius < 0 || radius > FRONTIER_ATLAS_WORLD_LIMIT) return { ok: false, changed: false, reason: 'invalid-atlas-radius' };
  if (!atlas || typeof atlas !== 'object' || Array.isArray(atlas) || atlas.edition !== FRONTIER_ATLAS_EDITION || atlas.seed !== FRONTIER_ATLAS_DEFAULT_SEED || !atlas.chunks || typeof atlas.chunks !== 'object' || Array.isArray(atlas.chunks)) {
    return { ok: false, changed: false, reason: 'invalid-atlas' };
  }
  const masks = new Map();
  const minX = Math.floor((position.x - radius) / FRONTIER_ATLAS_CELL_SIZE);
  const maxX = Math.floor((position.x + radius) / FRONTIER_ATLAS_CELL_SIZE);
  const minZ = Math.floor((position.z - radius) / FRONTIER_ATLAS_CELL_SIZE);
  const maxZ = Math.floor((position.z + radius) / FRONTIER_ATLAS_CELL_SIZE);
  for (let cellZ = minZ; cellZ <= maxZ; cellZ++) for (let cellX = minX; cellX <= maxX; cellX++) {
    const centerX = cellX * FRONTIER_ATLAS_CELL_SIZE + FRONTIER_ATLAS_CELL_SIZE / 2;
    const centerZ = cellZ * FRONTIER_ATLAS_CELL_SIZE + FRONTIER_ATLAS_CELL_SIZE / 2;
    if ((centerX - position.x) ** 2 + (centerZ - position.z) ** 2 > radius ** 2) continue;
    const cell = getFrontierAtlasCell({ x: centerX, z: centerZ });
    if (!cell.ok) continue;
    const previousMask = masks.get(cell.chunkId) ?? atlas.chunks[cell.chunkId] ?? 0;
    if (!Number.isSafeInteger(previousMask) || previousMask < 0 || previousMask > MAX_MASK) return { ok: false, changed: false, reason: 'invalid-atlas-chunk' };
    masks.set(cell.chunkId, previousMask | cell.mask);
  }
  const patches = [...masks].filter(([id, mask]) => atlas.chunks[id] !== mask).map(([chunkId, mask]) => ({ chunkId, mask }));
  const additions = patches.filter(({ chunkId }) => !hasOwn(atlas.chunks, chunkId)).length;
  if (Object.keys(atlas.chunks).length + additions > MAX_FRONTIER_ATLAS_CHUNKS) return { ok: false, changed: false, reason: 'atlas-capacity-exceeded' };
  return { ok: true, changed: patches.length > 0, reason: null, cell: origin, patches };
}

export function applyFrontierAtlasPatch(atlas, patch) {
  const checked = normalizeFrontierAtlasState(atlas);
  if (!patch || typeof patch !== 'object' || !parseFrontierAtlasChunkId(patch.chunkId)
    || !Number.isSafeInteger(patch.mask) || patch.mask <= 0 || patch.mask > MAX_MASK) throw new Error('invalid-atlas-patch');
  const previousMask = checked.chunks[patch.chunkId] ?? 0;
  if ((patch.mask | previousMask) !== patch.mask) throw new Error('invalid-atlas-patch');
  if (previousMask === patch.mask) return checked;
  if (!hasOwn(checked.chunks, patch.chunkId) && Object.keys(checked.chunks).length >= MAX_FRONTIER_ATLAS_CHUNKS) throw new Error('atlas-capacity-exceeded');
  return { ...checked, chunks: { ...checked.chunks, [patch.chunkId]: patch.mask } };
}
