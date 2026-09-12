// Provisional field-study pacing. The basic taming guide is never gated here.
export const OBSERVATION_CONFIG = Object.freeze({ range: 12, verticalRange: 2.2, interruptionSeconds: 2, retrySeconds: 2 });
export const OBSERVATION_CATALOG = Object.freeze({
  mossling: Object.freeze({ seconds: [3, 7], clues: [
    { title: 'A quiet approach', text: 'Mossling watches ahead and hears rushing feet. Sneak around its side or rear, and give it space if it startles.' },
    { title: 'Family body tones', text: 'Mossling body tones run in families. After this field study, a nourished nursery can guide one settled parent’s body tone into its young.' },
  ] }),
  tidefin: Object.freeze({ seconds: [4, 9], clues: [
    { title: 'A patient marsh glider', text: 'Tidefin investigates a baited snare when the bank is clear. Prepare the woven snare on dry, open ground.' },
    { title: 'Release earns trust', text: 'Back away while Tidefin approaches. Once it is caught, walk gently in and release it before it struggles free.' },
  ] }),
  emberhorn: Object.freeze({ seconds: [4, 12], clues: [
    { title: 'Respect the warning', text: 'Emberhorn guards its space. Study it quietly from a distance; challenging it starts a dangerous approach.' },
    { title: 'A recovery opening', text: 'Dodge its committed charge, then close in and use a reinforced tether during recovery. Keep a berry lure ready to offer afterward.' },
  ] }),
  skydancer: Object.freeze({ seconds: [5, 12], clues: [
    { title: 'Quiet calls', text: 'Skydancer responds to a calming chime from a quiet perch. Stand still and keep your distance before ringing.' },
    { title: 'Follow the perches', text: 'Give Skydancer room to settle, then follow the next violet perch and call again. After both calls, approach gently to bond.' },
  ] }),
});

// Optional v3 extension; strict, finite keys and completed stages only. No timers
// or arbitrary player text cross the save/export boundary.
export function normalizeObservationClues(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid-observation-clues');
  const out = {};
  for (const [id, stage] of Object.entries(value)) {
    if (!Object.hasOwn(OBSERVATION_CATALOG, id) || !Number.isInteger(stage) || stage < 0 || stage > 2) throw Error('invalid-observation-clues');
    if (stage > 0) out[id] = stage;
  }
  return out;
}

export function getObservationJournal(speciesId, progress) {
  const definition = OBSERVATION_CATALOG[speciesId];
  if (!definition) return [];
  const count = progress?.observationClues?.[speciesId] ?? 0;
  return definition.clues.slice(0, count).map((clue, index) => ({ ...clue, stage: index + 1 }));
}
