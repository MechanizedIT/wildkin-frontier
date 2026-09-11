// Isolated browser state setups exercise UI/input/persistence boundaries.
// These are explicitly diagnostic setups, not an unassisted campaign run.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL ?? "msedge" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [], checks = [];
page.on("pageerror", error => errors.push(error.stack));
fs.mkdirSync("dist/qa", { recursive: true });
const url = process.env.GAME_URL ?? "http://localhost:8080/";
const screenshot = name => page.screenshot({ path: `dist/qa/${name}.png` });
async function openShellTab(tab) {
  const direct = page.locator('.beta-panel nav [data-tab="'+tab+'"]').first();
  if (await direct.isVisible()) { await direct.click(); return; }
  await page.locator('.beta-panel nav [data-tab="more"]').click();
  await page.locator('.beta-panel main [data-tab="'+tab+'"]').click();
}
try {
  await page.goto(url);
  await page.locator('[data-action="start"]').click();
  await page.keyboard.press("j");
  const before = await page.evaluate(() => ({ ...window.__game.playerController.getState().pos }));
  await page.keyboard.down("w"); await page.waitForTimeout(250); await page.keyboard.up("w");
  assert.deepEqual(await page.evaluate(() => ({ ...window.__game.playerController.getState().pos })), before);
  await openShellTab("settings");
  await page.locator('input[data-action="mute"]').uncheck();
  assert.equal(await page.evaluate(() => window.__game.betaGame.getModel().settings.muted), true);
  await page.locator('input[data-action="mute"]').check();
  assert.equal(await page.evaluate(() => window.__game.betaGame.getModel().settings.muted), false);
  await page.locator('input[data-action="reducedMotion"]').check();
  assert.equal(await page.evaluate(() => window.__game.betaGame.getModel().settings.reducedMotion), true);
  await page.locator('input[data-action="reducedMotion"]').uncheck();
  await page.keyboard.press("Escape");
  await page.keyboard.press("m"); await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => window.__game.betaGame.isBlocking()), false, "Journal cannot open atop the map");
  await page.evaluate(() => window.__game.frontierMap.close());
  checks.push("Journal blocks movement; sound/reduced motion controls work; Escape cannot layer panels");

  // Browser-native touch input, including a held gesture interrupted by a menu.
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points.map(([x,y]) => ({x,y})) });
  const start = await page.evaluate(() => ({...window.__game.playerController.getState().pos}));
  await touch("touchStart", [[85,650]]); await touch("touchMove", [[145,650]]);
  await page.waitForTimeout(450);
  await touch("touchEnd", []);
  const moved = await page.evaluate(() => ({...window.__game.playerController.getState().pos}));
  assert.ok(moved.x > start.x + 1, "Native left-thumb drag moves the player");
  await touch("touchStart", [[85,650]]); await touch("touchMove", [[145,650]]);
  await page.keyboard.press("j"); await touch("touchEnd", []); await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const stopped = await page.evaluate(() => ({...window.__game.playerController.getState().pos}));
  await page.waitForTimeout(400);
  assert.deepEqual(await page.evaluate(() => ({...window.__game.playerController.getState().pos})), stopped, "Menu clears held touch movement");
  checks.push("Native touch joystick moves; menu interruption clears touch ownership");

  await page.evaluate(() => {
    const g = window.__game;
    g.frontierProgress.secureCompanions(["mossling", "tidefin", "emberhorn", "skydancer"], "qa-ability-roster");
  });
  for (const [id, section] of [["mossling",1],["tidefin",2],["emberhorn",3],["skydancer",4]]) {
    await page.evaluate(({id,section}) => {
      const g = window.__game;
      g.frontierProgress.selectCompanion(id);
      g.frontierProgress.unlockWaypoint(`wp_section_${section}`);
      g.beginExpedition(`wp_section_${section}`);
      const chest = g.worldRegistry.getLootChestById(`chest_${id}_secret`);
      const p = { x:chest.pos.x, y:chest.pos.y + .55, z:chest.pos.z + 1.2 };
      g.characterPhysics.setPosition(p); g.playerController.syncPosFromPhysics(); g.playerController.snapRenderPose();
    }, {id,section});
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(id => window.__game.betaGame.lootAccess(window.__game.worldRegistry.getLootChestById(`chest_${id}_secret`)).ok,id), false);
    if (id === "mossling") await page.evaluate(() => window.__game.playerCombat.takeDamage(2));
    await page.keyboard.press("q");
    await page.waitForTimeout(90);
    const ability = await page.evaluate(id => {
      const g=window.__game;
      return { unlocked:g.frontierProgress.getState().completedPoiIds.includes(`chest_${id}_secret`), cooldown:g.betaGame.companions.getAbility().cooldown,
        health:g.playerCombat.getHealth(), invulnerable:g.playerCombat.isInvulnerable(), mode:g.playerController.getState().mode };
    }, id);
    assert.equal(ability.unlocked,true,`${id} opens its own seal`);
    assert.ok(ability.cooldown > 0,`${id} starts cooldown`);
    if(id === "mossling") assert.equal(ability.health,5);
    if(id === "tidefin") assert.equal(ability.invulnerable,true);
    if(id === "skydancer") assert.equal(ability.mode,"JUMP");
    await screenshot(`ability-${id}`);
    if(id === "skydancer") await page.waitForTimeout(1800);
    const loot = await page.evaluate(id => window.__game.lootSystem.open(`chest_${id}_secret`),id);
    assert.equal(loot.ok,true,`${id} secret is physically openable after its seal`);
    if(id === "mossling") {
      const cargoBefore=await page.evaluate(()=>window.__game.pickupSystem.getInventory());
      await page.evaluate(()=>{
        window.__restoreStorage=Storage.prototype.setItem;
        Storage.prototype.setItem=function(){throw new DOMException("QA quota failure","QuotaExceededError");};
        window.__game.handleExtractionFlow({id:"qa-failed-extraction"});
      });
      assert.equal(await page.evaluate(()=>window.__game.expeditionSession.isActive()),true);
      assert.deepEqual(await page.evaluate(()=>window.__game.pickupSystem.getInventory()),cargoBefore);
      assert.equal(await page.evaluate(()=>window.__game.runResultCard.isVisible()),false);
      await page.evaluate(()=>{Storage.prototype.setItem=window.__restoreStorage;delete window.__restoreStorage;});
      checks.push("Storage failure keeps expedition/cargo active without a false secured result; extraction retry succeeds");
    }
    await page.evaluate(() => window.__game.handleExtractionFlow({id:"qa-ability-extraction"}));
    await page.locator("#run-result-overlay button").click();
    checks.push(`${id}: Q input, ability effect, cooldown, seal reward, extraction`);
  }
  // Export a real backup via UI, prove invalid restore is non-mutating, restore
  // a valid backup through the native chooser and explicit confirmation.
  await page.keyboard.press("j"); await openShellTab("settings");
  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="exportSave"]').click();
  const download = await downloadPromise, backupPath = "dist/qa/frontier-backup.json";
  await download.saveAs(backupPath);
  const backup = JSON.parse(fs.readFileSync(backupPath,"utf8"));
  assert.equal(backup.format,"wildkin-frontier-save");
  const stateBefore = await page.evaluate(() => window.__game.frontierProgress.getState());
  await page.locator('input[type="file"]').setInputFiles({name:"wrong-game.json",mimeType:"application/json",buffer:Buffer.from('{"hello":1}')});
  await page.locator('[data-action="confirm-import"]').click();
  await page.waitForTimeout(150);
  assert.deepEqual(await page.evaluate(() => window.__game.frontierProgress.getState()),stateBefore);
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  await page.locator('[data-action="confirm-import"]').click();
  await page.waitForEvent("load");
  await page.locator('[data-action="start"]').click();
  assert.equal(await page.evaluate(() => window.__game.frontierProgress.getState().securedCompanions.length),4);
  assert.equal(await page.evaluate(() => window.__game.frontierProgress.getState().completedPoiIds.length),4);
  checks.push("Native export/download + invalid import rejection + confirmed valid restore/reload");
  for(const width of [320,390,430,1024]) {
    await page.setViewportSize({width,height:844});
    await page.keyboard.press("j"); await openShellTab("workshop");
    await page.waitForTimeout(100);
    const bounds=await page.locator('.beta-panel').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x+bounds.width <= width+1);
    assert.ok(bounds.y>=0 && bounds.y+bounds.height<=845);
    await screenshot(`layout-${width}`); await page.keyboard.press("Escape");
  }
  checks.push("Menu bounds fit 320, 390, 430 and 1024 pixel viewports");
  assert.deepEqual(errors,[]);
  const report={pass:true,proof:"Diagnostic state/position setup with real keyboard, touch, menus, file chooser and reload",checks,errors};
  fs.writeFileSync("dist/qa/systems-playtest.json",JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2));
} catch(error) { await screenshot("systems-failure"); console.error(error); console.error(errors); process.exitCode=1; }
finally {await browser.close();}
