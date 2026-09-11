// Mechanical presentation follows existing seal/claim ownership; it never grants loot.
const DOOR_TRAVEL = 0.515;
const TRAY_TRAVEL = 0.25;
const OPEN_SECONDS = 1.4;
const ease = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

export function createCacheMechanisms({ registry, progress, getVisualRoot }) {
  const mechanisms = new Map();
  for (const region of registry.data.regions ?? []) {
    for (const chest of registry.getLootChestsForSection(region.id)) {
      const root = getVisualRoot?.(chest.id);
      const left = root?.getObjectByName('CacheDoorLeft');
      const right = root?.getObjectByName('CacheDoorRight');
      const tray = root?.getObjectByName('CacheTray');
      const core = root?.getObjectByName('CacheCore');
      if (!left || !right || !tray || !core) continue;
      mechanisms.set(chest.id, { chest, root, left, right, tray, core,
        leftX: left.position.x, rightX: right.position.x, trayZ: tray.position.z,
        amount: 0, initialized: false });
    }
  }
  let previousSection = null;
  function apply(m, amount, claimed) {
    // Doors clear before the loaded tray advances; the same rigid meshes remain.
    const doors = ease(amount / 0.65);
    const tray = ease((amount - 0.6) / 0.4);
    m.left.position.x = m.leftX - DOOR_TRAVEL * doors;
    m.right.position.x = m.rightX + DOOR_TRAVEL * doors;
    m.tray.position.z = m.trayZ + TRAY_TRAVEL * tray;
    m.core.visible = !claimed;
  }
  function reset() {
    previousSection = null;
    for (const m of mechanisms.values()) {
      m.initialized = false;
      m.amount = 0;
      apply(m, 0, false);
    }
  }
  return {
    has: (id) => mechanisms.has(id),
    access(id) {
      const m = mechanisms.get(id);
      return m?.initialized && m.amount < 1 - 1e-6
        ? { ok: false, busy: true, label: 'OPENING', reason: 'The vault is opening.' }
        : { ok: true };
    },
    reset,
    update(dt, { sectionId, paused = false, hidden = false, reducedMotion = false } = {}) {
      if (hidden) { reset(); return; }
      const changedSection = previousSection !== sectionId;
      previousSection = sectionId;
      const completed = progress.getState().completedPoiIds;
      for (const m of mechanisms.values()) {
        if (m.chest.sectionId !== sectionId) { m.initialized = false; continue; }
        const claimed = !progress.getLootChestAvailability(m.chest.id, m.chest.refillSeconds, Date.now()).available;
        const target = completed.includes(m.chest.id) || claimed ? 1 : 0;
        if (!m.initialized || changedSection || reducedMotion) m.amount = target;
        else if (!paused) m.amount += Math.sign(target - m.amount) * Math.min(Math.abs(target - m.amount), Math.max(0, dt) / OPEN_SECONDS);
        m.initialized = true;
        apply(m, m.amount, claimed);
      }
    },
  };
}
