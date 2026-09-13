import { CAMP_CROP_GROWTH_SECONDS, CAMP_CROP_MAX_ADVANCE_SECONDS } from './campGardenState.js';
import { createSavedProcessClock } from '../game/savedProcessClock.js';

// Small adapter for the existing fixed loop and physical world action. All
// durable crop quantities, inventory exchanges and yield belong to progress.
export function createCampGarden({ progress, getGarden, canGarden, getPlayerPosition, notify = () => {}, onChanged = () => {} }) {
  const clock = createSavedProcessClock({
    getProcess: () => progress.getCampCrop(), getId: crop => crop.plotId, getProgress: crop => crop.growthSeconds,
    duration: CAMP_CROP_GROWTH_SECONDS, maxAdvance: CAMP_CROP_MAX_ADVANCE_SECONDS,
    advance: seconds => progress.advanceCampCrop(seconds),
  });
  function resetClock() { clock.reset(); }
  function update(dt, { active = false } = {}) {
    clock.update(dt, { active });
  }
  function nearby(id) {
    if (!canGarden()) return null;
    const plot = getGarden(id), player = getPlayerPosition();
    return plot && Math.hypot(plot.anchorPos.x-player.x, plot.anchorPos.z-player.z) <= 3.2
      && Math.abs(plot.topHeight-player.y) <= 2.2 ? plot : null;
  }
  function describe(info) {
    const plot = nearby(info.id);
    if (!plot) return null;
    const crop = progress.getCampCrop(), planted = crop?.plotId === plot.id;
    const ready = planted && crop.growthSeconds >= CAMP_CROP_GROWTH_SECONDS;
    const yieldInfo = progress.getCampCropHarvest();
    return { ...info, type: 'berryGarden', anchorPos: { ...plot.anchorPos, y: plot.topHeight + 1.2 },
      action: ready ? 'harvest' : 'plant',
      label: ready ? 'HARVEST' : planted ? 'GROWING' : 'PLANT',
      disabled: !ready && (planted || !!crop || (progress.getPackResourceCounts().berries ?? 0) < 1),
      cost: !planted ? { berries: 1 } : null,
      reward: ready ? { berries: yieldInfo.yield } : null,
      bonus: ready && yieldInfo.bloomTended ? 'Bloom +1' : null,
      detail: ready ? `${yieldInfo.yield} berries${yieldInfo.bloomTended ? ' · nurtured by your Mossling' : ''}.`
        : planted ? 'Growing. Explore while it ripens.' : crop ? 'Harvest your planted garden first.' : 'Plant one berry from your backpack.' };
  }
  function activate(info) {
    const plot = nearby(info.id);
    if (!plot) return { ok: false, reason: 'out-of-reach' };
    const result = info.action === 'harvest' ? progress.harvestCampCrop(plot.id)
      : info.action === 'plant' ? progress.plantCampCrop(plot.id) : { ok: false, reason: 'unknown-action' };
    if (result.ok) {
      resetClock(); onChanged(plot, result);
      notify(info.action === 'harvest' ? 'Berries gathered' : 'Garden planted',
        info.action === 'harvest' ? `+${result.yield} berries${result.bloomTended ? ' · Mossling tended' : ''}` : 'Explore while it grows.');
    } else notify('Garden', result.reason === 'storage-write-failed' ? 'Could not save. Your crop and berries were kept.'
      : result.reason === 'output-full' ? 'Make room in your backpack. Your crop is still here.'
        : result.reason === 'empty' ? 'Bring one berry to plant.' : 'Your garden is not ready yet.');
    return result;
  }
  return { update, describe, activate, resetClock };
}
