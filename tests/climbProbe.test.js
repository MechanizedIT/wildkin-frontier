import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '../vendor/rapier.js';
import { createCharacterPhysics } from '../src/physics/createCharacterPhysics.js';
import { createPhysicsWorld } from '../src/physics/createPhysicsWorld.js';
import { createClimbProbe, CLIMB_PROBE_CONFIG } from '../src/movement/climbProbe.js';
import { createFrontierChunk, sampleFrontier } from '../src/world/frontierTerrain.js';

await RAPIER.init();

const emptyPlayground = () => ({
  terrainSurfaces: [], groundPatches: [{ collisionEnabled: false }],
  obstacles: [], platforms: [], boundaries: [],
});

function sceneryBox(id, traversalSurface = 'scenery') {
  return {
    id, traversalSurface, sectionId: 'camp', origin: { x: 0, z: 0 },
    // Same closed-box topology used by F2C trunk/stone streamed surfaces.
    vertices: new Float32Array([
      -0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5,
      -0.5, 2, -0.5, 0.5, 2, -0.5, 0.5, 2, 0.5, -0.5, 2, 0.5,
    ]),
    indices: new Uint32Array([
      0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
      0, 5, 1, 0, 4, 5, 1, 6, 2, 1, 5, 6,
      2, 7, 3, 2, 6, 7, 3, 4, 0, 3, 7, 4,
    ]),
  };
}

function terraceFixture(t) {
  const physics = createPhysicsWorld(RAPIER, emptyPlayground());
  t.after(() => physics.world.free());
  const surface = { ...createFrontierChunk(0, -3), sectionId: 'field' };
  physics.updateTerrainSurfaces({ add: [surface] });
  const half = 1.04 / 2;
  const position = { x: 32, z: -123.5 };
  position.y = sampleFrontier(position.x, position.z).height + half + 0.03;
  const character = createCharacterPhysics(RAPIER, physics.world, position);
  return { physics, character, probe: createClimbProbe({ characterPhysics: character, physicsWorld: physics }), position, surface };
}

test('real terrace south face produces one stable physical ledge candidate while its ramp does not', t => {
  const { physics, probe, position } = terraceFixture(t);
  const candidate = probe.findCandidate({ position, approach: { x: 0, z: -1 } });
  assert.ok(candidate);
  assert.equal(candidate.surfaceId, '0,-3');
  assert.ok(candidate.contact.z >= -124.08 && candidate.contact.z <= -124);
  assert.ok(candidate.topY - (position.y - 0.52) > 2.8 && candidate.topY - (position.y - 0.52) < 3.3);
  assert.ok(candidate.normal.z > 0.99);
  assert.equal(Object.isFrozen(candidate), true);
  assert.equal(Object.isFrozen(candidate.contact), true);
  assert.equal(probe.isExitClear(candidate), true);

  const rampPos = { x: 24, z: -116.5 };
  rampPos.y = sampleFrontier(rampPos.x, rampPos.z).height + 0.55;
  const rampCharacter = createCharacterPhysics(RAPIER, physics.world, rampPos);
  const rampProbe = createClimbProbe({ characterPhysics: rampCharacter, physicsWorld: physics });
  assert.equal(rampProbe.findCandidate({ position: rampPos, approach: { x: 0, z: -1 } }), null);
});

test('candidate survives the lip grace, then invalidates when its streamed surface retires', t => {
  const { physics, probe, position, surface } = terraceFixture(t);
  const candidate = probe.findCandidate({ position, approach: { x: 0, z: -1 } });
  assert.ok(candidate);
  const lipCenter = { ...candidate.exitCenter, y: candidate.topY + 0.52 + CLIMB_PROBE_CONFIG.exitClearance + 0.05 };
  assert.equal(probe.hasRemainingFace(candidate, lipCenter), true, 'face remains valid through the ledge-exit center');
  physics.updateTerrainSurfaces({ remove: [surface.id] });
  assert.equal(probe.isCandidateValid(candidate), false);
  assert.equal(probe.hasRemainingFace(candidate, position), false);
  assert.equal(probe.isExitClear(candidate), false);
});

test('a nearer solid cannot be probed through to a climbable face behind it', t => {
  const {physics,probe,position}=terraceFixture(t);
  physics.world.createCollider(RAPIER.ColliderDesc.cuboid(.5,1,.045).setTranslation(32,position.y,-123.9));
  physics.world.step();
  assert.equal(probe.findCandidate({position,approach:{x:0,z:-1}}),null);
});

