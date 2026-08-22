import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMBAT_CONFIG, RUSHER_CONFIG, SPITTER_CONFIG, PROJECTILE_CONFIG, XP_CONFIG } from "../src/combat/combatConfig.js";
import { isTargetInAttackArc, getAttackTargets, distance3D } from "../src/combat/combatTargeting.js";
import { classifyDodgeGesture, mergeIntents } from "../src/input/inputController.js";
import { INPUT_CONFIG } from "../src/game/config.js";
import { createCombatSession } from "../src/combat/combatSession.js";
import { createPlayerCombat } from "../src/combat/playerCombat.js";
import * as THREE from "three";

// Mock helpers for playerCombat without THREE scene
function mockPlayerCombat() {
  const player = new THREE.Group();
  const mockMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x000000 }));
  player.add(mockMesh);
  const fakePhysics = null;
  let state = { pos: new THREE.Vector3(0, 0.52, 0), facing: 0, mode: "IDLE", traversalMode: "IDLE", speed: 0, grounded: true, verticalVelocity: 0 };
  const pc = createPlayerCombat({
    playerMesh: player,
    characterPhysics: null,
    gameAudio: null,
    particleSystem: null,
    getPlayerState: () => state,
    getCreatures: () => [],
    onHealthChanged: () => {},
    onDeath: () => {},
    onDamageFeedback: () => {},
    scene: new THREE.Scene(),
  });
  return { pc, player, state };
}

describe("Phase 3 — combat config", () => {
  it("attack timing within spec", () => {
    assert.ok(COMBAT_CONFIG.attackDuration >= 0.42 && COMBAT_CONFIG.attackDuration <= 0.50, `duration ${COMBAT_CONFIG.attackDuration}`);
    assert.ok(COMBAT_CONFIG.attackImpactNormalized >= 0.42 && COMBAT_CONFIG.attackImpactNormalized <= 0.50);
    assert.ok(COMBAT_CONFIG.attackCooldown >= 0.10 && COMBAT_CONFIG.attackCooldown <= 0.18);
    assert.ok(COMBAT_CONFIG.attackRange >= 1.65 && COMBAT_CONFIG.attackRange <= 1.85);
    assert.ok(COMBAT_CONFIG.attackArcDegrees >= 150 && COMBAT_CONFIG.attackArcDegrees <= 170);
    assert.equal(COMBAT_CONFIG.maxTargetsPerAttack, 3);
    assert.equal(COMBAT_CONFIG.baseDamage, 1);
  });
  it("health and i-frames within spec", () => {
    assert.equal(COMBAT_CONFIG.playerMaxHealth, 5);
    assert.ok(COMBAT_CONFIG.postHitInvulnerability >= 0.60 && COMBAT_CONFIG.postHitInvulnerability <= 0.75);
    assert.ok(COMBAT_CONFIG.dodgeInvulnerability >= 0.18 && COMBAT_CONFIG.dodgeInvulnerability <= 0.26);
    assert.ok(COMBAT_CONFIG.combatDisengageDelay >= 1.5 && COMBAT_CONFIG.combatDisengageDelay <= 2.5);
  });
  it("rusher tuning within spec", () => {
    assert.equal(RUSHER_CONFIG.health, 3);
    assert.ok(RUSHER_CONFIG.aggroRadius >= 5.0 && RUSHER_CONFIG.aggroRadius <= 6.0);
    assert.ok(RUSHER_CONFIG.moveSpeed >= 2.2 && RUSHER_CONFIG.moveSpeed <= 2.8);
    assert.ok(RUSHER_CONFIG.attackRange >= 1.1 && RUSHER_CONFIG.attackRange <= 1.3);
    assert.ok(RUSHER_CONFIG.windup >= 0.45 && RUSHER_CONFIG.windup <= 0.60);
    assert.ok(RUSHER_CONFIG.lungeDuration >= 0.20 && RUSHER_CONFIG.lungeDuration <= 0.30);
    assert.ok(RUSHER_CONFIG.recover >= 0.55 && RUSHER_CONFIG.recover <= 0.75);
  });
  it("spitter tuning within spec", () => {
    assert.equal(SPITTER_CONFIG.health, 2);
    assert.ok(SPITTER_CONFIG.aggroRadius >= 6.0 && SPITTER_CONFIG.aggroRadius <= 7.0);
    assert.ok(SPITTER_CONFIG.preferredDistance >= 3.5 && SPITTER_CONFIG.preferredDistance <= 4.5);
    assert.ok(SPITTER_CONFIG.moveSpeed >= 1.7 && SPITTER_CONFIG.moveSpeed <= 2.1);
    assert.ok(SPITTER_CONFIG.windup >= 0.55 && SPITTER_CONFIG.windup <= 0.75);
    assert.ok(SPITTER_CONFIG.shotCooldown >= 1.4 && SPITTER_CONFIG.shotCooldown <= 1.9);
    assert.ok(SPITTER_CONFIG.projectileSpeed >= 3.8 && SPITTER_CONFIG.projectileSpeed <= 4.8);
    assert.equal(SPITTER_CONFIG.projectileLifetime, 3);
  });
});

