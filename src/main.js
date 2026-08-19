import * as THREE from "three";
import { createCamera, updateCameraAspect } from "./game/createCamera.js";
import { createRenderer, resizeRenderer } from "./game/createRenderer.js";
import { createScene } from "./game/createScene.js";

const canvas = document.getElementById("c");
const app = document.getElementById("app");
const debugLabel = document.getElementById("debug-label");

// Scene / camera / renderer setup
const { scene, player } = createScene();

function getAspect() {
  const w = app.clientWidth;
  const h = app.clientHeight;
  return w / Math.max(h, 1);
}

const camera = createCamera(getAspect());
const renderer = createRenderer(canvas);

// Initial sizing — use app container (portrait) not window innerWidth
function resize() {
  const w = app.clientWidth;
  const h = app.clientHeight;
  updateCameraAspect(camera, w / Math.max(h, 1));
  resizeRenderer(renderer, w, h);
}

resize();
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => {
  // Safari needs a tick after orientationchange
  setTimeout(resize, 200);
});

// Subtle idle animation so scene feels alive without adding gameplay
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Gentle bob + facing drift to prove render loop is healthy — removed later when movement exists
  if (player) {
    player.position.y = 0.35 + Math.sin(t * 1.1) * 0.04;
    player.rotation.y = Math.sin(t * 0.35) * 0.12;
  }

  renderer.render(scene, camera);
}

animate();

// Debug / version label — temporary, removable later
const VERSION = "Phase 0 — 0.1.0";
let frameCount = 0;
let lastFpsUpdate = performance.now();
let fps = 0;

function updateDebugLabel() {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate > 500) {
    fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    lastFpsUpdate = now;
    frameCount = 0;
    if (debugLabel) {
      debugLabel.textContent = `${VERSION} · ${fps} fps · ${app.clientWidth}×${app.clientHeight} · portrait`;
    }
  }
  requestAnimationFrame(updateDebugLabel);
}

if (debugLabel) {
  debugLabel.textContent = `${VERSION} · starting…`;
}
updateDebugLabel();

// Expose for manual console checks (not required for submission)
window.__game = { scene, camera, renderer, THREE };
