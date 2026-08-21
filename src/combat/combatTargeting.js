// src/combat/combatTargeting.js — pure targeting logic, testable without THREE/Rapier
import { COMBAT_CONFIG } from "./combatConfig.js";

export function distance3D(a, b) {
  const dx = a.x - b.x;
  const dy = (a.y ?? 0) - (b.y ?? 0);
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

export function distanceXZ(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function angleDifference(radA, radB) {
  let d = radA - radB;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.abs(d);
}

// Check if target is within frontal arc and range and vertical tolerance
// playerPos {x,y,z}, playerFacing radians (0 = +Z, atan2(dx/dz)), targetPos {x,y,z}
export function isTargetInAttackArc(playerPos, playerFacing, targetPos, range = COMBAT_CONFIG.attackRange, arcDeg = COMBAT_CONFIG.attackArcDegrees, verticalTol = COMBAT_CONFIG.verticalTolerance) {
  const dx = targetPos.x - playerPos.x;
  const dz = targetPos.z - playerPos.z;
  const horizDist = Math.hypot(dx, dz);
  if (horizDist > range + 1e-6) return false;

  // vertical check: compare Y with tolerance
  const py = playerPos.y ?? 0.5;
  const ty = targetPos.y ?? 0.5;
  const dy = Math.abs(py - ty);
  if (dy > verticalTol) return false;

  // 3D distance also must be within range? But spec says vertical-aware: use XZ + vertical tolerance, not full 3D? We'll enforce XZ+vertical; if vertical within tol, XZ already ensures not too far below.
  // Additionally check 3D if needed but XZ+tol is primary.

  const angleToTarget = Math.atan2(dx, dz);
  const diff = angleDifference(angleToTarget, playerFacing);
  const halfArc = (arcDeg * Math.PI / 180) / 2;
  return diff <= halfArc + 1e-6;
}

export function getAttackTargets(playerPos, playerFacing, candidates, opts = {}) {
  const range = opts.range ?? COMBAT_CONFIG.attackRange;
  const arcDeg = opts.arcDegrees ?? COMBAT_CONFIG.attackArcDegrees;
  const verticalTol = opts.verticalTolerance ?? COMBAT_CONFIG.verticalTolerance;
  const maxTargets = opts.maxTargets ?? COMBAT_CONFIG.maxTargetsPerAttack;
  const res = [];
  for (const c of candidates) {
    if (c.isDead) continue;
    const pos = c.pos ?? c.position ?? c;
    if (!pos) continue;
    if (isTargetInAttackArc(playerPos, playerFacing, pos, range, arcDeg, verticalTol)) {
      const dist = distance3D(playerPos, pos);
      // also compute horiz for sorting? Use 3D for nearest
      res.push({ creature: c, dist, pos });
    }
  }
  res.sort((a, b) => a.dist - b.dist);
  return res.slice(0, maxTargets).map(r => r.creature);
}

export function wouldBeHit(playerPos, playerFacing, creaturePos, opts = {}) {
  return isTargetInAttackArc(playerPos, playerFacing, creaturePos, opts.range, opts.arcDegrees, opts.verticalTolerance);
}

// For testing: create mock creature
export function createMockCreature(id, x, z, y = 0.5, opts = {}) {
  return {
    id,
    pos: { x, y, z },
    position: { x, y, z },
    isDead: opts.isDead ?? false,
    health: opts.health ?? 3,
  };
}
