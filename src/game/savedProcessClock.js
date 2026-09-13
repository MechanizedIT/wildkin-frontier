// Rendering-free active-play accumulator for one saved process. The caller
// keeps domain state and persistence ownership; a failed advance loses only
// the completed bounded quantum already removed from this transient clock.
export function createSavedProcessClock({ getProcess, getId, getProgress, duration, maxAdvance, advance }) {
  let elapsed = 0, lastId = null, lastProgress = 0;
  function reset() { elapsed = 0; lastId = null; lastProgress = 0; }
  function update(dt, { active = false } = {}) {
    const process = getProcess();
    if (!process) { reset(); return; }
    const id = getId(process), progress = getProgress(process);
    if (id !== lastId || progress < lastProgress) elapsed = 0;
    lastId = id; lastProgress = progress;
    if (!active || progress >= duration || !Number.isFinite(dt) || dt <= 0) return;
    elapsed += Math.min(dt, .25);
    const quantum = Math.min(maxAdvance, duration - progress);
    if (elapsed + 1e-8 < quantum) return;
    elapsed = Math.max(0, elapsed - quantum);
    advance(quantum);
  }
  return { update, reset };
}
