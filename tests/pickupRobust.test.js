import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { createPickupSystem } from "../src/resources/pickupSystem.js";
import { RESOURCE_TYPES } from "../src/resources/resourceConfig.js";
import { pickupInventoryFixture } from './helpers/pickupInventoryFixture.js';

describe("Pickup robust collision", () => {
  it("launched uses radius-aware check and resting not overlapping", async () => {
    const scene = new THREE.Scene();
    // Mock playground with a box at origin 2x2, height 1.0
    const playground = {
      obstacles: [{ x: 0, z: 0, w: 2, h: 2, height: 1.0, aabb: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 } }],
      platforms: [],
    };
    const RAPIER = await import("@dimforge/rapier3d-compat");
    await RAPIER.init();
    const physicsWorld = { world: new RAPIER.World({ x: 0, y: 0, z: 0 }), RAPIER };
    // Add matching static collider for the box so sphere cast would hit it if Rapier used
    const desc = RAPIER.ColliderDesc.cuboid(1, 0.5, 1).setTranslation(0, 0.5, 0).setFriction(0.6);
    physicsWorld.world.createCollider(desc);
    physicsWorld.world.step();
    const ps = createPickupSystem(scene, physicsWorld, playground, () => {}, { inventory: pickupInventoryFixture().inventory });
    // Use a rock node near box to attempt spawn
    const node = { type: RESOURCE_TYPES.tree, state: { position: { x: -2, y: 0, z: 0 } }, collider: null, index: 0 };
    // Manually create a pickup with intended path through box
    const p = ps.spawnPickup(node);
    // Force position near box and attempt launched trajectory through box
    p.pos.set(-1.5, 0.3, 0);
    p.mesh.position.copy(p.pos);
    p.vel.set(3, 0.5, 0);
    p.state = "LAUNCHED";
    p._radius = 0.32;
    // Simulate a few frames - should become RESTING but not overlapping
    for (let i=0;i<60;i++) ps.update(1/60, { x: 10, y: 0.5, z: 0 }, () => {}, null);
    // Check that if it became RESTING, its position is not overlapping expanded box
    if (p.state === "RESTING") {
      const r = 0.32;
      const overlapping = p.pos.x >= -1 - r && p.pos.x <= 1 + r && p.pos.z >= -1 - r && p.pos.z <= 1 + r && p.pos.y < 1 + r;
      assert.equal(overlapping, false, `resting pickup should not overlap box, pos ${p.pos.x.toFixed(2)},${p.pos.z.toFixed(2)}`);
    }
  });

  it("MAGNETIZING ignores wall and reaches COLLECTED", async () => {
    const scene = new THREE.Scene();
    const playground = {
      obstacles: [{ x: 0, z: 0, w: 1, h: 1, height: 2.0, aabb: { minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5 } }],
      platforms: [],
    };
    const RAPIER = await import("@dimforge/rapier3d-compat");
    await RAPIER.init();
    const physicsWorld = { world: new RAPIER.World({ x: 0, y: 0, z: 0 }), RAPIER };
    const ps = createPickupSystem(scene, physicsWorld, playground, () => {}, { inventory: pickupInventoryFixture().inventory });
    const node = { type: RESOURCE_TYPES.rock, state: { position: { x: -2, y: 0, z: 0 } }, collider: null, index: 0 };
    const p = ps.spawnPickup(node);
    // Place pickup behind wall relative to player — distance 1.6 < 2.4 magnet radius, wall between at 0
    p.pos.set(-0.7, 0.26, 0);
    p.mesh.position.copy(p.pos);
    p.state = "RESTING";
    p.age = 1.0;
    p.lastClearPos.copy(p.pos);
    // Player on opposite side of wall within magnet radius
    const playerPos = { x: 0.9, y: 0.5, z: 0 };
    // Ensure magnet triggers despite wall between
    for (let i=0;i<120;i++) ps.update(1/60, playerPos, () => {}, null);
    // Should have been collected (removed) despite wall
    assert.equal(ps.getPickups().includes(p), false, "pickup should be collected even though wall between");
  });

  it("magnetization rescues bad overlapping pickup", async () => {
    const scene = new THREE.Scene();
    const playground = {
      obstacles: [{ x: 0, z: 0, w: 1, h: 1, height: 2.0, aabb: { minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5 } }],
      platforms: [],
    };
    const RAPIER = await import("@dimforge/rapier3d-compat");
    await RAPIER.init();
    const physicsWorld = { world: new RAPIER.World({ x: 0, y: 0, z: 0 }), RAPIER };
    const ps = createPickupSystem(scene, physicsWorld, playground, () => {}, { inventory: pickupInventoryFixture().inventory });
    const node = { type: RESOURCE_TYPES.rock, state: { position: { x: 0, y: 0, z: 0 } }, collider: null, index: 0 };
    const p = ps.spawnPickup(node);
    // Force into overlapping position (inside box)
    p.pos.set(0, 0.26, 0);
    p.mesh.position.copy(p.pos);
    p.state = "RESTING";
    p.age = 1.0;
    // Player nearby within magnet radius on side of box
    const playerPos = { x: 0.9, y: 0.5, z: 0 };
    ps.update(1/60, playerPos, () => {}, null);
    // Should have switched to MAGNETIZING despite being overlapping (no line-of-sight check)
    assert.equal(p.state === "MAGNETIZING" || !ps.getPickups().includes(p), true, "should magnetize even when overlapping");
  });
});
