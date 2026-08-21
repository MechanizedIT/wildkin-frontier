import * as THREE from "three";
import * as RAPIER from "rapier";
import { createCamera, updateCameraAspect, CAMERA_CONFIG } from "./game/createCamera.js";
import { createRenderer, resizeRenderer } from "./game/createRenderer.js";
import { createScene } from "./game/createScene.js";
import { createPlayerController } from "./player/playerController.js";
import { createCameraFollow } from "./camera/cameraFollow.js";
import { createTouchMovement } from "./input/touchMovement.js";
import { createKeyboardInput } from "./input/keyboardInput.js";
import { mergeIntents as mergeIntentsPure } from "./input/inputController.js";
import { MOVEMENT_CONFIG, CAMERA_CONFIG_FOLLOW, INPUT_CONFIG, RAPIER_CONFIG } from "./game/config.js";
import { createPhysicsWorld } from "./physics/createPhysicsWorld.js";
import { createCharacterPhysics } from "./physics/createCharacterPhysics.js";
import { createPhysicsDebug } from "./physics/physicsDebug.js";
import { createResourceSystem } from "./resources/resourceSystem.js";
import { createPickupSystem } from "./resources/pickupSystem.js";
import { createFieldTool } from "./tools/fieldTool.js";
import { createGameAudio } from "./audio/gameAudio.js";
import { createRunInventoryHud } from "./ui/runInventoryHud.js";
import { createParticleSystem } from "./resources/particleSystem.js";
import { createAutoHarvestToggle } from "./ui/autoHarvestToggle.js";

const canvas = document.getElementById("c");
const app = document.getElementById("app");
const debugLabel = document.getElementById("debug-label");

const VERSION = "Phase 2.2 — 0.7.0";

if (debugLabel) debugLabel.textContent = `${VERSION} · loading Rapier…`;

await RAPIER.init();

const { scene, player, playground } = createScene();

function getAspect() {
  const w = app.clientWidth;
  const h = app.clientHeight;
  return w / Math.max(h, 1);
}

const camera = createCamera(getAspect());
const renderer = createRenderer(canvas);

function resize() {
  const w = app.clientWidth;
  const h = app.clientHeight;
  updateCameraAspect(camera, w / Math.max(h, 1));
  resizeRenderer(renderer, w, h);
}
resize();
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => {
  setTimeout(resize, 200);
});

// Physics — offline, vendored rapier.js (compat, base64 WASM)
const physicsWorld = createPhysicsWorld(RAPIER, playground);
// Player capsule starts slightly above ground to avoid initial penetration
const startPos = { x: 0, y: RAPIER_CONFIG.capsuleTotalHeight / 2 + 0.15, z: 5.5 };
const characterPhysics = createCharacterPhysics(RAPIER, physicsWorld.world, startPos);

// Input
const touchMovement = createTouchMovement(app, MOVEMENT_CONFIG, INPUT_CONFIG);
const keyboardInput = createKeyboardInput(MOVEMENT_CONFIG);

// Player controller (Rapier authoritative)
const playerController = createPlayerController(player, playground, camera, MOVEMENT_CONFIG, characterPhysics);
// Sync mesh to physics start pos
player.position.set(startPos.x, startPos.y, startPos.z);

// Camera follow
const cameraFollow = createCameraFollow(camera, player, CAMERA_CONFIG_FOLLOW, CAMERA_CONFIG);
cameraFollow.snap();

// Physics debug (disabled by default, enable via window.__game.physicsDebug.setEnabled(true))
const physicsDebug = createPhysicsDebug(scene, characterPhysics, physicsWorld);

