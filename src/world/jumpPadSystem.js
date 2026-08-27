// First-class physical Jump Pads and shared editor trajectory math.

export function getJumpPadDirection(rotY = 0) {
  return { x: Math.sin(rotY), z: Math.cos(rotY) };
}

export function predictJumpPadTrajectory(pad, { gravity = 12, duration = null, steps = 24 } = {}) {
  const direction = getJumpPadDirection(pad.rotY ?? 0);
  const horizontal = pad.horizontalLaunch;
  const vertical = pad.verticalLaunch;
  const flightTime = duration ?? Math.max(0.2, (2 * vertical) / gravity);
  const points = [];
  for (let index = 0; index <= steps; index++) {
    const t = flightTime * index / steps;
    points.push({
      x: pad.pos.x + direction.x * horizontal * t,
      y: (pad.pos.y ?? 0) + vertical * t - 0.5 * gravity * t * t,
      z: pad.pos.z + direction.z * horizontal * t,
      t,
    });
  }
  return points;
}

export function createJumpPadSystem(worldRegistry, opts = {}) {
  const getActiveSectionId = opts.getActiveSectionId ?? (() => null);
  const launchPlayer = opts.launchPlayer ?? (() => false);
  const now = opts.now ?? (() => performance.now());
  const inside = new Set();
  const readyAt = new Map();

  function update(playerPos) {
    if (!playerPos) return null;
    let launched = null;
    const pads = worldRegistry.getJumpPadsForSection?.(getActiveSectionId()) ?? [];
    const liveIds = new Set(pads.map((pad) => pad.id));
    for (const id of [...inside]) if (!liveIds.has(id)) inside.delete(id);
    for (const pad of pads) {
      const radius = pad.triggerRadius ?? 1;
      const isInside = Math.hypot(playerPos.x - pad.pos.x, playerPos.z - pad.pos.z) <= radius;
      if (!isInside) { inside.delete(pad.id); continue; }
      if (inside.has(pad.id) || now() < (readyAt.get(pad.id) ?? 0)) continue;
      inside.add(pad.id);
      const direction = getJumpPadDirection(pad.rotY ?? 0);
      if (launchPlayer({ pad, direction, horizontalLaunch: pad.horizontalLaunch, verticalLaunch: pad.verticalLaunch })) {
        readyAt.set(pad.id, now() + (pad.cooldown ?? 0.8) * 1000);
        launched = pad;
      }
    }
    return launched;
  }

  function reset() { inside.clear(); readyAt.clear(); }
  return { update, reset };
}
