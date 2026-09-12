import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import * as THREE from "three";
import { createPlayer } from "../src/player/createPlayer.js";
import { createPlayerVisuals } from "../src/player/playerVisuals.js";
import { createFieldTool } from "../src/tools/fieldTool.js";
import { clearModelAssetCacheForTests, registerModelTemplateForTests } from "../src/assets/modelAssetRuntime.js";
import { normalizeWorldData } from "../src/world/worldValidator.js";
import { WORLD_DATA } from "../src/world/data/world.js";

const states = ["idle", "walk", "run", "sneak", "jump", "fall", "dodge", "climb", "mantle", "attack", "hurt"];
const descriptor = {
  id: "player_explorer_fixture",
  model: {
    path: "assets/models/player_explorer_fixture/model.glb", scale: 1, pivot: { x: 0, y: 0, z: 0 },
    clips: Object.fromEntries(states.map((state) => [state, state[0].toUpperCase() + state.slice(1)])),
    locomotion: { walk: 3.3, run: 6, sneak: 1.6, climb: 1.2 },
  },
  handAnchor: { bone: "RightHand", position: { x: 0.01, y: 0.02, z: 0.03 }, rotation: { x: 0, y: 0.2, z: 0 } },
};

function template() {
  const scene = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const count = geometry.getAttribute("position").count;
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(Array.from({ length: count * 4 }, (_, i) => i % 4 === 0 ? 0 : 0), 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(Array.from({ length: count * 4 }, (_, i) => i % 4 === 0 ? 1 : 0), 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  const hand = new THREE.Bone(); hand.name = "RightHand"; mesh.add(hand); mesh.bind(new THREE.Skeleton([hand])); scene.add(mesh);
  return { scene, animations: states.map((state) => new THREE.AnimationClip(state[0].toUpperCase() + state.slice(1), 0.2, [])) };
}

afterEach(() => clearModelAssetCacheForTests());

describe("opt-in external player visual", () => {
  it("keeps the outer procedural player transform while attaching tool and clips to the external rig", () => {
    registerModelTemplateForTests(descriptor.model.path, template());
    const player = createPlayer(descriptor);
    const adapter = player.userData.externalPlayerModel;
    assert.ok(adapter);
    assert.equal(player.name, "player");
    assert.ok(player.userData.proceduralFallbackChildren.every((child) => !child.visible));
    const visuals = createPlayerVisuals(player);
    visuals.sync(0.016, { mode: "RUN", speed: 4 });
    assert.equal(adapter.animator.activeState, "run");
    let swingStarts = 0;
    const tool = createFieldTool(player, null, { onSwingStart: () => { swingStarts += 1; adapter.playAction("attack"); } });
    assert.equal(tool.handAnchor.parent, adapter.handBone);
    assert.deepEqual(tool.handAnchor.position.toArray(), [0.01, 0.02, 0.03]);
    assert.equal(tool.requestCombatSwing(), true);
    assert.equal(swingStarts, 1);
    assert.equal(adapter.animator.activeState, "attack");
    visuals.sync(0.016, { mode: "RUN", speed: 4 });
    assert.equal(adapter.animator.activeState, "attack", "movement feedback must not cancel an action on its first frame");
    assert.ok(adapter.animator.active.time > 0, "attack actually advances");
    adapter.playAction("hurt");
    assert.equal(adapter.animator.activeState, "hurt");
    visuals.sync(0.1, { mode: "IDLE", speed: 0 });
    assert.equal(adapter.animator.activeState, "hurt", "hurt interrupts attack and survives movement feedback");
    visuals.sync(0.11, { mode: "IDLE", speed: 0 });
    visuals.sync(0.016, { mode: "IDLE", speed: 0 });
    assert.equal(adapter.animator.activeState, "idle", "locomotion resumes after the one-shot completes");
  });

  it("requires all declared player clips and a right-hand attachment in world data", () => {
    const world = structuredClone(WORLD_DATA); world.playerVisual = structuredClone(descriptor);
    assert.doesNotThrow(() => normalizeWorldData(world));
    delete world.playerVisual.model.clips.hurt;
    assert.throws(() => normalizeWorldData(world), /clip hurt required/);
  });

  it("uses the physical climb speed without restarting a held grip, and traversal immediately replaces actions", () => {
    registerModelTemplateForTests(descriptor.model.path, template());
    const player = createPlayer(descriptor);
    const adapter = player.userData.externalPlayerModel;

    adapter.playAction("attack");
    adapter.update(0.05, "CLIMB", 1.2);
    assert.equal(adapter.animator.activeState, "climb", "entering a wall pose replaces an attack immediately");
    assert.equal(adapter.animator.active.getEffectiveTimeScale(), 1);
    const climbingTime = adapter.animator.active.time;

    adapter.update(0.1, "CLIMB", 0);
    assert.equal(adapter.animator.active.getEffectiveTimeScale(), 0, "neutral input holds the current grip pose");
    assert.equal(adapter.animator.active.time, climbingTime, "a held grip does not advance or restart its clip");
    adapter.update(0.05, "CLIMB", 0.6);
    assert.equal(adapter.animator.active.getEffectiveTimeScale(), 0.5, "climb cadence follows real vertical speed");
    assert.ok(adapter.animator.active.time > climbingTime, "resuming retains and advances the same clip phase");

    adapter.update(0, "CLIMB", -0.9);
    assert.equal(adapter.animator.active.getEffectiveTimeScale(), -0.75, "descending reuses the authored climb loop in reverse");

    const heldClimbPhase = adapter.animator.active.time;
    adapter.playAction("hurt");
    adapter.update(0, "MANTLE", 1.1, { mantleDuration: 0.4, mantleProgress: 0.2, mantleLiftFraction: 0.55 });
    assert.equal(adapter.animator.activeState, "climb", "the lift keeps the wall-facing climb pose while immediately replacing hurt");
    assert.equal(adapter.animator.active.getEffectiveTimeScale(), 0, "the retained climb phase holds through the physical lift");
    assert.equal(adapter.animator.active.time, heldClimbPhase, "the lift uses the last real climb phase rather than restarting upright");
    adapter.update(0, "MANTLE", 1.1, { mantleDuration: 0.4, mantleProgress: 0.55, mantleLiftFraction: 0.55 });
    assert.equal(adapter.animator.activeState, "mantle", "the actual mantle begins when the body clears the lip");
    assert.ok(Math.abs(adapter.animator.active.getEffectiveTimeScale() - 0.2 / (0.4 * 0.45)) < 1e-9, "the authored mantle completes over only the post-lift travel");
    adapter.update(0.01, "WALK", 3.3);
    assert.equal(adapter.animator.activeState, "walk", "ordinary locomotion still resumes after traversal");
  });
});
