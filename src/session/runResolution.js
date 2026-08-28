// Shared successful extraction owner used by Beacons, Waypoints, and the
// Section 1 Camp-link return. Banking and run reset happen exactly once.

export function resolveSuccessfulExtraction({ session, cargo, xp, bankRun } = {}) {
  if (!session?.isActive?.()) return { ok: false, reason: "inactive-run" };
  session.setCargo?.(cargo ?? {});
  session.setXp?.(xp ?? 0);
  const snapshot = session.tryResolveExtract?.();
  if (!snapshot) return { ok: false, reason: "already-resolved" };
  const banked = bankRun?.(snapshot.cargo, snapshot.xp, snapshot.runId);
  session.resetToCamp?.();
  return { ok: true, type: "extracted", snapshot, banked };
}

export function createReturnToCampFlow({ session, getCargo, getXp, bankRun } = {}) {
  let pending = null;
  return {
    request(context = {}) {
      if (!session?.isActive?.()) return { ok: false, reason: "inactive-run" };
      pending = { ...context };
      return { ok: true, pending: { ...pending } };
    },
    cancel() {
      if (!pending) return { ok: false, reason: "not-pending" };
      pending = null;
      return { ok: true };
    },
    confirm() {
      if (!pending) return { ok: false, reason: "not-pending" };
      const context = pending;
      pending = null;
      return { ...resolveSuccessfulExtraction({ session, cargo: getCargo?.() ?? {}, xp: getXp?.() ?? 0, bankRun }), context };
    },
    isPending: () => !!pending,
    getPending: () => pending ? { ...pending } : null,
  };
}
