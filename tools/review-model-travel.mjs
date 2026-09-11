// Candidate-only motion evidence in the running game. All setup is transient.
// Simulation stays on the game's own loop; camera changes are presentation only.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeWorldData } from '../src/world/worldValidator.js';
import { getSurfaceHeight } from '../src/world/terrainSurfaceModel.js';

const base = process.env.GAME_URL ?? 'http://localhost:8080/';
const out = process.env.OUTPUT_DIR;
if (!out) throw new Error('OUTPUT_DIR must name a fresh evidence directory');
await mkdir(out, { recursive: false });
const world = JSON.parse(await readFile('src/world/data/world.json', 'utf8'));
const candidates = [];
for (const [variable, id] of [['MOSS_MODEL', 'mossling'], ['PLAYER_MODEL', 'explorer']]) {
  if (!process.env[variable]) continue;
  const bytes = await readFile(process.env[variable]);
  const url = `assets/models/${id}-travel-review/model.glb`;
  const descriptor = id === 'mossling' ? world.visualAssets.find(a => a.id === 'asset_wildkin_mossling').model : world.playerVisual.model;
  descriptor.path = url;
  if (id === 'explorer' && process.env.PLAYER_DESCRIPTOR) world.playerVisual = JSON.parse(await readFile(process.env.PLAYER_DESCRIPTOR, 'utf8'));
  if (id === 'explorer') world.playerVisual.model.path = url;
  candidates.push({ id, url, bytes, source: process.env[variable], sha256: createHash('sha256').update(bytes).digest('hex') });
}
normalizeWorldData(world);
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const context = await browser.newContext({ viewport: { width: 1000, height: 560 }, recordVideo: { dir: path.join(out, 'video'), size: { width: 1000, height: 560 } } });
const page = await context.newPage();
const report = { candidates: candidates.map(({ bytes, ...c }) => c), setup: 'Candidate world injected in this browser only. Wild ROAM notice/timer is held for an unobstructed sample; player/companion travel uses ordinary keyboard input on the camp ground. Close-up camera replaces only presentation follow.', samples: {}, errors: [] };
page.on('pageerror', e => report.errors.push(e.message));
await page.route('**/src/world/data/world.js*', route => route.fulfill({ contentType: 'text/javascript', body: `const WORLD_DATA=${JSON.stringify(world)};export{WORLD_DATA};export default WORLD_DATA;` }));
for (const c of candidates) await page.route(`**/${c.url}`, route => route.fulfill({ contentType: 'model/gltf-binary', body: c.bytes }));

