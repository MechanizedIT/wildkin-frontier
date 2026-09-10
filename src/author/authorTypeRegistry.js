// src/author/authorTypeRegistry.js — central Author Type registry (Phase 4A.2.2)
// Centralizes transform/capability/storage/visual/collider/inspector knowledge.
// Production UI/Mode must not rely on hard-coded family lists for ordinary transform/presentation.

import { describeBoxCollider, describeResourceCollider, describeCreatureCollider, describeVisualAssetCollider } from "../world/colliderDescriptor.js";
import { enumerateRegionAuthorObjects } from "./authorObjectCollections.js";
import { resolveJumpPadVisual, resolveParkourMarkerVisual, resolvePortalGateVisual } from "../world/playerFacingVisuals.js";

// Helpers
function isFiniteNumber(v) { return typeof v === "number" && Number.isFinite(v); }

function clonePos(p) { return { x: p.x, y: p.y ?? 0, z: p.z }; }

// Ladder derived recompute helper
function rotatedAabb(centerX, centerZ, width, depth, rotationY) {
  const cos = Math.abs(Math.cos(rotationY));
  const sin = Math.abs(Math.sin(rotationY));
  const halfX = cos * width / 2 + sin * depth / 2;
  const halfZ = sin * width / 2 + cos * depth / 2;
  return { minX: centerX - halfX, maxX: centerX + halfX, minZ: centerZ - halfZ, maxZ: centerZ + halfZ };
}

function inferLocalDepth(aabb, width, rotationY, fallback) {
  if (!aabb) return fallback;
  const worldWidth = aabb.maxX - aabb.minX;
  const worldDepth = aabb.maxZ - aabb.minZ;
  const cos = Math.abs(Math.cos(rotationY));
  const sin = Math.abs(Math.sin(rotationY));
  const candidates = [];
  if (sin > 1e-6) candidates.push((worldWidth - cos * width) / sin);
  if (cos > 1e-6) candidates.push((worldDepth - sin * width) / cos);
  const valid = candidates.filter((value) => Number.isFinite(value) && value > 0.05);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : fallback;
}

function recomputeLadderDerived(ladder, oldLadder, deltaRot) {
  const rotY = ladder.rotY ?? 0;
  ladder.wallNormal = { x: Math.sin(rotY), z: Math.cos(rotY) };
  ladder.approachDir = { x: -ladder.wallNormal.x, z: -ladder.wallNormal.z };
  if (!oldLadder) return;

  function rotateOffset(ox, oz) {
    const cos = Math.cos(deltaRot);
    const sin = Math.sin(deltaRot);
    return { x: ox * cos + oz * sin, z: -ox * sin + oz * cos };
  }

  if (ladder.topPlatform && oldLadder.topPlatform) {
    const offset = rotateOffset(
      oldLadder.topPlatform.x - oldLadder.x,
      oldLadder.topPlatform.z - oldLadder.z,
    );
    ladder.topPlatform.x = ladder.x + offset.x;
    ladder.topPlatform.z = ladder.z + offset.z;
    ladder.topPlatform.topY = ladder.topY;
    ladder.topPlatform.aabb = rotatedAabb(
      ladder.topPlatform.x,
      ladder.topPlatform.z,
      ladder.topPlatform.w,
      ladder.topPlatform.h,
      rotY,
    );
  }

  if (ladder.mantleExit && oldLadder.mantleExit) {
    const offset = rotateOffset(
      oldLadder.mantleExit.x - oldLadder.x,
      oldLadder.mantleExit.z - oldLadder.z,
    );
    ladder.mantleExit.x = ladder.x + offset.x;
    ladder.mantleExit.z = ladder.z + offset.z;
    ladder.mantleExit.y = ladder.topY;
  }

  if (ladder.topEntryRegion && oldLadder.topEntryRegion) {
    const oldCenterX = (oldLadder.topEntryRegion.minX + oldLadder.topEntryRegion.maxX) / 2;
    const oldCenterZ = (oldLadder.topEntryRegion.minZ + oldLadder.topEntryRegion.maxZ) / 2;
    const offset = rotateOffset(oldCenterX - oldLadder.x, oldCenterZ - oldLadder.z);
    const centerX = ladder.x + offset.x;
    const centerZ = ladder.z + offset.z;
    const depth = inferLocalDepth(
      oldLadder.topEntryRegion,
      oldLadder.w,
      oldLadder.rotY ?? 0,
      Math.max(oldLadder.h ?? 0.5, 0.75),
    );
    const aabb = rotatedAabb(centerX, centerZ, ladder.w, depth, rotY);
    ladder.topEntryRegion = { ...ladder.topEntryRegion, ...aabb };
  }
}

// Normalized transform shape:
// { position:{x,y,z}, rotationY, size:{width,height,depth}, uniformScale }

function makePropDefinition(subtype, extra = {}) {
  const key = `prop:${subtype}`;
  return {
    key,
    visualId: `prop/${subtype}`,
    sizeMode: "box",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: true, collisionControl: true,
      sizeMode: "box",
    },
    ownership: { mode: "point" },
    ...extra,
    matches(found) {
      return found.collection === "props" && found.obj.subtype === subtype;
    },
    transform: {
      read(found) {
        const obj = found.obj;
        return {
          position: { x: obj.pos.x, y: obj.pos.y ?? 0, z: obj.pos.z },
          rotationY: obj.rotY ?? 0,
          size: { width: obj.size.w, height: obj.size.h, depth: obj.size.d },
          uniformScale: 1,
          sizeMode: "box",
        };
      },
      write(candidateObj, found, normalized) {
        // candidateObj is the raw object reference inside candidate draft (same as found.obj but mutated via candidate)
        // found.obj is reference; we mutate it directly (candidate's draft object)
        const pos = normalized.position;
        const rot = normalized.rotationY;
        const size = normalized.size;
        if (pos) {
          candidateObj.pos.x = pos.x;
          candidateObj.pos.y = pos.y ?? candidateObj.pos.y ?? 0;
          candidateObj.pos.z = pos.z;
        }
        if (isFiniteNumber(rot)) candidateObj.rotY = rot;
        if (size) {
          if (isFiniteNumber(size.width)) candidateObj.size.w = size.width;
          if (isFiniteNumber(size.height)) candidateObj.size.h = size.height;
          if (isFiniteNumber(size.depth)) candidateObj.size.d = size.depth;
        }
        // ensure no shadow fields
        if ("x" in candidateObj && candidateObj !== candidateObj) {}
        delete candidateObj.x; delete candidateObj.z; delete candidateObj.y; delete candidateObj.baseY; delete candidateObj.w; delete candidateObj.h; delete candidateObj.height;
      },
    },
    visual: {
      resolveRef(found) {
        return { kind: "builtin", id: `prop/${subtype}` };
      },
    },
    collision: {
      describe(found) {
        const t = found.obj;
        // water has no collision
        const enabled = subtype === "water" ? false : (t.collisionEnabled !== false);
        return describeBoxCollider({
          size: { width: t.size.w, height: t.size.h, depth: t.size.d },
          position: { x: t.pos.x, y: t.pos.y ?? 0, z: t.pos.z },
          rotationY: t.rotY ?? 0,
          enabled,
        });
      },
    },
    inspector: [
      // presentation handled generically via capabilities, but custom fields none for props except displayName maybe
    ],
  };
}

