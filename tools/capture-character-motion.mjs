// Capture exported GLB clips in the local Three.js runtime for visual review.
//
// Required environment:
//   MODEL_URL=/.dream-loop/.../model.glb OUTPUT_DIR=.dream-loop/.../runtime-motion
// Optional:
//   GAME_URL=http://localhost:8080/ CLIPS=Walk,Run HEIGHT_METERS=1.2
//   SPEEDS=Walk:0.98,Run:4 DESCRIPTOR_URL=/.dream-loop/.../asset.json
//
// This is a review tool, not an admission judge. It samples each requested
// exported clip at 12 phases including the loop endpoint without using a game
// requestAnimationFrame loop or changing production runtime state.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const gameUrl = process.env.GAME_URL ?? 'http://localhost:8080/';
const modelUrl = process.env.MODEL_URL;
const outputDir = process.env.OUTPUT_DIR;
if (!modelUrl || !outputDir) throw new Error('MODEL_URL and OUTPUT_DIR are required.');
if (!modelUrl.startsWith('/') || /^https?:/i.test(modelUrl)) throw new Error('MODEL_URL must be a local same-origin path beginning with /.');
const requestedClips = (process.env.CLIPS ?? 'Walk,Run').split(',').map((value) => value.trim()).filter(Boolean);
if (!requestedClips.length) throw new Error('CLIPS must name at least one animation.');
const heightMeters = Number(process.env.HEIGHT_METERS ?? '');
const speeds = Object.fromEntries((process.env.SPEEDS ?? '').split(',').filter(Boolean).map((entry) => {
  const [name, value] = entry.split(':');
  return [name.trim(), Number(value)];
}));
const descriptorUrl = process.env.DESCRIPTOR_URL || null;
if (descriptorUrl && (!descriptorUrl.startsWith('/') || /^https?:/i.test(descriptorUrl))) throw new Error('DESCRIPTOR_URL must be a local same-origin path beginning with /.');

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });

async function writeContactSheet(name, frames) {
  const dataUrl = await page.evaluate(async ({ frames }) => {
    const decode = (base64) => new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = `data:image/png;base64,${base64}`;
    });
    const images = await Promise.all(frames.map((frame) => decode(frame.base64)));
    const cell = 128; const columns = 4; const rows = Math.ceil(images.length / columns);
    const canvas = document.createElement('canvas'); canvas.width = columns * cell; canvas.height = rows * cell;
    const context = canvas.getContext('2d'); context.fillStyle = '#152128'; context.fillRect(0, 0, canvas.width, canvas.height);
    images.forEach((image, index) => {
      const x = (index % columns) * cell; const y = Math.floor(index / columns) * cell;
      context.drawImage(image, x, y, cell, cell); context.fillStyle = 'rgba(0,0,0,.7)'; context.fillRect(x, y + cell - 19, cell, 19);
      context.fillStyle = '#fff'; context.font = '12px sans-serif'; context.fillText(`${String(frames[index].phase).padStart(3, ' ')}%`, x + 6, y + cell - 6);
    });
    return canvas.toDataURL('image/png');
  }, { frames });
  await writeFile(path.join(outputDir, `${name}-contact-sheet.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
}

try {
  await page.goto(gameUrl, { waitUntil: 'networkidle' });
  const info = await page.evaluate(async ({ modelUrl, descriptorUrl, requestedClips, heightMeters }) => {
    const THREE = await import('/vendor/three.module.js');
    const { GLTFLoader } = await import('/vendor/addons/GLTFLoader.js');
    const response = await fetch(modelUrl);
    if (!response.ok) throw new Error(`Cannot fetch model: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const descriptor = descriptorUrl ? await fetch(descriptorUrl).then(async (result) => {
      if (!result.ok) throw new Error(`Cannot fetch descriptor: ${result.status}`);
      return result.json();
    }) : null;
    document.body.replaceChildren(); document.body.style.margin = '0'; document.body.style.background = '#152128';
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(512, 512); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; document.body.append(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x152128);
    const camera = new THREE.PerspectiveCamera(33, 1, .05, 100); scene.add(new THREE.HemisphereLight(0xf9fff4, 0x21382c, 2.0));
    const key = new THREE.DirectionalLight(0xfff1d5, 2.8); key.position.set(3.5, 5.5, 4); key.castShadow = true; scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bcaff, 0.8); fill.position.set(-4, 2, -3); scene.add(fill);
    const gltf = await new GLTFLoader().parseAsync(bytes, modelUrl);
    gltf.scene.traverse((node) => {
      if (!node.isMesh) return;
      const source = Array.isArray(node.material) ? node.material[0] : node.material;
      node.material = new THREE.MeshLambertMaterial({ color: source?.color ?? 0xffffff, map: source?.map ?? null, flatShading: true });
      node.castShadow = true; node.receiveShadow = true;
    });
    scene.add(gltf.scene); const bounds = new THREE.Box3().setFromObject(gltf.scene); const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3()); const floorY = bounds.min.y;
    const grid = new THREE.GridHelper(Math.max(size.x, size.z, 1) * 3, 16, 0x46636a, 0x274249); grid.position.y = floorY; scene.add(grid);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(Math.max(size.x, size.z, 1) * 1.5, 64), new THREE.MeshLambertMaterial({ color: 0x607659 })); floor.rotation.x = -Math.PI / 2; floor.position.y = floorY - .002; floor.receiveShadow = true; scene.add(floor);
    const mixer = new THREE.AnimationMixer(gltf.scene); const clips = Object.fromEntries(gltf.animations.map((clip) => [clip.name, clip]));
    const missing = requestedClips.filter((clip) => !clips[clip]); if (missing.length) throw new Error(`Missing requested clips: ${missing.join(', ')}`);
    window.__characterMotionCapture = { THREE, renderer, scene, camera, mixer, gltf, clips, heightHint: Number.isFinite(heightMeters) ? heightMeters : 0, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: size.toArray(), center: center.toArray(), floorY } };
    return { bytes: bytes.byteLength, sha256, descriptor, clips: Object.fromEntries(gltf.animations.map((clip) => [clip.name, clip.duration])), bounds: window.__characterMotionCapture.bounds };
  }, { modelUrl, descriptorUrl, requestedClips, heightMeters });

  const captures = [];
  for (const clipName of requestedClips) {
    const duration = info.clips[clipName];
    for (const view of ['front', 'three-quarter', 'side']) {
      const contactFrames = [];
      for (let index = 0; index < 12; index += 1) {
        const phase = index / 11; // includes the wrap endpoint exactly once.
        await page.evaluate(({ clipName, duration, phase, view }) => {
          const proof = window.__characterMotionCapture; const { THREE, mixer, clips, camera, renderer, scene } = proof;
          mixer.stopAllAction(); const action = mixer.clipAction(clips[clipName]); action.reset(); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
          mixer.setTime(Math.min(duration, duration * phase)); action.paused = true;
          // Animation can expand the skinned pose far beyond bind-pose bounds;
          // fit the camera from this exact sampled pose so no head, tail or
          // flight limb is silently cropped out of the review evidence.
          proof.scene.updateMatrixWorld(true); const sampledBounds = new THREE.Box3().setFromObject(proof.gltf.scene); const sampledSize = sampledBounds.getSize(new THREE.Vector3());
          const largest = Math.max(sampledSize.x, sampledSize.y, sampledSize.z, proof.heightHint || 0, .01); const center = sampledBounds.getCenter(new THREE.Vector3()); center.y = sampledBounds.min.y + sampledSize.y * .52;
          const radius = largest * 4.5; const elevation = largest * 1.10;
          // Three.js is Y-up: X/Z orbit the model horizontally and Y is the
          // camera elevation. Keeping this explicit avoids the prior review
          // error where the camera descended into the model and cropped heads.
          const positions = { front: [0, elevation, radius], 'three-quarter': [radius * .72, elevation, radius * .72], side: [radius, elevation, 0] };
          camera.position.set(center.x + positions[view][0], center.y + positions[view][1], center.z + positions[view][2]); camera.lookAt(center); renderer.render(scene, camera);
        }, { clipName, duration, phase, view });
        const filename = `${clipName.toLowerCase()}-${view}-${String(index + 1).padStart(2, '0')}.png`;
        const buffer = await page.screenshot({ path: path.join(outputDir, filename) });
        contactFrames.push({ phase: Math.round(phase * 100), base64: buffer.toString('base64') });
        captures.push({ clip: clipName, view, index, phase, file: filename });
      }
      await writeContactSheet(`${clipName.toLowerCase()}-${view}`, contactFrames);
    }
  }
  const travelReference = Object.fromEntries(requestedClips.map((clip) => {
    const speed = speeds[clip]; const duration = info.clips[clip];
    return [clip, { durationSeconds: duration, speedMetersPerSecond: Number.isFinite(speed) ? speed : null, nominalTravelMetersPerCycle: Number.isFinite(speed) ? speed * duration : null }];
  }));
  await writeFile(path.join(outputDir, 'motion-review.json'), JSON.stringify({
    tool: 'tools/capture-character-motion.mjs', modelUrl, descriptorUrl, model: { bytes: info.bytes, sha256: info.sha256, bounds: info.bounds, heightMeters: Number.isFinite(heightMeters) ? heightMeters : null }, descriptor: info.descriptor,
    requestedClips, availableClipDurationsSeconds: info.clips, travelReference, capture: { phases: 12, endpointIncluded: true, loopMode: 'LoopOnce clampWhenFinished', views: ['front', 'three-quarter', 'side'], materials: 'runtime MeshLambertMaterial with source Base Color map; no reflection maps', floor: 'matte circle plus grid at exported model bounds minimum Y' }, captures,
    limitation: 'Screenshots and clip timing are evidence for an independent motion reviewer. They do not establish a gameplay movement pass, foot locking, or owner phone acceptance.'
  }, null, 2));
  console.log(JSON.stringify({ outputDir, modelUrl, sha256: info.sha256, clips: requestedClips, clipDurations: info.clips }, null, 2));
} finally {
  await browser.close();
}