async function capture(label, target, keys = [], pulseKey = null) {
  await page.evaluate(target => {
    const g = window.__game;
    const pick = () => target === 'player' ? g.player : target === 'companion' ? g.scene.getObjectByName('companion_mossling') : g.creatureSystem.getCreatures().find(c => c.state.id === target)?.group;
    g.cameraFollow.update = () => {
      const group = pick(); if (!group) return;
      const p = group.position, yaw = group.rotation.y;
      const radius = target === 'player' ? 3.0 : 3.5;
      g.camera.position.set(p.x + Math.sin(yaw + Math.PI / 2.4) * radius, p.y + 1.15, p.z + Math.cos(yaw + Math.PI / 2.4) * radius);
      g.camera.lookAt(p.x, p.y + (target === 'player' ? .10 : .45), p.z); g.camera.fov = 40; g.camera.updateProjectionMatrix();
    };
  }, target);
  for (const key of keys) await page.keyboard.down(key);
  report.samples[label] = [];
  for (let i = 0; i < 16; i++) {
    // Hold across game frames: a zero-duration synthetic tap can be released
    // before the authoritative loop consumes it.
    if (pulseKey && i % 4 === 0) await page.keyboard.press(pulseKey, { delay: 80 });
    await page.waitForTimeout(80);
    const sample = await page.evaluate(target => {
      const g = window.__game;
      const c = g.creatureSystem.getCreatures().find(c => c.state.id === target);
      const group = target === 'player' ? g.player : target === 'companion' ? g.scene.getObjectByName('companion_mossling') : c?.group;
      let model; group?.traverse(n => { if (n.userData.externalModelInstance) model = n; });
      const a = model?.userData.modelAnimationController;
      const tool = target === 'player' ? g.fieldTool : null;
      return { time: performance.now(), position: group?.position.toArray(), yaw: group?.rotation.y, state: a?.activeState, clipTime: a?.active?.time, timeScale: a?.active?.getEffectiveTimeScale(), ai: c?.state.aiState,
        tool: tool ? { swinging: tool.isSwinging, profile: tool.activeProfile, hand: tool.handAnchor.getWorldPosition(new g.THREE.Vector3()).toArray(), head: tool.head.getWorldPosition(new g.THREE.Vector3()).toArray() } : undefined };
    }, target);
    sample.image = `${label}-${String(i).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(out, sample.image) });
    report.samples[label].push(sample);
  }
  for (const key of keys) await page.keyboard.up(key);
  await page.waitForTimeout(180);
}

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('[data-action="start"]').click();
  await page.waitForFunction(() => !!window.__game?.player?.userData?.externalPlayerModel);
  if (process.env.PLAYER_MODEL) {
    // The camp's outer clearing has room for several strides and a side camera.
    // This only stages the review; subsequent travel still uses ordinary input.
    const surface = world.regions.find(region => region.id === 'camp').surface;
    const position = { x: 30, y: getSurfaceHeight(surface, 30, 22) + .52, z: 22 };
    await page.evaluate(position => { const g = window.__game; g.characterPhysics.setPosition(position); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose(); }, position);
    report.playerReviewStart = position;
  }
  await page.evaluate(() => window.__game.frontierProgress.secureCompanions(['mossling'], 'transient-motion-review'));
  await page.waitForTimeout(300);
  if (process.env.FIT_TOOL === '1') {
    const fitted = await page.evaluate(() => {
      const g = window.__game, T = g.THREE, tool = g.fieldTool;
      const anchor = tool.handAnchor, hand = anchor.parent;
      g.scene.updateMatrixWorld(true);
      const handWorld = hand.getWorldQuaternion(new T.Quaternion());
      const anchorWorld = anchor.getWorldQuaternion(new T.Quaternion());
      const toolWorld = tool.toolGroup.getWorldQuaternion(new T.Quaternion());
      const downstream = anchorWorld.clone().invert().multiply(toolWorld);
      const forward = new T.Vector3(0, -.65, .75).normalize();
      const right = new T.Vector3(1, 0, 0);
      const up = new T.Vector3().crossVectors(forward, right).normalize();
      const desired = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right, up, forward));
      desired.premultiply(g.player.getWorldQuaternion(new T.Quaternion()));
      anchor.quaternion.copy(handWorld.invert().multiply(desired).multiply(downstream.invert()));
      anchor.position.set(.012, .040, .024);
      return { bone: hand.name, position: { x: anchor.position.x, y: anchor.position.y, z: anchor.position.z }, rotation: { x: anchor.rotation.x, y: anchor.rotation.y, z: anchor.rotation.z } };
    });
    const descriptor = structuredClone(world.playerVisual); descriptor.handAnchor = fitted;
    await writeFile(path.join(out, 'fitted-player-descriptor.json'), JSON.stringify(descriptor, null, 2));
    report.fittedHandAnchor = fitted;
  }
  const start = await page.evaluate(() => window.__game.playerController.getState().pos);
  async function resetPlayer() {
    await page.evaluate(start => { const g = window.__game; g.characterPhysics.setPosition(start); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose(); }, start);
    await page.waitForTimeout(200);
  }
  if (process.env.PLAYER_MODEL) {
    await capture('player-walk', 'player', ['KeyW']); await resetPlayer();
    await capture('player-run', 'player', ['KeyW', 'ShiftLeft']); await resetPlayer();
    await capture('player-sneak', 'player', ['KeyW', 'KeyC']); await resetPlayer();
    // Field Tool attacks require an active expedition; Space is Dodge.
    await page.evaluate(() => window.__game.beginExpeditionFromDefaultEntry());
    await page.waitForTimeout(300);
    await capture('player-attack', 'player', [], 'KeyF');
    await capture('player-dodge', 'player', [], 'Space');
    // Stage behind the first authored pad, then cross it using ordinary W.
    // The existing pad and physics own the jump; no animation is forced.
    const region = world.regions.find(region => region.id === 'section_1');
    const pad = region.jumpPads[0];
    const padStart = { x: pad.pos.x, z: pad.pos.z + 1.9 };
    padStart.y = getSurfaceHeight(region.surface, padStart.x, padStart.z) + .52;
    await page.evaluate(position => { const g = window.__game; g.characterPhysics.setPosition(position); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose(); }, padStart);
    report.jumpSetup = { pad: pad.id, start: padStart, input: 'W across the authored launch pad' };
    await page.waitForTimeout(200);
    await capture('player-jump', 'player', ['KeyW']);
    for (const [label, state] of [['player-attack', 'attack'], ['player-dodge', 'dodge'], ['player-jump', 'jump']]) {
      const states = report.samples[label].map(sample => sample.state);
      assert.ok(states.includes(state), `${label} never entered ${state}: ${states.join(', ')}`);
      assert.ok(states.some(value => value !== state), `${label} never exited ${state}`);
    }
  }
  if (process.env.MOSS_MODEL) {
    await capture('companion-follow', 'companion', ['KeyW']);
    const id = await page.evaluate(() => {
      const g = window.__game; g.beginExpeditionFromDefaultEntry();
      const c = g.creatureSystem.getActiveAliveCreatures().find(c => c.state.id === 'wildkin_mossling_1');
      c.state.noticeRadius = 0; c.state.personalSpaceRadius = 0; c.state.aiTimer = -100; c.state.facing = 0;
      return c.state.id;
    });
    await capture('wild-roam', id);
  }
  for (const samples of Object.values(report.samples)) {
    for (let i = 1; i < samples.length; i++) {
      const s = samples[i], p = samples[i - 1];
      if (!s.position || !p.position) throw new Error('Review model disappeared');
      const dx = s.position[0] - p.position[0], dz = s.position[2] - p.position[2], distance = Math.hypot(dx, dz);
      s.speed = distance / ((s.time - p.time) / 1000);
      s.forwardDotTravel = distance > .001 ? (Math.sin(s.yaw) * dx + Math.cos(s.yaw) * dz) / distance : null;
    }
  }
} finally {
  report.note = 'Evidence only: numeric heading and selectable clips do not establish acceptable anatomy, gait or physical-phone performance. Independent actual-image review is required.';
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await context.close(); await browser.close();
}
console.log(JSON.stringify({ output: out, errors: report.errors, samples: Object.keys(report.samples) }));
if (report.errors.length) process.exitCode = 1;