function makeVisualAssetInstanceDefinition() {
  return {
    key: "prop:visualAsset",
    visualId: "asset",
    sizeMode: "uniform",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: true, collisionControl: true,
      sizeMode: "uniform",
    },
    ownership: { mode: "point" },
    matches(found) {
      return found.collection === "props" && found.obj.subtype === "visualAsset";
    },
    transform: {
      read(found) {
        const obj = found.obj;
        return {
          position: clonePos(obj.pos),
          rotationY: obj.rotY ?? 0,
          size: null,
          uniformScale: isFiniteNumber(obj.uniformScale) ? obj.uniformScale : 1,
          sizeMode: "uniform",
        };
      },
      write(candidateObj, found, normalized) {
        if (normalized.position) candidateObj.pos = clonePos(normalized.position);
        if (isFiniteNumber(normalized.rotationY)) candidateObj.rotY = normalized.rotationY;
        if (isFiniteNumber(normalized.uniformScale)) candidateObj.uniformScale = Math.max(0.2, Math.min(5, normalized.uniformScale));
        delete candidateObj.size;
        delete candidateObj.scale;
        delete candidateObj.x; delete candidateObj.y; delete candidateObj.z;
      },
    },
    visual: {
      resolveRef(found) {
        return { kind: "asset", id: found.obj.visualAssetId };
      },
    },
    collision: {
      describe(found) {
        const asset = (found.visualAssets ?? []).find((entry) => entry.id === found.obj.visualAssetId);
        if (asset?.gameplay?.role === "wildkin") {
          return describeCreatureCollider({
            uniformScale: found.obj.uniformScale ?? 1,
            position: found.obj.pos,
            rotationY: found.obj.rotY ?? 0,
            enabled: found.obj.collisionEnabled !== false,
          });
        }
        return describeVisualAssetCollider({
          collision: asset?.collision ?? null,
          uniformScale: found.obj.uniformScale ?? 1,
          position: found.obj.pos,
          rotationY: found.obj.rotY ?? 0,
          enabled: found.obj.collisionEnabled !== false,
        });
      },
    },
    inspector: [],
  };
}

function makeGroundDefinition() {
  return {
    key: "groundPatch",
    visualId: "groundPatch",
    sizeMode: "box",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: true, collisionControl: true,
      sizeMode: "box",
    },
    ownership: { mode: "footprint" },
    matches(found) { return found.collection === "groundPatches"; },
    transform: {
      read(found) {
        const o = found.obj;
        return {
          position: { x: o.pos.x, y: o.pos.y ?? -0.25, z: o.pos.z },
          rotationY: o.rotY ?? 0,
          size: { width: o.size.w, height: o.size.h, depth: o.size.d },
          uniformScale: 1,
          sizeMode: "box",
        };
      },
      write(candidateObj, found, normalized) {
        const pos = normalized.position;
        if (pos) { candidateObj.pos.x = pos.x; candidateObj.pos.y = pos.y; candidateObj.pos.z = pos.z; }
        if (isFiniteNumber(normalized.rotationY)) candidateObj.rotY = normalized.rotationY;
        const s = normalized.size;
        if (s) {
          if (isFiniteNumber(s.width)) candidateObj.size.w = s.width;
          if (isFiniteNumber(s.height)) candidateObj.size.h = s.height;
          if (isFiniteNumber(s.depth)) candidateObj.size.d = s.depth;
        }
      },
    },
    visual: { resolveRef() { return { kind: "builtin", id: "groundPatch" }; } },
    collision: {
      describe(found) {
        const o = found.obj;
        return describeBoxCollider({
          size: { width: o.size.w, height: o.size.h, depth: o.size.d },
          position: { x: o.pos.x, y: o.pos.y ?? -0.25, z: o.pos.z },
          rotationY: o.rotY ?? 0,
          enabled: o.collisionEnabled !== false,
        });
      },
    },
    inspector: [],
  };
}
function makeBoundaryDefinition() {
  return {
    key: "boundaryCollider",
    visualId: "boundaryCollider",
    sizeMode: "box",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: true, collisionControl: true,
      sizeMode: "box",
    },
    ownership: { mode: "footprint" },
    matches(found) { return found.collection === "boundaryColliders"; },
    transform: {
      read(found) {
        const o = found.obj;
        return {
          position: { x: o.pos.x, y: o.pos.y ?? 0, z: o.pos.z },
          rotationY: o.rotY ?? 0,
          size: { width: o.size.w, height: o.size.h, depth: o.size.d },
          uniformScale: 1,
          sizeMode: "box",
        };
      },
      write(candidateObj, found, normalized) {
        const pos = normalized.position;
        if (pos) { candidateObj.pos.x = pos.x; candidateObj.pos.y = pos.y; candidateObj.pos.z = pos.z; }
        if (isFiniteNumber(normalized.rotationY)) candidateObj.rotY = normalized.rotationY;
        const s = normalized.size;
        if (s) {
          if (isFiniteNumber(s.width)) candidateObj.size.w = s.width;
          if (isFiniteNumber(s.height)) candidateObj.size.h = s.height;
          if (isFiniteNumber(s.depth)) candidateObj.size.d = s.depth;
        }
      },
    },
    visual: { resolveRef() { return { kind: "builtin", id: "boundaryCollider" }; } },
    collision: {
      describe(found) {
        const o = found.obj;
        return describeBoxCollider({
          size: { width: o.size.w, height: o.size.h, depth: o.size.d },
          position: { x: o.pos.x, y: o.pos.y ?? 0, z: o.pos.z },
          rotationY: o.rotY ?? 0,
          enabled: o.collisionEnabled !== false,
        });
      },
    },
    inspector: [],
  };
}

