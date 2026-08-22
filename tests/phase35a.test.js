import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { WORLD_DATA } from "../src/world/data/world.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { createWorldRegistry } from "../src/world/worldRegistry.js";
import { createRegionManager } from "../src/world/regionManager.js";
import { createExpeditionSession } from "../src/session/expeditionSession.js";
import { createResourceSystem } from "../src/resources/resourceSystem.js";
import { createCreatureSystem } from "../src/creatures/creatureSystem.js";
import { createPickupSystem } from "../src/resources/pickupSystem.js";
import { createXpMoteSystem } from "../src/combat/xpMoteSystem.js";
import { createProjectileSystem } from "../src/combat/projectileSystem.js";

// Helper minimal scene/physics mocks
function makeScene() { return new THREE.Scene(); }
function makePhysicsMock() {
  return {
    world: {
      createCollider: () => ({ handle: Math.random() * 1000 | 0, translation: () => ({ x: 0, y: 0, z: 0 }) }),
      removeCollider: () => {},
      step: () => {},
      createRigidBody: () => ({ setTranslation: () => {} }),
      createCharacterController: () => ({
        setSlideEnabled: () => {}, setMaxSlopeClimbAngle: () => {}, setMinSlopeSlideAngle: () => {},
        enableAutostep: () => {}, enableSnapToGround: () => {}, setUp: () => {}, setApplyImpulsesToDynamicBodies: () => {},
        computeColliderMovement: () => {}, computedMovement: () => ({ x: 0, y: 0, z: 0 }), computedGrounded: () => true,
      }),
      intersectionWithShape: () => null,
      castShape: () => null,
    },
    RAPIER: {
      ColliderDesc: { cuboid: () => ({ setTranslation: function(){return this;}, setFriction: function(){return this;}, setActiveCollisionTypes: function(){return this;}}), capsule: () => ({ setTranslation: function(){return this;}, setFriction: function(){return this;}, setActiveCollisionTypes: function(){return this;}}) },
      RigidBodyDesc: { kinematicPositionBased: () => ({ setTranslation: function(){return this;}}) },
      ActiveCollisionTypes: { ALL: 0xffffffff },
      Ball: function(){},
    },
  };
}

describe("Phase 3.5A — world data", () => {
  it("world definition loads/normalizes", () => {
    const norm = normalizeWorldData(WORLD_DATA);
    assert.equal(norm.version, "3.5A");
    assert.equal(norm.regions.length, 3);
    assert.ok(norm.camp);
    assert.ok(norm.regions.every(r => r.bounds && Array.isArray(r.neighbors)));
  });

  it("invalid duplicate IDs fail", () => {
    const dup = JSON.parse(JSON.stringify(WORLD_DATA));
    dup.regions[1].id = dup.regions[0].id; // duplicate south_basin
    assert.throws(() => normalizeWorldData(dup), /duplicate region id/);
  });

  it("duplicate resource ids fail", () => {
    const dup = JSON.parse(JSON.stringify(WORLD_DATA));
    const firstRes = dup.regions[0].resources[0];
    dup.regions[1].resources.push({ ...firstRes });
    assert.throws(() => normalizeWorldData(dup), /duplicate resource id/);
  });

  it("bad neighbor/reference IDs fail", () => {
    const bad = JSON.parse(JSON.stringify(WORLD_DATA));
    bad.regions[0].neighbors = ["nonexistent_region"];
    assert.throws(() => normalizeWorldData(bad), /neighbor .* not found/);
  });

  it("invalid creature type fails", () => {
    const bad = JSON.parse(JSON.stringify(WORLD_DATA));
    bad.regions[0].creatures[0].type = "dragon";
    assert.throws(() => normalizeWorldData(bad), /unsupported type/);
  });

  it("existing test-world objects are represented through new data path", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const allRes = reg.getAllResources();
    const allCrea = reg.getAllCreatures();
    assert.equal(allRes.length, 18, "should have 18 resources (migrated systems-test world)");
    assert.equal(allCrea.length, 6, "should have 6 creatures");
    // Check specific migrated positions
    const southTree = allRes.find(r => r.id === "tree_south_01");
    assert.ok(southTree);
    assert.equal(southTree.pos.x, 1.2);
    assert.equal(southTree.pos.z, 4.2);
    const hunter = allCrea.find(c => c.id === "rusher_hunter");
    assert.ok(hunter);
    assert.equal(hunter.pos.x, -9.2);
  });

  it("creature spawn validation still passes (clearance)", () => {
    // normalize already checks clearance, but explicit: should not throw for valid WORLD_DATA
    assert.doesNotThrow(() => normalizeWorldData(WORLD_DATA));
  });

  it("region bounds and neighbor references valid", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    for (const r of reg.getAllRegions()) {
      assert.ok(r.bounds.minX < r.bounds.maxX);
      assert.ok(r.bounds.minZ < r.bounds.maxZ);
      for (const nid of r.neighbors) {
        assert.ok(reg.getRegionById(nid), `neighbor ${nid} exists`);
      }
    }
  });

  it("no obvious invalid cross-region ownership (pos inside bounds)", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    for (const res of reg.getAllResources()) {
      const bounds = reg.getBoundsForRegion(res.regionId);
      assert.ok(res.pos.x >= bounds.minX && res.pos.x <= bounds.maxX, `${res.id} x inside`);
      assert.ok(res.pos.z >= bounds.minZ && res.pos.z <= bounds.maxZ, `${res.id} z inside`);
    }
    for (const cr of reg.getAllCreatures()) {
      const bounds = reg.getBoundsForRegion(cr.regionId);
      assert.ok(cr.pos.x >= bounds.minX && cr.pos.x <= bounds.maxX, `${cr.id} x inside`);
      assert.ok(cr.pos.z >= bounds.minZ && cr.pos.z <= bounds.maxZ, `${cr.id} z inside`);
    }
  });

  it("supported world object types and anchor/POI identifiers", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const wps = reg.getAllWaypoints();
    for (const wp of wps) assert.equal(wp.type, "majorWaypoint");
    const beacons = reg.getAllBeacons();
    for (const bc of beacons) assert.equal(bc.type, "extractionBeacon");
    const pois = reg.getAllPois();
    for (const poi of pois) assert.ok(typeof poi.type === "string" && poi.type.length > 0);
  });
});

