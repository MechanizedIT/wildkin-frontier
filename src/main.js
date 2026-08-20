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

const canvas = document.getElementById("c");
const app = document.getElementById("app");
const debugLabel = document.getElementById("debug-label");

const VERSION = "Phase 1.2 — 0.4.0";

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

// Single authoritative rAF loop — fixed timestep for Rapier
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

  // Fixed-step physics updates
  let substeps = 0;
  while (accumulator >= fixedDt && substeps < maxSubsteps) {
    playerController.update(fixedDt, intent);
    accumulator -= fixedDt;
    substeps++;
    // consume dodge only on first substep where it triggered
    if (wasDodgeRequested && playerController.getState().mode === "DODGE") {
      // dodge consumed, prevent re-trigger within same frame
      intent.dodgeRequested = false;
    }
  }
  physicsSubstepsLast = substeps;
  // If we hit maxSubsteps and still have accumulator, drop remainder to avoid spiral
  if (accumulator >= fixedDt) accumulator = 0;

  if (wasDodgeRequested) {
    touchMovement.consumeDodge();
  }

  // Camera follow — per-frame, uses rendered dt for smoothness
  const pState = playerController.getState();
  const moveDir = pState.speed > 0.1 ? { x: Math.sin(pState.facing), z: Math.cos(pState.facing) } : null;
  cameraFollow.update(dt, pState.speed, moveDir);

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
      debugLabel.textContent = `${VERSION} · ${fps} fps · ${stMode}${trav} · ${band} · ${pState.speed.toFixed(1)} u/s · ${grounded} vv${vv} · ${substeps} step`;
    }
  }

  renderer.render(scene, camera);
}

tick();

// Debug globals only (window.__game) — gameplay does not rely on it
window.__game = { scene, camera, renderer, player, playground, playerController, touchMovement, keyboardInput, THREE, MOVEMENT_CONFIG, RAPIER, physicsWorld, characterPhysics, physicsDebug };