function makePlatformDefinition() {
  return {
    key: "platform",
    visualId: "traversal/platform",
    sizeMode: "box",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: false, collisionControl: false,
      sizeMode: "box",
    },
    ownership: { mode: "point" },
    matches(found) { return found.collection === "platforms" || found.type === "platform"; },
    transform: {
      read(found) {
        const o = found.obj;
        const baseY = o.baseY ?? o.y ?? 0;
        return {
          position: { x: o.x, y: baseY, z: o.z },
          rotationY: o.rotY ?? 0,
          size: { width: o.w, height: o.height, depth: o.h },
          uniformScale: 1,
          sizeMode: "box",
        };
      },
      write(candidateObj, found, normalized) {
        const pos = normalized.position;
        const size = normalized.size;
        if (pos) {
          candidateObj.x = pos.x;
          candidateObj.z = pos.z;
          candidateObj.y = pos.y;
          candidateObj.baseY = pos.y;
        }
        if (isFiniteNumber(normalized.rotationY)) candidateObj.rotY = normalized.rotationY;
        if (size) {
          if (isFiniteNumber(size.width)) candidateObj.w = size.width;
          if (isFiniteNumber(size.depth)) candidateObj.h = size.depth;
          if (isFiniteNumber(size.height)) candidateObj.height = size.height;
        }
        // ensure no shadow pos field
        delete candidateObj.pos;
      },
    },
    visual: { resolveRef() { return { kind: "builtin", id: "traversal/platform" }; } },
    collision: {
      describe(found) {
        const o = found.obj;
        const baseY = o.baseY ?? o.y ?? 0;
        return describeBoxCollider({
          size: { width: o.w, height: o.height, depth: o.h },
          position: { x: o.x, y: baseY, z: o.z },
          rotationY: o.rotY ?? 0,
          enabled: true,
        });
      },
    },
    inspector: [],
  };
}
function makeObstacleDefinition() {
  return {
    key: "obstacle",
    visualId: "traversal/obstacle",
    sizeMode: "box",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: false, collisionControl: false,
      sizeMode: "box",
    },
    ownership: { mode: "point" },
    matches(found) { return found.collection === "obstacles" || found.type === "obstacle"; },
    transform: {
      read(found) {
        const o = found.obj;
        const baseY = o.baseY ?? o.y ?? 0;
        return {
          position: { x: o.x, y: baseY, z: o.z },
          rotationY: o.rotY ?? 0,
          size: { width: o.w, height: o.height, depth: o.h },
          uniformScale: 1,
          sizeMode: "box",
        };
      },
      write(candidateObj, found, normalized) {
        const pos = normalized.position;
        if (pos) {
          candidateObj.x = pos.x;
          candidateObj.z = pos.z;
          candidateObj.y = pos.y;
          candidateObj.baseY = pos.y;
        }
        if (isFiniteNumber(normalized.rotationY)) candidateObj.rotY = normalized.rotationY;
        const s = normalized.size;
        if (s) {
          if (isFiniteNumber(s.width)) candidateObj.w = s.width;
          if (isFiniteNumber(s.depth)) candidateObj.h = s.depth;
          if (isFiniteNumber(s.height)) candidateObj.height = s.height;
        }
        delete candidateObj.pos;
      },
    },
    visual: { resolveRef() { return { kind: "builtin", id: "traversal/obstacle" }; } },
    collision: {
      describe(found) {
        const o = found.obj;
        const baseY = o.baseY ?? o.y ?? 0;
        return describeBoxCollider({
          size: { width: o.w, height: o.height, depth: o.h },
          position: { x: o.x, y: baseY, z: o.z },
          rotationY: o.rotY ?? 0,
          enabled: true,
        });
      },
    },
    inspector: [],
  };
}

function makeLadderDefinition() {
  return {
    key: "climbable:ladder",
    visualId: "traversal/ladder",
    sizeMode: "box",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: false, collisionControl: false,
      sizeMode: "box",
    },
    ownership: { mode: "point" },
    matches(found) { return found.collection === "climbables" || found.type === "climbable"; },
    transform: {
      read(found) {
        const o = found.obj;
        const baseY = o.bottomY ?? 0;
        const height = (o.topY ?? 2.4) - baseY;
        return {
          position: { x: o.x, y: baseY, z: o.z },
          rotationY: o.rotY ?? 0,
          size: { width: o.w ?? 1.9, height, depth: o.h ?? 0.5 },
          uniformScale: 1,
          sizeMode: "box",
        };
      },
      write(candidateObj, found, normalized) {
        const old = { ...candidateObj,
          topPlatform: candidateObj.topPlatform ? { ...candidateObj.topPlatform, aabb: candidateObj.topPlatform.aabb ? { ...candidateObj.topPlatform.aabb } : undefined } : null,
          topEntryRegion: candidateObj.topEntryRegion ? { ...candidateObj.topEntryRegion } : null,
          mantleExit: candidateObj.mantleExit ? { ...candidateObj.mantleExit } : null,
          wallNormal: candidateObj.wallNormal ? { ...candidateObj.wallNormal } : null,
          approachDir: candidateObj.approachDir ? { ...candidateObj.approachDir } : null,
        };
        // Save old height for delta calc
        const oldBottomY = candidateObj.bottomY ?? 0;
        const oldTopY = candidateObj.topY ?? 2.4;
        const oldHeight = oldTopY - oldBottomY;
        const oldX = candidateObj.x, oldZ = candidateObj.z, oldRot = candidateObj.rotY ?? 0;

        const pos = normalized.position;
        const size = normalized.size;
        const rot = normalized.rotationY;

        const newBottomY = pos ? pos.y : oldBottomY;
        const newHeight = size && isFiniteNumber(size.height) ? size.height : oldHeight;
        const newTopY = newBottomY + newHeight;
        const newW = size && isFiniteNumber(size.width) ? size.width : candidateObj.w;
        const newD = size && isFiniteNumber(size.depth) ? size.depth : candidateObj.h;
        const newX = pos ? pos.x : oldX;
        const newZ = pos ? pos.z : oldZ;
        const newRot = isFiniteNumber(rot) ? rot : oldRot;

        const delta = { x: newX - oldX, z: newZ - oldZ, y: newBottomY - oldBottomY };
        const deltaRot = newRot - oldRot;

        // Apply primary
        candidateObj.x = newX;
        candidateObj.z = newZ;
        candidateObj.bottomY = newBottomY;
        candidateObj.topY = newTopY;
        candidateObj.w = newW;
        candidateObj.h = newD;
        candidateObj.rotY = newRot;

        // Recompute dependent
        recomputeLadderDerived(candidateObj, old, deltaRot);

        // Ensure no shadow pos
        delete candidateObj.pos;
        delete candidateObj.y;
        delete candidateObj.baseY;
      },
    },
    visual: { resolveRef() { return { kind: "builtin", id: "traversal/ladder" }; } },
    collision: {
      describe(found) {
        const o = found.obj;
        const baseY = o.bottomY ?? 0;
        const height = (o.topY ?? 2.4) - baseY;
        return describeBoxCollider({
          size: { width: o.w ?? 1.9, height, depth: o.h ?? 0.5 },
          position: { x: o.x, y: baseY, z: o.z },
          rotationY: o.rotY ?? 0,
          enabled: true,
        });
      },
    },
    inspector: [],
  };
}