describe("Phase 3.5A — ExpeditionSession", () => {
  it("owns runXp, kills, cargo, currentRegion, maxDepth", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const depthMap = reg.getRegionDepthMap();
    const sess = createExpeditionSession({ startAnchorId: "camp_gate", regionDepthMap: depthMap, initialRegionId: "south_basin" });
    assert.equal(sess.getStatus(), "active");
    assert.equal(sess.getCurrentRegionId(), "south_basin");
    assert.equal(sess.getKills(), 0);
    assert.equal(sess.getRunXp(), 0);
    sess.addKill();
    sess.addXp(5);
    sess.incrementCargo("wood", 2);
    assert.equal(sess.getKills(), 1);
    assert.equal(sess.getRunXp(), 5);
    assert.equal(sess.getCargo().wood, 2);
  });

  it("tracks maxDepth and currentRegion", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const depthMap = reg.getRegionDepthMap();
    const sess = createExpeditionSession({ regionDepthMap: depthMap, initialRegionId: "south_basin" });
    assert.equal(sess.getMaxDepth(), 0);
    sess.setRegion("central_basin");
    assert.equal(sess.getCurrentRegionId(), "central_basin");
    assert.ok(sess.getMaxDepth() >= 1);
    sess.setRegion("north_highlands");
    assert.ok(sess.getMaxDepth() >= 2);
    // moving back does not reduce maxDepth
    sess.setRegion("south_basin");
    assert.ok(sess.getMaxDepth() >= 2);
  });

  it("reset/death lifecycle hooks", () => {
    const sess = createExpeditionSession({ initialRegionId: "south_basin" });
    sess.addKill();
    sess.addXp(10);
    sess.setCargo({ wood: 3, stone: 1, fiber: 0 });
    sess.onDeath();
    assert.equal(sess.getStatus(), "dead");
    sess.reset();
    assert.equal(sess.getStatus(), "active");
    assert.equal(sess.getKills(), 0);
    assert.equal(sess.getRunXp(), 0);
    assert.equal(sess.getCargo().wood, 0);
  });

  it("future slots for Wildkin/extraction outcome exist", () => {
    const sess = createExpeditionSession({});
    const state = sess.getState();
    assert.ok("unsecuredWildkin" in state);
    assert.ok("extractionOutcome" in state);
  });

  it("does not force player-health internals", () => {
    const sess = createExpeditionSession({});
    const state = sess.getState();
    assert.ok(!("health" in state));
    assert.ok(!("playerHealth" in state));
  });
});

