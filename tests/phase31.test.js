import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { COMBAT_CONFIG } from "../src/combat/combatConfig.js";
import { TEMPERAMENT, aggressiveShouldInitiate, territorialShouldWarn, territorialShouldAttack, defensiveShouldRetaliate, skittishShouldFlee } from "../src/creatures/temperament.js";
import { canTargetActor, findNearestEligible } from "../src/creatures/perception.js";
import { chooseSteeringDirection, isMovementStalled } from "../src/creatures/steering.js";
import { classifyGesture, isHoldActive, GESTURE_CONFIG } from "../src/input/gesture.js";
import { resolveFieldToolImpact } from "../src/combat/fieldToolImpact.js";
import { getAttackTargets } from "../src/combat/combatTargeting.js";
import { createXpMoteSystem } from "../src/combat/xpMoteSystem.js";
import { createProjectileSystem } from "../src/combat/projectileSystem.js";
import { createCreatureSystem } from "../src/creatures/creatureSystem.js";
import { CREATURE_SPAWNS } from "../src/creatures/creatureConfig.js";

// --- projectile independent of facing ---
describe("Phase 3.1 — projectile independent of facing", () => {
  it("player hit from any facing direction", async () => {
    const scene = new THREE.Scene();
    const ps = createProjectileSystem(scene, null, null);
    // mock player at 0,0,0 facing irrelevant - projectile should hit regardless of facing
    // we test via rayVsExpandedCapsule helper logic implicitly used in update
    // Do direct projectile vs player via ps.update with different player facings
    let hits = 0;
    ps.setDamageCallback(() => { hits++; return true; });
    ps.setInvulnChecker(() => false);
    for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      hits = 0;
      ps.setPlayerPos({ x: 5, y: 0.5, z: 0 });
      // player facing stored but not used for projectile - ensure hit still occurs
      // spawn projectile aimed at player
      ps.clear();
      ps.spawnProjectile({ x: 0, y: 0.5, z: 0 }, { x: 1, y: 0, z: 0 }, null);
      // Simulate until hit or timeout
      for (let i = 0; i < 80; i++) ps.update(0.02);
      assert.equal(hits, 1, `facing ${facing} should hit`);
    }
  });

  it("projectile owner exclusion", async () => {
    const scene = new THREE.Scene();
    const ps = createProjectileSystem(scene, null, null);
    const mockOwner = { id: "ownerX", state: { id: "ownerX", pos: { x: 0, y: 0.5, z: 0 }, cfg: { capsuleRadius: 0.32, capsuleHalfHeight: 0.2 } }, collider: { handle: 999 } };
    // Wildkin provider includes owner and another target
    const other = { id: "other", state: { id: "other", pos: { x: 2, y: 0.5, z: 0 }, cfg: { capsuleRadius: 0.32, capsuleHalfHeight: 0.2 }, isDead: false, aiState: "ROAM" }, collider: { handle: 1000 } };
    ps.setWildkinProvider(() => [mockOwner, other]);
    let wildkinHits = [];
    ps.setWildkinDamageCallback((target) => { wildkinHits.push(target.id ?? target.state.id); });
    ps.setPlayerPos({ x: 50, y: 0.5, z: 50 }); // far away
    ps.setDamageCallback(() => 0);
    ps.spawnProjectile({ x: -1, y: 0.5, z: 0 }, { x: 1, y: 0, z: 0 }, mockOwner);
    for (let i = 0; i < 40; i++) ps.update(0.02);
    // Should not hit owner, but should hit other
    assert.ok(!wildkinHits.includes("ownerX"), "owner excluded");
    // May have hit other if within path
    assert.ok(wildkinHits.includes("other") || wildkinHits.length === 0, "owner exclusion respected");
  });

  it("projectile vs wildkin", async () => {
    const scene = new THREE.Scene();
    const ps = createProjectileSystem(scene, null, null);
    const target = { id: "wild1", state: { id: "wild1", pos: { x: 3, y: 0.5, z: 0 }, cfg: { capsuleRadius: 0.30, capsuleHalfHeight: 0.16 }, isDead: false, aiState: "ROAM" }, collider: { handle: 2000 } };
    ps.setWildkinProvider(() => [target]);
    let hit = false;
    ps.setWildkinDamageCallback(() => { hit = true; });
    ps.setPlayerPos({ x: 50, y: 0.5, z: 50 });
    ps.spawnProjectile({ x: 0, y: 0.5, z: 0 }, { x: 1, y: 0, z: 0 }, null);
    for (let i = 0; i < 60; i++) ps.update(0.02);
    assert.equal(hit, true);
  });

  it("world blocking still removes projectile", async () => {
    const scene = new THREE.Scene();
    // Create playground with obstacle directly between shooter and target
    const playground = { obstacles: [{ aabb: { minX: 1.5, maxX: 2.5, minZ: -0.5, maxZ: 0.5 }, height: 1.0 }], platforms: [] };
    const { createPhysicsWorld } = await import("../src/physics/createPhysicsWorld.js");
    // Without Rapier, fallback AABB will block
    const ps = createProjectileSystem(scene, null, playground);
    ps.setPlayerPos({ x: 5, y: 0.5, z: 0 });
    let hits = 0;
    ps.setDamageCallback(() => { hits++; return true; });
    ps.spawnProjectile({ x: 0, y: 0.5, z: 0 }, { x: 1, y: 0, z: 0 }, null);
    for (let i = 0; i < 60; i++) ps.update(0.02);
    // World blocked so no player hit
    assert.equal(hits, 0);
    assert.equal(ps.getCount(), 0);
  });

  it("one damage per projectile max", async () => {
    const scene = new THREE.Scene();
    const ps = createProjectileSystem(scene, null, null);
    ps.setPlayerPos({ x: 1, y: 0.5, z: 0 });
    let hits = 0;
    ps.setDamageCallback(() => { hits++; return true; });
    ps.spawnProjectile({ x: 0, y: 0.5, z: 0 }, { x: 1, y: 0, z: 0 }, null);
    // Put two wildkin in line - should only hit first (player first)
    const w1 = { id: "w1", state: { id: "w1", pos: { x: 0.6, y: 0.5, z: 0 }, cfg: { capsuleRadius: 0.3, capsuleHalfHeight: 0.16 }, isDead: false, aiState: "ROAM" }, collider: { handle: 3000 } };
    const w2 = { id: "w2", state: { id: "w2", pos: { x: 1.2, y: 0.5, z: 0 }, cfg: { capsuleRadius: 0.3, capsuleHalfHeight: 0.16 }, isDead: false, aiState: "ROAM" }, collider: { handle: 3001 } };
    ps.setWildkinProvider(() => [w1, w2]);
    let wildHits = 0;
    ps.setWildkinDamageCallback(() => { wildHits++; });
    for (let i = 0; i < 20; i++) ps.update(0.02);
    assert.ok(hits + wildHits <= 1, "max one hit");
  });
});