function makeResourceDefinition(typeId) {
  const isUniform = true;
  return {
    key: `resource:${typeId}`,
    visualId: `resource/${typeId}`,
    sizeMode: "uniform",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: false, collisionControl: false,
      sizeMode: "uniform",
    },
    ownership: { mode: "point" },
    matches(found) { return found.collection === "resources" && found.obj.type === typeId; },
    transform: {
      read(found) {
        const o = found.obj;
        return {
          position: { x: o.pos.x, y: o.pos.y ?? 0, z: o.pos.z },
          rotationY: o.rotY ?? o.rotationY ?? 0,
          size: null,
          uniformScale: isFiniteNumber(o.uniformScale) ? o.uniformScale : (isFiniteNumber(o.scale) ? o.scale : 1),
          sizeMode: "uniform",
        };
      },
      write(candidateObj, found, normalized) {
        const pos = normalized.position;
        if (pos) {
          candidateObj.pos.x = pos.x;
          candidateObj.pos.y = pos.y ?? 0;
          candidateObj.pos.z = pos.z;
        }
        if (isFiniteNumber(normalized.rotationY)) {
          candidateObj.rotY = normalized.rotationY;
          delete candidateObj.rotationY;
        }
        if (isFiniteNumber(normalized.uniformScale)) {
          // clamp scale to reasonable range 0.2..3.0 for gameplay
          const s = Math.max(0.2, Math.min(3.0, normalized.uniformScale));
          candidateObj.uniformScale = s;
          delete candidateObj.scale;
        }
        // Ensure no shadow x/z/w etc
        delete candidateObj.x; delete candidateObj.z; delete candidateObj.y; delete candidateObj.baseY; delete candidateObj.w; delete candidateObj.h; delete candidateObj.height;
      },
    },
    visual: { resolveRef() { return { kind: "builtin", id: `resource/${typeId}` }; } },
    collision: {
      describe(found) {
        const o = found.obj;
        const scale = isFiniteNumber(o.uniformScale) ? o.uniformScale : (isFiniteNumber(o.scale) ? o.scale : 1);
        return describeResourceCollider({
          typeId,
          uniformScale: scale,
          position: { x: o.pos.x, y: o.pos.y ?? 0, z: o.pos.z },
          rotationY: o.rotY ?? 0,
          enabled: true,
        });
      },
    },
    inspector: [
      { key: "type", label: "Resource Type", type: "enum", options: ["tree","rock","fiber"], path: "type" },
      { key: "level", label: "Resource Level", type: "number", min: 1, max: 20, step: 1, path: "level" },
    ],
  };
}

function makeCreatureDefinition(species) {
  return {
    key: `creature:${species}`,
    visualId: `creature/${species}`,
    sizeMode: "none",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: false,
      duplicatable: true, deletable: true, presentation: false, collisionControl: false,
      sizeMode: "none",
      // Wildkin supports initial facing via rotationY? Spec says initial facing only, no scale. We'll expose rotation as facing but not resize.
      // So rotation should be supported as facingYaw? The UI should expose rotation for creature as initial facing, but not continuous rotation slider? For parity we allow rotation.
      // Let's set rotation true but keep resize false.
      // Overwrite: make rotation true for facing.
    },
    ownership: { mode: "point" },
    matches(found) {
      // For generic creature, match any creature regardless of subtype; but we have two definitions rusher/spitter need to both match respective subtype.
      // To allow exactly one resolution, we define generic matches any creature, but we will have two entries with subtype check; registry resolve will find first matching.
      // So define per species matching.
      return found.collection === "creatures" && found.obj.type === species;
    },
    transform: {
      read(found) {
        const o = found.obj;
        return {
          position: { x: o.pos.x, y: o.pos.y ?? 0, z: o.pos.z },
          rotationY: o.facingYaw ?? o.rotY ?? 0, // initial facing
          size: null,
          uniformScale: 1,
          sizeMode: "none",
        };
      },
      write(candidateObj, found, normalized) {
        const pos = normalized.position;
        if (pos) {
          const dx = pos.x - candidateObj.pos.x;
          const dz = pos.z - candidateObj.pos.z;
          const dy = (pos.y ?? 0) - (candidateObj.pos.y ?? 0);
          candidateObj.pos.x = pos.x;
          candidateObj.pos.y = pos.y ?? 0;
          candidateObj.pos.z = pos.z;
          // move home together if not explicit home edit? But here we handle generic drag: home follows spawn if not explicitly separate?
          // The draft's apply logic had moveHomeWithSpawn behavior; we replicate: if candidateObj.homePos and not explicitly edited, move home by delta.
          // We can check if homePos exists and if normalized also doesn't have explicit home edit flag; for now always move home with spawn on drag.
          if (candidateObj.homePos && normalized.moveHomeWithSpawn !== false) {
            candidateObj.homePos.x += dx;
            candidateObj.homePos.z += dz;
            candidateObj.homePos.y = (candidateObj.homePos.y ?? 0) + dy;
          }
        }
        if (isFiniteNumber(normalized.rotationY)) {
          candidateObj.facingYaw = normalized.rotationY;
          delete candidateObj.facing;
        }
        delete candidateObj.x; delete candidateObj.z; delete candidateObj.y; delete candidateObj.baseY; delete candidateObj.w; delete candidateObj.h;
      },
    },
    visual: { resolveRef() { return { kind: "builtin", id: `creature/${species}` }; } },
    collision: {
      describe(found) {
        const o = found.obj;
        return describeCreatureCollider({
          position: { x: o.pos.x, y: o.pos.y ?? 0, z: o.pos.z },
          rotationY: o.facingYaw ?? 0,
          enabled: true,
        });
      },
    },
    inspector: [
      { key: "type", label: "Creature Type", type: "enum", options: ["rusher","spitter"], path: "type" },
      { key: "level", label: "Wildkin Level", type: "number", min: 1, max: 20, step: 1, path: "level" },
      { key: "temperament", label: "Temperament", type: "enum", options: ["AGGRESSIVE","TERRITORIAL","DEFENSIVE","SKITTISH"], path: "temperament" },
      { key: "roamRadius", label: "Roam Radius", type: "number", min: 0, max: 20, step: 0.1, path: "roamRadius" },
      { key: "noticeRadius", label: "Notice Radius", type: "number", min: 0, max: 30, step: 0.1, path: "noticeRadius" },
      { key: "personalSpace", label: "Personal Space", type: "number", min: 0, max: 10, step: 0.1, path: "personalSpace" },
      { key: "leashRadius", label: "Leash Radius", type: "number", min: 0, max: 30, step: 0.1, path: "leashRadius" },
      { key: "speciesTag", label: "Species Tag", type: "text", path: "speciesTag" },
      { key: "homePos.x", label: "Home X", type: "number", path: "homePos.x" },
      { key: "homePos.z", label: "Home Z", type: "number", path: "homePos.z" },
      { key: "moveHomeWithSpawn", label: "Move Home With Spawn", type: "boolean", editorOnly: true, defaultValue: true },
    ],
  };
}
function makeGenericCreatureDefinition() {
  // fallback for any creature not matched specifically
  return {
    key: "creature:generic",
    visualId: "creature/rusher",
    sizeMode: "none",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: false,
      duplicatable: true, deletable: true, presentation: false, collisionControl: false,
      sizeMode: "none",
    },
    ownership: { mode: "point" },
    matches(found) { return found.type === "creature"; },
    transform: {
      read(found) {
        const o = found.obj;
        return {
          position: { x: o.pos.x, y: o.pos.y ?? 0, z: o.pos.z },
          rotationY: o.facingYaw ?? o.rotY ?? 0,
          size: null, uniformScale: 1, sizeMode: "none",
        };
      },
      write(candidateObj, found, normalized) {
        const pos = normalized.position;
        if (pos) {
          const dx = pos.x - candidateObj.pos.x;
          const dz = pos.z - candidateObj.pos.z;
          const dy = (pos.y ?? 0) - (candidateObj.pos.y ?? 0);
          candidateObj.pos.x = pos.x; candidateObj.pos.y = pos.y ?? 0; candidateObj.pos.z = pos.z;
           if (candidateObj.homePos && normalized.moveHomeWithSpawn !== false) { candidateObj.homePos.x += dx; candidateObj.homePos.z += dz; candidateObj.homePos.y = (candidateObj.homePos.y ?? 0) + dy; }
        }
        if (isFiniteNumber(normalized.rotationY)) candidateObj.facingYaw = normalized.rotationY;
        delete candidateObj.x; delete candidateObj.z;
      },
    },
    visual: { resolveRef() { return { kind: "builtin", id: "creature/rusher" }; } },
    collision: { describe(found) { const o=found.obj; return describeCreatureCollider({ position:{x:o.pos.x,y:o.pos.y??0,z:o.pos.z}}); }},
    inspector: [
      { key: "level", label: "Wildkin Level", type: "number", min: 1, max: 20, step: 1, path: "level" },
      { key: "temperament", label: "Temperament", type: "enum", options: ["AGGRESSIVE","TERRITORIAL","DEFENSIVE","SKITTISH"], path: "temperament" },
      { key: "roamRadius", label: "Roam Radius", type: "number", path: "roamRadius" },
      { key: "noticeRadius", label: "Notice Radius", type: "number", path: "noticeRadius" },
      { key: "personalSpace", label: "Personal Space", type: "number", path: "personalSpace" },
      { key: "leashRadius", label: "Leash Radius", type: "number", path: "leashRadius" },
    ],
  };
}

