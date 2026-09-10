import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { createGuardianAttackState, createGuardianEncounter, GUARDIAN_ATTACK, updateGuardianAttackState } from "../src/combat/guardianEncounter.js";
import { createCreatureSystem } from "../src/creatures/creatureSystem.js";

describe("Heartwood Guardian encounter", () => {
  it("telegraphs for the authored safe-escape window, then resolves once", () => {
    const state = createGuardianAttackState();
    assert.deepEqual(updateGuardianAttackState(state, 0.01, { canAttack: true, playerPosition: { x: 2, y: 0, z: 3 } }).map((event) => event.type), ["telegraph"]);
    assert.equal(updateGuardianAttackState(state, 1.29, { canAttack: true, playerPosition: { x: 9, y: 0, z: 9 } }).length, 0);
    assert.deepEqual(updateGuardianAttackState(state, 0.02, { canAttack: true, playerPosition: { x: 9, y: 0, z: 9 } }).map((event) => event.type), ["detonate"]);
    assert.equal(state.cooldown, GUARDIAN_ATTACK.cooldownSeconds);
  });

  it("freezes safely while disabled and creates at most two sequential enrage telegraphs", () => {
    const state = createGuardianAttackState();
    updateGuardianAttackState(state, 0.01, { canAttack: true, playerPosition: { x: 0, y: 0, z: 0 }, enraged: true });
    const before = state.telegraphRemaining;
    assert.deepEqual(updateGuardianAttackState(state, 9, { canAttack: false, playerPosition: { x: 0, y: 0, z: 0 } }), []);
    assert.equal(state.telegraphRemaining, before);
    assert.deepEqual(updateGuardianAttackState(state, 1.31, { canAttack: true, playerPosition: { x: 3, y: 0, z: 0 }, enraged: true }).map((event) => event.type), ["detonate", "telegraph"]);
    assert.equal(state.queued, 0);
  });

  it("only damages a player still inside the marked ring and never progresses under a modal", () => {
    const scene = new THREE.Scene();
    const guardian = { state: { pos: { x: 0, y: 0, z: 0 }, health: 8, maxHealth: 8, isDead: false, aiState: "CHASE", isAggroed: true } };
    const player = { x: 0, y: 0, z: 0 };
    const hits = [];
    const warnings = [];
    const encounter = createGuardianEncounter({ scene, getGuardian: () => guardian, getPlayerState: () => player, playerCombat: { takeDamage: (...args) => hits.push(args) }, onWarning: (message) => warnings.push(message) });
    encounter.update(0.1, { sectionId: "section_5", paused: true });
    assert.equal(encounter.getState().phase, "idle");
    encounter.update(0.1, { sectionId: "section_5" });
    assert.equal(warnings[0], "Move outside the amber ring");
    player.x = 3;
    encounter.update(1.31, { sectionId: "section_5" });
    assert.equal(hits.length, 0, "leaving the ring is safe");
    encounter.reset();
    player.x = 0;
    encounter.update(0.1, { sectionId: "section_5" });
    encounter.update(1.31, { sectionId: "section_5" });
    assert.deepEqual(hits[0].slice(0, 1), [2]);
    encounter.dispose();
    assert.equal(scene.children.length, 0);
  });

  it("keeps the defeated Heartwood Guardian out for this expedition, then restores it on reset", () => {
    const system = createCreatureSystem(new THREE.Scene(), null, null, { spawns: [{ id: "guardian", type: "rusher", pos: { x: 0, y: 0, z: 0 }, regionId: "section_5" }] });
    const guardian = system._creatures[0];
    guardian.state.visualAssetId = "asset_heartwood_guardian";
    system.setPlayerPos({ x: 10, y: 0, z: 10 });
    system.damageCreature(guardian, 999, { x: 0, y: 0, z: 0 });
    assert.equal(guardian.state.respawnRemaining, Infinity);
    system.update(60);
    assert.equal(guardian.state.aiState, "RESPAWNING");
    system.reset();
    assert.equal(guardian.state.noRespawnThisRun, false);
    assert.equal(guardian.state.aiState, "ROAM");
    system.dispose();
  });
});
