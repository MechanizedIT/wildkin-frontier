import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const label = process.argv[2] ?? 'current';
const only = process.argv.find(value => value.startsWith('--only='))?.slice(7);
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple capture label');
const out = `art/reviews/rootbound-wildwood/buildout-2026-09-15/${label}`;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });
const errors = [], frames = [];
page.on('pageerror', e => errors.push(e.message));
const stations = [
  ['meadow', -475, 590, 3.0], ['gallery-entry', -478, 620, 3.0],
  ['galleries', -480, 646, -2.85], ['grove', -449, 675, -2.3],
  ['verge', -422, 688, -2.5], ['crown', -469, 711, 3.08],
  ['crown-return', -493, 701, .05],
  ['crown-outlook', -470, 722, 0], ['grove-interior', -453, 680, -2.35],
];
try {
  await page.goto(`${process.env.GAME_URL ?? 'http://localhost:8080/'}?scout=1`);
  await page.waitForFunction(() => Boolean(window.__game), { timeout: 120000 });
  const start = page.locator('[data-action=start]');
  if (await start.isVisible()) await start.click();
  await page.waitForTimeout(900);
  await page.locator('#scout-flight').click();
  await page.evaluate(() => { document.querySelector('#scout-controls').hidden = true; });
  for (const [name, x, z, yaw] of stations.filter(station => !only || only.split(',').includes(station[0]))) {
    await page.evaluate(({ x, z, yaw }) => {
      const g = window.__game;
      g.characterPhysics.setPosition({ x, y: g.frontierChunks.getHeight(x, z) + .7, z });
      g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
      g.cameraFollow.orbitBy(yaw - g.cameraFollow.getYaw()); g.cameraFollow.snap();
    }, { x, z, yaw });
    await page.waitForTimeout(6500);
    const frame = await page.evaluate(() => {
      const g = window.__game, s = g.playerController.getState();
      const visuals = []; g.scene.traverse(o => { if (o.userData.frontierScenery) visuals.push(o.userData.frontierScenery); });
      const camera = g.camera, origin = camera.getWorldPosition(new g.THREE.Vector3());
      const target = new g.THREE.Vector3(s.pos.x, s.pos.y + .3, s.pos.z);
      const ray = new g.THREE.Raycaster(origin, target.clone().sub(origin).normalize(), 0, origin.distanceTo(target) - .3);
      ray.camera = camera;
      const obstructions = ray.intersectObjects(g.scene.children, true).filter(hit => hit.object.visible).slice(0, 8).map(hit => ({
        name: hit.object.name, parent: hit.object.parent?.name, distance: hit.distance, instanceId: hit.instanceId,
        data: hit.object.userData, parentData: hit.object.parent?.userData,
      }));
      return { pos: { ...s.pos }, grounded: s.grounded, mode: s.mode,
        terrain: g.frontierChunks.getHeight(s.pos.x, s.pos.z), render: { ...g.renderer.info.render },
        fps: g.debugCounts.fps, scenery: g.frontierScenery.getDebugState(), visuals, obstructions,
        overflow: document.documentElement.scrollWidth > innerWidth };
    });
    await page.screenshot({ path: `${out}/${name}.png` });
    frames.push({ name, ...frame });
    console.log(JSON.stringify({ name, pos: frame.pos, grounded: frame.grounded, calls: frame.render.calls, triangles: frame.render.triangles, fps: frame.fps }));
  }
  if (!only) {
  await page.setViewportSize({ width: 1200, height: 1050 });
  await page.evaluate(() => {
    const g = window.__game;
    const camera = new g.THREE.PerspectiveCamera(48, 1200 / 1050, .1, 1000);
    camera.position.set(-370, 130, 525); camera.lookAt(-462, 6, 663);
    g.scene.fog = null;
    g.renderer.setSize(1200, 1050); g.renderer.render(g.scene, camera);
    g.renderer.render = g.renderer.render.bind(g.renderer, g.scene, camera);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/overview.png` });
  }
} finally {
  await fs.writeFile(`${out}/report.json`, JSON.stringify({ label, errors, frames }, null, 2));
  await browser.close();
}
if (errors.length) console.error(errors);
