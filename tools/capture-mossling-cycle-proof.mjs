// Standalone, synchronous cycle contact-sheet proof for a staged GLB.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.GAME_URL ?? 'http://localhost:8080/';
const modelPath = process.env.MODEL_URL ?? '/.dream-loop/workflow-proof/rigging/mossling-20k-v7/model.glb';
const output = '.dream-loop/workflow-proof/rigging/mossling-20k-v7/actual-game-review/cycles';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
await page.goto(base, { waitUntil: 'networkidle' });
const info = await page.evaluate(async ({ modelPath }) => {
  const THREE = await import('/vendor/three.module.js');
  const { GLTFLoader } = await import('/vendor/addons/GLTFLoader.js');
  document.body.replaceChildren(); document.body.style.margin = '0';
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(512, 512); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x21313a);
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100); camera.position.set(3.1, 2.15, 4.1); camera.lookAt(0, .7, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x243a30, 2.2));
  const key = new THREE.DirectionalLight(0xfff4df, 2.4); key.position.set(3, 5, 4); scene.add(key);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2.1, 48), new THREE.MeshLambertMaterial({ color: 0x738866 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const gltf = await new GLTFLoader().loadAsync(modelPath);
  gltf.scene.traverse((node) => { if (node.isMesh) { node.material = new THREE.MeshLambertMaterial({ color: node.material.color, map: node.material.map, flatShading: true }); node.castShadow = node.receiveShadow = true; } });
  scene.add(gltf.scene);
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const byName = Object.fromEntries(gltf.animations.map((clip) => [clip.name, clip]));
  window.__cycleProof = { THREE, renderer, scene, camera, mixer, byName };
  return Object.fromEntries(gltf.animations.map((clip) => [clip.name, clip.duration]));
}, { modelPath });
for (const clipName of ['Idle', 'Walk', 'Run', 'Attack', 'Hurt']) {
  if (!info[clipName]) throw new Error(`Missing ${clipName}`);
  for (let i = 0; i < 10; i++) {
    await page.evaluate(({ clipName, i }) => {
      const p = window.__cycleProof; p.mixer.stopAllAction(); const action = p.mixer.clipAction(p.byName[clipName]); action.reset().play(); p.mixer.setTime(p.byName[clipName].duration * i / 9); p.renderer.render(p.scene, p.camera);
    }, { clipName, i });
    await page.screenshot({ path: path.join(output, `${clipName.toLowerCase()}-${String(i + 1).padStart(2, '0')}.png`) });
  }
}
await writeFile(path.join(output, 'clip-durations.json'), JSON.stringify(info, null, 2));
await browser.close();
console.log(JSON.stringify({ output, clips: info }, null, 2));