// Phase 2.1 — harvesting systems
const resourcePlacements = [
  // Trees (6) ~5 hits each
  { type: "tree", pos: { x: 1.2, y: 0, z: 4.2 } },
  { type: "tree", pos: { x: -8.6, y: 0, z: 1.8 } },
  { type: "tree", pos: { x: 6.2, y: 0, z: -1.8 } },
  { type: "tree", pos: { x: 2.2, y: 2.4, z: -7.2 } }, // on high platform top
  { type: "tree", pos: { x: -9.0, y: 0, z: 6.5 } },
  { type: "tree", pos: { x: 8.8, y: 0, z: 3.2 } },
  // Rocks (5) ~4 hits each
  { type: "rock", pos: { x: 3.2, y: 0, z: 2.6 } },
  { type: "rock", pos: { x: 4.6, y: 0, z: 3.4 } },
  { type: "rock", pos: { x: 7.2, y: 0, z: 0.8 } },
  { type: "rock", pos: { x: -3.0, y: 0, z: -4.5 } },
  { type: "rock", pos: { x: -1.8, y: 0, z: -4.8 } },
  // Fiber (7) ~3 hits each
  { type: "fiber", pos: { x: 0.2, y: 0, z: 4.6 } },
  { type: "fiber", pos: { x: -2.2, y: 0, z: 6.0 } },
  { type: "fiber", pos: { x: -7.2, y: 0, z: -1.2 } },
  { type: "fiber", pos: { x: 1.0, y: 0, z: -3.8 } },
  { type: "fiber", pos: { x: 8.4, y: 0, z: -2.4 } },
  { type: "fiber", pos: { x: -4.2, y: 0, z: -8.2 } },
  { type: "fiber", pos: { x: 4.0, y: 0, z: -5.8 } },
];

const gameAudio = createGameAudio();
const particleSystem = createParticleSystem(scene);
const inventoryHud = createRunInventoryHud();
const autoHarvestToggle = createAutoHarvestToggle(true);
let autoHarvestEnabled = true;
autoHarvestToggle.onToggle((v) => { autoHarvestEnabled = v; });

const pickupSystem = createPickupSystem(scene, physicsWorld, playground, (inv, resId) => {
  inventoryHud.update(inv);
  if (resId) inventoryHud.pulse(resId);
});
pickupSystem.setPlayerCollider(characterPhysics.collider);
inventoryHud.update(pickupSystem.getInventory());

const resourceSystem = createResourceSystem(scene, physicsWorld, resourcePlacements);
const fieldTool = createFieldTool(player, gameAudio);

// Single authoritative rAF loop — fixed timestep for Rapier + harvesting
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = performance.now();
let fps = 0;
let accumulator = 0;
let physicsSubstepsLast = 0;
const fixedDt = RAPIER_CONFIG.fixedDt;
const maxSubsteps = RAPIER_CONFIG.maxSubsteps;
const maxDelta = RAPIER_CONFIG.maxDelta;

if (debugLabel) debugLabel.textContent = `${VERSION} · Rapier ${RAPIER.version ? RAPIER.version() : "0.20.0"} · starting…`;