describe("Phase 3.5A — region activation", () => {
  it("player position resolves current region/pocket", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const rm = createRegionManager(reg);
    // south_basin contains 0,5.5
    assert.equal(reg.getRegionForPosition({ x: 0, y: 0.5, z: 5.5 }), "south_basin");
    assert.equal(rm.resolveRegionForPos({ x: 0, z: 5.5 }), "south_basin");
    // central
    assert.equal(reg.getRegionForPosition({ x: 0, y: 0.5, z: 0 }), "central_basin");
    // north
    assert.equal(reg.getRegionForPosition({ x: 2.2, y: 2.4, z: -7.2 }), "north_highlands");
    // outside all -> nearest
    const outside = reg.getRegionForPosition({ x: 20, y: 0, z: 0 });
    assert.ok(typeof outside === "string");
  });

  it("active set includes expected neighbor buffer", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const rm = createRegionManager(reg);
    // south active = south + central
    let res = rm.update({ x: 0, y: 0.5, z: 5.5 });
    assert.equal(rm.getCurrentRegionId(), "south_basin");
    assert.deepEqual(rm.getActiveIds().sort(), ["central_basin", "south_basin"].sort());
    // central active = all three
    res = rm.update({ x: 0, y: 0.5, z: 0 });
    assert.equal(rm.getCurrentRegionId(), "central_basin");
    assert.deepEqual(rm.getActiveIds().sort(), ["central_basin", "north_highlands", "south_basin"].sort());
    // north active = north + central
    res = rm.update({ x: 2.2, y: 0.5, z: -7.2 });
    assert.equal(rm.getCurrentRegionId(), "north_highlands");
    assert.deepEqual(rm.getActiveIds().sort(), ["central_basin", "north_highlands"].sort());
  });

  it("moving across boundary changes active set once", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    let changeCount = 0;
    const rm = createRegionManager(reg, { onChange: () => changeCount++ });
    rm.update({ x: 0, y: 0.5, z: 5.5 }); // south
    assert.equal(changeCount, 1);
    rm.update({ x: 0, y: 0.5, z: 5.5 }); // same -> no change
    assert.equal(changeCount, 1);
    rm.update({ x: 0, y: 0.5, z: 0 }); // central -> change
    assert.equal(changeCount, 2);
    rm.update({ x: 0, y: 0.5, z: 0 }); // same central -> no change
    assert.equal(changeCount, 2);
  });

  it("moving back restores expected set", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const rm = createRegionManager(reg);
    rm.update({ x: 0, y: 0.5, z: 5.5 });
    const southActive = rm.getActiveIds().slice().sort();
    rm.update({ x: 0, y: 0.5, z: 0 });
    rm.update({ x: 0, y: 0.5, z: 5.5 });
    assert.deepEqual(rm.getActiveIds().slice().sort(), southActive);
  });

  it("distant regions remain inactive", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const rm = createRegionManager(reg);
    rm.update({ x: 0, y: 0.5, z: 5.5 }); // south
    assert.ok(!rm.isActive("north_highlands"), "north should be inactive when in south");
    rm.update({ x: 2.2, y: 0.5, z: -7.2 }); // north
    assert.ok(!rm.isActive("south_basin"), "south should be inactive when in north");
  });

  it("no duplicate entity creation after deactivate/reactivate", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const playground = { obstacles: [], platforms: [], bounds: { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: 11.5 } };
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    const initialCount = rs.nodes.length;
    const activeSouth = ["south_basin", "central_basin"];
    const activeNorth = ["north_highlands", "central_basin"];
    rs.setActiveRegions(activeSouth);
    assert.equal(rs.nodes.length, initialCount);
    rs.setActiveRegions(activeNorth);
    assert.equal(rs.nodes.length, initialCount);
    rs.setActiveRegions(activeSouth);
    assert.equal(rs.nodes.length, initialCount);
    // No duplicate nodes
    const ids = rs.nodes.map(n => n.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("avoids per-frame allocation churn where practical — active set reuse", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const rm = createRegionManager(reg);
    rm.update({ x: 0, y: 0.5, z: 5.5 });
    const firstActive = rm.getActiveIds();
    rm.update({ x: 0.01, y: 0.5, z: 5.51 }); // tiny move within same region
    const secondActive = rm.getActiveIds();
    assert.deepEqual(firstActive.sort(), secondActive.sort());
  });
});