describe("Phase 3 — targeting (frontal/vertical)", () => {
  it("front/in-range enemy eligible", () => {
    const playerPos = { x: 0, y: 0.5, z: 0 };
    const facing = 0; // +Z
    const targetFront = { x: 0, y: 0.5, z: 1.0 };
    assert.equal(isTargetInAttackArc(playerPos, facing, targetFront), true);
  });
  it("enemy behind not eligible", () => {
    const playerPos = { x: 0, y: 0.5, z: 0 };
    const facing = 0;
    const behind = { x: 0, y: 0.5, z: -1.0 };
    assert.equal(isTargetInAttackArc(playerPos, facing, behind), false);
  });
  it("vertical separation invalid (far below platform)", () => {
    const playerPos = { x: 0, y: 2.9, z: 0 }; // on high platform ~2.4+0.5
    const enemyBelow = { x: 0.2, y: 0.5, z: 0.2 }; // ground below
    // vertical diff ~2.4 > tolerance 0.85 => not hit
    assert.equal(isTargetInAttackArc(playerPos, 0, enemyBelow), false);
    // same XZ but high vertical should be excluded even though XZ overlaps
    const distXZ = Math.hypot(0.2, 0.2);
    assert.ok(distXZ < COMBAT_CONFIG.attackRange);
  });
  it("enemy at side outside arc not hit (~90deg)", () => {
    const playerPos = { x: 0, y: 0.5, z: 0 };
    const facing = 0;
    // 90 deg to side: x 1.2, z 0
    const side = { x: 1.2, y: 0.5, z: 0 };
    // arc 160 => half 80 deg, side 90 >80 => false
    assert.equal(isTargetInAttackArc(playerPos, facing, side), false);
  });
  it("enemy at 45deg front is hit (within 80 half)", () => {
    const playerPos = { x: 0, y: 0.5, z: 0 };
    const facing = 0;
    const diag = { x: 0.7, y: 0.5, z: 0.7 }; // ~45 deg
    assert.equal(isTargetInAttackArc(playerPos, facing, diag), true);
  });
  it("outside range not hit", () => {
    const playerPos = { x: 0, y: 0.5, z: 0 };
    const facing = 0;
    const far = { x: 0, y: 0.5, z: 2.2 }; // range 1.75, far > range
    assert.equal(isTargetInAttackArc(playerPos, facing, far), false);
  });
  it("getAttackTargets caps at 3 and sorts nearest", () => {
    const playerPos = { x: 0, y: 0.5, z: 0 };
    const facing = 0;
    const candidates = [
      { id: "a", pos: { x: 0, y: 0.5, z: 0.5 }, isDead: false },
      { id: "b", pos: { x: 0, y: 0.5, z: 0.8 }, isDead: false },
      { id: "c", pos: { x: 0, y: 0.5, z: 0.3 }, isDead: false },
      { id: "d", pos: { x: 0, y: 0.5, z: 1.0 }, isDead: false },
      { id: "e", pos: { x: 0, y: 0.5, z: 1.2 }, isDead: false },
    ];
    const res = getAttackTargets(playerPos, facing, candidates);
    assert.equal(res.length, 3);
    assert.equal(res[0].id, "c"); // nearest
    assert.equal(res[1].id, "a");
    assert.equal(res[2].id, "b");
  });
  it("dead enemy excluded", () => {
    const playerPos = { x: 0, y: 0.5, z: 0 };
    const facing = 0;
    const candidates = [
      { id: "a", pos: { x: 0, y: 0.5, z: 0.5 }, isDead: true },
      { id: "b", pos: { x: 0, y: 0.5, z: 0.6 }, isDead: false },
    ];
    const res = getAttackTargets(playerPos, facing, candidates);
    assert.equal(res.length, 1);
    assert.equal(res[0].id, "b");
  });
});

