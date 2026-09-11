// src/resources/harvestLogic.js — pure helpers for harvesting (testable without THREE/Rapier)
import { HARVEST_CONFIG, isHarvestCompatibleMode } from "./resourceConfig.js";

export function distanceXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function distance3D(a, b) {
  const dx = a.x - b.x;
  const dy = (a.y ?? 0) - (b.y ?? 0);
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

function usesSurfaceStrike(node) {
  const half = node.type.colliderHalfExtents;
  return node.collisionEnabled !== false && node.type.solid && node.type.colliderShape === 'cuboid' && half
    && Math.max(half.x, half.z) * (node.state.uniformScale ?? 1) > HARVEST_CONFIG.surfaceStrikeMinHalfExtent;
}

export function getHarvestReach(node) {
  return usesSurfaceStrike(node) ? HARVEST_CONFIG.surfaceStrikeRadius : HARVEST_CONFIG.harvestRadius;
}

export function getHarvestInteractionPoint(node, playerPos = null, out = {}) {
  const base = node.state.position;
  const scale = node.state.uniformScale ?? 1;
  const scaledHeight = (node.type.interactionHeight ?? node.type.colliderCenterY ?? 0.5) * scale;
  out.x = base.x; out.y = (base.y ?? 0) + Math.min(scaledHeight, HARVEST_CONFIG.maxStrikeHeight); out.z = base.z;
  const half = node.type.colliderHalfExtents;
  // Large grounded boxes are struck at their reachable lower surface. Small
  // nodes keep their established center reach; non-solid Author props do too.
  if (playerPos && usesSurfaceStrike(node)) {
    const offset = node.type.colliderOffset ?? {y:node.type.colliderCenterY ?? 0};
    const yaw = node.state.rotationY ?? 0, c = Math.cos(yaw), s = Math.sin(yaw);
    const cx = base.x + ((offset.x ?? 0) * c + (offset.z ?? 0) * s) * scale;
    const cz = base.z + (-(offset.x ?? 0) * s + (offset.z ?? 0) * c) * scale;
    const dx = playerPos.x - cx, dz = playerPos.z - cz;
    const x = Math.max(-half.x * scale, Math.min(half.x * scale, dx * c - dz * s));
    const z = Math.max(-half.z * scale, Math.min(half.z * scale, dx * s + dz * c));
    out.x = cx + x * c + z * s; out.z = cz - x * s + z * c;
    const bottom = (base.y ?? 0) + ((offset.y ?? 0) - half.y) * scale;
    out.y = Math.max(bottom, Math.min(bottom + half.y * scale * 2, out.y));
  }
  return out;
}

function getPlayerEffectivePos(playerPos) {
  // playerPos is capsule center ~ y 0.5+; use as is for 3D distance
  return { x: playerPos.x, y: playerPos.y ?? 0.5, z: playerPos.z };
}

export function isNodeReady(node) {
  return node.state.nodeState === "READY" && node.state.remainingChunks > 0;
}

export function isHarvestableInRange(node, playerPos) {
  if (node.state.nodeState !== "READY") return false;
  if (node.state.remainingChunks <= 0) return false;
  const interact = getHarvestInteractionPoint(node, playerPos);
  const pEff = getPlayerEffectivePos(playerPos);
  const d = distance3D(interact, pEff);
  return d <= getHarvestReach(node);
}

export function canAutoHarvestNow(node, playerPos, playerMode, playerSpeed = 0, autoHarvestEnabled = true) {
  if (!isHarvestableInRange(node, playerPos)) return false;
  if (!isHarvestCompatibleMode(playerMode)) return false;
  if (playerSpeed > (HARVEST_CONFIG.harvestMaxHorizontalSpeed ?? 0.25) + 1e-6) return false;
  if (!autoHarvestEnabled) return false;
  return true;
}

export function isEligible(node, playerPos, playerMode, playerSpeed = 0, autoHarvestEnabled = true) {
  return canAutoHarvestNow(node, playerPos, playerMode, playerSpeed, autoHarvestEnabled);
}

export function selectTargets(nodes, playerPos, playerMode, playerSpeed = 0, autoHarvestEnabled = true) {
  if (!autoHarvestEnabled) return [];
  if (!isHarvestCompatibleMode(playerMode)) return [];
  if (playerSpeed > (HARVEST_CONFIG.harvestMaxHorizontalSpeed ?? 0.25) + 1e-6) return [];
  const eligible = [];
  for (const n of nodes) {
    if (n.state.nodeState !== "READY") continue;
    if (n.state.remainingChunks <= 0) continue;
    const interact = getHarvestInteractionPoint(n, playerPos);
    const pEff = getPlayerEffectivePos(playerPos);
    const d = distance3D(interact, pEff);
    if (d <= getHarvestReach(n)) eligible.push({ node: n, dist: d });
  }
  eligible.sort((a, b) => a.dist - b.dist);
  return eligible.slice(0, HARVEST_CONFIG.maxTargetsPerSwing).map(r => r.node);
}

export function selectHarvestableInRange(nodes, playerPos) {
  const res = [];
  for (const n of nodes) if (isHarvestableInRange(n, playerPos)) res.push(n);
  return res;
}

// Same eligibility for halos — now separated: halo = in-range + Auto ON, not speed/mode gated
export function shouldShowHalo(node, playerPos, playerMode, playerSpeed = 0, autoHarvestEnabled = true) {
  if (!autoHarvestEnabled) return false;
  return isHarvestableInRange(node, playerPos);
}

export function isRespawnIndicatorVisible(node, playerPos) {
  const base = node.state.position;
  const nodeY = ((base.y ?? 0) + getHarvestInteractionPoint(node).y) * 0.5;
  const pY = playerPos.y ?? 0.5;
  const dx = base.x - playerPos.x;
  const dy = nodeY - pY;
  const dz = base.z - playerPos.z;
  const d = Math.hypot(dx, dy, dz);
  return d <= (HARVEST_CONFIG.respawnIndicatorRadius ?? 4.0);
}

// Pure hit simulation without visuals/collider: returns { yieldResourceId, depleted, newRemaining }
export function applyHitPure(node) {
  if (node.state.nodeState !== "READY" || node.state.remainingChunks <= 0) return null;
  node.state.remainingChunks -= 1;
  const wasDepleted = node.state.remainingChunks <= 0;
  let depleted = false;
  if (wasDepleted) {
    node.state.nodeState = "RESPAWNING";
    node.state.respawnRemaining = node.type.respawnSeconds;
    depleted = true;
  }
  return { yieldResourceId: node.type.resourceId, depleted, remaining: node.state.remainingChunks };
}

export function tickRespawn(node, dt) {
  if (node.state.nodeState !== "RESPAWNING") return false;
  node.state.respawnRemaining -= dt;
  if (node.state.respawnRemaining <= 0) {
    node.state.nodeState = "READY";
    node.state.remainingChunks = node.type.maxChunks;
    node.state.respawnRemaining = 0;
    return true; // respawned
  }
  return false;
}

// Check if player occupies future collider volume (simple AABB+ capsule approx)
export function isPlayerInsideColliderVolume(playerPos, node) {
  if (!node.type.solid || !node.type.colliderHalfExtents) return false;
  const scale = node.state.uniformScale ?? 1;
  const he = {
    x: node.type.colliderHalfExtents.x * scale,
    y: node.type.colliderHalfExtents.y * scale,
    z: node.type.colliderHalfExtents.z * scale,
  };
  const baseY = node.state.position.y ?? 0;
  const offset = node.type.colliderOffset ?? { x: 0, y: node.type.colliderCenterY ?? 0, z: 0 };
  const angle = node.state.rotationY ?? 0;
  const cy = baseY + (offset.y ?? 0) * scale;
  const cx = node.state.position.x + ((offset.x ?? 0) * Math.cos(angle) + (offset.z ?? 0) * Math.sin(angle)) * scale;
  const cz = node.state.position.z + (-(offset.x ?? 0) * Math.sin(angle) + (offset.z ?? 0) * Math.cos(angle)) * scale;
  // Player capsule center
  const px = playerPos.x;
  const py = playerPos.y ?? 0.5;
  const pz = playerPos.z;
  // Approx capsule AABB expansion: radius 0.32 halfHeight 0.20
  const pr = 0.32;
  const ph = 0.20;
  // Check overlap: distance from player center to cuboid center <= halfExtents + radius (xz) and y within half+radius+halfHeight?
  // For y, capsule extends pr+ph above/below center: total half = pr+ph? Actually capsule halfHeight 0.20 + radius 0.32 = 0.52 total half.
  const totalHalfY = ph + pr; // 0.52
  const yaw = node.state.rotationY ?? 0;
  const worldDx = px - cx;
  const worldDz = pz - cz;
  const dx = Math.abs(worldDx * Math.cos(yaw) - worldDz * Math.sin(yaw));
  const dz = Math.abs(worldDx * Math.sin(yaw) + worldDz * Math.cos(yaw));
  const dy = Math.abs(py - cy);
  if (dx > he.x + pr + 0.04) return false;
  if (dz > he.z + pr + 0.04) return false;
  if (dy > he.y + totalHalfY + 0.04) return false;
  return true;
}

// Pickup / inventory pure
export function createInventory() {
  return { wood: 0, stone: 0, fiber: 0 };
}
export function collectPickupPure(inventory, resourceId, alreadyCollectedFlag) {
  if (alreadyCollectedFlag.collected) return false;
  alreadyCollectedFlag.collected = true;
  if (inventory[resourceId] !== undefined) inventory[resourceId] += 1;
  return true;
}

// Swing cadence pure helper: tracks progress and determines impact events
export function createSwingState() {
  return { progress: 0, isSwinging: false, impactFired: false, cooldown: 0 };
}
export function tickSwing(state, dt, hasTargets, compatible, impactThreshold = HARVEST_CONFIG.impactNormalizedTime, swingInterval = HARVEST_CONFIG.swingInterval) {
  if (!compatible) {
    state.isSwinging = false;
    state.progress = 0;
    state.impactFired = false;
    state.cooldown = 0;
    return { impact: false };
  }
  if (!state.isSwinging) {
    if (hasTargets && state.cooldown <= 0) {
      state.isSwinging = true;
      state.progress = 0;
      state.impactFired = false;
    } else {
      if (state.cooldown > 0) state.cooldown -= dt;
      return { impact: false };
    }
  }
  state.progress += dt / swingInterval;
  let impact = false;
  if (!state.impactFired && state.progress >= impactThreshold) {
    state.impactFired = true;
    impact = true;
  }
  if (state.progress >= 1) {
    state.isSwinging = false;
    state.progress = 0;
    state.impactFired = false;
    state.cooldown = 0;
  }
  return { impact };
}
