import { CAMP_CARE_MAX_NOURISHMENT } from './campCareState.js';

// The save owner handles payment/assignment. This owner checks the live physical
// bed again on activation, so a stale world button cannot feed from a distance.
export function createCampCareInteraction({ progress, getBed, canCare, getPlayerPosition, notify = () => {}, onChanged = () => {} }) {
  function nearby(id) {
    if (!canCare()) return null;
    const bed = getBed(id), player = getPlayerPosition();
    if (!bed || Math.hypot(bed.anchorPos.x-player.x, bed.anchorPos.z-player.z) > 3.2
      || Math.abs(bed.topHeight-player.y) > 2.2) return null;
    return bed;
  }
  function describe(info) {
    const bed = nearby(info.id);
    if (!bed) return null;
    const care = progress.getCampCare(), active = progress.getActiveWildkin();
    const occupied = care?.bedId === bed.id;
    const full = occupied && care.nourishment === CAMP_CARE_MAX_NOURISHMENT;
    return { ...info, type: 'wildkinBed', anchorPos: { ...bed.anchorPos, y: bed.topHeight + 1.15 },
      action: occupied ? 'feed' : 'assign',
      label: occupied ? (full ? 'NOURISHED' : 'FEED') : 'SETTLE',
      disabled: occupied ? full || progress.getPackResourceCounts().berries < 1 : !!care || active?.speciesId !== 'mossling',
      detail: occupied ? `${care.nourishment} of 3 nourishment. ${full ? 'Well fed. No more berries needed.' : 'One berry from your backpack.'}`
        : care ? 'Release the occupied bed first.' : active?.speciesId === 'mossling' ? 'Settle your selected Mossling here.' : 'Select a Mossling at the Camp sanctuary.',
      cost: occupied && !full ? { berries: 1 } : null,
      nourishment: occupied ? care.nourishment : null,
      secondary: occupied ? { action: 'release', label: 'Release bed' } : null };
  }
  function activate(info) {
    const bed = nearby(info.id);
    if (!bed) return { ok: false, reason: 'out-of-reach' };
    const result = info.action === 'release' ? progress.releaseCampWildkin(bed.id)
      : info.action === 'feed' ? progress.feedCampWildkin(bed.id)
        : info.action === 'assign' ? progress.assignCampWildkin(progress.getActiveWildkin()?.id, bed.id)
          : { ok: false, reason: 'unknown-action' };
    if (result.ok) {
      onChanged(bed, result.care);
      notify(info.action === 'feed' ? 'Berry shared' : info.action === 'release' ? 'Bed free' : 'Mossling settled',
        info.action === 'feed' ? `${result.care.nourishment} / 3 nourished` : '');
    } else notify('Nursery', result.reason === 'storage-write-failed' ? 'Could not save. Your berry and care were kept.'
      : result.reason === 'empty' ? 'Bring berries in your backpack.' : result.reason === 'nourished' ? 'Already nourished.' : 'Move beside the bed and try again.');
    return result;
  }
  return { describe, activate };
}
