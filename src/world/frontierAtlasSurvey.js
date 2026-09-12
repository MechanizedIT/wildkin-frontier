// Loop adapter for personal atlas progress.  The composition owner calls update
// from its existing frame loop; this module intentionally creates no timers.

import { getFrontierAtlasCell } from './frontierAtlasState.js';

const RETRY_SECONDS = 2;

export function createFrontierAtlasSurvey({ progress, onBlocked = () => {} } = {}) {
  let lastCommittedCell = null;
  let pending = null;
  let retryElapsed = 0;

  function cellKey(cell) { return `${cell.chunkId}:${cell.bit}`; }
  function attempt(request) {
    const result = progress?.revealFrontierAt?.(request.position) ?? { ok: false, changed: false, reason: 'atlas-progress-unavailable' };
    if (result.ok) {
      lastCommittedCell = request.key;
      pending = null;
      retryElapsed = 0;
      return result;
    }
    pending = request;
    retryElapsed = 0;
    onBlocked(result.reason ?? 'atlas-save-failed');
    return result;
  }

  function update(dt, position, { enabled = true } = {}) {
    if (!enabled) return { ok: true, changed: false, skipped: true };
    const seconds = Number.isFinite(dt) && dt > 0 ? dt : 0;
    if (pending) {
      retryElapsed += seconds;
      if (retryElapsed < RETRY_SECONDS) return { ok: false, changed: false, reason: pending.reason ?? 'atlas-save-pending', pending: true };
      return attempt(pending);
    }
    const cell = getFrontierAtlasCell(position);
    if (!cell.ok) return { ok: false, changed: false, reason: cell.reason };
    const key = cellKey(cell);
    if (key === lastCommittedCell) return { ok: true, changed: false };
    return attempt({ key, position: { x: position.x, z: position.z } });
  }

  function reset() {
    lastCommittedCell = null;
    pending = null;
    retryElapsed = 0;
  }

  return { update, reset };
}