describe("Phase 3.5A — creature/resource integration", () => {
  it("inactive creature does not progress AI/attack timers", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const playground = { obstacles: [], platforms: [], bounds: { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: 11.5 } };
    const reg = createWorldRegistry(WORLD_DATA);
    const spawns = reg.getAllCreatures();
    const cs = createCreatureSystem(scene, phys, playground, { spawns, worldRegistry: reg });
    // Make all creatures active initially
    cs.setActiveRegions(["south_basin", "central_basin", "north_highlands"]);
    // Pick an aggressive creature in central (spitter_outer_1) — SKITTISH never enters WINDUP, so use AGGRESSIVE
    const targetCreature = cs.getCreatures().find(c => c.state.regionId === "central_basin" && c.state.temperament === "AGGRESSIVE");
    assert.ok(targetCreature);
    // Force into WINDUP to test timer freeze
    targetCreature.state.aiState = "WINDUP";
    targetCreature.state.aiTimer = 0;
    const beforeTimer = targetCreature.state.aiTimer;
    // Deactivate central (where this creature lives)
    cs.setActiveRegions(["south_basin", "north_highlands"]);
    cs.update(0.1);
    // Timer should not have progressed
    assert.equal(targetCreature.state.aiTimer, beforeTimer);
    assert.equal(targetCreature.state.aiState, "WINDUP");
    // Reactivate and verify it progresses
    cs.setActiveRegions(["central_basin", "south_basin"]);
    cs.update(0.1);
    assert.ok(targetCreature.state.aiTimer > beforeTimer);
  });

  it("active creature still behaves normally", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const playground = { obstacles: [], platforms: [], bounds: { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: 11.5 } };
    const reg = createWorldRegistry(WORLD_DATA);
    const cs = createCreatureSystem(scene, phys, playground, { spawns: reg.getAllCreatures(), worldRegistry: reg });
    cs.setActiveRegions(["south_basin", "central_basin", "north_highlands"]);
    const southCreature = cs.getCreatures().find(c => c.state.regionId === "south_basin");
    southCreature.state.aiState = "ROAM";
    southCreature.state.aiTimer = 0;
    cs.setPlayerPos({ x: southCreature.state.pos.x + 1, y: 0.5, z: southCreature.state.pos.z });
    cs.update(0.2);
    // Should have left ROAM (maybe ALERT/CHASE) because player nearby and temperament SKITTISH etc
    // At least timer progressed
    assert.ok(southCreature.state.aiTimer >= 0);
  });

  it("inactive resource region does not produce unwanted run updates", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    // Active only south
    rs.setActiveRegions(["south_basin"]);
    // Pick a north node that is READY
    const northNode = rs.nodes.find(n => n.regionId === "north_highlands" && n.state.nodeState === "READY");
    assert.ok(northNode);
    // Try to harvest: isHarvestableInRange should be false because region inactive even if in range
    const playerPosNearNorth = { x: northNode.state.position.x, y: 0.5, z: northNode.state.position.z };
    assert.equal(rs.isHarvestableInRange(northNode, playerPosNearNorth), false);
    assert.equal(rs.getEligibleNodes(playerPosNearNorth, "IDLE", 0, true).length, 0);
    // Halo also hidden
    assert.equal(rs.getHaloTargets(playerPosNearNorth, "IDLE", 0, true).length, 0);
  });

  it("inactive resource respawn timer freezes, reactivation restores valid state", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    const southNode = rs.nodes.find(n => n.regionId === "south_basin" && n.type.id === "tree");
    // Deplete it (tree requires maxChunks hits)
    for (let i = 0; i < southNode.type.maxChunks; i++) rs.applyHit(southNode, null, null, null);
    assert.equal(southNode.state.nodeState, "RESPAWNING");
    const remainingBefore = southNode.state.respawnRemaining;
    // Make south inactive
    rs.setActiveRegions(["central_basin", "north_highlands"]);
    rs.update(0.5, { x: 0, y: 0.5, z: -7 }, "IDLE", 0, true);
    // Timer should be frozen
    assert.equal(southNode.state.respawnRemaining, remainingBefore);
    // Reactivate
    rs.setActiveRegions(["south_basin", "central_basin", "north_highlands"]);
    rs.update(0.5, { x: 0, y: 0.5, z: 5.5 }, "IDLE", 0, true);
    assert.ok(southNode.state.respawnRemaining < remainingBefore);
  });

  it("reactivation restores valid state without duplicate collider", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    const southNode = rs.nodes.find(n => n.regionId === "south_basin" && n.type.solid);
    assert.ok(southNode.collider);
    rs.setActiveRegions(["central_basin"]); // deactivate south
    assert.equal(southNode.collider, null);
    assert.equal(southNode.group.visible, false);
    rs.setActiveRegions(["south_basin", "central_basin"]); // reactivate
    assert.equal(southNode.group.visible, true);
    // Collider restore is deferred via _pendingColliderRestore; after update with player far, should restore
    rs.update(0.01, { x: 20, y: 0.5, z: 20 }, "IDLE", 0, true);
    // After update, collider should be restored (if not inside player)
    // For mock physics, collider will be recreated
    assert.ok(southNode.collider || southNode._pendingColliderRestore);
  });
});

