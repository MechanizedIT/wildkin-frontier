// Native CDP multi-touch proof for the portrait joystick and direct Dodge UI.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'art/reviews/rootbound-wildwood/joystick-dodge-r1';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const page = await context.newPage(), errors = [], receipt = {
  errors,
  checks: [],
  setup: 'Fresh 412x915 mobile/touch browser context. A diagnostic Camp teleport to (0, 12) precedes input only; no user save is read or written.',
};
page.on('pageerror', error => errors.push(error.message));
const save = () => writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
const snapshot = () => page.evaluate(() => {
  const g = window.__game, state = g.playerController.getState(), forward = g.camera.getWorldDirection(new g.THREE.Vector3()).setY(0).normalize();
  return { pos: { ...state.pos }, facing: state.facing, mode: state.mode, cooldown: state.dodgeCooldown,
    touch: g.touchMovement.getIntent(), forward: { x: forward.x, z: forward.z } };
});
try {
  await page.goto(process.env.GAME_URL ?? 'http://localhost:8080/');
  await page.waitForFunction(() => !!window.__game, { timeout: 120000 });
  if (await page.locator('[data-action=start]').isVisible()) await page.locator('[data-action=start]').click();
  await page.evaluate(() => window.__game.beginExpeditionFromDefaultEntry());
  // Diagnostic setup only: unobstructed Camp ground makes direction legible.
  await page.evaluate(() => { const g = window.__game, x = 0, z = 12; g.characterPhysics.setPosition({ x, y: g.frontierChunks.getHeight(x, z) + .7, z }); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose(); });
  await page.waitForTimeout(500);
  const cdp = await context.newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([id, x, y]) => ({ id, x, y })) });
  const dodge = page.locator('.beta-dodge'), box = await dodge.boundingBox();
  assert.ok(box, 'Dodge is visible in portrait');
  const dodgePoint = [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)];
  // Left thumb establishes and holds the stick; second thumb presses Dodge.
  await touch('touchStart', [[1, 85, 760]]); await touch('touchMove', [[1, 85, 690]]); await page.waitForTimeout(180);
  const moving = await snapshot(); assert.ok(moving.touch.moveMagnitude > .5, 'thumb one owns a live stick direction');
  const beforeDodge = await snapshot();
  await touch('touchStart', [[1, 85, 690], [2, ...dodgePoint]]); await page.waitForTimeout(80);
  const duringDodge = await snapshot();
  assert.equal(duringDodge.mode, 'DODGE', 'Dodge enters before the second thumb releases');
  assert.ok(duringDodge.touch.moveMagnitude > .5, 'the first thumb remains active during Dodge');
  await page.waitForTimeout(180); const afterTravel = await snapshot();
  const dx = afterTravel.pos.x - beforeDodge.pos.x, dz = afterTravel.pos.z - beforeDodge.pos.z;
  assert.ok(dx * beforeDodge.forward.x + dz * beforeDodge.forward.z > .15, 'touch Dodge travels along the held forward stick direction');
  // The travel sample is taken while both native contacts are still down:
  // it proves the action button never steals the joystick pointer. End both
  // contacts only after this assertion; CDP's touchEnd flushes its active set.
  await touch('touchEnd', []); receipt.dualThumb = { beforeDodge, duringDodge, afterTravel }; await save();
  receipt.checks.push('CDP two-thumb Dodge fires before thumb two releases, preserves thumb one, and travels with the held stick.');

  // Stationary touch dodge uses the controller's existing facing fallback.
  await page.waitForTimeout(700); const stationaryBefore = await snapshot();
  await touch('touchStart', [[3, ...dodgePoint]]); await page.waitForTimeout(80); const stationaryDuring = await snapshot(); await touch('touchEnd', []);
  assert.equal(stationaryDuring.mode, 'DODGE');
  assert.equal(stationaryDuring.touch.moveMagnitude, 0);
  receipt.stationary = { stationaryBefore, stationaryDuring }; await save();
  receipt.checks.push('Stationary touch Dodge enters DODGE with no active stick, using facing fallback.');

  // Keyboard accessibility: each activation produces exactly one cooldown rise;
  // the subsequent keyup/click synthesis cannot create a second dodge.
  await page.waitForTimeout(800); await dodge.focus(); const keyboardBefore = await snapshot();
  await page.keyboard.press('Enter'); await page.waitForTimeout(70); const enter = await snapshot(); await page.waitForTimeout(80); const enterRelease = await snapshot();
  assert.equal(enter.mode, 'DODGE'); assert.ok(enter.cooldown > keyboardBefore.cooldown); assert.ok(enterRelease.cooldown <= enter.cooldown);
  await page.waitForTimeout(800); await page.keyboard.press('Space'); await page.waitForTimeout(70); const space = await snapshot(); await page.waitForTimeout(80); const spaceRelease = await snapshot();
  assert.equal(space.mode, 'DODGE'); assert.ok(spaceRelease.cooldown <= space.cooldown);
  receipt.keyboard = { keyboardBefore, enter, enterRelease, space, spaceRelease }; await save();
  receipt.checks.push('Focused Enter and Space each issue one Dodge; release produces no second activation.');
  await page.screenshot({ path: `${out}/portrait-dodge.png` });
  assert.deepEqual(errors, []);
} catch (error) { receipt.failure = error.stack ?? String(error); await save(); throw error; }
finally { await save(); await browser.close(); }
console.log(JSON.stringify(receipt));