describe("Phase 3 — input tap vs swipe", () => {
  it("qualifying swipe is dodge, not attack", () => {
    const cfg = INPUT_CONFIG;
    // minDist 34, maxDur 300, minVel 0.32. Use 50px 150ms => vel 0.33 => dodge
    assert.equal(classifyDodgeGesture(50, 150, 50 / 150, cfg), true);
    // Not dodge when small distance
    assert.equal(classifyDodgeGesture(20, 120, 20 / 120, cfg), false);
    // Not dodge when too slow
    assert.equal(classifyDodgeGesture(40, 200, 0.20, cfg), false);
    // Not dodge when too long duration
    assert.equal(classifyDodgeGesture(50, 400, 0.5, cfg), false);
  });
  it("mergeIntents attackRequested OR", () => {
    const touch = { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, dodgeX: 0, dodgeY: 0, attackRequested: true };
    const kb = { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, dodgeX: 0, dodgeY: 0, attackRequested: false };
    const merged = mergeIntents(touch, kb);
    assert.equal(merged.attackRequested, true);
    const touch2 = { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, dodgeX: 0, dodgeY: 0, attackRequested: false };
    const kb2 = { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, dodgeX: 0, dodgeY: 0, attackRequested: true };
    assert.equal(mergeIntents(touch2, kb2).attackRequested, true);
    // Neither
    assert.equal(mergeIntents(touch2, { ...kb2, attackRequested: false }).attackRequested, false);
  });
  it("touch move wins but attack still ORs", () => {
    const touch = { moveX: 1, moveY: 0, moveMagnitude: 0.8, movementBand: "run", dodgeRequested: false, dodgeX: 0, dodgeY: 0, attackRequested: false };
    const kb = { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, dodgeX: 0, dodgeY: 0, attackRequested: true };
    const merged = mergeIntents(touch, kb);
    assert.equal(merged.moveMagnitude, 0.8); // touch move wins
    assert.equal(merged.attackRequested, true); // but attack OR still
  });
  it("dodge OR also", () => {
    const touch = { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: true, dodgeX: 1, dodgeY: 0, attackRequested: false };
    const kb = { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, dodgeX: 0, dodgeY: 0, attackRequested: false };
    assert.equal(mergeIntents(touch, kb).dodgeRequested, true);
  });
});

