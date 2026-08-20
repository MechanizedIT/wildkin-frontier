import * as THREE from "three";
import { createCamera, updateCameraAspect, CAMERA_CONFIG } from "./game/createCamera.js";
import { createRenderer, resizeRenderer } from "./game/createRenderer.js";
import { createScene } from "./game/createScene.js";
import { createPlayerController } from "./player/playerController.js";
import { createCameraFollow } from "./camera/cameraFollow.js";
import { createTouchMovement } from "./input/touchMovement.js";
import { createKeyboardInput } from "./input/keyboardInput.js";
import { mergeIntents as mergeIntentsPure } from "./input/inputController.js";
import { MOVEMENT_CONFIG, CAMERA_CONFIG_FOLLOW, INPUT_CONFIG } from "./game/config.js";

const canvas = document.getElementById("c");
const app = document.getElementById("app");
const debugLabel = document.getElementById("debug-label");

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

// Input — touch joystick + keyboard fallback unify to one intent
const touchMovement = createTouchMovement(app, MOVEMENT_CONFIG, INPUT_CONFIG);
const keyboardInput = createKeyboardInput(MOVEMENT_CONFIG);

// Player movement controller (owns state, handles dodge/jump/climb)
const playerController = createPlayerController(player, playground, camera, MOVEMENT_CONFIG);

// Camera follow
const cameraFollow = createCameraFollow(camera, player, CAMERA_CONFIG_FOLLOW, CAMERA_CONFIG);
cameraFollow.snap();

// Single authoritative rAF loop
const VERSION = "Phase 1.1 — 0.3.0";
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = performance.now();
let fps = 0;

if (debugLabel) debugLabel.textContent = `${VERSION} · starting…`;

function tick() {
  requestAnimationFrame(tick);

  const dt = Math.min(clock.getDelta(), MOVEMENT_CONFIG.maxDelta);

  // Unified intent
  const touchIntent = touchMovement.getIntent();
  const kbIntent = keyboardInput.getIntent();
  const intent = mergeIntentsPure(touchIntent, kbIntent);

  // Player update (consumes dodge if triggered)
  const wasDodgeRequested = intent.dodgeRequested;
  playerController.update(dt, intent);
  if (wasDodgeRequested) {
    // consume on both sources so dodge fires once
    touchMovement.consumeDodge();
    // keyboard dodge is latched until keyup; controller already consumed via cooldown, but clear flag for next frame
    // keyboard's space remains latched until release, but dodgeCooldown prevents retrigger
    const st = playerController.getState();
    if (st.mode === "DODGE") {
      // already consuming, nothing else
    }
  }

  // Camera follow — feed speed + direction for look-ahead
  const pState = playerController.getState();
  const moveDir = pState.speed > 0.1 ? { x: Math.sin(pState.facing), z: Math.cos(pState.facing) } : null;
  cameraFollow.update(dt, pState.speed, moveDir);

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
      const trav = pState.traversalMode && pState.traversalMode !== "IDLE" ? ` · ${pState.traversalMode}` : "";
      debugLabel.textContent = `${VERSION} · ${fps} fps · ${stMode}${trav} · ${band} · ${pState.speed.toFixed(1)} u/s`;
    }
  }

  renderer.render(scene, camera);
}

tick();

// Debug globals only (window.__game) — gameplay does not rely on it
window.__game = { scene, camera, renderer, player, playground, playerController, touchMovement, keyboardInput, THREE, MOVEMENT_CONFIG };
