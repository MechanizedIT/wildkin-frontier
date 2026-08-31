// First-class vertical-carry Jump Pads and truthful direction-independent Author guidance.

export const JUMP_PAD_PRESETS = Object.freeze({
  low: Object.freeze({ verticalLaunch: 5.2 }),
  medium: Object.freeze({ verticalLaunch: 6.6 }),
  high: Object.freeze({ verticalLaunch: 8.0 }),
});

export function resolveJumpPadVerticalLaunch(pad = {}) {
  if (Number.isFinite(pad.verticalLaunch) && pad.verticalLaunch > 0) return pad.verticalLaunch;
  return JUMP_PAD_PRESETS[pad.powerPreset]?.verticalLaunch ?? JUMP_PAD_PRESETS.medium.verticalLaunch;
}

export function getJumpPadGuidance(pad = {}, { gravity = 12, walkSpeed = 3.3, runSpeed = 6 } = {}) {
  const verticalLaunch = resolveJumpPadVerticalLaunch(pad);
  const gravityMagnitude = Math.max(0.001, Math.abs(gravity));
  const airtime = (2 * verticalLaunch) / gravityMagnitude;
  return {
    verticalLaunch,
    apexHeightDelta: (verticalLaunch * verticalLaunch) / (2 * gravityMagnitude),
    airtime,
    walkCarryDistance: Math.max(0, walkSpeed) * airtime,
    runCarryDistance: Math.max(0, runSpeed) * airtime,
  };
}

export function getJumpPadDirection(rotY = 0) {
  return { x: Math.sin(rotY), z: Math.cos(rotY) };
}

// Canonical invalidation key shared by Author preview and tests. Keep this tied
// to the runtime fields rather than introducing an editor-only aggregate.
export function getJumpPadTrajectorySignature(pad = {}) {
  return JSON.stringify({
    id: pad.id ?? null,
    pos: { x: pad.pos?.x ?? 0, y: pad.pos?.y ?? 0, z: pad.pos?.z ?? 0 },
    powerPreset: pad.powerPreset ?? "medium",
    verticalLaunch: pad.verticalLaunch ?? null,
  });
}

export function predictJumpPadTrajectory(pad, { gravity = 12, duration = null, steps = 24 } = {}) {
  const direction = getJumpPadDirection(pad.rotY ?? 0);
  const horizontal = Math.max(0, Number(pad.horizontalLaunch) || 0);
  const vertical = resolveJumpPadVerticalLaunch(pad);
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
      const verticalLaunch = resolveJumpPadVerticalLaunch(pad);
      if (launchPlayer({ pad, verticalLaunch })) {
        readyAt.set(pad.id, now() + (pad.cooldown ?? 0.8) * 1000);
        launched = pad;
      }
    }
    return launched;
  }

  function reset() { inside.clear(); readyAt.clear(); }
  return { update, reset };
}
