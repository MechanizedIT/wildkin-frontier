// src/resources/harvestLogic.js — pure helpers for harvesting (testable without THREE/Rapier)
import { HARVEST_CONFIG, isHarvestCompatibleMode } from "./resourceConfig.js";

export function distanceXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function isNodeReady(node) {
  return node.state.nodeState === "READY" && node.state.remainingChunks > 0;
}

export function isEligible(node, playerPos, playerMode) {
  if (!isHarvestCompatibleMode(playerMode)) return false;
  if (node.state.nodeState !== "READY") return false;
  if (node.state.remainingChunks <= 0) return false;
  const d = distanceXZ(node.state.position, playerPos);
  return d <= HARVEST_CONFIG.harvestRadius;
}

export function selectTargets(nodes, playerPos, playerMode) {
  if (!isHarvestCompatibleMode(playerMode)) return [];
  const eligible = [];
  for (const n of nodes) {
    if (n.state.nodeState !== "READY") continue;
    if (n.state.remainingChunks <= 0) continue;
    const d = distanceXZ(n.state.position, playerPos);
    if (d <= HARVEST_CONFIG.harvestRadius) eligible.push({ node: n, dist: d });
  }
  eligible.sort((a, b) => a.dist - b.dist);
  return eligible.slice(0, HARVEST_CONFIG.maxTargetsPerSwing).map(r => r.node);
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
