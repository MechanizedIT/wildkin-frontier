import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createStaticWorld } from '../src/world/staticWorldBuilder.js';
import { createPhysicsWorld } from '../src/physics/createPhysicsWorld.js';
import { createCharacterPhysics } from '../src/physics/createCharacterPhysics.js';
import { createPlayerController } from '../src/player/playerController.js';
import { createFrontierChunkRuntime } from '../src/world/frontierChunkRuntime.js';
import { MOVEMENT_CONFIG } from '../src/game/config.js';

await RAPIER.init();

test('the real controller walks across the open Camp edge and streamed chunk boundaries', t => {
  const surface = { seed: 11, heights: [], water: [], routes: [], detail: { grassDensity: 0 } };
  const camp = { id: 'camp', bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }, surface,
    boundaryColliders: [{ id: 'north-wall', x: 0, z: -50, w: 100, h: 4, d: 1 }], props: [] };
  const playground = createStaticWorld({ regions: [camp] }, { openSections: ['camp'] });
  assert.equal(playground.terrainSurfaces.length, 1, 'open Camp has ground but no escarpment ring');
  assert.equal(playground.boundaries.length, 0, 'the old exterior wall cannot block the frontier');
  const physics = createPhysicsWorld(RAPIER, playground);
  const chunks = createFrontierChunkRuntime({ parent: playground.group, physicsWorld: physics, campSurface: surface });
  t.after(() => { chunks.dispose(); physics.world.free(); });
  playground.setActiveSection('camp'); physics.setActiveSection('camp');
  playground.setTerrainHeightProvider('camp', chunks.getHeight);
  const character = createCharacterPhysics(RAPIER, physics.world, { x: 0, y: .55, z: -44 });
  const camera = new THREE.PerspectiveCamera(); camera.lookAt(0, 0, -1);
  const controller = createPlayerController(new THREE.Group(), playground, camera, MOVEMENT_CONFIG, character);
  controller.syncPosFromPhysics();
  const intent = { moveX: 0, moveY: -1, moveMagnitude: .72, movementBand: 'walk', jumpRequested: false, dodgeRequested: false };
  let maximumResidents = 0, worstSupportError = 0;
  for (let frame = 0; frame < 1800; frame++) {
    chunks.update(controller.state.pos, { activeSectionId: 'camp' });
    controller.update(1 / 60, intent, {});
    maximumResidents = Math.max(maximumResidents, chunks.getDebugState().residentCount);
    const p = controller.state.pos;
    // Capsule base should remain near the same terrain used by rendering and camera.
    worstSupportError = Math.max(worstSupportError, Math.abs(p.y - .52 - playground.getTerrainHeight(p.x, p.z)));
  }
  assert.ok(controller.state.pos.z < -105, `walk reaches another chunk: ${controller.state.pos.z}`);
  assert.ok(worstSupportError < .22, `no falling through streamed support: ${worstSupportError}`);
  assert.ok(maximumResidents <= 25, 'travel cannot grow the live terrain window');
  assert.ok(controller.state.grounded, 'the final slope supports the player');
  chunks.update(controller.state.pos, { activeSectionId: 'camp', authorMode: true });
  assert.equal(chunks.getDebugState().residentCount, 0, 'Author editing does not retain procedural colliders');
});
