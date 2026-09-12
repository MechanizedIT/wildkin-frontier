// Bounded persistent Wildkin identity. Appearance remains a Mossling-only
// recipe; this module deliberately owns neither actors nor selection state.
import { normalizeWildkinGenome } from './wildkinGenome.js';

export const WILDKIN_INDIVIDUAL_VERSION = 1;
export const MAX_OWNED_WILDKIN = 64;
export const MAX_PENDING_WILDKIN = 4;
export const MAX_CAPTURED_WILDKIN_SOURCES = 8192;
export const WILDKIN_SPECIES_IDS = Object.freeze(['mossling', 'emberhorn', 'skydancer', 'tidefin']);

const SPECIES = new Set(WILDKIN_SPECIES_IDS);
// Origins are deterministic frontier coordinates such as f1:w:0:0:3.
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_:-]{1,128}$/.test(value);

export function cloneWildkinIndividual(record) {
  if (!record) return null;
  return { version: record.version, id: record.id, speciesId: record.speciesId,
    originId: record.originId, acquiredRunId: record.acquiredRunId,
    genome: record.genome ? { ...record.genome } : null };
}

export function normalizeWildkinIndividual(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (raw.version !== WILDKIN_INDIVIDUAL_VERSION || !validId(raw.id) || !validId(raw.originId)
    || !validId(raw.acquiredRunId) || !SPECIES.has(raw.speciesId)) return null;
  let genome = null;
  if (raw.speciesId === 'mossling') {
    try { genome = { ...normalizeWildkinGenome(raw.genome) }; } catch { return null; }
  } else if (raw.genome !== null && raw.genome !== undefined) return null;
  return { version: WILDKIN_INDIVIDUAL_VERSION, id: raw.id, speciesId: raw.speciesId,
    originId: raw.originId, acquiredRunId: raw.acquiredRunId, genome };
}

export function normalizeWildkinIndividuals(raw, limit = MAX_OWNED_WILDKIN) {
  if (!Array.isArray(raw) || raw.length > limit) return null;
  const records = [];
  const ids = new Set();
  const origins = new Set();
  for (const value of raw) {
    const record = normalizeWildkinIndividual(value);
    if (!record || ids.has(record.id) || origins.has(record.originId)) return null;
    ids.add(record.id); origins.add(record.originId); records.push(record);
  }
  return records;
}

export function projectWildkinSpecies(records) {
  return [...new Set(records.map(record => record.speciesId))];
}