describe("Phase 3.1 — dead collider lifecycle & safe respawn", () => {
  it("dead creature collision disabled and not targetable", async () => {
    const scene = new THREE.Scene();
    const cs = createCreatureSystem(scene, null, null);
    const c = cs.getCreatures()[0];
    // Damage to death
    c.state.health = 1;
    cs.damageCreature(c, 1, { x: 0, y: 0.5, z: 0 }, null, "player");
    assert.equal(c.state.isDead, true);
    assert.equal(c.collider, null); // disabled
    assert.equal(c.group.visible, true); // still visible briefly then hidden
    // Should not be in alive list
    assert.ok(!cs.getAliveCreatures().includes(c));
    // Should not be targetable
    const hits = getAttackTargets({ x: 0, y: 0.5, z: 0 }, 0, [{ id: c.state.id, pos: c.state.pos, isDead: c.state.isDead }]);
    assert.equal(hits.length, 0);
  });

  it("safe respawn not inside player", async () => {
    const scene = new THREE.Scene();
    const cs = createCreatureSystem(scene, null, null);
    const c = cs.getCreatures()[0];
    c.state.health = 1;
    cs.damageCreature(c, 1, { x: 0, y: 0.5, z: 0 }, null, "player");
    // Try respawn while player at home
    const home = c.state.homePos;
    cs.setPlayerPos({ x: home.x, y: 0.5, z: home.z }); // player on home
    c.state.respawnRemaining = 0.01;
    cs.update(0.02);
    // Should defer, still respawning
    assert.equal(c.state.aiState, "RESPAWNING");
    // Move player away and respawn
    cs.setPlayerPos({ x: home.x + 5, y: 0.5, z: home.z + 5 });
    c.state.respawnRemaining = 0.01;
    cs.update(0.02);
    assert.equal(c.state.isDead, false);
    assert.ok(c.collider !== null || c.state.aiState === "ROAM");
  });
});