function makeWaypointDefinition() {
  return {
    key: "waypoint:major",
    visualId: "anchor/waypoint",
    sizeMode: "uniform",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: false, collisionControl: false,
      sizeMode: "uniform",
    },
    ownership: { mode: "point" },
    matches(found) { return found.collection === "majorWaypoints" || found.type === "majorWaypoint"; },
    transform: {
      read(found) {
        const o = found.obj;
        return {
          position: { x: o.pos.x, y: o.pos.y ?? 0, z: o.pos.z },
          rotationY: o.rotY ?? 0,
          size: null, uniformScale: o.uniformScale ?? 1, sizeMode: "uniform",
        };
      },
      write(candidateObj, found, normalized) {
        const pos = normalized.position;
        if (pos) { candidateObj.pos.x = pos.x; candidateObj.pos.y = pos.y ?? 0; candidateObj.pos.z = pos.z; }
        if (isFiniteNumber(normalized.rotationY)) candidateObj.rotY = normalized.rotationY;
        if (isFiniteNumber(normalized.uniformScale)) candidateObj.uniformScale = Math.max(0.2, Math.min(5, normalized.uniformScale));
        delete candidateObj.x; delete candidateObj.z;
      },
    },
    visual: { resolveRef(found) { return found.obj.visualAssetId ? { kind: "asset", id: found.obj.visualAssetId } : { kind: "builtin", id: "anchor/waypoint" }; } },
    collision: {
      describe(found) { const o=found.obj; return { shape:"none", enabled:false, position:{x:o.pos.x,y:o.pos.y??0,z:o.pos.z}, editProxy:{visibleWhenHidden:false} }; }
    },
    inspector: [
      { key: "displayName", label: "Display Name", type: "text", path: "displayName" },
      { key: "type", label: "Anchor Type", type: "text", path: "type" },
      { key: "visualAssetId", label: "World Model", type: "visualAsset", path: "visualAssetId" },
    ],
  };
}
function makeBeaconDefinition() {
  return {
    key: "beacon:extraction",
    visualId: "anchor/beacon",
    sizeMode: "uniform",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: false, collisionControl: false,
      sizeMode: "uniform",
    },
    ownership: { mode: "point" },
    matches(found) { return found.collection === "extractionBeacons" || found.type === "extractionBeacon"; },
    transform: {
      read(found) { const o=found.obj; return { position:{x:o.pos.x,y:o.pos.y??0,z:o.pos.z}, rotationY:o.rotY??0, size:null, uniformScale:o.uniformScale??1, sizeMode:"uniform" }; },
      write(candidateObj, found, normalized) {
        if (normalized.position) { candidateObj.pos.x = normalized.position.x; candidateObj.pos.y = normalized.position.y ?? 0; candidateObj.pos.z = normalized.position.z; }
        if (isFiniteNumber(normalized.rotationY)) candidateObj.rotY = normalized.rotationY;
        if (isFiniteNumber(normalized.uniformScale)) candidateObj.uniformScale = Math.max(0.2, Math.min(5, normalized.uniformScale));
        delete candidateObj.x; delete candidateObj.z;
      },
    },
    visual: { resolveRef(found) { return found.obj.visualAssetId ? { kind: "asset", id: found.obj.visualAssetId } : { kind: "builtin", id: "anchor/beacon" }; } },
    collision: { describe(found){ const o=found.obj; return { shape:"none", enabled:false, position:{x:o.pos.x,y:o.pos.y??0,z:o.pos.z}, editProxy:{visibleWhenHidden:false} }; }},
    inspector: [
      { key: "displayName", label: "Display Name", type: "text", path: "displayName" },
      { key: "visualAssetId", label: "World Model", type: "visualAsset", path: "visualAssetId" },
    ],
  };
}

