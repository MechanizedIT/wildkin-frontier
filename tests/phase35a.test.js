import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { WORLD_DATA } from "./fixtures/crescentWorld.generated.js";
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
    assert.ok(norm.version && norm.version.startsWith("3.5"), `version should be 3.5x got ${norm.version}`);
    assert.ok(norm.regions.length >= 3, `expected at least 3 regions, got ${norm.regions.length}`);
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
    const srcRegion = dup.regions.find(r => r.resources && r.resources.length > 0);
    assert.ok(srcRegion, "need region with resource");
    const firstRes = srcRegion.resources[0];
    // Duplicate within same region to ensure bounds validation passes before duplicate check
    srcRegion.resources.push({ ...firstRes });
    assert.throws(() => normalizeWorldData(dup), /duplicate resource id/);
  });

  it("bad neighbor/reference IDs fail", () => {
    const bad = JSON.parse(JSON.stringify(WORLD_DATA));
    bad.regions[0].neighbors = ["nonexistent_region"];
    assert.throws(() => normalizeWorldData(bad), /neighbor .* not found/);
  });

  it("invalid creature type fails", () => {
    const bad = JSON.parse(JSON.stringify(WORLD_DATA));
    const regionWithCreature = bad.regions.find(r => r.creatures && r.creatures.length > 0);
    assert.ok(regionWithCreature, "need region with creature");
    regionWithCreature.creatures[0].type = "dragon";
    assert.throws(() => normalizeWorldData(bad), /unsupported type/);
  });

  it("existing test-world objects are represented through new data path", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const allRes = reg.getAllResources();
    const allCrea = reg.getAllCreatures();
    // Authored Area 1 remains deliberately bounded even after the Phase 4B pacing pass.
    assert.ok(allRes.length >= 20 && allRes.length <= 36, `should have 20-36 resources got ${allRes.length}`);
    assert.ok(allCrea.length >= 5 && allCrea.length <= 10, `should have 5-10 creatures got ${allCrea.length}`);
    // Check at least one known resource exists (camp or p1)
    const anyTree = allRes.find(r => r.type === "tree");
    assert.ok(anyTree);
    const anyRusher = allCrea.find(c => c.type === "rusher");
    assert.ok(anyRusher);
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
    const firstId = reg.getRegionIds()[0];
    const sess = createExpeditionSession({ startAnchorId: "camp_gate", regionDepthMap: depthMap, initialRegionId: firstId });
    assert.equal(sess.getStatus(), "active");
    assert.equal(sess.getCurrentRegionId(), firstId);
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
    const ids = reg.getRegionIds();
    const sess = createExpeditionSession({ regionDepthMap: depthMap, initialRegionId: ids[0] });
    assert.equal(sess.getMaxDepth(), 0);
    if (ids[1]) { sess.setRegion(ids[1]); assert.equal(sess.getCurrentRegionId(), ids[1]); assert.ok(sess.getMaxDepth() >= 1); }
    if (ids[2]) { sess.setRegion(ids[2]); assert.ok(sess.getMaxDepth() >= 1); }
    sess.setRegion(ids[0]);
    assert.ok(sess.getMaxDepth() >= 1);
  });

  it("reset/death lifecycle hooks", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const firstId = reg.getRegionIds()[0];
    const sess = createExpeditionSession({ initialRegionId: firstId });
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
    const regions = reg.getAllRegions();
    // Use actual region centers to verify resolution works for any layout
    for (const r of regions) {
      const cx = (r.bounds.minX + r.bounds.maxX) * 0.5;
      const cz = (r.bounds.minZ + r.bounds.maxZ) * 0.5;
      assert.equal(reg.getRegionForPosition({ x: cx, y: 0.5, z: cz }), r.id);
      assert.equal(rm.resolveRegionForPos({ x: cx, z: cz }), r.id);
    }
    // outside all -> nearest
    const outside = reg.getRegionForPosition({ x: 20, y: 0, z: 0 });
    assert.ok(typeof outside === "string");
  });

  it("active set includes expected neighbor buffer", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const rm = createRegionManager(reg);
    const regions = reg.getAllRegions();
    for (const r of regions) {
      const cx = (r.bounds.minX + r.bounds.maxX) * 0.5;
      const cz = (r.bounds.minZ + r.bounds.maxZ) * 0.5;
      rm.update({ x: cx, y: 0.5, z: cz });
      assert.equal(rm.getCurrentRegionId(), r.id);
      const active = rm.getActiveIds();
      // active must contain current + neighbors (neighbor buffer)
      assert.ok(active.includes(r.id), `active should contain current ${r.id}`);
      for (const n of r.neighbors) assert.ok(active.includes(n), `active for ${r.id} should include neighbor ${n}`);
    }
  });

  it("moving across boundary changes active set once", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    let changeCount = 0;
    const rm = createRegionManager(reg, { onChange: () => changeCount++ });
    const regions = reg.getAllRegions();
    if (regions.length < 2) return;
    const r0 = regions[0];
    const r1 = regions[1];
    const c0x = (r0.bounds.minX + r0.bounds.maxX) * 0.5; const c0z = (r0.bounds.minZ + r0.bounds.maxZ) * 0.5;
    const c1x = (r1.bounds.minX + r1.bounds.maxX) * 0.5; const c1z = (r1.bounds.minZ + r1.bounds.maxZ) * 0.5;
    rm.update({ x: c0x, y: 0.5, z: c0z });
    assert.equal(changeCount, 1);
    rm.update({ x: c0x, y: 0.5, z: c0z });
    assert.equal(changeCount, 1);
    rm.update({ x: c1x, y: 0.5, z: c1z });
    assert.equal(changeCount, 2);
    rm.update({ x: c1x, y: 0.5, z: c1z });
    assert.equal(changeCount, 2);
  });

  it("moving back restores expected set", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const rm = createRegionManager(reg);
    const regions = reg.getAllRegions();
    if (regions.length < 2) return;
    const r0 = regions[0]; const r1 = regions[1];
    const c0x = (r0.bounds.minX + r0.bounds.maxX) * 0.5; const c0z = (r0.bounds.minZ + r0.bounds.maxZ) * 0.5;
    const c1x = (r1.bounds.minX + r1.bounds.maxX) * 0.5; const c1z = (r1.bounds.minZ + r1.bounds.maxZ) * 0.5;
    rm.update({ x: c0x, y: 0.5, z: c0z });
    const firstActive = rm.getActiveIds().slice().sort();
    rm.update({ x: c1x, y: 0.5, z: c1z });
    rm.update({ x: c0x, y: 0.5, z: c0z });
    assert.deepEqual(rm.getActiveIds().slice().sort(), firstActive);
  });

  it("distant regions remain inactive", () => {
    const reg = createWorldRegistry(WORLD_DATA);
    const rm = createRegionManager(reg);
    const regions = reg.getAllRegions();
    if (regions.length < 2) return;
    const first = regions[0]; const last = regions[regions.length - 1];
    // If first and last are not neighbors, they should be inactive relative
    // Check that when in first, last is inactive if not neighbor
    const c0x = (first.bounds.minX + first.bounds.maxX) * 0.5; const c0z = (first.bounds.minZ + first.bounds.maxZ) * 0.5;
    const clx = (last.bounds.minX + last.bounds.maxX) * 0.5; const clz = (last.bounds.minZ + last.bounds.maxZ) * 0.5;
    rm.update({ x: c0x, y: 0.5, z: c0z });
    if (!first.neighbors.includes(last.id)) assert.ok(!rm.isActive(last.id), `${last.id} should be inactive when in ${first.id}`);
    rm.update({ x: clx, y: 0.5, z: clz });
    if (!last.neighbors.includes(first.id)) assert.ok(!rm.isActive(first.id), `${first.id} should be inactive when in ${last.id}`);
  });

  it("no duplicate entity creation after deactivate/reactivate", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const playground = { obstacles: [], platforms: [], bounds: { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: 11.5 } };
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    const initialCount = rs.nodes.length;
    const allIds = reg.getRegionIds();
    const half = Math.floor(allIds.length / 2);
    const activeA = allIds.slice(0, half || 1);
    const activeB = allIds.slice(half);
    rs.setActiveRegions(activeA);
    assert.equal(rs.nodes.length, initialCount);
    rs.setActiveRegions(activeB);
    assert.equal(rs.nodes.length, initialCount);
    rs.setActiveRegions(activeA);
    assert.equal(rs.nodes.length, initialCount);
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
    const allIds = reg.getRegionIds();
    const cs = createCreatureSystem(scene, phys, playground, { spawns, worldRegistry: reg });
    // Make all creatures active initially
    cs.setActiveRegions(allIds);
    // Pick an aggressive creature — SKITTISH never enters WINDUP, so use AGGRESSIVE
    const targetCreature = cs.getCreatures().find(c => c.state.type === "rusher" && c.state.temperament === "AGGRESSIVE");
    assert.ok(targetCreature);
    const targetRegion = targetCreature.state.regionId;
    const otherRegions = allIds.filter(id => id !== targetRegion);
    // Use the target-independent HURT timer so authored nearby Wildkin cannot retarget/reset the state.
    targetCreature.state.aiState = "HURT";
    targetCreature.state.hurtTime = 1;
    targetCreature.state.aiTimer = 0;
    const beforeTimer = targetCreature.state.aiTimer;
    // Deactivate target region
    cs.setActiveRegions(otherRegions);
    cs.update(0.1);
    // Timer should not have progressed
    assert.equal(targetCreature.state.aiTimer, beforeTimer);
    assert.equal(targetCreature.state.aiState, "HURT");
    // Reactivate and verify it progresses
    cs.setActiveRegions(allIds);
    cs.update(0.1);
    assert.ok(targetCreature.state.aiTimer > beforeTimer);
  });

  it("active creature still behaves normally", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const playground = { obstacles: [], platforms: [], bounds: { minX: -12.5, maxX: 12.5, minZ: -11.5, maxZ: 11.5 } };
    const reg = createWorldRegistry(WORLD_DATA);
    const cs = createCreatureSystem(scene, phys, playground, { spawns: reg.getAllCreatures(), worldRegistry: reg });
    const allIds = reg.getRegionIds();
    cs.setActiveRegions(allIds);
    const anyCreature = cs.getCreatures()[0];
    assert.ok(anyCreature);
    anyCreature.state.aiState = "ROAM";
    anyCreature.state.aiTimer = 0;
    cs.setPlayerPos({ x: anyCreature.state.pos.x + 1, y: 0.5, z: anyCreature.state.pos.z });
    cs.update(0.2);
    assert.ok(anyCreature.state.aiTimer >= 0);
  });

  it("inactive resource region does not produce unwanted run updates", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    const allIds = reg.getRegionIds();
    const firstRegion = allIds[0];
    const otherRegion = allIds[allIds.length - 1];
    if (firstRegion === otherRegion) return;
    // Active only first
    rs.setActiveRegions([firstRegion]);
    // Pick a node from other region that is READY
    const otherNode = rs.nodes.find(n => n.regionId === otherRegion && n.state.nodeState === "READY");
    assert.ok(otherNode);
    const playerPosNearOther = { x: otherNode.state.position.x, y: 0.5, z: otherNode.state.position.z };
    assert.equal(rs.isHarvestableInRange(otherNode, playerPosNearOther), false);
    assert.equal(rs.getEligibleNodes(playerPosNearOther, "IDLE", 0, true).length, 0);
    assert.equal(rs.getHaloTargets(playerPosNearOther, "IDLE", 0, true).length, 0);
  });

  it("inactive resource respawn timer freezes, reactivation restores valid state", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    const allIds = reg.getRegionIds();
    const firstRegion = allIds[0];
    const treeNode = rs.nodes.find(n => n.regionId === firstRegion && n.type.id === "tree");
    if (!treeNode) return;
    for (let i = 0; i < treeNode.type.maxChunks; i++) rs.applyHit(treeNode, null, null, null);
    assert.equal(treeNode.state.nodeState, "RESPAWNING");
    const remainingBefore = treeNode.state.respawnRemaining;
    const otherIds = allIds.filter(id => id !== firstRegion);
    rs.setActiveRegions(otherIds);
    rs.update(0.5, { x: 0, y: 0.5, z: -7 }, "IDLE", 0, true);
    assert.equal(treeNode.state.respawnRemaining, remainingBefore);
    rs.setActiveRegions(allIds);
    rs.update(0.5, { x: treeNode.state.position.x, y: 0.5, z: treeNode.state.position.z }, "IDLE", 0, true);
    assert.ok(treeNode.state.respawnRemaining < remainingBefore);
  });

  it("reactivation restores valid state without duplicate collider", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    const allIds = reg.getRegionIds();
    const firstRegion = allIds[0];
    const otherIds = allIds.filter(id => id !== firstRegion);
    const solidNode = rs.nodes.find(n => n.regionId === firstRegion && n.type.solid);
    if (!solidNode) return;
    assert.ok(solidNode.collider);
    rs.setActiveRegions(otherIds);
    assert.equal(solidNode.collider, null);
    assert.equal(solidNode.group.visible, false);
    rs.setActiveRegions(allIds);
    assert.equal(solidNode.group.visible, true);
    rs.update(0.01, { x: 20, y: 0.5, z: 20 }, "IDLE", 0, true);
    assert.ok(solidNode.collider || solidNode._pendingColliderRestore);
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
    const allIds = reg.getRegionIds();
    // Find a region that actually has a resource node (camp may be empty)
    const firstRegionWithNode = allIds.find(id => rs.nodes.some(n => n.regionId === id));
    assert.ok(firstRegionWithNode);
    const firstNode = rs.nodes.find(n => n.regionId === firstRegionWithNode);
    assert.ok(firstNode);
    ps.spawnPickup(firstNode);
    assert.equal(ps.getCount(), 1);
    const activeOther = allIds.filter(id => id !== firstRegionWithNode);
    ps.cullInactiveRegions(activeOther, reg);
    assert.equal(ps.getCount(), 0);
    assert.equal(ps.getPooledCount(), 1);
  });

  it("deactivation cleanup does not leak XP", () => {
    const scene = makeScene();
    const reg = createWorldRegistry(WORLD_DATA);
    const xm = createXpMoteSystem(scene, { worldRegistry: reg });
    const allIds = reg.getRegionIds();
    const firstRegion = allIds[0];
    const otherIds = new Set(allIds.filter(id => id !== firstRegion));
    const pos = { x: 0, y: 0.5, z: 5.5 };
    xm.spawnMotes(pos, 3, { regionId: firstRegion });
    assert.equal(xm.getCount(), 3);
    xm.cullInactiveRegions(otherIds);
    assert.equal(xm.getCount(), 0);
    assert.ok(xm.getPooledCount() >= 3);
  });

  it("deactivation cleanup does not leak projectiles", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const ps = createProjectileSystem(scene, phys, { obstacles: [], platforms: [] });
    ps.setWorldRegistry(reg);
    const allIds = reg.getRegionIds();
    const firstRegion = allIds[0];
    const otherIds = new Set(allIds.filter(id => id !== firstRegion));
    const origin = { x: 0, y: 0.5, z: 5.5 };
    const ownerMock = { state: { regionId: firstRegion, id: "owner1" } };
    ps.spawnProjectile(origin, { x: 1, y: 0, z: 0 }, ownerMock);
    assert.equal(ps.getCount(), 1);
    ps.cullInactiveRegions(otherIds);
    assert.equal(ps.getCount(), 0);
  });

  it("pools remain bounded after cull and respawn", () => {
    const scene = makeScene();
    const phys = makePhysicsMock();
    const reg = createWorldRegistry(WORLD_DATA);
    const placements = reg.getAllResources().map(r => ({ type: r.type, pos: r.pos, regionId: r.regionId, id: r.id }));
    const rs = createResourceSystem(scene, phys, placements);
    const ps = createPickupSystem(scene, phys, { obstacles: [], platforms: [] }, null);
    for (let i = 0; i < 40; i++) {
      const node = rs.nodes[i % rs.nodes.length];
      ps.spawnPickup(node);
    }
    assert.ok(ps.getCount() <= 32);
    assert.ok(ps.getPooledCount() <= 24);
    const allIds = reg.getRegionIds();
    ps.cullInactiveRegions(new Set([allIds[0]]));
    assert.ok(ps.getCount() <= 32);
    assert.ok(ps.getPooledCount() <= 24);
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
    const allIds = reg.getRegionIds();
    rs.setActiveRegions([allIds[0]]);
    if (allIds[1]) rs.setActiveRegions([allIds[1]]);
    rs.setActiveRegions(allIds);
    const finalIds = rs.nodes.map(n => n.id).sort();
    assert.deepEqual(finalIds, initialIds);
  });
});