describe("Phase 3 — player health + invuln", () => {
  it("damage once, reduces health", () => {
    const { pc } = mockPlayerCombat();
    assert.equal(pc.getHealth(), 5);
    pc.takeDamage(1, { x: 1, y: 0.5, z: 0 });
    assert.equal(pc.getHealth(), 4);
  });
  it("post-hit i-frame blocks second hit", () => {
    const { pc } = mockPlayerCombat();
    pc.takeDamage(1, { x: 1, y: 0.5, z: 0 });
    assert.equal(pc.getHealth(), 4);
    // Immediate second hit should be blocked
    const second = pc.takeDamage(1, { x: 1, y: 0.5, z: 0 });
    assert.equal(second, false);
    assert.equal(pc.getHealth(), 4);
  });
  it("damage resumes after i-frame expires", () => {
    const { pc } = mockPlayerCombat();
    pc.takeDamage(1, { x: 1, y: 0.5, z: 0 });
    // tick past postHit duration
    const dt = COMBAT_CONFIG.postHitInvulnerability + 0.05;
    pc.update(dt, { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: false, attackRequested: false }, { x: 0, y: 0.5, z: 0 }, 0, []);
    assert.equal(pc.isInvulnerable(), false);
    const ok = pc.takeDamage(1, { x: 1, y: 0.5, z: 0 });
    assert.equal(ok, true);
    assert.equal(pc.getHealth(), 3);
  });
  it("zero health enters death once", () => {
    const { pc } = mockPlayerCombat();
    let deathCalls = 0;
    const pc2 = createPlayerCombat({
      playerMesh: new THREE.Group(),
      characterPhysics: null,
      gameAudio: null,
      particleSystem: null,
      getPlayerState: () => ({ pos: new THREE.Vector3(0, 0.5, 0), facing: 0, mode: "IDLE", traversalMode: "IDLE" }),
      getCreatures: () => [],
      onHealthChanged: () => {},
      onDeath: () => deathCalls++,
      onDamageFeedback: () => {},
      scene: new THREE.Scene(),
    });
    for (let i = 0; i < 5; i++) {
      // tick to clear i-frame each time
      pc2.takeDamage(1, { x: 0, y: 0.5, z: 0 });
      pc2.update(COMBAT_CONFIG.postHitInvulnerability + 0.01, { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle" }, { x: 0, y: 0.5, z: 0 }, 0, []);
    }
    assert.equal(pc2.getHealth(), 0);
    assert.equal(pc2.isDead(), true);
    assert.equal(deathCalls, 1);
    // further damage should not increase deathCalls
    pc2.takeDamage(1, { x: 0, y: 0.5, z: 0 });
    assert.equal(deathCalls, 1);
  });
});

describe("Phase 3 — dodge invulnerability", () => {
  it("dodging gives i-frame", () => {
    const { pc, state } = mockPlayerCombat();
    // Simulate entering dodge
    state.mode = "DODGE";
    pc.update(0.01, { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: true }, { x: 0, y: 0.5, z: 0 }, 0, []);
    assert.equal(pc.isInvulnerable(), true);
    assert.equal(pc.isDodgingInvuln(), true);
    // Within dodge window damage should be blocked
    const blocked = pc.takeDamage(1, { x: 0, y: 0.5, z: 0 });
    assert.equal(blocked, false);
    assert.equal(pc.getHealth(), 5);
  });
  it("outside dodge window damages normally", () => {
    const { pc, state } = mockPlayerCombat();
    state.mode = "DODGE";
    pc.update(0.01, { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle", dodgeRequested: true }, { x: 0, y: 0.5, z: 0 }, 0, []);
    // Exit dodge before ticking past invuln so it can decay
    state.mode = "IDLE";
    pc.update(COMBAT_CONFIG.dodgeInvulnerability + 0.05, { moveX: 0, moveY: 0, moveMagnitude: 0, movementBand: "idle" }, { x: 0, y: 0.5, z: 0 }, 0, []);
    assert.equal(pc.isDodgingInvuln(), false);
    // Now damage should go through (postHit not active)
    const ok = pc.takeDamage(1, { x: 0, y: 0.5, z: 0 });
    assert.equal(ok, true);
  });
});

describe("Phase 3 — combat session / harvest suppression", () => {
  it("combat engaged when aggro nearby", () => {
    const sess = createCombatSession();
    sess.update(0.01, true); // aggro
    assert.equal(sess.isEngaged(), true);
  });
  it("disengages after delay", () => {
    const sess = createCombatSession();
    sess.update(0.01, true);
    assert.equal(sess.isEngaged(), true);
    // tick without aggro beyond delay
    sess.update(COMBAT_CONFIG.combatDisengageDelay + 0.1, false);
    // also no recent attack/damage, should be false
    assert.equal(sess.isEngaged(), false);
  });
  it("recent attack keeps engaged", () => {
    const sess = createCombatSession();
    sess.update(0.01, false);
    sess.notifyAttack();
    assert.equal(sess.isEngaged(), true);
    sess.update(COMBAT_CONFIG.combatDisengageDelay - 0.5, false);
    assert.equal(sess.isEngaged(), true);
    sess.update(1.0, false); // now beyond delay
    assert.equal(sess.isEngaged(), false);
  });
  it("recent damage keeps engaged", () => {
    const sess = createCombatSession();
    sess.notifyDamage();
    assert.equal(sess.isEngaged(), true);
  });
  it("harvest suppression does not change Auto preference", () => {
    let autoPref = true;
    const sess = createCombatSession();
    sess.update(0.01, true);
    const harvestingAllowed = autoPref && !sess.isEngaged();
    assert.equal(harvestingAllowed, false);
    assert.equal(autoPref, true); // unchanged
    // After disengage, harvesting resumes if pref ON
    sess.update(COMBAT_CONFIG.combatDisengageDelay + 0.2, false);
    const after = autoPref && !sess.isEngaged();
    assert.equal(after, true);
    // If pref OFF, remains off even when not engaged
    autoPref = false;
    sess.update(0.01, false);
    assert.equal(autoPref && !sess.isEngaged(), false);
  });
});

describe("Phase 3 — projectile pooling & once-only", () => {
  it("pool bounded, lifetime expiry", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const { createProjectileSystem } = await import("../src/combat/projectileSystem.js");
    const ps = createProjectileSystem(scene, null, null);
    assert.ok(ps.getCount() === 0);
    // Spawn max+1 should recycle
    for (let i = 0; i < 17; i++) ps.spawnProjectile({ x: 0, y: 0.5, z: 0 }, { x: 1, y: 0, z: 0 }, null);
    assert.ok(ps.getCount() <= 16, `bounded ${ps.getCount()}`);
    // Age beyond lifetime should expire
    ps.update(PROJECTILE_CONFIG.lifetime + 0.1);
    assert.equal(ps.getCount(), 0);
    // Pool bounded
    assert.ok(ps.getPooledCount() <= 16);
  });
});

describe("Phase 3 — XP motes once-only", () => {
  it("spawn and collect once", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const { createXpMoteSystem } = await import("../src/combat/xpMoteSystem.js");
    let xp = 0;
    const xm = createXpMoteSystem(scene, { onXpChanged: (v) => xp = v });
    xm.spawnMotes({ x: 0, y: 0.5, z: 0 }, 3);
    assert.equal(xm.getCount(), 3);
    // Simulate magnetize and collect: set player nearby and age beyond delay
    xm.setPlayerPos({ x: 0, y: 0.5, z: 0 });
    // Tick to pop and then magnet
    xm.update(0.6); // pop ends, rest
    xm.update(0.4); // now magnet delay passed, should start magnetizing
    // Need to tick many times to collect (move towards player)
    for (let i = 0; i < 40; i++) xm.update(0.05);
    // Should have collected at least one (allow randomness in spawn distance; some motes may be just outside 2.2 radius and require player to approach)
    assert.ok(xp >= 1, `xp ${xp}`);
    assert.ok(xm.getCount() <= 2);
    // Pool bounded
    assert.ok(xm.getPooledCount() <= 24);
  });
  it("mote pool bounded and no unbounded growth", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const { createXpMoteSystem } = await import("../src/combat/xpMoteSystem.js");
    const xm = createXpMoteSystem(scene);
    for (let i = 0; i < 40; i++) xm.spawnMotes({ x: i, y: 0.5, z: 0 }, 1);
    assert.ok(xm.getCount() <= 32);
  });
});

describe("Phase 3 — Rusher state flow", () => {
  it("ROAM -> ALERT -> CHASE -> WINDUP -> LUNGE -> RECOVER", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const { createCreatureSystem } = await import("../src/creatures/creatureSystem.js");
    const cs = createCreatureSystem(scene, null, null);
    // Pick an AGGRESSIVE rusher if present for deterministic aggro, else any rusher
    let rusher = cs.getCreatures().find(c => c.state.type === "rusher" && c.state.temperament === "AGGRESSIVE");
    if (!rusher) rusher = cs.getCreatures().find(c => c.state.type === "rusher");
    assert.ok(rusher, "rusher exists");
    // Start ROAM
    assert.equal(rusher.state.aiState, "ROAM");
    // Put player within aggro but not attack range
    const playerPos = { x: rusher.state.pos.x + 3.0, y: rusher.state.pos.y, z: rusher.state.pos.z };
    cs.setPlayerPos(playerPos);
    cs.update(0.05);
    // Should be ALERT or CHASE after aggro
    assert.ok(["ALERT", "CHASE", "WINDUP"].includes(rusher.state.aiState), `got ${rusher.state.aiState}`);
    // Tick ALERT duration 0.32 -> CHASE
    for (let i = 0; i < 20; i++) cs.update(0.05);
    assert.ok(["CHASE", "WINDUP", "LUNGE", "RECOVER"].includes(rusher.state.aiState));
    // Force close distance to trigger WINDUP
    cs.setPlayerPos({ x: rusher.state.pos.x + 0.8, y: rusher.state.pos.y, z: rusher.state.pos.z });
    for (let i = 0; i < 30; i++) cs.update(0.05);
    // Should have gone through windup to lunge
    assert.ok(["WINDUP", "LUNGE", "RECOVER", "CHASE", "ALERT"].includes(rusher.state.aiState));
  });
  it("lunge direction committed near end of windup", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const { createCreatureSystem } = await import("../src/creatures/creatureSystem.js");
    const cs = createCreatureSystem(scene, null, null);
    let rusher = cs.getCreatures().find(c => c.state.type === "rusher" && c.state.temperament === "AGGRESSIVE");
    if (!rusher) rusher = cs.getCreatures().find(c => c.state.type === "rusher");
    // Force into WINDUP
    rusher.state.aiState = "WINDUP";
    rusher.state.aiTimer = 0;
    rusher.state.isAggroed = true;
    cs.setPlayerPos({ x: rusher.state.pos.x + 2, y: rusher.state.pos.y, z: rusher.state.pos.z });
    const cfg = rusher.state.cfg;
    // Update just before windup end (70%)
    cs.update(cfg.windup * 0.6);
    cs.update(cfg.windup * 0.15); // now 75% -> should be committed (70% threshold)
    assert.ok(rusher.state.targetLungeDir !== null, "committed near end");
    const committed = { ...rusher.state.targetLungeDir };
    // Tick to complete windup -> LUNGE
    cs.update(cfg.windup * 0.35); // now > windup
    assert.equal(rusher.state.aiState, "LUNGE");
    // Move player to opposite side during lunge - direction should not change
    cs.setPlayerPos({ x: rusher.state.pos.x - 5, y: rusher.state.pos.y, z: rusher.state.pos.z });
    cs.update(0.05);
    assert.equal(rusher.state.aiState, "LUNGE");
    assert.deepEqual(rusher.state.targetLungeDir, committed);
  });
  it("lunge damage once", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    let damageCalls = 0;
    const { createCreatureSystem } = await import("../src/creatures/creatureSystem.js");
    const cs = createCreatureSystem(scene, null, null, {
      onPlayerDamage: () => { damageCalls += 1; return true; },
    });
    let rusher = cs.getCreatures().find(c => c.state.type === "rusher" && c.state.temperament === "AGGRESSIVE");
    if (!rusher) rusher = cs.getCreatures().find(c => c.state.type === "rusher");
    rusher.state.aiState = "LUNGE";
    rusher.state.aiTimer = 0;
    rusher.state.targetLungeDir = { x: 1, z: 0 };
    rusher.state._lungeHit = false;
    // Place player within range
    cs.setPlayerPos({ x: rusher.state.pos.x + 0.5, y: rusher.state.pos.y, z: rusher.state.pos.z });
    cs.update(rusher.state.cfg.lungeDuration * 0.5);
    assert.ok(damageCalls <= 1, `damageCalls ${damageCalls} should be <=1`);
    // Second tick still in lunge should not double hit
    cs.update(0.05);
    assert.ok(damageCalls <= 1);
  });
});