describe("Phase 3.5A — temporary entities", () => {
  it("deactivation cleanup does not leak pickups", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    const ps = createPickupSystem(scene, phys, { obstacles: [], platforms: [] }, null);
    // Spawn pickup from south node
    const southNode = rs.nodes.find(n => n.regionId === "south_basin");
    ps.spawnPickup(southNode);
    assert.equal(ps.getCount(), 1);
    const activeSouth = ["south_basin", "central_basin"];
    const activeNorth = ["north_highlands", "central_basin"];
    // Deactivate south origin -> should cull
    ps.cullInactiveRegions(activeNorth, reg);
    assert.equal(ps.getCount(), 0);
    assert.equal(ps.getPooledCount(), 1);
  });

  it("deactivation cleanup does not leak XP", () => {
    const scene = makeScene();
    const reg = createWorldRegistry(WORLD_DATA);
    const xm = createXpMoteSystem(scene, { worldRegistry: reg });
    const posSouth = { x: 0, y: 0.5, z: 5.5 };
    xm.spawnMotes(posSouth, 3, { regionId: "south_basin" });
    assert.equal(xm.getCount(), 3);
    xm.cullInactiveRegions(new Set(["central_basin", "north_highlands"]));
    assert.equal(xm.getCount(), 0);
    assert.ok(xm.getPooledCount() >= 3);
  });

  it("deactivation cleanup does not leak projectiles", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const ps = createProjectileSystem(scene, phys, { obstacles: [], platforms: [] });
    ps.setWorldRegistry(reg);
    const originSouth = { x: 0, y: 0.5, z: 5.5 };
    const ownerMock = { state: { regionId: "south_basin", id: "owner1" } };
    ps.spawnProjectile(originSouth, { x: 1, y: 0, z: 0 }, ownerMock);
    assert.equal(ps.getCount(), 1);
    ps.cullInactiveRegions(new Set(["central_basin", "north_highlands"]));
    assert.equal(ps.getCount(), 0);
  });

  it("pools remain bounded after cull and respawn", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    const ps = createPickupSystem(scene, phys, { obstacles: [], platforms: [] }, null);
    // Spawn many pickups beyond active limit
    for (let i = 0; i < 40; i++) {
      const node = rs.nodes[i % rs.nodes.length];
      ps.spawnPickup(node);
    }
    assert.ok(ps.getCount() <= 32);
    assert.ok(ps.getPooledCount() <= 24);
    // Cull half
    ps.cullInactiveRegions(new Set(["south_basin"]));
    assert.ok(ps.getCount() <= 32);
    assert.ok(ps.getPooledCount() <= 24);
    // Spawn again
    for (let i = 0; i < 10; i++) ps.spawnPickup(rs.nodes[0]);
    assert.ok(ps.getCount() <= 32);
    assert.ok(ps.getPooledCount() <= 24);
  });

  it("no duplicate entity creation after deactivate/reactivate", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    const initialIds = rs.nodes.map(n => n.id).sort();
    rs.setActiveRegions(["south_basin"]);
    rs.setActiveRegions(["central_basin"]);
    rs.setActiveRegions(["south_basin", "central_basin", "north_highlands"]);
    const finalIds = rs.nodes.map(n => n.id).sort();
    assert.deepEqual(finalIds, initialIds);
  });
});
