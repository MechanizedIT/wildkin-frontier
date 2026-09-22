// Preparation may fail; commit only performs already-prepared swaps. No frame,
// input, physics step or await can observe a partially committed batch.
export function publishBatch(entries, { prepare, discard, commit }) {
  const staged = [];
  try { for (const entry of entries) staged.push({ entry, value: prepare(entry) }); }
  catch (error) { for (const item of staged) discard(item.value); return { ok: false, error }; }
  for (const item of staged) commit(item.entry, item.value);
  return { ok: true };
}