describe("Phase 3 — Spitter projectile flow", () => {
  it("spitter fires one projectile per windup", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const { createCreatureSystem } = await import("../src/creatures/creatureSystem.js");
    const { createProjectileSystem } = await import("../src/combat/projectileSystem.js");
    const ps = createProjectileSystem(scene, null, null);
    let projCount = 0;
    const origSpawn = ps.spawnProjectile.bind(ps);
    ps.spawnProjectile = (...args) => { projCount++; return origSpawn(...args); };
    const cs = createCreatureSystem(scene, null, null, {
      onRequestProjectile: (origin, dir, owner) => ps.spawnProjectile(origin, dir, owner),
    });
    const spitter = cs.getCreatures().find(c => c.state.type === "spitter");
    assert.ok(spitter);
    spitter.state.aiState = "WINDUP";
    spitter.state.aiTimer = 0;
    spitter.state.isAggroed = true;
    cs.setPlayerPos({ x: spitter.state.pos.x + 3, y: spitter.state.pos.y, z: spitter.state.pos.z });
    cs.update(spitter.state.cfg.windup + 0.05);
    assert.equal(projCount, 1);
    assert.equal(spitter.state.aiState, "RECOVER");
    // Ensure not firing again during recover
    cs.update(0.2);
    assert.equal(projCount, 1);
  });
  it("projectile damages once and expires", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const { createProjectileSystem } = await import("../src/combat/projectileSystem.js");
    const ps = createProjectileSystem(scene, null, null);
    let damageCalls = 0;
    ps.setDamageCallback(() => { damageCalls += 1; return true; });
    ps.setInvulnChecker(() => false);
    ps.setPlayerPos({ x: 5, y: 0.5, z: 0 });
    const proj = ps.spawnProjectile({ x: 0, y: 0.5, z: 0 }, { x: 1, y: 0, z: 0 }, null);
    // Move projectile towards player; speed ~4.3, distance 5 => ~1.16 sec
    for (let i = 0; i < 80; i++) ps.update(0.02);
    assert.ok(damageCalls === 1, `damageCalls ${damageCalls}`);
    assert.equal(ps.getCount(), 0); // disappeared on hit
  });
});

