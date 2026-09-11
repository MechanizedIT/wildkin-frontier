// Repeatable visual evidence, not proof of human phone comfort or traversal.
// Region travel uses diagnostic APIs; existing playtests cover real input.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const label = process.argv[2] ?? 'current';
const portrait = process.argv.includes('--portrait');
const viewports = portrait ? [[390, 844], [320, 568]] : [[844, 390], [932, 430]];
const primaryWidth = viewports[0][0];
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple lowercase capture label');
const out = `.dream-loop/${label}`;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const errors = [], frames = [];
const page = await browser.newPage({ viewport: { width: primaryWidth, height: viewports[0][1] }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
page.on('pageerror', e => errors.push(e.message));
async function capture(name) {
  await page.waitForTimeout(2900);
  const stats = await page.evaluate(() => {
    const g = window.__game;
    const water = [];
    g.scene.traverse(o => { if (o.name === 'shallow_water') water.push({ material: o.material.type, metalness: o.material.metalness ?? 0, roughness: o.material.roughness ?? 1 }); });
    return { region: g.regionManager.getCurrentRegionId(), fps: g.debugCounts.fps,
      calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles,
      textures: g.renderer.info.memory.textures, water,
      generatedGroundPaint: Boolean(g.scene.getObjectByName(`terrain_${g.regionManager.getCurrentRegionId()}`)?.material.map?.userData.generatedGroundPaint),
      overflow: document.documentElement.scrollWidth > innerWidth,
      position: { ...g.playerController.getState().pos } };
  });
  assert.equal(stats.overflow, false, `${name}: viewport overflows horizontally`);
  await page.screenshot({ path: `${out}/${name}.png` });
  frames.push({ name, ...stats });
}
try {
  await page.goto(process.env.GAME_URL ?? 'http://localhost:8080/', { waitUntil: 'networkidle' });
  await page.locator('[data-action=start]').click();
  await capture(`camp-${primaryWidth}`);
  await page.evaluate(() => window.__game.beginExpeditionFromDefaultEntry());
  await capture(`section1-${primaryWidth}`);
  for (let section = 1; section <= 4; section++) {
    await page.evaluate(section => {
      const g = window.__game;
      const gate = g.worldRegistry.getPortalGateById(`gate_section_${section}_to_${section + 1}`);
      g.transitionThroughPortalGate(gate);
    }, section);
    await capture(`section${section + 1}-${primaryWidth}`);
  }
  // A seeded Camp inventory makes item detail and multi-digit counts reviewable.
  await page.evaluate(() => {
    const g = window.__game;
    g.handleExtractionFlow(null);
    g.frontierProgress.bankRun({ wood: 128, stone: 64, fiber: 32, berries: 12, iron_ore: 24, crystal_shard: 8, wildflower: 6 }, 240, 'dream-loop-qa');
  });
  if (await page.locator('.result-continue').isVisible()) await page.locator('.result-continue').click();
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.keyboard.press('b');
    await capture(`backpack-${width}`);
    await page.locator('.beta-panel nav [data-tab=skills]').click();
    await capture(`skills-${width}`);
    const settingsTab=page.locator('.beta-panel nav [data-tab=settings]');
    if(await settingsTab.isVisible()) await settingsTab.click();
    else {
      await page.locator('.beta-panel nav [data-tab=more]').click();
      await page.locator('.beta-panel main [data-tab=settings]').click();
    }
    await capture(`settings-${width}`);
    await page.keyboard.press('Escape');
    await capture(`hud-${width}`);
  }
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/report.json`, JSON.stringify({ label, viewport: `${viewports.map(([w,h])=>`${w}×${h}`).join(', ')}; desktop Edge mobile emulation`, errors, frames }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ label, errors, frames: frames.map(({ name, region, fps, calls, triangles }) => ({ name, region, fps, calls, triangles })) }, null, 2));
