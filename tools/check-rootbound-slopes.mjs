import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createFrontierChunk } from '../src/world/frontierTerrain.js';

const out = `art/reviews/rootbound-wildwood/buildout-2026-09-15/${process.argv.includes('--pose') ? 'sliding-pose' : 'sliding'}`;
await fs.mkdir(out, { recursive: true });
const faces = [];
for (let cz = 12; cz <= 14; cz++) for (let cx = -11; cx <= -8; cx++) {
  const mesh = createFrontierChunk(cx, cz);
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const points = [...mesh.indices.slice(i, i + 3)].map(index => [...mesh.vertices.slice(index * 3, index * 3 + 3)]);
    const [a, b, c] = points, u = b.map((v, i) => v - a[i]), v = c.map((v, i) => v - a[i]);
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(...normal); normal.forEach((_, i) => normal[i] /= length);
    const degrees = Math.acos(normal[1]) * 180 / Math.PI;
    if (degrees < 47) continue;
    const x = (a[0] + b[0] + c[0]) / 3 + mesh.origin.x, z = (a[2] + b[2] + c[2]) / 3 + mesh.origin.z;
    if (x < -520 || x > -375 || z > 742) continue;
    faces.push({ x, z, y: (a[1] + b[1] + c[1]) / 3, degrees, normal });
  }
}
const slide = faces.filter(p => p.degrees < 57).sort((a, b) => Math.abs(a.degrees - 52) - Math.abs(b.degrees - 52));
const steep = faces.filter(p => p.degrees > 62).sort((a, b) => b.degrees - a.degrees);
console.log(JSON.stringify({ candidates: faces.length, slide: slide.slice(0, 3), steep: steep.slice(0, 3) }));
if (process.argv.includes('--scan')) { await fs.writeFile(`${out}/faces.json`, JSON.stringify({ slide, steep }, null, 2)); process.exit(); }
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, recordVideo: { dir: out, size: { width: 412, height: 915 } } });
const errors = [], receipts = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`${process.env.GAME_URL ?? 'http://localhost:8080/'}?scout=1`);
  await page.waitForFunction(() => !!window.__game, { timeout: 120000 });
  if (await page.locator('[data-action=start]').isVisible()) await page.locator('[data-action=start]').click();
  await page.locator('#scout-flight').click();
  await page.evaluate(() => { document.querySelector('#scout-controls').hidden = true; });
  for (const [kind, candidates] of [['slide', slide], ['fall', steep]]) {
    for (let attempt = 0; attempt < Math.min(3, candidates.length); attempt++) {
      const target = candidates[attempt];
      const place = async () => page.evaluate(p => {
        const g = window.__game;
        g.playerController.resetJumpState();
        g.characterPhysics.setPosition({ x: p.x, y: p.y + 1.05, z: p.z });
        g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
        g.cameraFollow.orbitBy(Math.atan2(-p.normal[0], -p.normal[2]) - g.cameraFollow.getYaw()); g.cameraFollow.snap();
      }, target);
      await place(); await page.waitForTimeout(5000); // load the destination's streamed collision
      await place(); // trial begins here, with no movement input or position changes afterward
      const trace = [];
      for (let frame = 0; frame < 50; frame++) {
        trace.push(await page.evaluate(() => {
          const g = window.__game, s = g.playerController.getState(), support = g.characterPhysics.getTerrainSupport();
          const model = g.scene.getObjectByName('externalPlayerModel');
          const animator = model?.parent?.userData?.externalPlayerModel?.animator;
          return { pos: { ...s.pos }, mode: s.mode, grounded: s.grounded, velocity: s.slideVelocity,
            pose: model && { pitch: model.rotation.x, y: model.position.y, clip: animator?.activeState, phase: animator?.active?.time },
            support: support && { degrees: support.angle * 180 / Math.PI, slidable: support.slidable } };
        }));
        if ([0, 12, 30, 49].includes(frame)) await page.screenshot({ path: `${out}/${kind}-${attempt}-${frame}.png` });
        await page.waitForTimeout(60);
      }
      const first = trace[0].pos, last = trace.at(-1).pos;
      const receipt = { kind, target, trace, horizontal: Math.hypot(last.x - first.x, last.z - first.z), drop: first.y - last.y };
      receipts.push(receipt);
      console.log(JSON.stringify({ kind, target, modes: [...new Set(trace.map(p => p.mode))], horizontal: receipt.horizontal, drop: receipt.drop }));
      if (kind === 'slide' ? trace.filter(s => s.mode === 'SLIDE').length > 3 && receipt.horizontal > .4 : trace.some(s => s.mode === 'FALL') && receipt.drop > .4) break;
    }
  }
  assert.ok(receipts.some(r => r.kind === 'slide' && r.trace.filter(s => s.mode === 'SLIDE').length > 3 && r.horizontal > .4), 'actual Rootbound terrain visibly carries an idle player downhill');
  if (steep.length) assert.ok(receipts.some(r => r.kind === 'fall' && r.trace.some(s => s.mode === 'FALL') && r.drop > .4), 'actual steep Rootbound terrain enters falling');
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/receipt.json`, JSON.stringify({ errors, receipts, steepFaceCount: steep.length }, null, 2));
  await browser.close();
}
