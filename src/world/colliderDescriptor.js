// src/world/colliderDescriptor.js — simple collider descriptor seam (Phase 4A.2.2)
// Keeps visual complexity separate from collision. Same transform interpretation for:
// Author transform → visual root → Edit proxy → runtime Rapier collider
// Do not turn detailed visuals into mesh colliders.

import { RESOURCE_TYPES } from "../resources/resourceConfig.js";

export function describeBoxCollider({ size, position, rotationY = 0, enabled = true, visibleWhenHidden = true } = {}) {
  const w = size.width ?? size.w ?? 1;
  const h = size.height ?? size.h ?? 1;
  const d = size.depth ?? size.d ?? 1;
  return {
    shape: "box",
    size: { width: w, height: h, depth: d },
    // offset from base (author position y is base). Center = base + height/2
    offset: { x: 0, y: h / 2, z: 0 },
    position: { ...position },
    rotationY,
    enabled: !!enabled,
    editProxy: { visibleWhenHidden: !!visibleWhenHidden },
  };
}

// For axis-aligned box at base position, derive center for Rapier
export function getColliderCenter(descriptor) {
  const offsetX = descriptor.offset?.x ?? 0;
  const offsetZ = descriptor.offset?.z ?? 0;
  const rotationY = descriptor.rotationY ?? 0;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  return {
    x: descriptor.position.x + offsetX * cos + offsetZ * sin,
    y: descriptor.position.y + (descriptor.offset?.y ?? 0),
    z: descriptor.position.z - offsetX * sin + offsetZ * cos,
  };
}
export function getColliderHalfExtents(descriptor) {
  return {
    x: descriptor.size.width / 2,
    y: descriptor.size.height / 2,
    z: descriptor.size.depth / 2,
  };
}

// Resource collider: simple box scaled uniformly, independent of detailed foliage
export function describeResourceCollider({ typeId, uniformScale = 1, position, rotationY = 0, enabled = true } = {}) {
  const cfg = RESOURCE_TYPES[typeId];
  if (!cfg) {
    // fallback generic small box
    return describeBoxCollider({ size: { width: 0.8 * uniformScale, height: 1.0 * uniformScale, depth: 0.8 * uniformScale }, position, rotationY, enabled });
  }
  if (!cfg.solid || !cfg.colliderHalfExtents) {
    return { shape: "none", enabled: false, editProxy: { visibleWhenHidden: false } };
  }
  const he = cfg.colliderHalfExtents;
  const size = { width: he.x * 2 * uniformScale, height: he.y * 2 * uniformScale, depth: he.z * 2 * uniformScale };
  const centerY = cfg.colliderCenterY * uniformScale;
  // For resource, position y is base (ground). Collider offset is centerY
  return {
    shape: "box",
    size,
    offset: { x: 0, y: centerY, z: 0 },
    position: { ...position },
    rotationY,
    enabled: !!enabled,
    interactionHeight: (cfg.interactionHeight ?? 0.5) * uniformScale,
    editProxy: { visibleWhenHidden: false },
  };
}

export function describeVisualAssetCollider({ collision, uniformScale = 1, position, rotationY = 0, enabled = true } = {}) {
  if (!collision || collision.shape !== "box" || !enabled) {
    return { shape: "none", enabled: false, editProxy: { visibleWhenHidden: false } };
  }
  return {
    shape: "box",
    size: {
      width: collision.size.w * uniformScale,
      height: collision.size.h * uniformScale,
      depth: collision.size.d * uniformScale,
    },
    offset: {
      x: collision.offset.x * uniformScale,
      y: collision.offset.y * uniformScale,
      z: collision.offset.z * uniformScale,
    },
    position: { ...position },
    rotationY,
    enabled: true,
    editProxy: { visibleWhenHidden: true },
  };
}

export function describeCreatureCollider({ uniformScale = 1, position, rotationY = 0, enabled = true } = {}) {
  // Creatures use capsule in runtime, but for Author parity we describe as box approximation
  // Editor collider is not needed to be precise; keep simple box.
  // For descriptor consistency we treat as box with approximate dimensions.
  // Size approx 0.64 diameter, height 0.84
  return {
    shape: "capsule",
    size: { radius: 0.32 * uniformScale, halfHeight: 0.20 * uniformScale },
    offset: { x: 0, y: (0.20 + 0.32) * uniformScale, z: 0 },
    position: { ...position },
    rotationY,
    enabled: !!enabled,
    editProxy: { visibleWhenHidden: false },
  };
}

export function describeWaypointCollider({ position } = {}) {
  // Anchors are interaction volumes, not solid colliders
  return { shape: "cylinder", size: { radius: 0.8, height: 1.6 }, position, enabled: false, editProxy: { visibleWhenHidden: false } };
}

// Helper to compare descriptor transform vs visual root transform for parity test
export function colliderMatchesVisual(colliderDesc, visualRootPos, visualRootRotY, epsilon = 0.01) {
  if (!colliderDesc || !visualRootPos) return false;
  const samePos = Math.abs(colliderDesc.position.x - visualRootPos.x) < epsilon &&
                  Math.abs(colliderDesc.position.y - visualRootPos.y) < epsilon &&
                  Math.abs(colliderDesc.position.z - visualRootPos.z) < epsilon;
  const sameRot = Math.abs((colliderDesc.rotationY ?? 0) - (visualRootRotY ?? 0)) < epsilon;
  return samePos && sameRot;
}
