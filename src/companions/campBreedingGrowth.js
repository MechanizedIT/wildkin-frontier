import { CAMP_BREEDING_GROWTH_SECONDS, CAMP_BREEDING_MAX_ADVANCE_SECONDS } from './campBreedingState.js';

// Active-play time only. The save owner resolves the child and owns all
// durable growth; elapsed wall-clock/offline time never enters this path.
export function createCampBreedingGrowth(progress) {
  let elapsed = 0, lastChild = null, lastGrowth = 0;
  function reset() { elapsed = 0; lastChild = null; lastGrowth = 0; }
  function update(dt, { active = false } = {}) {
    const breeding = progress.getCampBreeding();
    if (!breeding) { reset(); return; }
    if (breeding.offspring.id !== lastChild || breeding.growthSeconds < lastGrowth) elapsed = 0;
    lastChild = breeding.offspring.id; lastGrowth = breeding.growthSeconds;
    if (!active || lastGrowth >= CAMP_BREEDING_GROWTH_SECONDS || !Number.isFinite(dt) || dt <= 0) return;
    elapsed += Math.min(dt, .25);
    const quantum = Math.min(CAMP_BREEDING_MAX_ADVANCE_SECONDS, CAMP_BREEDING_GROWTH_SECONDS-lastGrowth);
    if (elapsed + 1e-8 < quantum) return;
    elapsed = Math.max(0, elapsed-quantum);
    progress.advanceCampBreeding(quantum);
  }
  return { update, reset };
}
