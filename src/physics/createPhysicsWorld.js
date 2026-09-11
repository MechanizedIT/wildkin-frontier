// src/physics/createPhysicsWorld.js — Rapier World + static world colliders (Phase 1.2)
// No game-design decisions. Builds fixed colliders matching the visual playground.

export function createPhysicsWorld(RAPIER, playground) {
  // Gravity 0 — we manage vertical velocity explicitly via the character controller.
  // World step is still useful for broadphase updates; gravity not applied to kinematic.
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  world.timestep = 1 / 60;
  // Length unit default 1.0 is fine for ~1u character.

  const staticColliders = [];
  const colliderSections = new Map();
  let activeSectionId = null;

  function addCuboid(hx, hy, hz, tx, ty, tz, rotY = 0, sectionId = null) {
    const desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
      .setTranslation(tx, ty, tz)
      .setFriction(0.6)
      .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
    if (rotY && Math.abs(rotY) > 1e-6) {
      const half = rotY * 0.5;
      desc.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) });
    }
    const c = world.createCollider(desc);
    staticColliders.push(c);
    colliderSections.set(c, sectionId);
    return c;
  }

  // Ground patches — authored playable surfaces (collision from same authored transform)
  // If no authored ground patches, fallback to legacy global ground for test compatibility
  if ((playground.groundPatches?.length ?? 0) > 0 || (playground.terrainSurfaces?.length ?? 0) > 0) {
    for (const surface of playground.terrainSurfaces ?? []) {
      const desc = RAPIER.ColliderDesc.trimesh(surface.vertices, surface.indices)
        .setFriction(0.6).setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
      const collider = world.createCollider(desc);
      staticColliders.push(collider);
      colliderSections.set(collider, surface.sectionId);
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
      addCuboid(hx, hy, hz, x, ty, z, rotY, gp.sectionId ?? gp.regionId ?? null);
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
      staticColliders.push(collider);colliderSections.set(collider, o.sectionId ?? o.regionId ?? null);
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
    addCuboid(hx, hy, hz, o.x, ty, o.z, rotY, o.sectionId ?? o.regionId ?? null);
  }

  // Platforms — respect baseY/rotY
  for (const p of playground.platforms) {
    const hx = p.w / 2;
    const hz = p.h / 2;
    const hy = p.height / 2;
    const baseY = p.baseY ?? p.y ?? 0;
    const ty = baseY + hy;
    const rotY = p.rotY ?? 0;
    addCuboid(hx, hy, hz, p.x, ty, p.z, rotY, p.sectionId ?? p.regionId ?? null);
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
      addCuboid(hx, hy, hz, x, y, z, rotY, b.sectionId ?? b.regionId ?? null);
    }
  }
  // Safety floor far below gameplay (not walkable when authored ground deleted)
  addCuboid(60, 0.5, 60, 0, -30, 0, 0, null);

  // Initial pipeline update so character controller queries see static colliders immediately
  world.step();

  function setActiveSection(sectionId) {
    if (activeSectionId === sectionId) return { changed: false, sectionId };
    activeSectionId = sectionId;
    for (const collider of staticColliders) {
      const owner = colliderSections.get(collider);
      collider.setEnabled?.(owner === null || owner === sectionId);
    }
    world.step();
    return { changed: true, sectionId };
  }

  return { world, staticColliders, colliderSections, setActiveSection, getActiveSectionId: () => activeSectionId, RAPIER };
}
