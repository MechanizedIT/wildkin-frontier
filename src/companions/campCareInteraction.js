import { CAMP_CARE_MAX_NOURISHMENT } from './campCareState.js';
import { CAMP_BREEDING_GROWTH_SECONDS } from './campBreedingState.js';
import { expressWildkinGenome } from '../creatures/wildkinGenome.js';

// The save owner handles payment/assignment. This owner checks the live physical
// bed again on activation, so a stale world button cannot feed from a distance.
export function createCampCareInteraction({ progress, getBed, canCare, getPlayerPosition, notify = () => {}, onChanged = () => {} }) {
  let pairChoice = null;
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
    const breeding = progress.getCampBreeding?.();
    if (breeding?.bedId === bed.id) {
      const ready = breeding.growthSeconds >= CAMP_BREEDING_GROWTH_SECONDS;
      return { ...info, type: 'wildkinBed', anchorPos: { ...bed.anchorPos, y: bed.topHeight + 1.15 },
        action: 'welcome', label: ready ? 'WELCOME' : 'GROWING', disabled: !ready,
        growthStage: Math.min(3, 1 + Math.floor(breeding.growthSeconds / 40)), nourishment: null,
        detail: ready ? 'Welcome your young Mossling to the family.' : 'Your young Mossling grows while you play.', secondary: null };
    }
    const care = progress.getCampCare(), active = progress.getActiveWildkin();
    const occupied = care?.bedId === bed.id;
    const full = occupied && care.nourishment === CAMP_CARE_MAX_NOURISHMENT;
    const pairing = full ? progress.getCampBreedingEligibility?.(bed.id) : null;
    const guidedPairing = full ? progress.getCampBreedingEligibility?.(bed.id, { preserveTrait: 'baseColor' }) : null;
    const canPair = pairing?.ok === true;
    if (pairChoice?.bedId === bed.id) return describePairChoice(info, bed, pairChoice);
    const canGuideTone = canPair && guidedPairing?.ok === true;
    return { ...info, type: 'wildkinBed', anchorPos: { ...bed.anchorPos, y: bed.topHeight + 1.15 },
      action: canPair ? (canGuideTone ? 'choose-pair' : 'pair') : occupied ? 'feed' : 'assign',
      label: canPair ? 'PAIR' : occupied ? (full ? 'NOURISHED' : 'FEED') : 'SETTLE',
      disabled: occupied ? !canPair && (full || progress.getPackResourceCounts().berries < 1) : !!care || !!breeding || active?.speciesId !== 'mossling',
      detail: canPair ? 'Pair your settled Mossling with your selected partner. Uses its nourishment.'
        : occupied ? `${care.nourishment} of 3 nourishment. ${full ? (pairing ? pairingHint(pairing.reason) : 'Well fed. No more berries needed.') : 'One berry from your backpack.'}`
        : breeding ? 'Welcome your growing young first.' : care ? 'Release the occupied bed first.' : active?.speciesId === 'mossling' ? 'Settle your selected Mossling here.' : 'Select a Mossling at the Camp sanctuary.',
      bonus: full && pairing && !canPair
        ? (pairing.reason?.includes('capacity') ? 'Family full' : 'Choose partner')
        : null,
      pairChoice: false,
      cost: occupied && !full ? { berries: 1 } : null,
      nourishment: occupied ? care.nourishment : null,
      secondary: occupied ? { action: 'release', label: 'Release bed' } : null };
  }
  function describePairChoice(info, bed, choice) {
    return { ...info, type: 'wildkinBed', anchorPos: { ...bed.anchorPos, y: bed.topHeight + 1.15 },
      action: 'pair', label: 'NATURAL', disabled: false, detail: 'Choose how your young Mossling inherits its body tone.',
      caption: 'Young’s body tone', pairChoice: true, nourishment: CAMP_CARE_MAX_NOURISHMENT,
      secondary: { action: 'guide-tone', label: `${choice.tone.name.toUpperCase()} TONE`, color: choice.tone.hex } };
  }
  function openPairChoice(bed) {
    const guided = progress.getCampBreedingEligibility?.(bed.id, { preserveTrait: 'baseColor' });
    if (!guided?.ok || !Array.isArray(guided.parentIds) || !guided.offspring?.genome) return { ok: false, reason: 'pair-choice-unavailable' };
    const tone = expressWildkinGenome(guided.offspring.genome).baseColor;
    pairChoice = { bedId: bed.id, parentIds: [...guided.parentIds], tone: { name: tone.name, hex: tone.hex } };
    return { ok: true, choosing: true };
  }
  function freshPairChoice(bed) {
    if (!pairChoice || pairChoice.bedId !== bed.id) return null;
    const natural = progress.getCampBreedingEligibility?.(bed.id);
    const guided = progress.getCampBreedingEligibility?.(bed.id, { preserveTrait: 'baseColor' });
    if (!natural?.ok || !guided?.ok || !sameIds(guided.parentIds, pairChoice.parentIds) || !sameIds(natural.parentIds, pairChoice.parentIds)
      || !guided.offspring?.genome) return null;
    const tone = expressWildkinGenome(guided.offspring.genome).baseColor;
    if (tone.name !== pairChoice.tone.name || tone.hex !== pairChoice.tone.hex) return null;
    return { natural, guided };
  }
  function activate(info) {
    const bed = nearby(info.id);
    if (!bed) return { ok: false, reason: 'out-of-reach' };
    if (info.action === 'choose-pair') return openPairChoice(bed);
    let result;
    if (info.action === 'pair' || info.action === 'guide-tone') {
      if (pairChoice?.bedId === bed.id) {
        const fresh = freshPairChoice(bed);
        if (!fresh) { pairChoice = null; return { ok: false, reason: 'stale-pair-choice' }; }
        result = info.action === 'guide-tone'
          ? progress.beginCampBreeding(bed.id, { preserveTrait: 'baseColor' })
          : progress.beginCampBreeding(bed.id);
        if (result.ok) pairChoice = null;
      } else if (info.action === 'pair') result = progress.beginCampBreeding(bed.id);
      else return { ok: false, reason: 'stale-pair-choice' };
    } else result = info.action === 'release' ? progress.releaseCampWildkin(bed.id)
      : info.action === 'welcome' ? progress.welcomeCampYoung(bed.id)
      : info.action === 'feed' ? progress.feedCampWildkin(bed.id)
        : info.action === 'assign' ? progress.assignCampWildkin(progress.getActiveWildkin()?.id, bed.id)
          : { ok: false, reason: 'unknown-action' };
    if (result.ok) {
      onChanged(bed, result.care);
      notify((info.action === 'pair' || info.action === 'guide-tone') ? 'A young Mossling' : info.action === 'welcome' ? 'Welcome to the family'
        : info.action === 'feed' ? 'Berry shared' : info.action === 'release' ? 'Bed free' : 'Mossling settled',
        (info.action === 'pair' || info.action === 'guide-tone') ? 'Growing at this nursery.' : info.action === 'welcome' ? 'Select your new companion at the Sanctuary.'
          : info.action === 'feed' ? `${result.care.nourishment} / 3 nourished` : '');
    } else notify('Nursery', result.reason === 'storage-write-failed' ? 'Could not save. Your nursery progress was kept.'
      : result.reason === 'empty' ? 'Bring berries in your backpack.' : result.reason === 'nourished' ? 'Already nourished.' : 'Move beside the bed and try again.');
    return result;
  }
  function cancelPairChoice() { pairChoice = null; }
  function update({ paused = false, authorSuppress = false, blocked = false } = {}) {
    if (!pairChoice || paused || authorSuppress || blocked || !nearby(pairChoice.bedId)) cancelPairChoice();
  }
  return { describe, activate, update, cancelPairChoice };
}

function sameIds(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === 2 && a.length === b.length && a.every((id, index) => id === b[index]);
}

function pairingHint(reason) {
  if (reason?.includes('capacity')) return 'Make room in your Wildkin family.';
  return 'Select another adult Mossling of the opposite sex at the Sanctuary.';
}
