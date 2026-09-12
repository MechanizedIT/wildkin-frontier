import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '../vendor/rapier.js';
import { MOVEMENT_CONFIG } from '../src/game/config.js';
import { createPhysicsWorld } from '../src/physics/createPhysicsWorld.js';
import { createCharacterPhysics } from '../src/physics/createCharacterPhysics.js';
import { createClimbProbe } from '../src/movement/climbProbe.js';
import { createPlayerController } from '../src/player/playerController.js';
import { createFrontierChunk, sampleFrontier } from '../src/world/frontierTerrain.js';

await RAPIER.init();

const DT = 1 / 60;
const idle = Object.freeze({ moveX: 0, moveY: 0, moveMagnitude: 0, jumpRequested: false, dodgeRequested: false });
const climbUp = Object.freeze({ ...idle, moveY: -1, moveMagnitude: 1 });
const climbDown = Object.freeze({ ...idle, moveY: 1, moveMagnitude: 1 });
const jumpIntoFace = pressed => ({ ...climbUp, jumpRequested: pressed });

function fixture(t) {
  const playground = {
    terrainSurfaces: [], groundPatches: [{ collisionEnabled: false }], obstacles: [], platforms: [], boundaries: [],
    climbables: [], jumpTraversals: [], getGroundHeight: (x, z) => sampleFrontier(x, z).height,
  };
  const physicsWorld = createPhysicsWorld(RAPIER, playground);
  t.after(() => physicsWorld.world.free());
  const surface = { ...createFrontierChunk(0, -3), sectionId: 'camp' };
  physicsWorld.updateTerrainSurfaces({ add: [surface] });
  const initial = { x: 32, z: -123.5 };
  initial.y = sampleFrontier(initial.x, initial.z).height + 0.55;
  const characterPhysics = createCharacterPhysics(RAPIER, physicsWorld.world, initial);
  const climbProbe = createClimbProbe({ characterPhysics, physicsWorld });
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(32, 3, -120); camera.lookAt(32, 2, -130); camera.updateMatrixWorld();
  const controller = createPlayerController(new THREE.Group(), playground, camera, MOVEMENT_CONFIG, characterPhysics, { climbProbe });
  controller.state.facing = Math.PI;
  const interaction = controller.getClimbInteraction(0.2);
  assert.ok(interaction?.candidate, 'the real terrace presents a climb candidate');
  return { playground, physicsWorld, surface, characterPhysics, climbProbe, controller, interaction };
}

function activate(f) {
  assert.equal(f.controller.activateClimb(f.interaction), true);
  assert.equal(f.controller.state.mode, 'CLIMB');
  assert.equal(f.controller.state.grounded, false);
}

function updateUntil(controller, predicate, intent = climbUp, limit = 480) {
  let largestStep = 0;
  let largestRise = 0;
  for (let index = 0; index < limit; index++) {
    const before = controller.state.pos.clone();
    controller.update(DT, intent);
    largestStep = Math.max(largestStep, before.distanceTo(controller.state.pos));
    largestRise = Math.max(largestRise, controller.state.pos.y - before.y);
    if (predicate(controller, index)) return { index, largestStep, largestRise };
  }
  assert.fail(`condition was not reached within ${limit} fixed steps`);
}

test('natural terrace climb attaches, pauses without drift, and preserves signed ascent/descent', t => {
  const f = fixture(t); activate(f);
  const start = f.controller.state.pos.clone();
  for (let i = 0; i < 24; i++) f.controller.update(DT, climbUp);
  assert.ok(f.controller.state.pos.y > start.y + 0.4);
  assert.ok(f.controller.state.climbVelocity > 1.05 && f.controller.state.climbVelocity < 1.2);
  const held = f.controller.state.pos.clone();
  for (let i = 0; i < 30; i++) f.controller.update(DT, idle);
  assert.ok(f.controller.state.pos.distanceTo(held) < 1e-4, 'resting input holds the same physical grip');
  assert.equal(f.controller.state.climbVelocity, 0);
  for (let i = 0; i < 12; i++) f.controller.update(DT, climbDown);
  assert.ok(f.controller.state.pos.y < held.y - 0.15);
  assert.ok(f.controller.state.climbVelocity < -0.8 && f.controller.state.climbVelocity > -1);
});

