import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { PRIMARY, BRANCH } from '../src/world/rootboundShoulders.js';

const label = process.argv[2] ?? 'current';
const optional = process.argv.includes('--branch');
const ordinary = process.argv.includes('--ordinary');
const out = `art/reviews/rootbound-wildwood/buildout-2026-09-15/${label}`;
await fs.mkdir(out, { recursive: true });
const route = optional ? BRANCH : PRIMARY;
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
const errors = [], trace = [], stops = [];
page.on('pageerror', e => errors.push(e.message));
let failure = null;
try {
  await page.goto(`${process.env.GAME_URL ?? 'http://localhost:8080/'}${ordinary ? '' : '?scout=1'}`);
  await page.waitForFunction(() => Boolean(window.__game), { timeout: 120000 });
  if (await page.locator('[data-action=start]').isVisible()) await page.locator('[data-action=start]').click();
  await page.waitForTimeout(500);
  if (!ordinary) await page.locator('#scout-flight').click();
  // One setup placement. Every following waypoint uses ordinary W input,
  // physical movement and camera steering, never position assignment.
  await page.evaluate(([x, z]) => {
    const g = window.__game;
    g.characterPhysics.setPosition({ x, y: g.frontierChunks.getHeight(x, z) + .7, z });
    g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
    if (document.querySelector('#scout-controls')) document.querySelector('#scout-controls').hidden = true;
  }, route[0]);
  await page.waitForTimeout(5000);
  const started = Date.now();
  for (let index = 1; index < route.length; index++) {
    const target = route[index]; let arrived = false, stagnant = 0, lastDistance = Infinity;
    for (let step = 0; step < 240; step++) {
      const sample = await page.evaluate(([x, z]) => {
        const g = window.__game, s = g.playerController.getState();
        const dx = x - s.pos.x, dz = z - s.pos.z, yaw = Math.atan2(-dx, -dz);
        let turn = yaw - g.cameraFollow.getYaw();
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        g.cameraFollow.orbitBy(turn);
        return { pos: { ...s.pos }, distance: Math.hypot(dx, dz), grounded: s.grounded,
          mode: s.mode, terrain: g.frontierChunks.getHeight(s.pos.x, s.pos.z), health: g.playerCombat.getHealth() };
      }, target);
      trace.push({ ms: Date.now() - started, waypoint: index, ...sample });
      if (sample.distance < .9) { arrived = true; break; }
      stagnant = lastDistance - sample.distance < .035 ? stagnant + 1 : 0;
      lastDistance = sample.distance;
      if (stagnant > 18) break;
      await page.keyboard.down('w'); await page.waitForTimeout(250);
    }
    await page.keyboard.up('w');
    stops.push({ index, target, arrived, pos: trace.at(-1)?.pos });
    await fs.writeFile(`${out}/walk-${optional ? 'branch' : 'main'}.json`, JSON.stringify({ input: 'ordinary keyboard W + camera steering; only first point placed', protectedScout: !ordinary, route, stops, failure: 'Traversal still running or interrupted before completion', errors, trace }, null, 2));
    console.log(JSON.stringify(stops.at(-1)));
    if (!arrived) { failure = `Blocked approaching waypoint ${index}`; await page.screenshot({ path: `${out}/walk-blocked.png` }); break; }
  }
  await page.screenshot({ path: `${out}/walk-end.png` });
} catch (e) { failure = e.stack; } finally {
  await page.keyboard.up('w').catch(() => {});
  await fs.writeFile(`${out}/walk-${optional ? 'branch' : 'main'}.json`, JSON.stringify({ input: 'ordinary keyboard W + camera steering; only first point placed', protectedScout: !ordinary, route, stops, failure, errors, trace }, null, 2));
  await browser.close();
}
if (failure || errors.length) { console.error(failure, errors); process.exitCode = 1; }
