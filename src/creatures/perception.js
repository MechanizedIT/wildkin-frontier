// src/creatures/perception.js — small focused actor perception helpers (pure)
// Wildkin must perceive other Wildkin, not just target=player

export function makeActor({ id, actorType, pos, alive = true, speciesTag = "", y = 0.5 }) {
  return { id, actorType, pos: { x: pos.x, y: pos.y ?? y, z: pos.z }, alive, speciesTag };
}

export function distanceXZ(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export const WILDLIFE_AWARENESS_CONFIG = Object.freeze({
  quietHearingRadius: 1.15,
  quietVisionScale: .85,
  visionHalfAngle: Math.PI / 3,
  memorySeconds: 1.8,
});

// Ordinary movement is audible around an animal. Sneaking and standing still
// require close hearing or a clear frontal view. A renderer is not needed.
export function canNoticeQuietPlayer({ observer, player, noticeRadius, verticalTolerance = 2, lineOfSight = () => true }) {
  if (!observer?.pos || !player?.pos) return false;
  const dx = player.pos.x - observer.pos.x, dz = player.pos.z - observer.pos.z;
  const distance = Math.hypot(dx, dz);
  if (distance > noticeRadius || Math.abs((player.pos.y ?? .5) - (observer.pos.y ?? .5)) > verticalTolerance) return false;
  const quiet = player.mode === 'SNEAK' || (player.mode === 'IDLE' && (player.speed ?? 0) < .1);
  if (!quiet) return true;
  if (distance <= WILDLIFE_AWARENESS_CONFIG.quietHearingRadius) return true;
  if (distance > noticeRadius * WILDLIFE_AWARENESS_CONFIG.quietVisionScale) return false;
  const facing = observer.facing ?? 0;
  const dot = (Math.sin(facing) * dx + Math.cos(facing) * dz) / distance;
  return dot >= Math.cos(WILDLIFE_AWARENESS_CONFIG.visionHalfAngle) && lineOfSight();
}

export function isAliveActor(actor) {
  if (!actor) return false;
  if (actor.alive === false) return false;
  if (actor.state?.isDead) return false;
  if (actor.state?.aiState === "RESPAWNING") return false;
  return true;
}

export function actorPosition(actor) {
  if (actor.state?.pos) return actor.state.pos;
  if (actor.pos) return actor.pos;
  if (actor.position) return actor.position;
  return actor;
}

// Return nearest eligible actor from list, filtered by isEligible predicate, within maxRadius
export function findNearestEligible({ selfPos, candidates, maxRadius = Infinity, isEligible = () => true, excludeIds = new Set() }) {
  let best = null;
  let bestDist = Infinity;
  for (const cand of candidates) {
    if (!cand) continue;
    if (excludeIds.has(cand.id) || excludeIds.has(cand.state?.id)) continue;
    if (!isAliveActor(cand)) continue;
    const cPos = actorPosition(cand);
    if (!cPos) continue;
    const d = distanceXZ(selfPos, cPos);
    if (d > maxRadius + 1e-6) continue;
    if (!isEligible(cand, d)) continue;
    if (d < bestDist) {
      bestDist = d;
      best = cand;
    }
  }
  return best ? { actor: best, dist: bestDist } : null;
}

// Self/dead exclusion check (pure)
export function canTargetActor(self, target) {
  if (!self || !target) return false;
  const selfId = self.state?.id ?? self.id;
  const targetId = target.state?.id ?? target.id;
  if (selfId && targetId && selfId === targetId) return false;
  if (!isAliveActor(target)) return false;
  return true;
}