test('repeated ordinary jumps into the tall terrace face cannot ratchet onto the shelf', t => {
  const f = fixture(t);
  const startFeetY = f.controller.state.pos.y - 0.52;
  let maxFeetY = startFeetY;
  let jumpStarts = 0;
  let previousMode = f.controller.state.mode;

  for (let frame = 0; frame < 720; frame++) {
    // A fresh press every quarter second reproduces repeated touch-button taps.
    f.controller.update(DT, jumpIntoFace(frame % 15 === 0));
    const mode = f.controller.state.mode;
    if (mode === 'JUMP' && previousMode !== 'JUMP') jumpStarts++;
    previousMode = mode;
    maxFeetY = Math.max(maxFeetY, f.controller.state.pos.y - 0.52);
    assert.notEqual(mode, 'CLIMB', 'ordinary Jump never enters contextual climbing');
    assert.notEqual(mode, 'MANTLE', 'ordinary Jump never enters a mantle');
  }

  const finalFeetY = f.controller.state.pos.y - 0.52;
  assert.ok(jumpStarts >= 3, `the fixture exercised repeated jump edges (${jumpStarts})`);
  assert.ok(maxFeetY < f.interaction.candidate.topY - 0.8,
    `ordinary apex ${maxFeetY.toFixed(2)} must remain below terrace top ${f.interaction.candidate.topY.toFixed(2)}`);
  assert.ok(maxFeetY < startFeetY + 1.7,
    `repeated presses cannot accumulate height (${(maxFeetY - startFeetY).toFixed(2)}m rise)`);
  assert.ok(finalFeetY < f.interaction.candidate.topY - 2.5,
    `player must finish on the lower side of the face (${finalFeetY.toFixed(2)}m feet)`);
});

test('natural climb reaches a supported mantle through bounded Rapier movement', t => {
  const f = fixture(t); activate(f);
  let sawMantle = false;
  const result = updateUntil(f.controller, controller => {
    sawMantle ||= controller.state.mode === 'MANTLE';
    return sawMantle && controller.state.mode === 'IDLE';
  });
  assert.equal(sawMantle, true);
  assert.equal(f.controller.state.grounded, true);
  assert.ok(f.controller.state.pos.distanceTo(new THREE.Vector3(
    f.interaction.candidate.exitCenter.x,
    f.interaction.candidate.exitCenter.y - 0.012,
    f.interaction.candidate.exitCenter.z,
  )) < 0.08);
  assert.ok(result.largestStep < 0.08, `largest fixed-step movement was ${result.largestStep.toFixed(3)}m`);
  assert.equal(f.controller.consumeLandingImpact(), null);
});

test('activation rejects a retired and recreated stale candidate', t => {
  const f = fixture(t);
  f.physicsWorld.updateTerrainSurfaces({ remove: [f.surface.id] });
  f.physicsWorld.updateTerrainSurfaces({ add: [f.surface] });
  assert.equal(f.controller.activateClimb(f.interaction), false);
  assert.equal(f.controller.state.mode, 'IDLE');
  assert.equal(f.controller.state.grounded, true);
});

test('retiring the active face detaches on the next fixed step', t => {
  const f = fixture(t); activate(f);
  f.controller.update(DT, climbUp);
  const before = f.controller.state.pos.clone();
  f.physicsWorld.updateTerrainSurfaces({ remove: [f.surface.id] });
  f.controller.update(DT, idle);
  assert.equal(f.controller.state.mode, 'FALL');
  assert.equal(f.controller.state.grounded, false);
  assert.ok(f.controller.state.pos.distanceTo(before) < 1e-5, 'retirement detaches without a position jump');
});

test('blocked natural exit drops to the lower clearing without turning the cliff face into support', t => {
  const f = fixture(t); activate(f);
  let teleports = 0;
  const setPosition = f.characterPhysics.setPosition;
  f.characterPhysics.setPosition = position => { teleports++; return setPosition(position); };
  const exit = f.interaction.candidate.exitCenter;
  f.physicsWorld.world.createCollider(RAPIER.ColliderDesc.cuboid(0.28, 0.35, 0.28).setTranslation(exit.x, exit.y, exit.z));
  f.physicsWorld.world.step();
  let sawFall = false;
  const result = updateUntil(f.controller, controller => {
    sawFall ||= controller.state.mode === 'FALL';
    return sawFall && controller.state.mode === 'IDLE';
  }, climbUp, 600);
  const feetY = f.controller.state.pos.y - 0.52;
  assert.ok(feetY < f.interaction.candidate.topY - 2.5, `landing feet ${feetY.toFixed(2)} must reach the lower clearing`);
  const support = f.characterPhysics.castRay(
    { x: f.controller.state.pos.x, y: feetY + 0.1, z: f.controller.state.pos.z },
    { x: 0, y: -1, z: 0 }, 0.25,
  );
  assert.ok(support && support.normal.y > 0.9 && support.distance < 0.15,
    `lower landing needs walkable support (${JSON.stringify(support?.normal)}, ${support?.distance})`);
  assert.equal(teleports, 0, 'the blocked exit is resolved only through KCC movement');
  assert.ok(result.largestRise < 0.03, `the falling path never jumps upward (${result.largestRise.toFixed(3)}m max rise)`);
  assert.ok(f.controller.state.pos.distanceTo(new THREE.Vector3(exit.x, exit.y, exit.z)) > 2,
    'the blocked exit cannot arrive at the mantle destination');
  assert.equal(f.controller.consumeLandingImpact(), null, 'the sub-threshold release does not cause damage');
  assert.equal(f.controller.consumeLandingImpact(), null);
});