function tick() {
  requestAnimationFrame(tick);

  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, maxDelta);
  accumulator += dt;

  // Unified intent sampled once per frame (same intent for all substeps)
  const touchIntent = touchMovement.getIntent();
  const kbIntent = keyboardInput.getIntent();
  const intent = mergeIntentsPure(touchIntent, kbIntent);
  const wasDodgeRequested = intent.dodgeRequested;

  // Fixed-step physics + harvesting updates
  let substeps = 0;
  while (accumulator >= fixedDt && substeps < maxSubsteps) {
    playerController.update(fixedDt, intent);
    // Harvesting fixed-step updates — player position/state at this substep (includes speed gating)
    const pStateFixed = playerController.getState();
    const pPosFixed = pStateFixed.pos;
    resourceSystem.update(fixedDt, pPosFixed, pStateFixed.mode, pStateFixed.speed, autoHarvestEnabled);
    // FieldTool handles swing cadence and decides when to impact (checks speed + auto flag)
    fieldTool.update(
      fixedDt,
      pPosFixed,
      pStateFixed,
      (pos, mode, speed, autoFlag) => resourceSystem.getEligibleNodes(pos, mode, speed ?? pStateFixed.speed, autoFlag ?? autoHarvestEnabled),
      (targets) => {
        for (const node of targets) {
          resourceSystem.applyHit(
            node,
            (n) => pickupSystem.spawnPickup(n),
            (n, cnt) => particleSystem.spawnBurst(n, cnt),
            (profile, isFinal) => {
              gameAudio.playHarvest(profile, isFinal);
              if (isFinal) gameAudio.playDeplete();
            }
          );
        }
      },
      autoHarvestEnabled
    );
    // Pickups physics / magnet (fixed step for determinism, also per-frame below for smoothness)
    const psFixed = playerController.getState();
    pickupSystem.update(fixedDt, psFixed.pos, (resId) => gameAudio.playPickup(resId), characterPhysics.collider);

    accumulator -= fixedDt;
    substeps++;
    // consume dodge only on first substep where it triggered
    if (wasDodgeRequested && playerController.getState().mode === "DODGE") {
      intent.dodgeRequested = false;
    }
  }
  physicsSubstepsLast = substeps;
  if (accumulator >= fixedDt) accumulator = 0;

  if (wasDodgeRequested) {
    touchMovement.consumeDodge();
  }

  // Camera follow — per-frame, uses rendered dt for smoothness
  const pState = playerController.getState();
  const moveDir = pState.speed > 0.1 ? { x: Math.sin(pState.facing), z: Math.cos(pState.facing) } : null;
  cameraFollow.update(dt, pState.speed, moveDir);

  // Per-frame particle interpolation (dt) for smoothness beyond fixed step
  particleSystem.update(dt);
  // Also update pickups per-frame for magnet smoothness if no fixed steps happened
  if (substeps === 0) {
    pickupSystem.update(Math.min(dt, 1 / 30), pState.pos, (resId) => gameAudio.playPickup(resId), characterPhysics.collider);
  }

  // Physics debug
  physicsDebug.update(pState.grounded, pState.speed, pState.verticalVelocity, physicsSubstepsLast);

  // Debug label throttled
  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate > 500) {
    fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    lastFpsUpdate = now;
    frameCount = 0;
    if (debugLabel) {
      const band = intent.movementBand;
      const stMode = pState.mode;
      const trav = pState.traversalMode && pState.traversalMode !== "IDLE" && pState.traversalMode !== stMode ? ` · ${pState.traversalMode}` : "";
      const grounded = pState.grounded ? "G" : "A";
      const vv = pState.verticalVelocity.toFixed(1);
      const inv = pickupSystem.getInventory();
      debugLabel.textContent = `${VERSION} · ${fps} fps · ${stMode}${trav} · ${band} · ${pState.speed.toFixed(1)} u/s · W${inv.wood} S${inv.stone} F${inv.fiber} · ${grounded} vv${vv} · ${substeps} step`;
    }
  }

  renderer.render(scene, camera);
}

tick();

// Debug globals only (window.__game) — gameplay does not rely on it
window.__game = {
  scene, camera, renderer, player, playground, playerController, touchMovement, keyboardInput, THREE, MOVEMENT_CONFIG, RAPIER, physicsWorld, characterPhysics, physicsDebug, resourceSystem, pickupSystem, fieldTool, inventoryHud, gameAudio, particleSystem, autoHarvestToggle,
  get autoHarvestEnabled() { return autoHarvestEnabled; },
  set autoHarvestEnabled(v) { autoHarvestEnabled = !!v; autoHarvestToggle.setEnabled(autoHarvestEnabled); },
  get debugCounts() {
    return {
      activePickups: pickupSystem.getCount(),
      pooledPickups: pickupSystem.getPooledCount(),
      activeParticles: particleSystem.getCount(),
      pooledParticles: particleSystem.getPooledCount(),
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      fps,
    };
  },
};
