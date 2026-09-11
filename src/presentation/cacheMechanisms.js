// Mechanical presentation follows existing seal/claim ownership; it never grants loot.
const DOOR_TRAVEL = 0.515;
const TRAY_TRAVEL = 0.25;
const OPEN_SECONDS = 1.4;
const LID_SECONDS = 0.95;
const LID_ANGLE = -100 * Math.PI / 180;
const LATCH_ANGLE = -0.8;
const ease = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

export function createCacheMechanisms({ registry, progress, getVisualRoot, getAvailability }) {
  const mechanisms = new Map();
  for (const region of registry.data.regions ?? []) {
    for (const chest of registry.getLootChestsForSection(region.id)) {
      const root = getVisualRoot?.(chest.id);
      const left = root?.getObjectByName('CacheDoorLeft');
      const right = root?.getObjectByName('CacheDoorRight');
      const tray = root?.getObjectByName('CacheTray');
      const core = root?.getObjectByName('CacheCore');
      const lid = root?.getObjectByName('ChestLidPivot');
      if (lid) {
        const latches = ['ChestLatchLeft', 'ChestLatchRight'].map(name => root.getObjectByName(name)).filter(Boolean);
        mechanisms.set(chest.id, { kind: 'lid', chest, root, lid, lidX: lid.rotation.x,
          latches: latches.map(node => ({ node, x: node.rotation.x })), amount: 0, initialized: false });
        continue;
      }
      if (!left || !right || !tray || !core) continue;
      mechanisms.set(chest.id, { kind: 'vault', chest, root, left, right, tray, core,
        leftX: left.position.x, rightX: right.position.x, trayZ: tray.position.z,
        amount: 0, initialized: false });
    }
  }
  let previousSection = null;
  function apply(m, amount, claimed) {
    if (m.kind === 'lid') {
      // Release catches before lifting; refill reverses this same safe order.
      m.lid.rotation.x = m.lidX + LID_ANGLE * ease((amount - 0.2) / 0.8);
      const catchRelease = ease(amount / 0.2) * (1 - ease((amount - 0.7) / 0.3));
      for (const latch of m.latches) latch.node.rotation.x = latch.x + LATCH_ANGLE * catchRelease;
      return;
    }
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
    // Only automatic seal mechanisms replace companion wards/access timing.
    has: (id) => mechanisms.get(id)?.kind === 'vault',
    access(id) {
      const m = mechanisms.get(id);
      return m?.kind === 'vault' && m.initialized && m.amount < 1 - 1e-6
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
        const availability = getAvailability ? getAvailability(m.chest.id) : progress.getLootChestAvailability(m.chest.id, m.chest.refillSeconds, Date.now());
        const claimed = !availability.available;
        const target = claimed || (m.kind === 'vault' && completed.includes(m.chest.id)) ? 1 : 0;
        if (!m.initialized || changedSection || reducedMotion) m.amount = target;
        else if (!paused) m.amount += Math.sign(target - m.amount) * Math.min(Math.abs(target - m.amount), Math.max(0, dt) / (m.kind === 'lid' ? LID_SECONDS : OPEN_SECONDS));
        m.initialized = true;
        apply(m, m.amount, claimed);
      }
    },
  };
}