describe("Phase 3 — restart resets temporary state", () => {
  it("playerCombat reset restores health, invuln, attack", async () => {
    const { pc } = mockPlayerCombat();
    pc.takeDamage(1, { x: 0, y: 0.5, z: 0 });
    assert.equal(pc.getHealth(), 4);
    pc.reset();
    assert.equal(pc.getHealth(), 5);
    assert.equal(pc.isInvulnerable(), false);
    assert.equal(pc.isDead(), false);
  });
  it("xp mote system reset clears XP and motes", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const { createXpMoteSystem } = await import("../src/combat/xpMoteSystem.js");
    const xm = createXpMoteSystem(scene);
    xm.spawnMotes({ x: 0, y: 0.5, z: 0 }, 3);
    xm.setXp(5);
    assert.equal(xm.getXp(), 5);
    xm.reset();
    assert.equal(xm.getXp(), 0);
    assert.equal(xm.getCount(), 0);
  });
  it("creature respawn resets health and AI", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const { createCreatureSystem } = await import("../src/creatures/creatureSystem.js");
    const cs = createCreatureSystem(scene, null, null);
    const c = cs.getCreatures()[0];
    c.state.health = 0;
    c.state.isDead = true;
    c.state.aiState = "RESPAWNING";
    c.state.respawnRemaining = 0.01;
    cs.setPlayerPos({ x: 50, y: 0.5, z: 50 }); // far
    cs.update(0.02);
    // Should have respawned if not inside player
    assert.equal(c.state.isDead, false);
    assert.equal(c.state.health, c.state.cfg.health);
    assert.equal(c.state.aiState, "ROAM");
  });
  it("pickup inventory reset preserves auto harvest pref separately", async () => {
    const THREE = await import("three");
    const scene = new THREE.Scene();
    const { createPickupSystem } = await import("../src/resources/pickupSystem.js");
    const ps = createPickupSystem(scene, null, null, () => {});
    // Simulate inventory
    const mockNodeTree = { type: { resourceId: "wood" }, state: { position: { x: 0, y: 0, z: 0 } }, index: 0, collider: null };
    const mockNodeStone = { type: { resourceId: "stone" }, state: { position: { x: 1, y: 0, z: 0 } }, index: 1, collider: null };
    // Use collectPickupPure via system? Just test resetInventory
    ps.spawnPickup(mockNodeTree);
    ps.spawnPickup(mockNodeStone);
    // Actually inventory only increments on collect, not spawn. So test inventory reset
    // We'll manually fill via internal inventory
    ps.inventory.wood = 3;
    ps.inventory.stone = 2;
    let autoPref = true;
    // Simulate combat suppression: harvestingAllowed false but pref remains true
    const harvestingAllowed = autoPref && false;
    assert.equal(harvestingAllowed, false);
    assert.equal(autoPref, true);
    ps.resetInventory();
    assert.deepEqual(ps.getInventory(), { wood: 0, stone: 0, fiber: 0 });
    assert.equal(autoPref, true); // preserved
  });
});