function makePoiDefinition(subtype) {
  const key = `poi:${subtype}`;
  const visualId = subtype === "barrier" ? "poi/barrier" : "poi/chest";
  // POIs support uniform scale where safe
  const sizeMode = "uniform";
  return {
    key,
    visualId,
    sizeMode,
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: false, collisionControl: false,
      sizeMode,
    },
    ownership: { mode: "point" },
    matches(found) { return found.collection === "pois" && found.obj.type === subtype; },
    transform: {
      read(found) {
        const o = found.obj;
        return {
          position: { x: o.pos.x, y: o.pos.y ?? 0, z: o.pos.z },
          rotationY: o.rotY ?? 0,
          size: null,
          uniformScale: isFiniteNumber(o.uniformScale) ? o.uniformScale : (isFiniteNumber(o.scale) ? o.scale : 1),
          sizeMode,
        };
      },
      write(candidateObj, found, normalized) {
        if (normalized.position) { candidateObj.pos.x = normalized.position.x; candidateObj.pos.y = normalized.position.y ?? 0; candidateObj.pos.z = normalized.position.z; }
        if (isFiniteNumber(normalized.rotationY)) candidateObj.rotY = normalized.rotationY;
        if (isFiniteNumber(normalized.uniformScale)) {
          const s = Math.max(0.3, Math.min(3.0, normalized.uniformScale));
          candidateObj.uniformScale = s; delete candidateObj.scale;
        }
        delete candidateObj.x; delete candidateObj.z;
      },
    },
    visual: { resolveRef() { return { kind: "builtin", id: visualId }; } },
    collision: {
      describe(found) {
        const o = found.obj;
        const scale = isFiniteNumber(o.uniformScale) ? o.uniformScale : (isFiniteNumber(o.scale) ? o.scale : 1);
        // simple box 0.7 scaled
        return describeBoxCollider({
          size: { width: 0.7 * scale, height: 0.6 * scale, depth: 0.7 * scale },
          position: { x: o.pos.x, y: o.pos.y ?? 0, z: o.pos.z },
          rotationY: o.rotY ?? 0,
          enabled: true,
        });
      },
    },
    inspector: [
      { key: "type", label: "POI Type", type: "text", path: "type" },
      { key: "requires", label: "Requires (JSON)", type: "json", path: "requires" },
      { key: "displayName", label: "Display Name", type: "text", path: "displayName" },
    ],
  };
}
function makeGenericPoiDefinition() {
  return {
    key: "poi:generic",
    visualId: "poi/chest",
    sizeMode: "uniform",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: true,
      duplicatable: true, deletable: true, presentation: false, collisionControl: false,
      sizeMode: "uniform",
    },
    ownership: { mode: "point" },
    matches(found) { return found.collection === "pois" || found.type === "poi"; },
    transform: {
      read(found) { const o=found.obj; return { position:{x:o.pos.x,y:o.pos.y??0,z:o.pos.z}, rotationY:o.rotY??0, size:null, uniformScale:isFiniteNumber(o.uniformScale)?o.uniformScale:1, sizeMode:"uniform" }; },
      write(candidateObj, found, normalized) {
        if (normalized.position) { candidateObj.pos.x = normalized.position.x; candidateObj.pos.y = normalized.position.y ?? 0; candidateObj.pos.z = normalized.position.z; }
        if (isFiniteNumber(normalized.rotationY)) candidateObj.rotY = normalized.rotationY;
        if (isFiniteNumber(normalized.uniformScale)) { candidateObj.uniformScale = normalized.uniformScale; delete candidateObj.scale; }
        delete candidateObj.x; delete candidateObj.z;
      },
    },
    visual: { resolveRef(found) { const t = found.obj.type ?? "chest"; return { kind: "builtin", id: t === "barrier" ? "poi/barrier" : "poi/chest" }; } },
    collision: { describe(found){ const o=found.obj; const scale=isFiniteNumber(o.uniformScale)?o.uniformScale:1; return describeBoxCollider({ size:{width:0.7*scale,height:0.6*scale,depth:0.7*scale}, position:{x:o.pos.x,y:o.pos.y??0,z:o.pos.z}, rotationY:o.rotY??0, enabled:true}); }},
    inspector: [
      { key: "type", label: "POI Type", type: "text", path: "type" },
      { key: "requires", label: "Requires", type: "json", path: "requires" },
    ],
  };
}

function makeSectionObjectDefinition(collection, key, visualId, inspector = [], { sized = false, visualRole = "playerFacing", resolveVisualRef = null } = {}) {
  return {
    key: `section:${key}`,
    visualId,
    visualRole,
    sizeMode: sized ? "box" : "none",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: sized,
      duplicatable: true, deletable: true, presentation: false, collisionControl: false,
      sizeMode: sized ? "box" : "none",
    },
    ownership: { mode: "section" },
    matches(found) { return found.collection === collection || found.type === key; },
    transform: {
      read(found) {
        const object = found.obj;
        return {
          position: { x: object.pos.x, y: object.pos.y ?? 0, z: object.pos.z },
          rotationY: object.rotY ?? object.facingYaw ?? 0,
          size: sized ? { width: object.size.w, height: object.size.h, depth: object.size.d } : null,
          uniformScale: 1,
          sizeMode: sized ? "box" : "none",
        };
      },
      write(candidateObj, _found, normalized) {
        if (normalized.position) candidateObj.pos = { x: normalized.position.x, y: normalized.position.y ?? 0, z: normalized.position.z };
        if (isFiniteNumber(normalized.rotationY)) candidateObj.rotY = normalized.rotationY;
        if (sized && normalized.size) candidateObj.size = { w: normalized.size.width, h: normalized.size.height, d: normalized.size.depth };
      },
    },
    visual: {
      resolveRef(found) {
        if (resolveVisualRef) return resolveVisualRef(found).visualRef;
        return found.obj.visualAssetId ? { kind: "asset", id: found.obj.visualAssetId } : { kind: "builtin", id: visualId };
      },
    },
    collision: { describe() { return { shape: "none", enabled: false, editProxy: { visibleWhenHidden: false } }; } },
    inspector,
  };
}

function makeSpawnDefinitions() {
  const campSpawn = {
    key: "spawn:camp",
    visualId: "spawn/marker",
    visualRole: "editorHelperOnly",
    sizeMode: "none",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: false,
      duplicatable: false, deletable: false, presentation: false, collisionControl: false,
      sizeMode: "none",
    },
    ownership: { mode: "fixed" },
    matches(found) { return found.collection === "campSpawn" || found.type === "campSpawn"; },
    transform: {
      read(found) { const o=found.obj; return { position:{x:o.pos.x,y:o.pos.y??0,z:o.pos.z}, rotationY:o.facingYaw ?? 0, size:null, uniformScale:1, sizeMode:"none" }; },
      write(candidateObj, found, normalized, candidate) {
        // candidateObj not used; for spawn we need to mutate candidate.camp.playerSpawn via found handling? But found.obj is virtual; candidateObj is same virtual? In authorDraft we handle spawn specially via _findRawInCandidate. Instead of mutating candidateObj, we mutate candidate.camp
        // However this write will be called with candidateObj being reference to virtual obj (not persisted). We should instead mutate via candidate parameter (the draft copy)
        // We have access to candidate (full draft) passed as 4th arg if provided; if not, we fallback to candidateObj mutation which won't persist.
        // To keep adapter generic, we will handle spawn mutation via candidate draft passed.
        // Expected caller passes candidate draft as 4th arg; we mutate candidate.camp.playerSpawn.
        // For now support both: if candidate provided, mutate it.
      },
    },
    visual: { resolveRef() { return { kind: "builtin", id: "spawn/marker" }; } },
    collision: { describe() { return { shape:"none", enabled:false, editProxy:{visibleWhenHidden:false} }; }},
    inspector: [],
  };
  const runSpawn = {
    key: "spawn:run",
    visualId: "spawn/marker",
    visualRole: "editorHelperOnly",
    sizeMode: "none",
    capabilities: {
      selectable: true, draggable: true, elevation: true, rotation: true, resize: false,
      duplicatable: false, deletable: false, presentation: false, collisionControl: false,
      sizeMode: "none",
    },
    ownership: { mode: "fixed" },
    matches(found) { return found.collection === "runSpawn" || found.type === "runSpawn"; },
    transform: {
      read(found) { const o=found.obj; return { position:{x:o.pos.x,y:o.pos.y??0,z:o.pos.z}, rotationY:o.facingYaw ?? 0, size:null, uniformScale:1, sizeMode:"none" }; },
      write() {},
    },
    visual: { resolveRef() { return { kind: "builtin", id: "spawn/marker" }; } },
    collision: { describe(){ return { shape:"none", enabled:false, editProxy:{visibleWhenHidden:false}}; }},
    inspector: [],
  };
  return [campSpawn, runSpawn];
}