test('a full-height blocked release emits exactly one harmful landing impact', t => {
  const f = fixture(t); activate(f);
  const candidate = f.interaction.candidate;
  const exit = candidate.exitCenter;
  f.physicsWorld.world.createCollider(RAPIER.ColliderDesc.cuboid(0.28, 0.35, 0.28).setTranslation(exit.x, exit.y, exit.z));
  f.physicsWorld.world.step();

  const highGrip = { x: f.controller.state.pos.x, y: candidate.topY + 0.52, z: f.controller.state.pos.z };
  f.characterPhysics.setPosition(highGrip);
  f.controller.syncPosFromPhysics();
  const peakFeetY = f.controller.state.pos.y - 0.52;
  f.controller.update(DT, climbUp);
  assert.equal(f.controller.state.mode, 'FALL');
  updateUntil(f.controller, controller => controller.state.mode === 'IDLE', idle, 600);

  const landingFeetY = f.controller.state.pos.y - 0.52;
  assert.ok(peakFeetY - landingFeetY > 2.4, `measured drop was ${(peakFeetY - landingFeetY).toFixed(2)}m`);
  assert.equal(f.controller.consumeLandingImpact()?.damage, 1);
  assert.equal(f.controller.consumeLandingImpact(), null);
});

test('resetJumpState clears active climbing without a phantom landing', t => {
  const f = fixture(t); activate(f);
  for (let i = 0; i < 20; i++) f.controller.update(DT, climbUp);
  f.controller.resetJumpState();
  assert.equal(f.controller.state.mode, 'IDLE');
  assert.equal(f.controller.state.climbable, null);
  assert.equal(f.controller.state.mantleData, null);
  assert.equal(f.controller.state.climbVelocity, 0);
  assert.equal(f.controller.consumeLandingImpact(), null);
});

test('knockback detaches the grip and gravity continues while the hit moves the player', t => {
  const f=fixture(t);activate(f);
  for(let i=0;i<55;i++)f.controller.update(DT,climbUp);
  const before=f.controller.state.pos.y;
  f.controller.update(DT,idle,{knockback:{remaining:.2,dir:{x:0,z:1},speed:2}});
  assert.equal(f.controller.state.mode,'FALL');
  assert.equal(f.controller.state.climbable,null);
  assert.ok(f.controller.state.pos.y<before);
  assert.ok(f.controller.state.verticalVelocity<0);
});

test('a newly blocked authored exit falls without teleporting or claiming grounded', t => {
  const f = fixture(t);
  const candidate = f.interaction.candidate;
  f.playground.climbables.push({
    id: 'authored-terrace-face', x: candidate.contact.x, z: candidate.contact.z,
    bottomY: f.controller.state.pos.y - 0.52, topY: candidate.topY,
    approachDir: { x: -candidate.normal.x, z: -candidate.normal.z },
    mantleExit: { x: candidate.exitCenter.x, z: candidate.exitCenter.z },
  });
  f.controller.update(DT, climbUp);
  assert.equal(f.controller.state.mode, 'CLIMB');
  const exit = candidate.exitCenter;
  f.physicsWorld.world.createCollider(RAPIER.ColliderDesc.cuboid(0.28, 0.35, 0.28).setTranslation(exit.x, exit.y, exit.z));
  f.physicsWorld.world.step();
  const result = updateUntil(f.controller, controller => controller.state.mode === 'FALL', climbUp);
  assert.equal(f.controller.state.grounded, false);
  assert.ok(f.controller.state.pos.distanceTo(new THREE.Vector3(exit.x, exit.y, exit.z)) > 0.4);
  assert.ok(result.largestStep < 0.12);
});
