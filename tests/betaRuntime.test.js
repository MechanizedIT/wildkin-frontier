import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { createPlayerCombat } from "../src/combat/playerCombat.js";
import { createCreatureSystem } from "../src/creatures/creatureSystem.js";

function createCombat() {
  const player = new THREE.Group();
  player.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  return createPlayerCombat({
    playerMesh: player, characterPhysics: null, gameAudio: null, particleSystem: null,
    getPlayerState: () => ({ pos: new THREE.Vector3(), facing: 0, mode: "IDLE", traversalMode: "IDLE" }),
  });
}

describe("Beta runtime support", () => {
  it("applies configured max health without erasing the current damage deficit", () => {
    const combat = createCombat();
    combat.takeDamage(2, { x: 1, y: 0, z: 0 });
    assert.equal(combat.configure({ maxHealth: 9 }), true);
    assert.equal(combat.getMaxHealth(), 9);
    assert.equal(combat.getHealth(), 7);
    combat.reset();
    assert.equal(combat.getHealth(), 9);
    assert.equal(combat.configure({ maxHealth: 999 }), true);
    assert.equal(combat.getMaxHealth(), 20);
    assert.equal(combat.heal(-1), false);
    assert.equal(combat.grantInvulnerability(99), true);
    assert.ok(combat.getState().postHitInvuln <= 5);
  });

  it("holds then captures a creature without awarding a kill or leaving a live target", () => {
    const scene = new THREE.Scene();
    let kills = 0;
    const system = createCreatureSystem(scene, null, null, {
      spawns: [{ id: "bondable", type: "rusher", pos: { x: 0, y: 0, z: 0 }, temperament: "SKITTISH", visualAsset: { id: "mossling" } }],
      onCreatureDied: () => { kills++; },
    });
    const target = system.getCreatures()[0];
    assert.equal(target.state.visualAssetId, "mossling");
    const originalAiState = target.state.aiState;
    assert.equal(system.setBondingTarget("bondable"), target);
    system.update(1);
    assert.equal(target.state.aiState, originalAiState);
    assert.equal(system.damageCreature(target, 1, { x: 1, y: 0, z: 0 }, null, "player"), false);
    assert.equal(system.secureBondTarget("bondable"), target);
    assert.equal(kills, 0);
    assert.equal(target.state.isDead, false);
    assert.equal(target.group.visible, false);
    assert.equal(target.collider, null);
    assert.equal(system.getAliveCreatures().includes(target), false);
    assert.equal(system.getActiveAliveCreatures().includes(target), false);
    assert.equal(system.getCreatures().includes(target), false);
    system.reset();
    assert.equal(target.state.bondCaptured, false);
    assert.equal(system.getAliveCreatures().includes(target), true);
  });
});