// Build definitions list
const DEFINITIONS = [
  makeVisualAssetInstanceDefinition(),
  makePropDefinition("box"),
  makePropDefinition("fence"),
  makePropDefinition("gate"),
  makePropDefinition("forestBoundary"),
  makePropDefinition("water"),
  makePropDefinition("island"),
  makePropDefinition("dropPod"),
  makePropDefinition("resonator"),
  makeGroundDefinition(),
  makeBoundaryDefinition(),
  makePlatformDefinition(),
  makeObstacleDefinition(),
  makeLadderDefinition(),
  makeResourceDefinition("tree"),
  makeResourceDefinition("rock"),
  makeResourceDefinition("fiber"),
  makeCreatureDefinition("rusher"),
  makeCreatureDefinition("spitter"),
  makeGenericCreatureDefinition(),
  makeWaypointDefinition(),
  makeBeaconDefinition(),
  makeSectionObjectDefinition("entryPoints", "entryPoint", "editor/entry-point", [
    { key: "facingYaw", label: "Facing (radians)", type: "number", path: "facingYaw" },
  ], { visualRole: "editorHelperOnly" }),
  makeSectionObjectDefinition("portalGates", "portalGate", "prop/gate", [
    { key: "displayName", label: "Display Name", type: "text", path: "displayName" },
    { key: "state", label: "State", type: "text", path: "state" },
    { key: "role", label: "Role", type: "text", path: "role" },
    { key: "travelEnabled", label: "Travel Enabled", type: "boolean", path: "travelEnabled" },
    { key: "targetGateId", label: "Target Gate", type: "text", path: "targetGateId" },
    { key: "targetSectionId", label: "Target Section", type: "text", path: "targetSectionId" },
    { key: "targetEntryId", label: "Target Entry", type: "text", path: "targetEntryId" },
    { key: "requirements", label: "Requirements", type: "json", path: "requirements" },
    { key: "visualAssetId", label: "Fallback Visual Asset", type: "visualAsset", path: "visualAssetId" },
    { key: "activeVisualAssetId", label: "Active Visual Asset", type: "visualAsset", path: "activeVisualAssetId" },
    { key: "ruinedVisualAssetId", label: "Ruined Visual Asset", type: "visualAsset", path: "ruinedVisualAssetId" },
  ], { resolveVisualRef: (found) => resolvePortalGateVisual(found.obj, found.obj.state, found.visualAssets ?? []) }),
  makeSectionObjectDefinition("jumpPads", "jumpPad", "traversal/jump-pad", [
    { key: "triggerRadius", label: "Trigger Radius", type: "number", path: "triggerRadius" },
    { key: "powerPreset", label: "Power Preset", type: "enum", options: ["low", "medium", "high"], path: "powerPreset" },
    { key: "verticalLaunch", label: "Vertical Override (blank = preset)", type: "number", path: "verticalLaunch" },
    { key: "cooldown", label: "Cooldown", type: "number", path: "cooldown" },
  ], { resolveVisualRef: (found) => resolveJumpPadVisual(found.obj, found.visualAssets ?? []) }),
  makeSectionObjectDefinition("parkourStarts", "parkourStart", "parkour/start", [
    { key: "courseId", label: "Course ID", type: "text", path: "courseId" },
    { key: "triggerRadius", label: "Trigger Radius", type: "number", path: "triggerRadius" },
    { key: "visualAssetId", label: "Visual Asset", type: "visualAsset", path: "visualAssetId" },
  ], { resolveVisualRef: (found) => resolveParkourMarkerVisual(found.obj, "start", found.visualAssets ?? []) }),
  makeSectionObjectDefinition("parkourCheckpoints", "parkourCheckpoint", "parkour/checkpoint", [
    { key: "courseId", label: "Course ID", type: "text", path: "courseId" },
    { key: "triggerRadius", label: "Trigger Radius", type: "number", path: "triggerRadius" },
    { key: "visualAssetId", label: "Visual Asset", type: "visualAsset", path: "visualAssetId" },
  ], { resolveVisualRef: (found) => resolveParkourMarkerVisual(found.obj, "checkpoint", found.visualAssets ?? []) }),
  makeSectionObjectDefinition("parkourEnds", "parkourEnd", "parkour/end", [
    { key: "courseId", label: "Course ID", type: "text", path: "courseId" },
    { key: "triggerRadius", label: "Trigger Radius", type: "number", path: "triggerRadius", min: 0.1 },
    { key: "visualAssetId", label: "Visual Asset", type: "visualAsset", path: "visualAssetId" },
  ], { resolveVisualRef: (found) => resolveParkourMarkerVisual(found.obj, "end", found.visualAssets ?? []) }),
  makeSectionObjectDefinition("parkourCourseZones", "parkourCourseZone", "editor/parkour-course-zone", [
    { key: "courseId", label: "Course ID", type: "text", path: "courseId" },
  ], { sized: true, visualRole: "editorHelperOnly" }),
  makeSectionObjectDefinition("killVolumes", "killVolume", "hazard/thornbed", [
    { key: "courseId", label: "Course ID", type: "text", path: "courseId" },
  ], { sized: true, visualRole: "playerFacing" }),
  makeSectionObjectDefinition("lootChests", "lootChest", "poi/chest", [
    { key: "displayName", label: "Display Name", type: "text", path: "displayName" },
    { key: "lootTableId", label: "Loot Table", type: "text", path: "lootTableId" },
    { key: "refillSeconds", label: "Refill Seconds (blank = once)", type: "number", path: "refillSeconds" },
    { key: "courseId", label: "Course ID", type: "text", path: "courseId" },
  ]),
  makePoiDefinition("chest"),
  makePoiDefinition("barrier"),
  makeGenericPoiDefinition(),
  ...makeSpawnDefinitions(),
];

export function resolveAuthorType(found) {
  if (!found) return null;
  let matched = null;
  let count = 0;
  for (const def of DEFINITIONS) {
    try {
      if (def.matches(found)) {
        matched = def;
        count++;
        // For generic fallbacks, we want most specific first; so break on first specific match if count==1 and def is not generic
        // But to ensure exactly one, we continue to count all. If multiple, prefer non-generic.
        // We'll keep first specific and if later generic also matches, we prefer specific.
        // So if we already have a specific match and next is generic, ignore generic.
        // Instead we track: if def.key includes "generic", skip if we already have match
        if (def.key.includes("generic")) {
          // keep previous specific if any
          if (matched && !matched.key.includes("generic")) {
            // we already have specific, undo counting generic as separate
            count--; // don't count generic as additional
            continue;
          }
        }
      }
    } catch {}
  }
  // If multiple specific matches (should not happen), pick first
  // Re-evaluate to ensure exactly one specific
  const specifics = DEFINITIONS.filter(d => {
    try { return d.matches(found) && !d.key.includes("generic"); } catch { return false; }
  });
  if (specifics.length === 1) return specifics[0];
  if (specifics.length > 1) return specifics[0]; // fallback
  const generics = DEFINITIONS.filter(d => { try { return d.matches(found); } catch {return false; }});
  if (generics.length === 1) return generics[0];
  if (generics.length > 1) {
    // Prefer non-generic if exists
    const nonGeneric = generics.find(g => !g.key.includes("generic"));
    if (nonGeneric) return nonGeneric;
    return generics[0];
  }
  return matched;
}

export function getAllDefinitions() { return [...DEFINITIONS]; }

export function getAuthorCapabilities(found) {
  const def = resolveAuthorType(found);
  return def ? def.capabilities : null;
}

