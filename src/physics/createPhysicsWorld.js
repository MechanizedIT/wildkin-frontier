// src/physics/createPhysicsWorld.js — Rapier World + static world colliders (Phase 1.2)
// No game-design decisions. Builds fixed colliders matching the visual playground.

export function createPhysicsWorld(RAPIER, playground) {
  // Gravity 0 — we manage vertical velocity explicitly via the character controller.
  // World step is still useful for broadphase updates; gravity not applied to kinematic.
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  world.timestep = 1 / 60;
  // Length unit default 1.0 is fine for ~1u character.

  const staticColliders = [];

  function addCuboid(hx, hy, hz, tx, ty, tz) {
    const desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
      .setTranslation(tx, ty, tz)
      .setFriction(0.6)
      .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
    const c = world.createCollider(desc);
    staticColliders.push(c);
    return c;
  }

  // Ground — 26 x 0.5 x 24 centered at (0, -0.25, 0) → half extents 13,0.25,12
  addCuboid(13, 0.25, 12, 0, -0.25, 0);

  // Obstacles (grey diagnostic boxes/walls + rocks approximated as cuboids)
  // playground.obstacles includes: center-east boulder, mid-south wall, 3 rocks, corridor walls
  for (const o of playground.obstacles) {
    const hx = o.w / 2;
    const hz = o.h / 2;
    const hy = (o.height ?? 0.9) / 2;
    const ty = hy - 0.02; // match visual offset (height/2 -0.02)
    addCuboid(hx, hy, hz, o.x, ty, o.z);
  }

  // Platforms — fixed boxes. Use half extents and center y = height/2 (bottom at 0)
  // The visual mesh center is at height/2 -0.02, but collider bottom at 0 is intentional for stable floor at 0.
  for (const p of playground.platforms) {
    const hx = p.w / 2;
    const hz = p.h / 2;
    const hy = p.height / 2;
    const ty = hy; // bottom at 0, top at height
    addCuboid(hx, hy, hz, p.x, ty, p.z);
  }

  // Climb wall (south face of high platform) — treat as solid but climbable sensor? Keep as solid cuboid.
  // Already part of platforms? No, climbWall is separate visual at (2.2, -5.05) size 1.9 x highPlatH x 0.5
  // Add as static wall so it blocks but also allows climbing approach.
  // The wall itself is part of high platform south face; duplicating would double-collide. Instead rely on platform box.
  // But the climbWall mesh is 0.5 thick at z -5.05, platform extends -7.2±1.9 → -9.1 to -5.3. So its south face is at -5.3.
  // Our platform collider already extends to -5.3. No extra collider needed.

  // Boundary walls — thin fixed walls at worldBounds to prevent escape (if physics world replaces clamp)
  const bounds = playground.bounds; // { minX -12.5 maxX 12.5 minZ -11.5 maxZ 11.5 }
  const wallThickness = 0.5;
  const wallHeight = 3;
  const wallY = wallHeight / 2;
  // North/South (z)
  addCuboid((bounds.maxX - bounds.minX) / 2 + wallThickness, wallHeight / 2, wallThickness / 2,
    0, wallY, bounds.minZ - wallThickness / 2 - 0.18);
  addCuboid((bounds.maxX - bounds.minX) / 2 + wallThickness, wallHeight / 2, wallThickness / 2,
    0, wallY, bounds.maxZ + wallThickness / 2 + 0.18);
  // East/West
  addCuboid(wallThickness / 2, wallHeight / 2, (bounds.maxZ - bounds.minZ) / 2 + wallThickness,
    bounds.minX - wallThickness / 2 - 0.18, wallY, 0);
  addCuboid(wallThickness / 2, wallHeight / 2, (bounds.maxZ - bounds.minZ) / 2 + wallThickness,
    bounds.maxX + wallThickness / 2 + 0.18, wallY, 0);

  // Initial pipeline update so character controller queries see static colliders immediately
  world.step();

  return { world, staticColliders, RAPIER };
}
