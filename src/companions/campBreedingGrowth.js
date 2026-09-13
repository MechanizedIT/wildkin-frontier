import { CAMP_BREEDING_GROWTH_SECONDS, CAMP_BREEDING_MAX_ADVANCE_SECONDS } from './campBreedingState.js';
import { createSavedProcessClock } from '../game/savedProcessClock.js';

// Active-play time only. The save owner resolves the child and owns all
// durable growth; elapsed wall-clock/offline time never enters this path.
export function createCampBreedingGrowth(progress) {
  const clock = createSavedProcessClock({
    getProcess: () => progress.getCampBreeding(), getId: breeding => breeding.offspring.id, getProgress: breeding => breeding.growthSeconds,
    duration: CAMP_BREEDING_GROWTH_SECONDS, maxAdvance: CAMP_BREEDING_MAX_ADVANCE_SECONDS,
    advance: seconds => progress.advanceCampBreeding(seconds),
  });
  function reset() { clock.reset(); }
  function update(dt, { active = false } = {}) {
    clock.update(dt, { active });
  }
  return { update, reset };
}
