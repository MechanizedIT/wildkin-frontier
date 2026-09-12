import { identifyCompanion } from './companionCatalog.js';
import { OBSERVATION_CATALOG, OBSERVATION_CONFIG, getObservationJournal } from './observationCatalog.js';

// One transient study, advanced only by the existing fixed loop. Persistence
// remains with frontierProgress; presentation reads snapshots without effects.
export function createCreatureObservation({ getPlayer, getCreatures, getProgress, discoverSpecies, earnClue, isVisible, hasSight, onClue = () => {} }) {
  let study = null, section = null, run = null, retry = 0;
  function reset() { study = null; section = null; run = null; retry = 0; }
  function visibleReason(target, player, sectionId) {
    if (!target || target.state.isDead || target.state.bondCaptured || target.state.aiState === 'RESPAWNING' || target.state.regionId !== sectionId) return 'Find the creature again.';
    const pos = target.state.pos;
    if (Math.hypot(pos.x - player.pos.x, pos.z - player.pos.z) > OBSERVATION_CONFIG.range) return 'Move a little closer.';
    if (Math.abs(pos.y - player.pos.y) > OBSERVATION_CONFIG.verticalRange) return 'Find a nearby level vantage point.';
    if (!isVisible(target)) return 'Keep the creature in view.';
    if (!hasSight(target)) return 'Move to a clear view around the obstacle.';
    return null;
  }
  function selectSubject(candidates, player, sectionId, saved, unfinishedOnly = false) {
    let best = null, bestDistance = Infinity, bestUnfinished = false;
    for (const candidate of candidates) {
      const species = identifyCompanion(candidate);
      if (!species) continue;
      const unfinished = getObservationJournal(species.id, saved).length < 2;
      if ((unfinishedOnly && !unfinished) || visibleReason(candidate, player, sectionId)) continue;
      const distance = Math.hypot(candidate.state.pos.x - player.pos.x, candidate.state.pos.z - player.pos.z);
      if (!best || (unfinished && !bestUnfinished) || (unfinished === bestUnfinished && distance < bestDistance)) {
        best = candidate; bestDistance = distance; bestUnfinished = unfinished;
      }
    }
    return best;
  }
  function update(dt, { sectionId, runId, active = true, paused = false, hidden = false, taming = false } = {}) {
    if (!active || hidden || section !== sectionId || run !== runId) {
      reset(); section = sectionId; run = runId;
      if (!active || hidden) return;
    }
    if (paused || taming) { if (study) study.reason = taming ? 'Finish taming to continue observing.' : 'Observation paused.'; return; }
    const step = Number.isFinite(dt) ? Math.max(0, Math.min(dt, .1)) : 0;
    if (!step) return;
    retry = Math.max(0, retry - step);
    const player = getPlayer(), candidates = getCreatures(), saved = getProgress();
    let target = study && candidates.find(c => c.state.id === study.id && identifyCompanion(c)?.id === study.species.id);
    // Stick while useful timing is underway. Once this species has earned all
    // of its field notes, yield to any visible unfinished species rather than
    // letting a nearby familiar animal monopolize the field guide.
    let nextSubject = null;
    if (study && getObservationJournal(study.species.id, saved).length === 2) {
      nextSubject = selectSubject(candidates, player, sectionId, saved, true);
      if (nextSubject) study = null;
    }
    if (study) {
      const reason = visibleReason(target, player, sectionId);
      if (reason) {
        study.reason = reason; study.lost += step;
        if (study.lost < OBSERVATION_CONFIG.interruptionSeconds) return;
        study = null;
      }
    }
    if (!study) {
      target = nextSubject ?? selectSubject(candidates, player, sectionId, saved);
      if (!target) return;
      study = { id: target.state.id, species: identifyCompanion(target), elapsed: 0, lost: 0, reason: null, completion: null };
    }
    study.lost = 0;
    if (!saved.discoveredSpecies.includes(study.species.id) && retry <= 0) {
      if (!discoverSpecies(study.species.id)) retry = OBSERVATION_CONFIG.retrySeconds;
    }
    const completed = getObservationJournal(study.species.id, saved).length;
    if (completed === 2) { study.reason = null; return; }
    if (!player.grounded || !['IDLE', 'SNEAK'].includes(player.mode) || (player.mode === 'IDLE' && (player.speed ?? 0) >= .1)) {
      study.reason = !player.grounded ? 'Stand on solid ground to observe.' : 'Stand still or sneak to observe.'; return;
    }
    if (target.state.playerDetected !== false) { study.reason = 'It noticed you. Give it space and wait quietly.'; return; }
    study.reason = null;
    const duration = OBSERVATION_CATALOG[study.species.id].seconds[completed];
    study.elapsed = Math.min(duration, study.elapsed + step);
    if (study.elapsed + 1e-8 >= duration && retry > 0) study.reason = 'Clue could not save. Keep watching to retry.';
    if (study.elapsed + 1e-8 >= duration && retry <= 0) {
      const result = earnClue(study.species.id, completed + 1);
      if (!result?.ok) { retry = OBSERVATION_CONFIG.retrySeconds; study.reason = 'Clue could not save. Keep watching to retry.'; return; }
      study.elapsed = 0;
      study.completion = OBSERVATION_CATALOG[study.species.id].clues[completed].title;
      onClue(study.species, completed + 1);
    }
  }
  function getModel() {
    if (!study) return null;
    const entries = getObservationJournal(study.species.id, getProgress()), completed = entries.length;
    const duration = OBSERVATION_CATALOG[study.species.id].seconds[Math.min(completed, 1)];
    return { id: study.id, speciesId: study.species.id, name: study.species.name, stage: Math.min(2, completed + 1), completedStages: completed,
      progress: completed === 2 ? 1 : Math.min(1, study.elapsed / duration), complete: completed === 2,
      reason: study.reason, hint: completed === 2 ? 'All field notes saved in Journal → Wildkin.' : 'Watch quietly without being noticed. Notes are saved in Journal → Wildkin.',
      completion: study.completion, journalEntries: entries };
  }
  return { update, reset, getModel };
}
