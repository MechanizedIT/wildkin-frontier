// Diagnostic habitat setup, followed by real keyboard sneak/walk and live AI.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = '.dream-loop/overnight-stealth';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
const errors = [], report = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto('http://localhost:8080/');
  await page.locator('[data-action=start]').click();
  await page.evaluate(() => { const g=window.__game; g.frontierProgress.unlockWaypoint('wp_section_1'); g.beginExpedition('wp_section_1'); });
  await page.waitForTimeout(500);
  for (const scenario of ['quiet-rear', 'quiet-front', 'walking-rear']) {
    const setup = await page.evaluate(async scenario => {
      const g = window.__game;
      const c = g.creatureSystem.getActiveAliveCreatures().find(c => c.state.visualAssetId === 'asset_wildkin_mossling');
      if (!c) throw Error('No Mossling');
      const { getSurfaceHeight } = await import('/src/world/terrainSurfaceModel.js');
      const surface = g.worldRegistry.getSectionById('section_1').surface;
      const p = { x: 0, z: 10, y: getSurfaceHeight(surface, 0, 10) + .65 };
      c.setPosition(p);
      Object.assign(c.state, { facing: scenario === 'quiet-front' ? 0 : Math.PI, aiState: 'ROAM', aiTimer: 0,
        isAggroed: false, fleeTime: 0, playerDetected: false, playerNoticeRemaining: 0,
        homePos: { ...p, y: p.y - .65 }, roamTarget: { ...p }, steerHold: 0 });
      const player = { x: 0, z: 13.2, y: getSurfaceHeight(surface, 0, 13.2) + .6 };
      g.characterPhysics.setPosition(player); g.playerController.syncPosFromPhysics();
      g.playerController.snapRenderPose(); g.cameraFollow.snap();
      window.__awarenessTarget = c.state.id;
      return { creatureId: c.state.id, position: p, player, facing: c.state.facing };
    }, scenario);
    // Let diagnostic repositioning settle onto Rapier ground; its brief FALL
    // is deliberately audible and must not contaminate the quiet trial.
    await page.waitForTimeout(350);
    await page.evaluate(({ position, facing }) => {
      const c=window.__game.creatureSystem.getCreatures().find(c=>c.state.id===window.__awarenessTarget);
      c.setPosition(position);
      Object.assign(c.state,{facing,aiState:'ROAM',aiTimer:0,isAggroed:false,fleeTime:0,playerDetected:false,playerNoticeRemaining:0});
    }, setup);
    if (scenario !== 'walking-rear') await page.keyboard.down('c');
    await page.keyboard.down('w');
    await page.waitForTimeout(650);
    const result = await page.evaluate(() => {
      const g = window.__game, c = g.creatureSystem.getCreatures().find(c => c.state.id === window.__awarenessTarget);
      const p = g.playerController.getState();
      return { mode: p.mode, speed: p.speed, player: { ...p.pos }, creature: { ...c.state.pos },
        facing: c.state.facing, detected: c.state.playerDetected, ai: c.state.aiState, memory: c.state.playerNoticeRemaining };
    });
    await page.keyboard.up('w'); await page.keyboard.up('c');
    await page.screenshot({ path: `${out}/${scenario}.png` });
    report.push({ scenario, setup, result });
  }
  assert.equal(report[0].result.mode, 'SNEAK');
  assert.equal(report[0].result.detected, false, 'quiet approach behind remains unnoticed');
  assert.equal(report[1].result.detected, true, 'quiet frontal approach is seen');
  assert.equal(report[2].result.detected, true, 'ordinary footsteps behind are heard');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pass: true, report, errors }));
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify({ report, errors }, null, 2));
  await browser.close();
}