export function getAuthorVisualRole(found) {
  const def = resolveAuthorType(found);
  return def ? (def.visualRole ?? "playerFacing") : null;
}

export function getAuthorVisualRef(found) {
  const def = resolveAuthorType(found);
  if (!def) return null;
  if (typeof def.visual.resolveRef === "function") {
    // If it expects found, pass it
    try { return def.visual.resolveRef(found); } catch { return { kind: "builtin", id: def.visualId }; }
  }
  return { kind: "builtin", id: def.visualId };
}

export function getColliderDescriptor(found) {
  const def = resolveAuthorType(found);
  if (!def || !def.collision || !def.collision.describe) return null;
  try { return def.collision.describe(found); } catch { return null; }
}

export function readNormalizedTransform(found) {
  const def = resolveAuthorType(found);
  if (!def || !def.transform || !def.transform.read) return null;
  return def.transform.read(found);
}

export function writeNormalizedTransform(candidate, found, normalized) {
  const def = resolveAuthorType(found);
  if (!def || !def.transform || !def.transform.write) return false;
  // candidate is full draft clone, found is {obj,region,collection,...} referencing candidate's object? In authorDraft transact we have candidate and found from _findRawInCandidate(candidate, id)
  // found.obj is reference inside candidate, so mutating it mutates candidate.
  // For spawns, we need to handle differently; def.write may need candidate to handle spawn storage.
  // Pass candidate as 4th arg if def expects
  if (def.key.startsWith("spawn:")) {
    // handle spawn specially via candidate mutation
    // found.obj is virtual; we need to mutate candidate.camp or waypoint runSpawn
    // Reuse logic from authorDraft's applyPatch for spawns? Instead we implement here.
    // For campSpawn: candidate.camp.playerSpawn.position
    // For runSpawn: find waypoint and mutate its runSpawn
    const obj = found.obj;
    const pos = normalized.position;
    const rot = normalized.rotationY;
    if (found.collection === "campSpawn") {
      if (!candidate.camp) candidate.camp = {};
      if (!candidate.camp.playerSpawn) candidate.camp.playerSpawn = { position: { x: 0, y: 0, z: 0 }, facingYaw: 0 };
      if (!candidate.camp.playerSpawn.position) {
        const sp = candidate.camp.playerSpawn;
        candidate.camp.playerSpawn = { position: { x: sp.x ?? 0, y: sp.y ?? 0, z: sp.z ?? 0 }, facingYaw: sp.facingYaw ?? 0 };
      }
      if (pos) {
        candidate.camp.playerSpawn.position.x = pos.x;
        candidate.camp.playerSpawn.position.y = pos.y ?? 0;
        candidate.camp.playerSpawn.position.z = pos.z;
      }
      if (isFiniteNumber(rot)) candidate.camp.playerSpawn.facingYaw = rot;
      return true;
    }
    if (found.collection === "runSpawn") {
      const wpId = found.obj._runSpawnFor;
      const region = candidate.regions.find(r => (r.majorWaypoints ?? []).some(w => w.id === wpId));
      if (!region) return false;
      const wp = region.majorWaypoints.find(w => w.id === wpId);
      if (!wp) return false;
      if (!wp.runSpawn) wp.runSpawn = { position: { x: wp.pos.x, y: wp.pos.y ?? 0, z: wp.pos.z + 1.2 }, facingYaw: 0 };
      if (!wp.runSpawn.position) {
        const rs = wp.runSpawn;
        wp.runSpawn = { position: { x: rs.x ?? wp.pos.x, y: rs.y ?? 0, z: rs.z ?? wp.pos.z }, facingYaw: rs.facingYaw ?? 0 };
      }
      if (pos) {
        wp.runSpawn.position.x = pos.x;
        wp.runSpawn.position.y = pos.y ?? 0;
        wp.runSpawn.position.z = pos.z;
      }
      if (isFiniteNumber(rot)) wp.runSpawn.facingYaw = rot;
      return true;
    }
    return false;
  }
  // For non-spawn, delegate to def's write with candidateObj = found.obj (which is inside candidate)
  const candidateObj = found.obj; // reference inside candidate
  try {
    def.transform.write(candidateObj, found, normalized, candidate);
    return true;
  } catch (e) {
    return false;
  }
}

export function getInspectorFields(found) {
  const def = resolveAuthorType(found);
  if (!def) return [];
  return def.inspector ?? [];
}

// Utility to check if object is authorable
export function isAuthorable(found) {
  return !!resolveAuthorType(found);
}

// For testing: every current authorable world object must resolve to exactly one type
export function checkAllObjectsResolve(worldData) {
  const errors = [];
  // Use authorDraft-like enumeration
  const ids = [];
  for (const region of worldData.regions) {
    for (const entry of enumerateRegionAuthorObjects(region)) ids.push({ id: entry.obj.id, ...entry });
  }
  ids.push({ id: "camp_spawn", collection: "campSpawn", obj: { id: "camp_spawn", pos: worldData.camp?.playerSpawn?.position ?? worldData.camp?.playerSpawn ?? {x:0,y:0,z:0}, facingYaw: worldData.camp?.playerSpawn?.facingYaw ?? 0, _virtual:true,_campSpawn:true }, type: "campSpawn", region: worldData.regions.find(r=>r.id==="camp") });
  for (const region of worldData.regions) for (const wp of region.majorWaypoints ?? []) {
    const rs = wp.runSpawn ?? { position: {x: wp.pos.x, y: wp.pos.y ??0, z: wp.pos.z+1.2}, facingYaw:0 };
    const pos = rs.position ?? rs;
    const facing = rs.facingYaw ?? 0;
    ids.push({ id: wp.id+"__runSpawn", collection:"runSpawn", obj:{id:wp.id+"__runSpawn", pos, facingYaw:facing, _virtual:true, _runSpawnFor:wp.id}, type:"runSpawn", region });
  }
  for (const entry of ids) {
    const found = { obj: entry.obj, region: entry.region, collection: entry.collection, type: entry.type, regionId: entry.region?.id ?? null };
    const def = resolveAuthorType(found);
    if (!def) errors.push(`no type for ${entry.id} (${entry.collection}/${entry.type})`);
    else {
      // check exactly one by counting matches
      let matches = 0;
      for (const d of DEFINITIONS) try{ if(d.matches(found)) matches++; }catch{}
      // Adjust for generic handling: if specifics match, generic not counted
      const specifics = DEFINITIONS.filter(d=> !d.key.includes("generic") && (()=>{try{return d.matches(found)}catch{return false}})());
      // simplify: if specifics found, expect 1 specific
      // we already did generics handling, so we check specifics count
      const countSpecific = DEFINITIONS.filter(d=> { try{ return !d.key.includes("generic") && d.matches(found);}catch{return false;}}).length;
      if (countSpecific===0) {
        // could be generic only? then one generic is expected
        const genericCount = DEFINITIONS.filter(d=> { try{ return d.matches(found);}catch{return false;}}).length;
        if (genericCount!==1) errors.push(`expected 1 match for ${entry.id}, got ${genericCount}`);
      } else if (countSpecific!==1) errors.push(`expected 1 specific type for ${entry.id}, got ${countSpecific}`);
    }
  }
  return errors;
}
