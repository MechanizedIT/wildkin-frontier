// src/physics/createPhysicsWorld.js — Rapier World + static world colliders (Phase 1.2)
// No game-design decisions. Builds fixed colliders matching the visual playground.

const CAMERA_FADE_ASSET_IDS = new Set(['asset_verge_canopy', 'asset_verge_canopy_tall', 'asset_verge_canopy_spread']);

export function createPhysicsWorld(RAPIER, playground) {
  // Gravity 0 — we manage vertical velocity explicitly via the character controller.
  // World step is still useful for broadphase updates; gravity not applied to kinematic.
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  world.timestep = 1 / 60;
  // Length unit default 1.0 is fine for ~1u character.

  const staticColliders = [];
  // Camera queries include immutable terrain/props plus explicitly registered
  // runtime construction. Harvest nodes stay out so foliage fading remains
  // visual-only and companions/creatures remain query-filtered kinematics.
  const cameraColliders = new Set();
  // Natural traversal is narrower than ordinary collision: terrain and
  // explicitly classified rock faces only.
  const traversalColliders = new Set();
  const colliderSections = new Map();
  const objectColliders = new Map();
  const disabledObjects = new Set();
  const colliderObjects = new Map();
  // Streamed terrain owns one collider per stable surface id. Authored terrain
  // remains in the ordinary object index; this map only tracks runtime additions.
  const terrainSurfaceColliders = new Map();
  let activeSectionId = null;
  let sectionSelectionMade = false;

  function registerCollider(collider, sectionId, objectId, { cameraSolid = true, traversalSolid = false } = {}) {
    staticColliders.push(collider);
    if (cameraSolid) cameraColliders.add(collider);
    if (traversalSolid) traversalColliders.add(collider);
    colliderSections.set(collider, sectionId);
    if (objectId == null) return;
    if (!objectColliders.has(objectId)) objectColliders.set(objectId, []);
    objectColliders.get(objectId).push(collider);
    colliderObjects.set(collider, objectId);
  }

  function retireCollider(collider) {
    if (!collider) return false;
    const staticIndex = staticColliders.indexOf(collider);
    if (staticIndex >= 0) staticColliders.splice(staticIndex, 1);
    cameraColliders.delete(collider);
    traversalColliders.delete(collider);
    const objectId = colliderObjects.get(collider);
    colliderObjects.delete(collider);
    colliderSections.delete(collider);
    if (objectId != null) {
      const siblings = objectColliders.get(objectId);
      if (siblings) {
        const next = siblings.filter(entry => entry !== collider);
        if (next.length) objectColliders.set(objectId, next);
        else {
          objectColliders.delete(objectId);
          disabledObjects.delete(objectId);
        }
      }
    }
    world.removeCollider(collider, true);
    return true;
  }

  function addCuboid(hx, hy, hz, tx, ty, tz, rotY = 0, sectionId = null, objectId = null, { cameraSolid = true, traversalSolid = false } = {}) {
    const desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
      .setTranslation(tx, ty, tz)
      .setFriction(0.6)
      .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
    if (rotY && Math.abs(rotY) > 1e-6) {
      const half = rotY * 0.5;
      desc.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) });
    }
    const c = world.createCollider(desc);
    registerCollider(c, sectionId, objectId, { cameraSolid, traversalSolid });
    return c;
  }

  // Ground patches — authored playable surfaces (collision from same authored transform)
  // If no authored ground patches, fallback to legacy global ground for test compatibility
  if ((playground.groundPatches?.length ?? 0) > 0 || (playground.terrainSurfaces?.length ?? 0) > 0) {
    for (const surface of playground.terrainSurfaces ?? []) {
      const desc = RAPIER.ColliderDesc.trimesh(surface.vertices, surface.indices)
        .setFriction(0.6).setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      const collider = world.createCollider(desc);
      registerCollider(collider, surface.sectionId ?? null, surface.id, { traversalSolid: true });
    }
    for (const gp of playground.groundPatches) {
      if (gp.collisionEnabled === false) continue;
      const w = gp.w ?? gp.size?.w ?? 25;
      const h = gp.h ?? gp.size?.h ?? 0.5;
      const d = gp.d ?? gp.size?.d ?? 25;
      const hx = w/2, hy = h/2, hz = d/2;
      const baseY = gp.y ?? gp.pos?.y ?? -0.25;
      const ty = baseY + hy;
      const rotY = gp.rotY ?? 0;
      const x = gp.x ?? gp.pos?.x ?? 0;
      const z = gp.z ?? gp.pos?.z ?? 0;
      addCuboid(hx, hy, hz, x, ty, z, rotY, gp.sectionId ?? gp.regionId ?? null, gp.id);
    }
  } else {
    // Legacy fallback for worlds without groundPatches (tests)
    addCuboid(13, 0.25, 12, 0, -0.25, 0, 0, null);
  }

  // Obstacles — respect authored baseY and rotY for parity (includes ground patch colliders if they were marked as obstacles already)
  for (const o of playground.obstacles) {
    // Skip if this obstacle is actually a ground patch already handled? Ground patches are also in obstacles array with isGround flag; they are already collided via groundPatches loop, so avoid duplicate
    if (o.isGround) continue;
    // Skip if boundary marker already handled via boundaries array
    if (o.isBoundary) continue;
    if (o.collisionEnabled === false) continue;
    if (o.collider?.shape === 'convexHull') {
      const shape = o.collider;
      const desc = RAPIER.ColliderDesc.convexMesh(new Float32Array(shape.vertices), new Uint32Array(shape.indices));
      if (!desc) throw new Error(`Invalid convex prop collider: ${o.id}`);
      desc.setTranslation(o.x, o.baseY + o.height/2, o.z)
        .setFriction(0.6).setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      const half = (o.rotY ?? 0)/2;
      desc.setRotation({x:0,y:Math.sin(half),z:0,w:Math.cos(half)});
      const collider = world.createCollider(desc);
      registerCollider(collider, o.sectionId ?? o.regionId ?? null, o.id, {
        cameraSolid: !CAMERA_FADE_ASSET_IDS.has(o.visualAssetId),
        traversalSolid: o.traversalSurface === 'rock',
      });
      continue;
    }
    const hx = o.w / 2;
    const hz = o.h / 2;
    const hy = (o.height ?? 0.9) / 2;
    const baseY = o.baseY ?? 0;
    const ty = baseY + hy - 0.02;
    const rotY = o.rotY ?? 0;
    // Respect collisionEnabled flag if present
    if (o.collisionEnabled === false) continue;
    addCuboid(hx, hy, hz, o.x, ty, o.z, rotY, o.sectionId ?? o.regionId ?? null, o.id, {
      cameraSolid: !CAMERA_FADE_ASSET_IDS.has(o.visualAssetId),
      traversalSolid: o.traversalSurface === 'rock',
    });
  }

  // Platforms — respect baseY/rotY
  for (const p of playground.platforms) {
    const hx = p.w / 2;
    const hz = p.h / 2;
    const hy = p.height / 2;
    const baseY = p.baseY ?? p.y ?? 0;
    const ty = baseY + hy;
    const rotY = p.rotY ?? 0;
    addCuboid(hx, hy, hz, p.x, ty, p.z, rotY, p.sectionId ?? p.regionId ?? null, p.id);
  }

  // Boundary colliders — authored outer limits (explicit, canonical baseY + h/2 center)
  if (playground.boundaries && playground.boundaries.length > 0) {
    for (const b of playground.boundaries) {
      if (b.collisionEnabled === false) continue;
      const w = b.w ?? b.size?.w ?? 1;
      const h = b.h ?? b.size?.h ?? 3;
      const d = b.d ?? b.size?.d ?? 1;
      const hx = w/2, hy = h/2, hz = d/2;
      const x = b.x ?? b.pos?.x ?? 0;
      const baseY = b.y ?? b.pos?.y ?? 0;
      const y = baseY + hy;
      const z = b.z ?? b.pos?.z ?? 0;
      const rotY = b.rotY ?? 0;
      addCuboid(hx, hy, hz, x, y, z, rotY, b.sectionId ?? b.regionId ?? null, b.id);
    }
  }
  // Safety floor far below gameplay (not walkable when authored ground deleted)
  addCuboid(60, 0.5, 60, 0, -30, 0, 0, null);

  // Initial pipeline update so character controller queries see static colliders immediately
  world.step();

  function isColliderEnabled(collider) {
    const sectionId = colliderSections.get(collider);
    return !disabledObjects.has(colliderObjects.get(collider))
      && (!sectionSelectionMade || sectionId === null || sectionId === activeSectionId);
  }

  function setStaticObjectEnabled(id, enabled) {
    const colliders = objectColliders.get(id);
    if (!colliders) return false;
    if (enabled) disabledObjects.delete(id);
    else disabledObjects.add(id);
    let changed = false;
    for (const collider of colliders) {
      const next = isColliderEnabled(collider);
      if (collider.isEnabled() === next) continue;
      collider.setEnabled(next);
      changed = true;
    }
    if (changed) world.step();
    return true;
  }

  function setActiveSection(sectionId) {
    if (activeSectionId === sectionId) return { changed: false, sectionId };
    activeSectionId = sectionId;
    sectionSelectionMade = true;
    for (const collider of staticColliders) {
      collider.setEnabled(isColliderEnabled(collider));
    }
    world.step();
    return { changed: true, sectionId };
  }

  /**
   * Apply one streamed terrain lifecycle batch. Vertices use local x/z and
   * real y; origin rebases x/z into the shared Rapier world coordinates.
   * A duplicate stable id is ignored, preserving the existing collider.
   */
  function updateTerrainSurfaces({ add = [], remove = [] } = {}) {
    const retiring = new Map();
    for (const entry of remove) {
      const id = typeof entry === 'string' ? entry : entry?.id;
      const collider = terrainSurfaceColliders.get(id);
      if (collider) retiring.set(id, collider);
    }
    const prepared = new Map();
    let ignored = 0;
    try {
      for (const surface of add) {
        const id = surface?.id;
        if (id == null || prepared.has(id) || (!retiring.has(id) && (terrainSurfaceColliders.has(id) || objectColliders.has(id)))) {
          ignored++;
          continue;
        }
        const origin = surface.origin ?? { x: 0, z: 0 };
        // Allocate disabled colliders before touching any current support or
        // public indexes. A failed incoming shape leaves the old batch usable.
        const desc = RAPIER.ColliderDesc.trimesh(surface.vertices, surface.indices)
          .setTranslation(origin.x ?? 0, 0, origin.z ?? 0)
          .setFriction(0.6)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL)
          .setEnabled(false);
        prepared.set(id, { collider: world.createCollider(desc), surface });
      }
    } catch (error) {
      for (const { collider } of prepared.values()) world.removeCollider(collider, true);
      throw error;
    }
    // Explicit object disablement survives replacement of the same surface id.
    const keptDisabled = new Set([...prepared.keys()].filter(id => disabledObjects.has(id)));
    for (const [id, collider] of retiring) {
      terrainSurfaceColliders.delete(id);
      retireCollider(collider);
    }
    for (const id of keptDisabled) disabledObjects.add(id);
    for (const [id, { collider, surface }] of prepared) {
      const traversalSolid = surface.traversalSurface === 'terrain' || surface.traversalSurface === 'rock';
      registerCollider(collider, surface.sectionId ?? null, id, { traversalSolid });
      terrainSurfaceColliders.set(id, collider);
      collider.setEnabled(isColliderEnabled(collider));
    }
    // Refresh broadphase exactly once, after the complete add/remove batch.
    if (prepared.size || retiring.size) world.step();
    return { added: prepared.size, removed: retiring.size, ignored, active: terrainSurfaceColliders.size };
  }

  function registerCameraCollider(collider) {
    if (collider) cameraColliders.add(collider);
    return collider;
  }
  function unregisterCameraCollider(collider) { cameraColliders.delete(collider); }

  function isTraversalColliderActive(collider) {
    return !!collider && traversalColliders.has(collider)
      && (typeof collider.isEnabled !== 'function' || collider.isEnabled());
  }

  function getColliderSurfaceId(collider) {
    return colliderObjects.get(collider) ?? null;
  }

  return { world, staticColliders, cameraColliders, traversalColliders, colliderSections, registerCameraCollider, unregisterCameraCollider, isTraversalColliderActive, getColliderSurfaceId, setActiveSection, setStaticObjectEnabled, updateTerrainSurfaces, getActiveSectionId: () => activeSectionId, RAPIER };
}
