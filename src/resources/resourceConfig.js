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
    // Pre-Phase-3 low trunk ~0.52 tall, thick/wide, low broad canopy
    colliderHalfExtents: { x: 0.58, y: 0.26, z: 0.58 },
    colliderCenterY: 0.26,
    // remnant collider removed in 2.1 — depleted nodes are non-solid
    remnantColliderHalfExtents: null,
    remnantCenterY: 0,
    interactionHeight: 0.58,
    dropOriginHeight: 0.62,
    impactEffectHeight: 0.48,
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

export function createVisualAssetResourceType(asset, remnantVisualAsset = null) {
  const settings = asset?.gameplay?.harvestable;
  if (!asset || asset.gameplay?.role !== "harvestable" || !settings) return null;
  const collision = asset.collision;
  const top = collision
    ? collision.offset.y + collision.size.h * 0.5
    : 0.65;
  return {
    id: `asset:${asset.id}`,
    displayName: asset.displayName,
    resourceId: settings.dropId,
    maxChunks: settings.maxChunks,
    respawnSeconds: settings.respawnSeconds,
    solid: !!collision,
    colliderShape: collision ? "cuboid" : null,
    colliderHalfExtents: collision ? { x: collision.size.w * 0.5, y: collision.size.h * 0.5, z: collision.size.d * 0.5 } : null,
    colliderCenterY: collision?.offset.y ?? 0,
    colliderOffset: collision?.offset ?? { x: 0, y: 0, z: 0 },
    assetCollision: collision ?? null,
    remnantColliderHalfExtents: null,
    remnantCenterY: 0,
    interactionHeight: Math.max(0.25, top * 0.72),
    dropOriginHeight: Math.max(0.3, top * 0.82),
    impactEffectHeight: Math.max(0.2, top * 0.62),
    feedbackProfile: settings.feedbackProfile,
    color: 0xffffff,
    visualAsset: asset,
    remnantVisualAsset,
  };
}

// Compatible player modes for auto-harvest
export const HARVEST_COMPATIBLE_MODES = new Set(["IDLE", "SNEAK", "WALK", "RUN"]);

export function isHarvestCompatibleMode(mode) {
  return HARVEST_COMPATIBLE_MODES.has(mode);
}