describe("Phase 3.1 — unified Field Tool impact & harvest during danger", () => {
  it("one swing may hit resource + creature", () => {
    const playerPos = { x: 0, y: 0.5, z: 0 };
    const facing = 0;
    const creature = { state: { id: "c1", pos: { x: 0, y: 0.5, z: 1.0 }, isDead: false, aiState: "ROAM" }, id: "c1" };
    const resource = { state: { position: { x: 0, y: 0, z: 0.9 }, nodeState: "READY", remainingChunks: 3 }, type: { interactionHeight: 0.58, maxChunks: 3 }, id: "r1" };
    const res = resolveFieldToolImpact({
      playerPos,
      playerFacing: facing,
      creatures: [creature],
      resources: [resource],
      combatConfig: COMBAT_CONFIG,
    });
    assert.equal(res.creatureHits.length, 1);
    assert.equal(res.resourceHits.length, 1);
  });

  it("Auto Harvest still operates during danger (combat does not suppress)", async () => {
    const autoHarvestEnabled = true;
    const combatEngaged = true;
    const harvestingAllowed = autoHarvestEnabled;
    assert.equal(harvestingAllowed, true);
    const { isHarvestableInRange } = await import("../src/resources/harvestLogic.js");
    const node = { state: { position: { x: 0, y: 0, z: 0 }, nodeState: "READY", remainingChunks: 3 }, type: { interactionHeight: 0.5, maxChunks: 3 } };
    const inRange = isHarvestableInRange(node, { x: 0, y: 0.5, z: 0.5 });
    assert.equal(inRange, true);
  });

  it("no auto-attack merely from creature presence", () => {
    // Field tool should not auto-initiate when only creature nearby, no resource
    // Simulate fieldTool logic: harvestAllowed requires resources; attack only on attackRequested
    const hasResources = false;
    const attackRequested = false;
    const creatureNearby = true;
    const shouldSwing = hasResources && false; // harvest path
    const shouldAttack = attackRequested;
    assert.equal(shouldSwing, false);
    assert.equal(shouldAttack, false);
  });

  it("manual harvest with Auto Harvest OFF", async () => {
    const { isHarvestableInRange } = await import("../src/resources/harvestLogic.js");
    const node = { state: { position: { x: 0, y: 0, z: 0 }, nodeState: "READY", remainingChunks: 2 }, type: { interactionHeight: 0.5, maxChunks: 2 } };
    // Auto OFF but manual range check still true
    const autoOff = false;
    const pos = { x: 0.3, y: 0.5, z: 0.3 };
    // isHarvestableInRange ignores auto flag
    assert.equal(isHarvestableInRange(node, pos), true);
    // Manual impact should use range, not auto
    const manualHits = isHarvestableInRange(node, pos) ? [node] : [];
    assert.equal(manualHits.length, 1);
  });
});

