// src/movement/traversalController.js — single owner for jump / climb / mantle (Phase 1.1)
// Kinematic jump: no physics engine. Climb: continuous up/down, top-entry, mantle.

import { MOVEMENT_CONFIG as DEFAULT_CFG } from "../game/config.js";

// ----- Pure helpers (testable without THREE) -----
export function isInsideRegionXZ(pos, region) {
  return pos.x >= region.minX && pos.x <= region.maxX && pos.z >= region.minZ && pos.z <= region.maxZ;
}

export function closestPointInRegion(pos, region) {
  const x = Math.max(region.minX, Math.min(region.maxX, pos.x));
  const z = Math.max(region.minZ, Math.min(region.maxZ, pos.z));
  return { x, z };
}

export function distanceToRegion(pos, region) {
  const c = closestPointInRegion(pos, region);
  return Math.hypot(pos.x - c.x, pos.z - c.z);
}

export function computeAirTime(initVert, gravity) {
  // symmetric start/end height: t = 2*v0/g
  if (gravity <= 1e-6) return 0;
  return (2 * initVert) / gravity;
}

export function computeJumpDistance(horizontalSpeed, airTime) {
  return horizontalSpeed * airTime;
}

export function canReachLanding(startPos, direction, speed, traversal, cfg) {
  const initVert = cfg.jumpInitialVerticalVelocity ?? 5.8;
  const gravity = cfg.jumpGravity ?? 12;
  const airTime = computeAirTime(initVert, gravity);
  const predicted = {
    x: startPos.x + direction.x * speed * airTime,
    z: startPos.z + direction.z * speed * airTime,
  };
  // if predicted inside region, reachable
  if (isInsideRegionXZ(predicted, traversal.landingRegion)) return { reachable: true, predicted, clamped: predicted };
  const closest = closestPointInRegion(predicted, traversal.landingRegion);
  const distToRegion = Math.hypot(predicted.x - closest.x, predicted.z - closest.z);
  const maxCorr = traversal.maxLandingCorrection ?? cfg.jumpMaxLandingCorrection ?? 1.4;
  // Also require distance from start to clamped landing <= speed*airTime + slack
  const distToClamped = Math.hypot(closest.x - startPos.x, closest.z - startPos.z);
  const maxReachable = speed * airTime + 0.35;
  if (distToRegion <= maxCorr && distToClamped <= maxReachable) {
    return { reachable: true, predicted, clamped: closest, distToRegion };
  }
  return { reachable: false, predicted, clamped: closest, distToRegion };
}

export function checkJumpTrigger(worldDir, pos, speed, magnitude, traversal, cfg) {
  if (!worldDir || (worldDir.x === 0 && worldDir.z === 0)) return null;
  if (magnitude !== undefined && magnitude < 0.18) return null;
  if (speed < (traversal.minTakeoffSpeed ?? cfg.jumpMinTakeoffSpeed ?? 2.2)) return null;
  const dx = pos.x - traversal.triggerCenter.x;
  const dz = pos.z - traversal.triggerCenter.z;
  const dist = Math.hypot(dx, dz);
  if (dist > (traversal.triggerRadius ?? cfg.jumpTriggerRadius ?? 1.45)) return null;
  const dot = worldDir.x * traversal.direction.x + worldDir.z * traversal.direction.z;
  if (dot < (cfg.jumpDirectionDotThreshold ?? 0.35)) return null;
  const reach = canReachLanding(pos, traversal.direction, speed, traversal, cfg);
  if (!reach.reachable) return null;
  return { traversal, reach };
}

export function findJumpCandidate(worldDir, pos, speed, magnitude, traversals, cfg) {
  for (const t of traversals) {
    const hit = checkJumpTrigger(worldDir, pos, speed, magnitude, t, cfg);
    if (hit) return hit;
  }
  return null;
}

// Climb pure helpers
export function isInsideTopEntryRegion(pos, climbable) {
  const r = climbable.topEntryRegion;
  if (!r) return false;
  return pos.x >= r.minX && pos.x <= r.maxX && pos.z >= r.minZ && pos.z <= r.maxZ;
}

export function checkClimbBottomEntry(worldDir, pos, magnitude, climbable, cfg) {
  if (magnitude < 0.12) return false;
  if (!worldDir || (worldDir.x === 0 && worldDir.z === 0)) return false;
  const dx = pos.x - climbable.x;
  const dz = pos.z - climbable.z;
  const horizDist = Math.hypot(dx, dz);
  if (horizDist > (cfg.climbProximity ?? 1.05)) return false;
  const dot = worldDir.x * climbable.approachDir.x + worldDir.z * climbable.approachDir.z;
  if (dot < (cfg.climbEnterDot ?? 0.30)) return false;
  return true;
}

