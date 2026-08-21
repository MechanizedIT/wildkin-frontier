// src/creatures/perception.js — small focused actor perception helpers (pure)
// Wildkin must perceive other Wildkin, not just target=player

export function makeActor({ id, actorType, pos, alive = true, speciesTag = "", y = 0.5 }) {
  return { id, actorType, pos: { x: pos.x, y: pos.y ?? y, z: pos.z }, alive, speciesTag };
}

export function distanceXZ(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
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
