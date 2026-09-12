// Spatial adapter between the continuous frontier and the existing expedition
// lifecycle. It owns no player, inventory, health, terrain, or save state.

export const FRONTIER_OUTING_MARGIN = 4;

export function isBeyondCampOutingBoundary(position, bounds, margin = FRONTIER_OUTING_MARGIN) {
  if (!position || !bounds || ![position.x, position.z].every(Number.isFinite)) return false;
  const extra = Number.isFinite(margin) ? Math.max(0, margin) : FRONTIER_OUTING_MARGIN;
  return position.x < bounds.minX - extra || position.x > bounds.maxX + extra
    || position.z < bounds.minZ - extra || position.z > bounds.maxZ + extra;
}

export function commitFrontierOutingStart({
  session,
  checkpoint,
  getActiveRun,
  startAnchorId = 'camp_gate',
  sectionId = 'camp',
  cargo = {},
  xp = 0,
  frontierDeparted = false,
} = {}) {
  if (!session?.isCamp?.() || !session.beginRun?.(startAnchorId)) return { ok: false, reason: 'already-active' };
  session.setRegion?.(sectionId, null);
  session.setCargo?.(cargo);
  session.setXp?.(xp);
  session.setFrontierDeparted?.(frontierDeparted);
  const saved = checkpoint?.();
  const committed = getActiveRun?.();
  if (saved?.ok !== true || committed?.runId !== session.getRunId?.()) {
    session.resetToCamp?.();
    session.setRegion?.(sectionId, null);
    session.setCargo?.(cargo);
    session.setXp?.(xp);
    return { ok: false, reason: saved?.reason ?? 'checkpoint-failed' };
  }
  return { ok: true, runId: committed.runId };
}

export function createFrontierOuting({
  session,
  campBounds,
  commitStart,
  margin = FRONTIER_OUTING_MARGIN,
  retrySeconds = 1,
  initialDeparted = false,
  onDeparted = () => {},
} = {}) {
  if (!session || !campBounds || typeof commitStart !== 'function') {
    throw new Error('FrontierOuting requires session, Camp bounds, and commitStart');
  }
  let retryRemaining = 0;
  let departedCamp = initialDeparted === true;

  function startAt(position, { source = 'camp-action' } = {}) {
    if (!session.isCamp?.()) return { ok: false, reason: 'already-active' };
    if (!position || ![position.x, position.y, position.z].every(Number.isFinite)) {
      return { ok: false, reason: 'invalid-position' };
    }
    const startsDeparted = isBeyondCampOutingBoundary(position, campBounds, margin);
    const result = commitStart({ position: { x: position.x, y: position.y, z: position.z }, source, frontierDeparted: startsDeparted });
    if (result?.ok) {
      retryRemaining = 0;
      departedCamp = startsDeparted;
      return result;
    }
    retryRemaining = Math.max(0, retrySeconds);
    return result ?? { ok: false, reason: 'start-failed' };
  }

  function update(dt, position, { enabled = true, grounded = true } = {}) {
    retryRemaining = Math.max(0, retryRemaining - Math.max(0, Number(dt) || 0));
    if (!enabled || !grounded) return null;
    if (!session.isCamp?.()) {
      if (session.isActive?.() && !departedCamp && isBeyondCampOutingBoundary(position, campBounds, margin)) {
        departedCamp = true;
        onDeparted();
      }
      return null;
    }
    if (retryRemaining > 0) return null;
    if (!isBeyondCampOutingBoundary(position, campBounds, margin)) return null;
    return startAt(position, { source: 'walk-out' });
  }

  return {
    update,
    startAt,
    isBeyondBoundary: position => isBeyondCampOutingBoundary(position, campBounds, margin),
    resetRetry: () => { retryRemaining = 0; },
    hasDepartedCamp: () => departedCamp,
    getState: () => ({ retryRemaining, departedCamp }),
  };
}
