export const CAMP_CROP_VERSION = 1;
export const CAMP_CROP_GROWTH_SECONDS = 90;
export const CAMP_CROP_MAX_ADVANCE_SECONDS = 5;

const validId = value => typeof value === 'string' && /^build_[A-Za-z0-9_-]{1,80}$/.test(value);

export function cloneCampCrop(crop) {
  return crop === null ? null : { version: crop.version, plotId: crop.plotId, growthSeconds: crop.growthSeconds };
}

export function getCampCropStage(crop) {
  if (!crop) return null;
  return Math.min(2, Math.floor(crop.growthSeconds / 30));
}

export function readCampCrop(value, { structures = [] } = {}) {
  if (value === null || value === undefined) return { ok: true, crop: null };
  const keys = ['version', 'plotId', 'growthSeconds'];
  const shape = value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
  if (!shape || value.version !== CAMP_CROP_VERSION || !validId(value.plotId)
    || !Number.isFinite(value.growthSeconds) || value.growthSeconds < 0 || value.growthSeconds > CAMP_CROP_GROWTH_SECONDS) {
    return { ok: false, reason: 'invalid-camp-crop' };
  }
  if (!structures.some(record => record.id === value.plotId && record.type === 'berry_garden')) {
    return { ok: false, reason: 'invalid-camp-crop-plot' };
  }
  return { ok: true, crop: cloneCampCrop(value) };
}