test('only terrain and explicitly classified rock obstacles enter traversal queries', t => {
  const playground = emptyPlayground();
  playground.obstacles = [
    { id: 'rock-face', x: 0, z: 0, w: 2, h: 1, height: 3, baseY: 0, traversalSurface: 'rock' },
    { id: 'canopy', x: 4, z: 0, w: 2, h: 1, height: 3, baseY: 0, visualAssetId: 'asset_verge_canopy' },
    { id: 'low-stone', x: 8, z: 0, w: 2, h: 1, height: 3, baseY: 0, visualAssetId: 'asset_fen_stone' },
  ];
  playground.boundaries = [{ id: 'boundary', x: 12, y: 0, z: 0, w: 2, h: 3, d: 1 }];
  const physics = createPhysicsWorld(RAPIER, playground);
  t.after(() => physics.world.free());
  assert.equal(physics.traversalColliders.size, 1);
  const character = createCharacterPhysics(RAPIER, physics.world, { x: 0, y: 0.55, z: 1.2 });
  const probe = createClimbProbe({ characterPhysics: character, physicsWorld: physics });
  const candidate = probe.findCandidate({ position: character.getPosition(), approach: { x: 0, z: -1 } });
  assert.equal(candidate?.surfaceId, 'rock-face');
});

test('streamed F2C scenery remains physically solid without entering natural traversal', t => {
  const physics = createPhysicsWorld(RAPIER, emptyPlayground());
  t.after(() => physics.world.free());
  const trunk = sceneryBox('f2c:stage-tree-west-1:trunk');
  const rock = sceneryBox('0,-3:terrace:rock:test', 'rock');
  rock.origin.x = 3;
  const unclassified = sceneryBox('legacy-prop-surface');
  delete unclassified.traversalSurface;
  unclassified.origin.x = 6;
  physics.updateTerrainSurfaces({ add: [trunk, rock, unclassified] });
  const trunkCollider = physics.staticColliders.find(c => physics.getColliderSurfaceId(c) === trunk.id);
  const rockCollider = physics.staticColliders.find(c => physics.getColliderSurfaceId(c) === rock.id);
  const unclassifiedCollider = physics.staticColliders.find(c => physics.getColliderSurfaceId(c) === unclassified.id);
  assert.ok(trunkCollider && rockCollider && unclassifiedCollider);
  assert.equal(physics.cameraColliders.has(trunkCollider), true);
  assert.equal(physics.isTraversalColliderActive(trunkCollider), false);
  assert.equal(physics.isTraversalColliderActive(unclassifiedCollider), false);
  assert.equal(physics.isTraversalColliderActive(rockCollider), true);
  const hit = physics.world.castRay(new RAPIER.Ray({ x: 0, y: 1, z: 2 }, { x: 0, y: 0, z: -1 }), 4, true);
  assert.equal(hit?.collider, trunkCollider, 'the excluded scenery surface still blocks physical queries');
  physics.updateTerrainSurfaces({ remove: [trunk.id] });
  assert.equal(physics.cameraColliders.has(trunkCollider), false);
  assert.equal(physics.traversalColliders.has(trunkCollider), false);
});

test('character spatial queries exclude self, sensors and injected ignored actors but reject solid overlap', t => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  t.after(() => world.free());
  const sensor = world.createCollider(RAPIER.ColliderDesc.cuboid(0.4, 0.4, 0.1).setTranslation(0, 1, 1).setSensor(true));
  const ignored = world.createCollider(RAPIER.ColliderDesc.cuboid(0.4, 0.5, 0.2).setTranslation(0, 1, 0));
  const solid = world.createCollider(RAPIER.ColliderDesc.cuboid(0.4, 0.5, 0.2).setTranslation(0, 1, -1));
  world.step();
  const character = createCharacterPhysics(RAPIER, world, { x: 0, y: 1, z: 2 }, { shouldIgnoreCollider: c => c === ignored });
  const hit = character.castRay({ x: 0, y: 1, z: 2 }, { x: 0, y: 0, z: -1 }, 4);
  assert.equal(hit?.collider, solid);
  assert.notEqual(hit?.collider, sensor);
  assert.equal(character.isCapsuleAtPositionClear({ x: 0, y: 1, z: 0 }), true);
  assert.equal(character.isCapsuleAtPositionClear({ x: 0, y: 1, z: -1 }), false);
  assert.equal(character.isCapsuleAtPositionClear(character.getPosition()), true, 'the query excludes the character itself');
});