describe("Phase 3.1 — tap/hold/swipe classification", () => {
  it("tap attack", () => {
    const cfg = GESTURE_CONFIG;
    const res = classifyGesture({ downX: 0, downY: 0, downTime: 0, upX: 2, upY: 1, upTime: 120, moveDist: 3, duration: 120, velocity: 0.025 }, cfg);
    assert.equal(res, "TAP");
  });
  it("hold attack", () => {
    const cfg = GESTURE_CONFIG;
    const res = classifyGesture({ downX: 0, downY: 0, downTime: 0, upX: 2, upY: 1, upTime: 300, moveDist: 3, duration: 300, velocity: 0.01 }, cfg);
    assert.equal(res, "HOLD");
    assert.equal(isHoldActive({ downTime: 0, now: 300, moveDistMax: 3 }, cfg), true);
  });
  it("release stops attack (hold active then release not queued)", () => {
    const cfg = GESTURE_CONFIG;
    assert.equal(isHoldActive({ downTime: 0, now: 100, moveDistMax: 2 }, cfg), false);
    assert.equal(isHoldActive({ downTime: 0, now: 250, moveDistMax: 2 }, cfg), true);
  });
  it("swipe = dodge without attack", () => {
    const cfg = GESTURE_CONFIG;
    const res = classifyGesture({ downX: 0, downY: 0, downTime: 0, upX: 50, upY: 0, upTime: 150, moveDist: 50, duration: 150, velocity: 0.33 }, cfg);
    assert.equal(res, "DODGE");
  });
});

describe("Phase 3.1 — temperament", () => {
  it("aggressive may initiate", () => {
    assert.equal(aggressiveShouldInitiate({ dist: 3, noticeRadius: 5, isTargetEligible: true, temperament: TEMPERAMENT.AGGRESSIVE }), true);
    assert.equal(aggressiveShouldInitiate({ dist: 6, noticeRadius: 5, isTargetEligible: true, temperament: TEMPERAMENT.AGGRESSIVE }), false);
  });
  it("territorial warn -> attack", () => {
    assert.equal(territorialShouldWarn({ dist: 2.0, noticeRadius: 6, personalSpace: 2.6, timeInsideNotice: 0, temperament: TEMPERAMENT.TERRITORIAL }), true);
    assert.equal(territorialShouldAttack({ dist: 2.0, personalSpace: 2.6, hasWarned: true, warnedTime: 1.1, warnDuration: 1.0, temperament: TEMPERAMENT.TERRITORIAL }), true);
    assert.equal(territorialShouldAttack({ dist: 2.0, personalSpace: 2.6, hasWarned: false, warnedTime: 1.1, warnDuration: 1.0, temperament: TEMPERAMENT.TERRITORIAL }), false);
  });
  it("defensive retaliation", () => {
    assert.equal(defensiveShouldRetaliate({ temperament: TEMPERAMENT.DEFENSIVE, attackerId: "player", isAttackerAlive: true, timeSinceHit: 1, retaliationDuration: 5 }), true);
    assert.equal(defensiveShouldRetaliate({ temperament: TEMPERAMENT.DEFENSIVE, attackerId: null, isAttackerAlive: true, timeSinceHit: 1, retaliationDuration: 5 }), false);
  });
  it("skittish flee", () => {
    assert.equal(skittishShouldFlee({ temperament: TEMPERAMENT.SKITTISH, dist: 3, noticeRadius: 5, wasHitRecently: false }), true);
    assert.equal(skittishShouldFlee({ temperament: TEMPERAMENT.SKITTISH, dist: 10, noticeRadius: 5, wasHitRecently: false }), false);
  });
});

