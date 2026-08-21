// src/resources/resourceConfig.js — Phase 2.1 centralized tuning + data-driven resource types
export const HARVEST_CONFIG = {
  harvestRadius: 1.65,
  maxTargetsPerSwing: 4,
  swingInterval: 0.52,
  impactNormalizedTime: 0.52,
  // swing duration equals interval; impact at ~52% through
  pickupMagnetRadius: 2.4,
  pickupMagnetSpeed: 6.5,
  pickupMagnetAccel: 14,
  pickupLaunchSpeed: 1.8,
  pickupLaunchUp: 3.3,
  magnetDelayAfterSpawn: 0.20,
  harvestMaxHorizontalSpeed: 0.25,
  respawnIndicatorRadius: 4.0,
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
    // Phase 2.1 enlarged ~1.7x to read from high camera
    colliderHalfExtents: { x: 0.55, y: 0.88, z: 0.55 },
    colliderCenterY: 0.88,
    // remnant collider removed in 2.1 — depleted nodes are non-solid
    remnantColliderHalfExtents: null,
    remnantCenterY: 0,
    interactionHeight: 0.95,
    dropOriginHeight: 1.05,
    impactEffectHeight: 0.75,
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
    colliderHalfExtents: { x: 0.72, y: 0.64, z: 0.72 },
    colliderCenterY: 0.64,
    remnantColliderHalfExtents: null,
    remnantCenterY: 0,
    interactionHeight: 0.55,
    dropOriginHeight: 0.70,
    impactEffectHeight: 0.45,
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
    interactionHeight: 0.35,
    dropOriginHeight: 0.40,
    impactEffectHeight: 0.30,
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