export function checkClimbTopEntry(worldDir, pos, magnitude, posY, climbable, cfg) {
  if (magnitude < 0.18) return false;
  if (!isInsideTopEntryRegion(pos, climbable)) return false;
  const topThreshold = climbable.topY - 0.45;
  if (posY < topThreshold) return false;
  // Need intent moving toward wall south direction (−approach)
  const approach = climbable.approachDir;
  const south = { x: -approach.x, z: -approach.z };
  const dotSouth = worldDir.x * south.x + worldDir.z * south.z;
  if (dotSouth < (cfg.climbTopEntryDot ?? 0.22)) return false;
  // Also proximity to wall
  const dx = pos.x - climbable.x;
  const dz = pos.z - climbable.z;
  const horizDist = Math.hypot(dx, dz);
  if (horizDist > (cfg.climbTopEntryRadius ?? 1.15) + 0.6) return false;
  return true;
}

export function computeMantleEndpoints(climbable, currentPos, cfg) {
  // Start near wall edge at topY
  const start = { x: currentPos.x, y: climbable.topY + 0.36, z: currentPos.z };
  // End just inside platform interior, slightly north of entry (small offset, not center teleport)
  const exit = climbable.mantleExit ?? { x: climbable.topPlatform.x, z: climbable.topPlatform.z - 0.2 };
  const end = {
    x: exit.x * 0.35 + currentPos.x * 0.65,
    y: climbable.topY + 0.36,
    z: exit.z,
  };
  return { start, end };
}

