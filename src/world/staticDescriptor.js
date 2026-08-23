// src/world/staticDescriptor.js — canonical static descriptor + capability matrix (Phase 4A.2)
// Single interpretation for Edit preview, runtime visuals, and Rapier.
// Base convention: pos.y is base/bottom elevation for rectangular solids/surfaces; center = base + height/2.

export const STATIC_CAPABILITIES = {
  // props
  box: { collision: true, visibleInPlay: true, opacity: true, tint: true, rotation: true, elevation: true, dimensions: true },
  fence: { collision: true, visibleInPlay: true, opacity: true, tint: true, rotation: true, elevation: true, dimensions: true },
  forestBoundary: { collision: true, visibleInPlay: true, opacity: true, tint: true, rotation: true, elevation: true, dimensions: true },
  gate: { collision: true, visibleInPlay: true, opacity: true, tint: true, rotation: true, elevation: true, dimensions: true },
  dropPod: { collision: true, visibleInPlay: true, opacity: true, tint: true, rotation: true, elevation: true, dimensions: true },
  resonator: { collision: true, visibleInPlay: true, opacity: true, tint: true, rotation: true, elevation: true, dimensions: true },
  water: { collision: false, visibleInPlay: true, opacity: true, tint: true, rotation: true, elevation: true, dimensions: true },
  island: { collision: true, visibleInPlay: true, opacity: true, tint: true, rotation: true, elevation: true, dimensions: true },
  // ground
  groundPatch: { collision: true, visibleInPlay: true, opacity: true, tint: true, rotation: true, elevation: true, dimensions: true },
  boundaryCollider: { collision: true, visibleInPlay: true, opacity: true, tint: true, rotation: true, elevation: true, dimensions: true },
};

export function getCapabilitiesForObject(obj, collection) {
  if (collection === "groundPatches") return STATIC_CAPABILITIES.groundPatch;
  if (collection === "boundaryColliders") return STATIC_CAPABILITIES.boundaryCollider;
  if (collection === "props") {
    const subtype = obj.subtype;
    return STATIC_CAPABILITIES[subtype] ?? STATIC_CAPABILITIES.box;
  }
  return null;
}

export function capsSupports(caps, key) {
  return !!caps?.[key];
}

function isFiniteNumber(v) { return typeof v === "number" && Number.isFinite(v); }

export function normalizeStaticDescriptor(obj, collection) {
  // Validates and normalizes to canonical descriptor
  // Throws if invalid; caller should catch for transaction validation
  if (!obj || typeof obj !== "object") throw new Error("static descriptor missing object");
  if (!obj.id || typeof obj.id !== "string") throw new Error("static id required");
  if (!obj.pos || typeof obj.pos !== "object") throw new Error(`${obj.id} pos missing`);
  if (!isFiniteNumber(obj.pos.x) || !isFiniteNumber(obj.pos.z)) throw new Error(`${obj.id} pos x/z finite required`);
  if (obj.pos.y !== undefined && !isFiniteNumber(obj.pos.y)) throw new Error(`${obj.id} pos y finite required`);
  const baseY = obj.pos.y ?? 0;
  const rotY = obj.rotY ?? 0;
  if (!isFiniteNumber(rotY)) throw new Error(`${obj.id} rotY finite required`);
  if (!obj.size || typeof obj.size !== "object") throw new Error(`${obj.id} size required`);
  const w = obj.size.w, h = obj.size.h, d = obj.size.d;
  if (!isFiniteNumber(w) || !isFiniteNumber(h) || !isFiniteNumber(d)) throw new Error(`${obj.id} size w/h/d finite required`);
  if (w <= 0 || h <= 0 || d <= 0) throw new Error(`${obj.id} size must be positive`);
  // caps check: if object claims supports but we still validate generically
  return {
    id: obj.id,
    family: collection,
    subtype: obj.subtype ?? collection,
    position: { x: obj.pos.x, y: baseY, z: obj.pos.z },
    baseY,
    rotationY: rotY,
    size: { width: w, height: h, depth: d },
    visibleInPlay: obj.visibleInPlay !== undefined ? !!obj.visibleInPlay : true,
    collisionEnabled: obj.collisionEnabled !== undefined ? !!obj.collisionEnabled : true,
    opacity: obj.opacity !== undefined ? obj.opacity : 1,
    color: obj.color ?? obj.tint ?? null,
    tint: obj.color ?? obj.tint ?? null,
    regionId: obj.regionId ?? null,
  };
}

export function getVisualCenter(descriptor) {
  // center = base + height/2
  return {
    x: descriptor.position.x,
    y: descriptor.baseY + descriptor.size.height / 2,
    z: descriptor.position.z,
  };
}

export function getRapierDescriptor(descriptor) {
  const center = getVisualCenter(descriptor);
  return {
    hx: descriptor.size.width / 2,
    hy: descriptor.size.height / 2,
    hz: descriptor.size.depth / 2,
    tx: center.x,
    ty: center.y,
    tz: center.z,
    rotY: descriptor.rotationY,
  };
}

export function parseTintColor(v, fallback) {
  if (v === undefined || v === null) return fallback;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    let s = v.trim();
    if (s.startsWith("0x")) s = "#" + s.slice(2);
    if (!s.startsWith("#")) s = "#" + s;
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return parseInt(s.slice(1), 16);
  }
  return fallback;
}
