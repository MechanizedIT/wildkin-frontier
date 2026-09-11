import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { createCharacterPhysics } from "../src/physics/createCharacterPhysics.js";
import { createWildCreature } from "../src/creatures/createWildCreature.js";
import { createCompanionPhysics } from "../src/companions/companionPhysics.js";

function mockPhysics() {
  let nextHandle = 1;
  const calls = [];
  const removedControllers = [];
  const RAPIER = {
    ActiveCollisionTypes: { ALL: 0xffff },
    RigidBodyDesc: {
      kinematicPositionBased() {
        return { setTranslation(x, y, z) { this.position = { x, y, z }; return this; } };
      },
    },
    ColliderDesc: {
      capsule() { return { setTranslation() { return this; }, setFriction() { return this; }, setActiveCollisionTypes() { return this; } }; },
    },
  };
  const world = {
    createRigidBody(desc) {
      const position = { ...desc.position };
      return { position, setTranslation(next) { Object.assign(position, next); } };
    },
    createCollider(_desc, body) {
      return { handle: nextHandle++, translation: () => ({ ...body.position }), setEnabled() {} };
    },
    createCharacterController() {
      return {
        setSlideEnabled() {}, setMaxSlopeClimbAngle() {}, setMinSlopeSlideAngle() {}, enableAutostep() {}, enableSnapToGround() {}, setUp() {}, setApplyImpulsesToDynamicBodies() {},
        computeColliderMovement(...args) { calls.push(args); },
        computedMovement() { return { x: 0, y: 0, z: 0 }; }, computedGrounded() { return true; }, numComputedCollisions() { return 0; }, computedCollision() { return null; },
      };
    },
    step() {}, propagateModifiedBodyPositionsToColliders() {},
    removeCharacterController(controller) { removedControllers.push(controller); }, removeCollider() {}, removeRigidBody() {},
  };
  return { RAPIER, world, calls, removedControllers };
}

test("player KCC filters followers while retaining world collider queries", () => {
  const physics = mockPhysics();
  const player = createCharacterPhysics(physics.RAPIER, physics.world, { x: 0, y: 1, z: 0 });
  const follower = { handle: 44 };
  const wall = { handle: 45 };
  player.setColliderFilter((candidate) => candidate?.handle === follower.handle);
  player.move({ x: 0.2, y: 0, z: 0 });
  const predicate = physics.calls.at(-1)[4];
  assert.equal(predicate(follower), false, "follower is excluded from the player query");
  assert.equal(predicate(wall), true, "static world remains collision-active");
});

test("wild KCC and disposal share the companion filter contract", () => {
  const physics = mockPhysics();
  const creature = createWildCreature(new THREE.Scene(), { ...physics }, { id: "test_wild", type: "rusher", pos: { x: 0, y: 0, z: 0 } }, 0);
  const follower = { handle: 51 };
  creature.setColliderFilter((candidate) => candidate?.handle === follower.handle);
  creature.move({ x: 0.1, y: 0, z: 0 });
  const predicate = physics.calls.at(-1)[4];
  assert.equal(predicate(follower), false, "wildkin does not route around a follower as if it were a wall");
  assert.equal(predicate({ handle: 52 }), true, "world collider remains active for wildkin movement");
  const controller = creature.controller;
  creature.dispose();
  assert.deepEqual(physics.removedControllers, [controller], "wild creature releases its KCC on disposal");
});

test("actual Rapier player travel passes a follower but stops at a static wall", async () => {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const player = createCharacterPhysics(RAPIER, world, { x: 0, y: 1, z: 0 });
    const follower = createCompanionPhysics({ physicsWorld: { RAPIER, world }, initialPosition: { x: 1, y: 1, z: 0 } });
    player.setColliderFilter((candidate) => candidate.handle === follower.collider.handle);
    world.step();
    const throughFollower = player.move({ x: 1.5, y: 0, z: 0 });
    assert.ok(throughFollower.corrected.x > 1.45, "follower does not block ordinary player movement");
    const wallBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(2.4, 1, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.15, 1, 0.7), wallBody);
    world.step();
    const intoWall = player.move({ x: 1.5, y: 0, z: 0 });
    assert.ok(intoWall.corrected.x < 0.7, "static world collision remains solid");
    follower.dispose();
  } finally {
    world.free();
  }
});
