// Companion follow intent is deliberately rendering- and physics-free.  The
// companion has a loose place in the expedition rather than a continuously
// enforced tether: it settles near its place, takes small attention walks, and
// only hurries when the player actually gets away.

const TAU = Math.PI * 2;

export const COMPANION_FOLLOW_TUNING = Object.freeze({
  settleRadius: 2.65,
  strollRadius: 3.55,
  catchupRadius: 6.1,
  recoverRadius: 13.5,
  recoverTeleportRadius: 22,
  strollSpeed: 1.45,
  catchupSpeed: 4.15,
  recoverSpeed: 6.2,
  attentionDelay: 1.45,
  attentionDuration: 1.65,
  formationDistance: 2.05,
  formationSpread: 0.86,
  forageDistance: 0.72,
});

function clamp(x, low, high) { return Math.max(low, Math.min(high, x)); }

function distanceXZ(a, b) { return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.z ?? 0) - (b.z ?? 0)); }

export function getCompanionFormationAnchor(player, playerFacing, slotIndex, slotCount, tuning = COMPANION_FOLLOW_TUNING) {
  // Slots fan behind the player. With one companion it stays just off-center,
  // which keeps the player silhouette and interaction prompt visible.
  const centered = slotCount <= 1 ? 0.42 : slotIndex - (slotCount - 1) * 0.5;
  const lateral = centered * tuning.formationSpread;
  const backwards = tuning.formationDistance + Math.abs(centered) * 0.18;
  const rightX = Math.cos(playerFacing), rightZ = -Math.sin(playerFacing);
  const forwardX = Math.sin(playerFacing), forwardZ = Math.cos(playerFacing);
  return {
    x: player.x - forwardX * backwards + rightX * lateral,
    y: player.y,
    z: player.z - forwardZ * backwards + rightZ * lateral,
  };
}

/**
 * Derive a stable intent for one fixed simulation step.
 * State is a small serializable transient object owned by companionSystem.
 */
export function deriveCompanionFollowIntent({ position, player, playerFacing = 0, slotIndex = 0, slotCount = 1, elapsed = 0, state = {}, tuning = COMPANION_FOLLOW_TUNING }) {
  const anchor = getCompanionFormationAnchor(player, playerFacing, slotIndex, slotCount, tuning);
  const distance = distanceXZ(position, player);
  const previousMode = state.mode ?? "SETTLE";
  let mode = state.mode ?? "SETTLE";
  let attentionUntil = state.attentionUntil ?? 0;
  let lastSettledAt = state.lastSettledAt ?? elapsed;
  let settledPoint = state.settledPoint ?? { x: position.x, y: position.y, z: position.z };
  let interestTarget = state.interestTarget ?? null;
  let attentionCount = state.attentionCount ?? 0;

  // Keep a settled companion at its own point. A player turning in place must
  // not drag it around its old formation slot; only real separation reopens
  // following. The wide exit/entry gaps avoid visible pace chatter.
  if (distance >= tuning.recoverTeleportRadius) mode = "TELEPORT";
  else if (distance >= tuning.recoverRadius || (previousMode === "RECOVER" && distance > tuning.catchupRadius)) mode = "RECOVER";
  else if (distance >= tuning.catchupRadius || (previousMode === "RECOVER" && distance > tuning.strollRadius)) mode = "CATCHUP";
  else if (distance >= tuning.strollRadius || ((previousMode === "STROLL" || previousMode === "CATCHUP") && distance > tuning.settleRadius)) mode = "STROLL";
  else if (previousMode === "ATTEND" && elapsed < attentionUntil) mode = "ATTEND";
  else mode = "SETTLE";

  if (mode === "SETTLE" && previousMode !== "SETTLE") {
    lastSettledAt = elapsed;
    settledPoint = { x: position.x, y: position.y, z: position.z };
    interestTarget = null;
  }
  if (mode === "SETTLE" && elapsed >= attentionUntil && elapsed - lastSettledAt >= tuning.attentionDelay) {
    attentionUntil = elapsed + tuning.attentionDuration;
    mode = "ATTEND";
    attentionCount += 1;
    const phase = (slotIndex * 1.91 + attentionCount * 2.399) % TAU;
    interestTarget = {
      x: settledPoint.x + Math.cos(phase) * tuning.forageDistance,
      y: settledPoint.y,
      z: settledPoint.z + Math.sin(phase) * tuning.forageDistance,
    };
  }

  let target = settledPoint;
  let speed = 0;
  if (mode === "STROLL") speed = tuning.strollSpeed;
  else if (mode === "CATCHUP") speed = tuning.catchupSpeed;
  else if (mode === "RECOVER") speed = tuning.recoverSpeed;
  else if (mode === "ATTEND") {
    // One stable interest point reads as a brief sniff/look, rather than an
    // animal circling a continuously moving target.
    target = interestTarget ?? settledPoint;
    speed = tuning.strollSpeed * 0.52;
  }
  if (mode === "STROLL" || mode === "CATCHUP" || mode === "RECOVER") target = anchor;

  return {
    mode,
    target,
    speed,
    distance,
    anchor,
    shouldTeleport: mode === "TELEPORT",
    nextState: {
      mode,
      attentionUntil,
      lastSettledAt,
      settledPoint,
      interestTarget,
      attentionCount,
    },
  };
}

export { distanceXZ as companionDistanceXZ };
