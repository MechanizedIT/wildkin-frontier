export const CAMP_CARE_VERSION = 1;
export const CAMP_CARE_MAX_NOURISHMENT = 3;

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_:-]{1,128}$/.test(value);

export function cloneCampCare(care) {
  return care === null ? null : { version: care.version, bedId: care.bedId, wildkinId: care.wildkinId, nourishment: care.nourishment };
}

export function readCampCare(value, { structures = [], ownedWildkin = [] } = {}) {
  if (value === null || value === undefined) return { ok: true, care: null };
  const keys = ['version', 'bedId', 'wildkinId', 'nourishment'];
  const shape = value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
  if (!shape || value.version !== CAMP_CARE_VERSION || !validId(value.bedId) || !validId(value.wildkinId)
    || !Number.isInteger(value.nourishment) || value.nourishment < 0 || value.nourishment > CAMP_CARE_MAX_NOURISHMENT) {
    return { ok: false, reason: 'invalid-camp-care' };
  }
  if (!structures.some(record => record.id === value.bedId && record.type === 'bed')) return { ok: false, reason: 'invalid-camp-care-bed' };
  if (!ownedWildkin.some(record => record.id === value.wildkinId && record.speciesId === 'mossling')) return { ok: false, reason: 'invalid-camp-care-wildkin' };
  return { ok: true, care: cloneCampCare(value) };
}