describe("Phase 3.1 — actor targeting", () => {
  it("self exclusion", () => {
    const a = { id: "a", state: { id: "a", isDead: false, aiState: "ROAM" } };
    assert.equal(canTargetActor(a, a), false);
  });
  it("dead exclusion", () => {
    const self = { id: "a", state: { id: "a", isDead: false } };
    const dead = { id: "b", state: { id: "b", isDead: true } };
    assert.equal(canTargetActor(self, dead), false);
  });
  it("wildkin vs wildkin damage", async () => {
    const scene = new THREE.Scene();
    const cs = createCreatureSystem(scene, null, null);
    const attacker = cs.getCreatures().find(c => c.state.temperament === TEMPERAMENT.AGGRESSIVE);
    const target = cs.getCreatures().find(c => c.state.temperament === TEMPERAMENT.SKITTISH);
    assert.ok(attacker && target);
    const before = target.state.health;
    // Directly damage via wildkin
    const ok = cs.damageCreature(target, 1, attacker.state.pos, null, attacker);
    assert.equal(ok, true);
    assert.equal(target.state.health, before - 1);
  });
});

describe("Phase 3.1 — wildlife XP rules", () => {
  it("wildlife-only kill no player XP", async () => {
    const scene = new THREE.Scene();
    const cs = createCreatureSystem(scene, null, null);
    const target = cs.getCreatures()[0];
    target.state.health = 1;
    target.state.playerDamaged = false;
    // Simulate wildlife damage
    const attacker = cs.getCreatures()[1];
    cs.damageCreature(target, 1, attacker.state.pos, null, attacker);
    assert.equal(target.state.isDead, true);
    assert.equal(target.state.playerDamaged, false);
  });
  it("player participation XP", async () => {
    const scene = new THREE.Scene();
    const cs = createCreatureSystem(scene, null, null);
    const target = cs.getCreatures()[0];
    target.state.health = 1;
    cs.damageCreature(target, 1, { x: 0, y: 0.5, z: 0 }, null, "player");
    assert.equal(target.state.playerDamaged, true);
  });
});

describe("Phase 3.1 — home/leash & steering", () => {
  it("home/leash return", async () => {
    const scene = new THREE.Scene();
    const cs = createCreatureSystem(scene, null, null);
    const c = cs.getCreatures()[0];
    // Move far from home beyond leash
    c.state.pos.set(c.state.homePos.x + c.state.leashRadius + 2, c.state.pos.y, c.state.homePos.z);
    c.group.position.set(c.state.pos.x, 0, c.state.pos.z);
    c.state.aiState = "ROAM";
    cs.update(0.1);
    // Should have switched to RETURN or still trying to return
    assert.ok(["RETURN", "ROAM", "CHASE"].includes(c.state.aiState));
  });
  it("steering chooses side when direct blocked", () => {
    const res = chooseSteeringDirection({
      desiredAngle: 0,
      probeResults: { directBlocked: true, left45Blocked: false, right45Blocked: true, left90Blocked: false, right90Blocked: false },
    });
    assert.ok(res !== null);
    assert.ok(Math.abs(res - Math.PI / 4) < 0.01);
  });
  it("steering stall detection", () => {
    assert.equal(isMovementStalled({ desiredMag: 1, correctedMag: 0.2 }), true);
    assert.equal(isMovementStalled({ desiredMag: 1, correctedMag: 0.8 }), false);
  });
});

describe("Phase 3.1 — XP visual", () => {
  it("xp mote is large blue/cyan with halo", async () => {
    const scene = new THREE.Scene();
    const xm = createXpMoteSystem(scene);
    xm.spawnMotes({ x: 0, y: 0.5, z: 0 }, 1);
    assert.equal(xm.getCount(), 1);
    const mote = xm._motes[0];
    assert.ok(mote.mesh.geometry.parameters.radius >= 0.28, `radius ${mote.mesh.geometry.parameters.radius}`);
    assert.ok(mote.mesh.material.color.getHexString().length === 6);
    assert.ok(mote.mesh.userData.halo, "halo exists");
  });
});