// ----- Stateful controller -----
export function createTraversalController(playground, cfg = DEFAULT_CFG) {
  const state = {
    mode: "IDLE", // IDLE | JUMP | CLIMB | MANTLE
    // jump
    jumpTraversal: null,
    jumpTime: 0,
    jumpAirTime: 0,
    jumpStartPos: null,
    jumpStartY: 0,
    jumpLandingY: 0,
    jumpLandingRegion: null,
    jumpHVel: { x: 0, z: 0 },
    jumpVertVel: 0,
    jumpInitialSpeed: 0,
    jumpDirection: { x: 0, z: 0 },
    // climb
    climbable: null,
    climbTime: 0,
    // mantle
    mantleTime: 0,
    mantleDuration: cfg.mantleDuration ?? 0.28,
    mantleStart: null,
    mantleEnd: null,
  };

  function getState() {
    return { ...state, mode: state.mode };
  }

  function isTraversing() {
    return state.mode !== "IDLE";
  }

  function tryStartJump(worldDir, pos, speed, magnitude) {
    if (state.mode !== "IDLE") return null;
    // Dodge must not convert — caller checks dodge first
    // Sneak should normally not jump: speed threshold already blocks
    const traversals = playground.jumpTraversals ?? playground.jumpLinks ?? [];
    const hit = findJumpCandidate(worldDir, pos, speed, magnitude, traversals, cfg);
    if (!hit) return null;
    const t = hit.traversal;
    const reach = hit.reach;
    // Begin from actual current position, preserve momentum
    state.mode = "JUMP";
    state.jumpTraversal = t;
    state.jumpTime = 0;
    state.jumpAirTime = computeAirTime(cfg.jumpInitialVerticalVelocity ?? 5.8, cfg.jumpGravity ?? 12);
    state.jumpStartPos = { x: pos.x, z: pos.z };
    state.jumpStartY = pos.y;
    // landing Y = platform height + 0.36 (player center)
    const landH = t.landingRegion?.height ?? playground.getGroundHeight(reach.clamped.x, reach.clamped.z, pos.y + 2) ?? 0;
    state.jumpLandingY = landH + 0.36;
    state.jumpLandingRegion = t.landingRegion;
    const dir = { x: t.direction.x, z: t.direction.z };
    // Preserve actual heading: use worldDir normalized
    const len = Math.hypot(worldDir.x, worldDir.z);
    const normDir = len > 1e-6 ? { x: worldDir.x / len, z: worldDir.z / len } : dir;
    // Blend dir toward authored direction slightly (keep natural but guarantee reaching)
    const blend = 0.25;
    const finalDir = {
      x: normDir.x * (1 - blend) + dir.x * blend,
      z: normDir.z * (1 - blend) + dir.z * blend,
    };
    const flen = Math.hypot(finalDir.x, finalDir.z) || 1;
    finalDir.x /= flen; finalDir.z /= flen;
    state.jumpDirection = finalDir;
    state.jumpInitialSpeed = speed;
    state.jumpHVel = { x: finalDir.x * speed, z: finalDir.z * speed };
    state.jumpVertVel = cfg.jumpInitialVerticalVelocity ?? 5.8;
    return { traversal: t, reach };
  }

  function updateJump(dt, intent, worldDir, pos) {
    if (state.mode !== "JUMP") return { landed: false, pos };
    const gravity = cfg.jumpGravity ?? 12;
    const airFactor = cfg.jumpAirControlFactor ?? 0.28;
    const accel = (cfg.acceleration ?? 28) * airFactor;

    state.jumpTime += dt;

    // Air control: limited steering toward intent direction, keeping speed around initial
    if (intent && intent.moveMagnitude > 0.12 && worldDir && (Math.abs(worldDir.x) > 1e-6 || Math.abs(worldDir.z) > 1e-6)) {
      const desiredDirLen = Math.hypot(worldDir.x, worldDir.z);
      if (desiredDirLen > 1e-6) {
        const desiredX = (worldDir.x / desiredDirLen) * state.jumpInitialSpeed;
        const desiredZ = (worldDir.z / desiredDirLen) * state.jumpInitialSpeed;
        let diffX = desiredX - state.jumpHVel.x;
        let diffZ = desiredZ - state.jumpHVel.z;
        const diffLen = Math.hypot(diffX, diffZ);
        const maxStep = accel * dt;
        if (diffLen > maxStep) {
          diffX = (diffX / diffLen) * maxStep;
          diffZ = (diffZ / diffLen) * maxStep;
        }
        state.jumpHVel.x += diffX;
        state.jumpHVel.z += diffZ;
        // Clamp max speed
        const curSpeed = Math.hypot(state.jumpHVel.x, state.jumpHVel.z);
        const maxSpd = cfg.jumpAirMaxSpeed ?? 7.2;
        if (curSpeed > maxSpd) {
          state.jumpHVel.x = (state.jumpHVel.x / curSpeed) * maxSpd;
          state.jumpHVel.z = (state.jumpHVel.z / curSpeed) * maxSpd;
        }
      }
    }

    // Integrate horizontal
    pos.x += state.jumpHVel.x * dt;
    pos.z += state.jumpHVel.z * dt;

    // Integrate vertical (kinematic: v -= g*dt ; y += v*dt)
    state.jumpVertVel -= gravity * dt;
    pos.y += state.jumpVertVel * dt;

    // Ground/landing check: when descending and Y at or below landing height, and XZ near landing region
    if (state.jumpVertVel < 0.2 && pos.y <= state.jumpLandingY + 0.06) {
      // Check if XZ within landing region + snap radius
      const inRegion = state.jumpLandingRegion ? isInsideRegionXZ(pos, state.jumpLandingRegion) : true;
      if (inRegion) {
        pos.y = state.jumpLandingY;
        // Small clamp to ensure inside region (not magnetic to center)
        if (state.jumpLandingRegion && !inRegion) {
          const closest = closestPointInRegion(pos, state.jumpLandingRegion);
          const dist = Math.hypot(pos.x - closest.x, pos.z - closest.z);
          if (dist <= (cfg.jumpMaxLandingCorrection ?? 1.4)) {
            pos.x = closest.x;
            pos.z = closest.z;
          }
        }
        state.mode = "IDLE";
        // Return residual speed for landing momentum
        return { landed: true, pos, landingSpeed: Math.hypot(state.jumpHVel.x, state.jumpHVel.z) };
      }
      // If not in region but time exceeded airTime + slack, still land on whatever ground is below (ground height)
      if (state.jumpTime > state.jumpAirTime + 0.35) {
        // Fall to ground height at current XZ
        const gh = playground.getGroundHeight(pos.x, pos.z, pos.y);
        pos.y = gh + 0.36;
        state.mode = "IDLE";
        return { landed: true, pos, landingSpeed: Math.hypot(state.jumpHVel.x, state.jumpHVel.z) };
      }
    }

    // Timeout fallback
    if (state.jumpTime > state.jumpAirTime + 0.75) {
      const gh = playground.getGroundHeight(pos.x, pos.z, pos.y);
      pos.y = gh + 0.36;
      state.mode = "IDLE";
      return { landed: true, pos, landingSpeed: Math.hypot(state.jumpHVel.x, state.jumpHVel.z) };
    }

    return { landed: false, pos };
  }

  // Climb bottom entry
  function tryStartClimbBottom(worldDir, pos, magnitude) {
    if (state.mode !== "IDLE") return null;
    for (const c of playground.climbables ?? []) {
      if (checkClimbBottomEntry(worldDir, pos, magnitude, c, cfg)) {
        state.mode = "CLIMB";
        state.climbable = c;
        state.climbTime = 0;
        return c;
      }
    }
    return null;
  }

  function tryStartClimbTop(worldDir, pos, magnitude, posY) {
    if (state.mode !== "IDLE") return null;
    for (const c of playground.climbables ?? []) {
      if (checkClimbTopEntry(worldDir, pos, magnitude, posY, c, cfg)) {
        state.mode = "CLIMB";
        state.climbable = c;
        state.climbTime = 0;
        // Position Y should already be at top; keep
        return c;
      }
    }
    return null;
  }

  function updateClimb(dt, intent, worldDir, pos) {
    if (state.mode !== "CLIMB") return { stillClimbing: false, pos, mantleStarted: false };
    const climb = state.climbable;
    const approach = climb.approachDir;
    const forwardDot = worldDir ? worldDir.x * approach.x + worldDir.z * approach.z : 0;
    const mag = intent ? intent.moveMagnitude : 0;

    let climbInput = 0;
    if (mag > 0.12) {
      climbInput = forwardDot * mag;
      if (Math.abs(forwardDot) < 0.28) climbInput *= 0.35;
    }

    // Downward input should descend continuously, not exit instantly.
    // Only exit via away input when at bottom (handled below) or when no vertical intent and strongly moving away.
    // For mid-climb, downward dot produces negative climbInput -> descends.

    // Choose speed up vs down
    const speed = climbInput >= 0 ? (cfg.climbSpeedUp ?? cfg.climbSpeed ?? 1.9) : (cfg.climbSpeedDown ?? 1.7);
    const dy = climbInput * speed * dt;
    pos.y += dy;

    // Snap XZ to wall anchor
    const anchorOffset = 0.35;
    pos.x = climb.x - approach.x * anchorOffset;
    pos.z = climb.z - approach.z * anchorOffset;

    const bottomY = playground.getGroundHeight(pos.x, pos.z, 0) + 0.36;
    const topY = climb.topY + 0.36;

    // Top reached -> mantle
    if (pos.y >= topY - 0.05 && climbInput > 0.05) {
      // Start mantle instead of teleport
      pos.y = topY;
      state.mode = "MANTLE";
      state.mantleTime = 0;
      state.mantleDuration = cfg.mantleDuration ?? 0.28;
      const endpoints = computeMantleEndpoints(climb, pos, cfg);
      state.mantleStart = endpoints.start;
      state.mantleEnd = endpoints.end;
      // Keep climbable for mantle reference
      return { stillClimbing: false, pos, mantleStarted: true };
    }

    if (pos.y <= bottomY) {
      pos.y = bottomY;
      if (climbInput < -0.08) {
        // Reached bottom and going further down -> exit smoothly
        state.mode = "IDLE";
        pos.x += -approach.x * 0.5;
        pos.z += -approach.z * 0.5;
        const climbed = state.climbable;
        state.climbable = null;
        return { stillClimbing: false, pos, exited: true, exitedClimbable: climbed, atBottom: true };
      }
    }

    // Clamp
    pos.y = Math.max(bottomY, Math.min(topY, pos.y));
    state.climbTime += dt;
    return { stillClimbing: true, pos };
  }

  function updateMantle(dt, pos) {
    if (state.mode !== "MANTLE") return { finished: false, pos };
    state.mantleTime += dt;
    const t = Math.min(1, state.mantleTime / state.mantleDuration);
    // ease: smoothstep
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const sx = state.mantleStart.x, sz = state.mantleStart.z, sy = state.mantleStart.y;
    const ex = state.mantleEnd.x, ez = state.mantleEnd.z, ey = state.mantleEnd.y;
    // Linear XZ, slight lift over lip then down: add small arc
    const arc = Math.sin(Math.PI * t) * 0.22;
    pos.x = sx + (ex - sx) * eased;
    pos.z = sz + (ez - sz) * eased;
    pos.y = sy + (ey - sy) * eased + arc;
    if (t >= 1) {
      pos.x = ex;
      pos.z = ez;
      pos.y = ey;
      state.mode = "IDLE";
      state.climbable = null;
      state.mantleStart = null;
      state.mantleEnd = null;
      return { finished: true, pos };
    }
    return { finished: false, pos };
  }

  // Exposed for tests to compute mantle endpoint
  function getMantleEndpoints(climbable, currentPos) {
    return computeMantleEndpoints(climbable, currentPos, cfg);
  }

  function reset() {
    state.mode = "IDLE";
    state.jumpTraversal = null;
    state.jumpTime = 0;
    state.jumpHVel = { x: 0, z: 0 };
    state.jumpVertVel = 0;
    state.climbable = null;
    state.climbTime = 0;
    state.mantleTime = 0;
    state.mantleStart = null;
    state.mantleEnd = null;
  }

  // Rapier-aware mantle endpoints (capsule-aware Y) for Phase 1.2 physics debug/tests
  function computeMantleEndpointsWithCapsule(capsuleTotalHeight) {
    // Not stateful — helper shim for playerController
    return (climbable, currentPos) => computeMantleEndpoints(climbable, currentPos, cfg);
  }

  return {
    getState,
    isTraversing,
    tryStartJump,
    updateJump,
    tryStartClimbBottom,
    tryStartClimbTop,
    updateClimb,
    updateMantle,
    getMantleEndpoints,
    reset,
    // expose pure helpers for direct test import (re-export)
  };
}
