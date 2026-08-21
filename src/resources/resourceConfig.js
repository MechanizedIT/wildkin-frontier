// src/resources/resourceConfig.js — Phase 2 centralized tuning + data-driven resource types
export const HARVEST_CONFIG = {
  harvestRadius: 1.65,
  maxTargetsPerSwing: 4,
  swingInterval: 0.52,
  impactNormalizedTime: 0.52,
  // swing duration equals interval; impact at ~52% through
  pickupMagnetRadius: 2.4,
  pickupMagnetSpeed: 6.5,
  pickupMagnetAccel: 14,
  pickupLaunchSpeed: 3.2,
  pickupLaunchUp: 2.6,
  magnetDelayAfterSpawn: 0.20,
  // halo
  haloPulseSpeed: 1.0,
  haloOpacityMin: 0.22,
  haloOpacityMax: 0.55,
  haloScaleMin: 0.96,
  haloScaleMax: 1.06,
  haloPulseDuration: 1.45,
  // particle
  particleCount: 6,
  particleLifetime: 0.42,
};

export const RESOURCE_TYPES = {
  tree: {
    id: "tree",
    displayName: "Tree",
    resourceId: "wood",
    maxChunks: 5,
    respawnSeconds: 18,
    solid: true,
    colliderShape: "cuboid",
    colliderHalfExtents: { x: 0.34, y: 0.55, z: 0.34 },
    colliderCenterY: 0.55,
    remnantColliderHalfExtents: { x: 0.28, y: 0.22, z: 0.28 },
    remnantCenterY: 0.22,
    feedbackProfile: "wood",
    color: 0x2f7d32,
  },
  rock: {
    id: "rock",
    displayName: "Rock Outcrop",
    resourceId: "stone",
    maxChunks: 4,
    respawnSeconds: 17,
    solid: true,
    colliderShape: "cuboid",
    colliderHalfExtents: { x: 0.44, y: 0.40, z: 0.44 },
    colliderCenterY: 0.40,
    remnantColliderHalfExtents: { x: 0.34, y: 0.16, z: 0.34 },
    remnantCenterY: 0.16,
    feedbackProfile: "stone",
    color: 0x8d8d8d,
  },
  fiber: {
    id: "fiber",
    displayName: "Fiber Bush",
    resourceId: "fiber",
    maxChunks: 3,
    respawnSeconds: 12,
    solid: false,
    colliderShape: null,
    colliderHalfExtents: null,
    colliderCenterY: 0,
    remnantColliderHalfExtents: null,
    remnantCenterY: 0,
    feedbackProfile: "fiber",
    color: 0x6abf69,
  },
};

export const RESOURCE_RESPAWN_CONFIG = {
  tree: 18,
  rock: 17,
  fiber: 12,
};

export function getResourceType(id) {
  return RESOURCE_TYPES[id] ?? null;
}

// Compatible player modes for auto-harvest
export const HARVEST_COMPATIBLE_MODES = new Set(["IDLE", "SNEAK", "WALK", "RUN"]);

export function isHarvestCompatibleMode(mode) {
  return HARVEST_COMPATIBLE_MODES.has(mode);
}
