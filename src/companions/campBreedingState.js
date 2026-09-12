import { inheritWildkinGenome } from '../creatures/wildkinGenome.js';
import { MAX_OWNED_WILDKIN, WILDKIN_INDIVIDUAL_VERSION, cloneWildkinIndividual, getWildkinSex, normalizeWildkinIndividual } from '../creatures/wildkinIndividual.js';

export const CAMP_BREEDING_VERSION = 1;
export const CAMP_BREEDING_GROWTH_SECONDS = 120;
export const CAMP_BREEDING_MAX_ADVANCE_SECONDS = 5;
export const MAX_CAMP_BREEDING_SEQUENCE = 1_000_000;
export const MAX_NEXT_CAMP_BREEDING_SEQUENCE = MAX_CAMP_BREEDING_SEQUENCE + 1;

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_:-]{1,128}$/.test(value);

export function cloneCampBreeding(breeding) {
  return breeding === null ? null : {
    version: breeding.version,
    bedId: breeding.bedId,
    parentIds: [...breeding.parentIds],
    offspring: cloneWildkinIndividual(breeding.offspring),
    growthSeconds: breeding.growthSeconds,
  };
}

export function getCampBreedingStage(breeding) {
  if (!breeding) return null;
  return Math.min(2, Math.floor(breeding.growthSeconds / 40));
}

export function createCampOffspring(parentA, parentB, sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > MAX_CAMP_BREEDING_SEQUENCE) return null;
  const a = normalizeWildkinIndividual(parentA), b = normalizeWildkinIndividual(parentB);
  if (!a || !b || a.id === b.id || a.speciesId !== 'mossling' || b.speciesId !== 'mossling' || a.sex === b.sex) return null;
  const id = `wildkin_bred_${sequence}`;
  const originId = `bred:${sequence}`;
  const generation = Math.min(255, Math.max(a.lineage?.generation ?? 0, b.lineage?.generation ?? 0) + 1);
  return normalizeWildkinIndividual({
    version: WILDKIN_INDIVIDUAL_VERSION,
    id,
    speciesId: 'mossling',
    originId,
    acquiredRunId: `camp_breed_${sequence}`,
    sex: getWildkinSex(originId),
    lineage: { parentIds: [a.id, b.id], generation },
    genome: inheritWildkinGenome(a.genome, b.genome, `camp-breed:${sequence}:${a.id}:${b.id}`),
  });
}

export function getCampOffspringSequence(record) {
  const idMatch = /^wildkin_bred_([1-9][0-9]*)$/.exec(record?.id ?? '');
  const originMatch = /^bred:([1-9][0-9]*)$/.exec(record?.originId ?? '');
  const runMatch = /^camp_breed_([1-9][0-9]*)$/.exec(record?.acquiredRunId ?? '');
  if (!idMatch || !originMatch || !runMatch) return null;
  const values = [idMatch[1], originMatch[1], runMatch[1]].map(Number);
  return values.every(value => Number.isSafeInteger(value) && value === values[0] && value <= MAX_CAMP_BREEDING_SEQUENCE) ? values[0] : null;
}

export function readCampBreeding(value, { structures = [], ownedWildkin = [] } = {}) {
  if (value === null || value === undefined) return { ok: true, breeding: null };
  const keys = ['version', 'bedId', 'parentIds', 'offspring', 'growthSeconds'];
  const shape = value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
  const offspring = shape ? normalizeWildkinIndividual(value.offspring) : null;
  if (!shape || value.version !== CAMP_BREEDING_VERSION || !validId(value.bedId)
    || !Array.isArray(value.parentIds) || value.parentIds.length !== 2 || !value.parentIds.every(validId)
    || value.parentIds[0] === value.parentIds[1] || !offspring
    || !Number.isFinite(value.growthSeconds) || value.growthSeconds < 0 || value.growthSeconds > CAMP_BREEDING_GROWTH_SECONDS) {
    return { ok: false, reason: 'invalid-camp-breeding' };
  }
  if (!structures.some(record => record.id === value.bedId && record.type === 'bed')) return { ok: false, reason: 'invalid-camp-breeding-bed' };
  const parents = value.parentIds.map(id => ownedWildkin.find(record => record.id === id));
  if (parents.some(parent => !parent || parent.speciesId !== 'mossling') || parents[0].sex === parents[1].sex) {
    return { ok: false, reason: 'invalid-camp-breeding-parents' };
  }
  const offspringSequence = getCampOffspringSequence(offspring);
  const expectedOffspring = offspringSequence === null ? null : createCampOffspring(parents[0], parents[1], offspringSequence);
  const expectedGeneration = Math.min(255, Math.max(parents[0].lineage?.generation ?? 0, parents[1].lineage?.generation ?? 0) + 1);
  if (offspring.speciesId !== 'mossling' || offspring.lineage?.generation !== expectedGeneration
    || offspring.lineage.parentIds[0] !== value.parentIds[0] || offspring.lineage.parentIds[1] !== value.parentIds[1]
    || !expectedOffspring || JSON.stringify(offspring) !== JSON.stringify(expectedOffspring)
    || ownedWildkin.some(record => record.id === offspring.id || record.originId === offspring.originId)
    || ownedWildkin.length + 1 > MAX_OWNED_WILDKIN) return { ok: false, reason: 'invalid-camp-breeding-offspring' };
  return { ok: true, breeding: cloneCampBreeding({ ...value, offspring }) };
}
