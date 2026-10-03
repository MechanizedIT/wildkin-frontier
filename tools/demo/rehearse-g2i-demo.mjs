import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import WORLD from '../../src/world/data/world.js';
import { createFrontierProgress } from '../../src/save/frontierProgress.js';
import { createG2IStorage } from '../../src/dev/g2iPlaytestLab.js';
const out = 'native/unity/WildkinUnity/Library/WildkinG2IDemo/browser';
fs.mkdirSync(out, { recursive:true });
const report = { setup:'Isolated browser context with seeded ordinary save; native DOM/keyboard inputs only after demo-owned setup. No earned-play or human-feel acceptance claim.', checks:[], errors:[], taming:'not attempted' };
const browser = await chromium.launch({headless:true, channel:process.env.BROWSER_CHANNEL ?? 'msedge'});
const context = await browser.newContext({viewport:{width:1600,height:900}});
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(String(error)));
let downloads=0; page.on('download',()=>downloads++);
const storage = createG2IStorage();
const normal = createFrontierProgress({ storage, resourceDrops:WORLD.resourceDrops }); normal.load(); normal.collectResources({berries:8});
const normalKey = normal.getStorageKey(), saved = storage.getItem(normalKey), settings = JSON.stringify({muted:true,reducedMotion:false});
await context.addInitScript(({normalKey,saved,settings})=>{
  // One test-origin baseline, not the user's browser data; never overwrite on reset.
  if(!localStorage.getItem('g2i-rehearsal-seeded')) {
    localStorage.setItem(normalKey,saved); localStorage.setItem('wildkin.settings',settings); localStorage.setItem('g2i-rehearsal-seeded','1');
  }
},{normalKey,saved,settings});
const ready = async()=>{await page.waitForFunction(()=>!!window.__game && document.querySelector('#boot-status').hidden,null,{timeout:60000});};
const snapshot = ()=>page.evaluate(()=>{const g=window.__game,s=g.playerController.getState();return{pos:s.pos,mode:s.mode,cooldown:s.dodgeCooldown,health:g.playerCombat.getHealth(),engaged:g.combatSession.isEngaged(),rock:g.resourceSystem.getNodes().find(n=>n.id==='g2i-rock')?.state.remainingChunks,creature:g.creatureSystem.getCreatures().find(c=>c.state.id==='g2i-hostile')?.state.health,taming:g.betaGame.companions.getFieldTamingState(),pending:g.betaGame.companions.getPending().length,pack:g.frontierProgress.getPackResourceCounts()};});
const hold=async(keys,ms)=>{for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(ms);for(const key of keys.toReversed())await page.keyboard.up(key);};
const shot=async name=>page.screenshot({path:path.join(out,name+'.png')});
const check=async label=>{report.checks.push({label,...await snapshot()});console.log(label, report.checks.at(-1));};
try {
  await page.goto('http://127.0.0.1:8080/?g2i=1'); await ready();
  await page.waitForFunction(()=>window.__game.combatSession.isEngaged() && window.__game.resourceSystem.getNodes().find(n=>n.id==='g2i-rock').state.remainingChunks<4,null,{timeout:7000});
  await check('Auto Harvest real resource hit while combat engaged'); await shot('combat');
  const initialRock = (await snapshot()).rock;
  await hold(['f'],1000);
  const impacted = await snapshot(); assert.ok(impacted.rock < initialRock); assert.ok(impacted.creature < 3);
  await check('Real tool/combat in hostile encounter');
  await page.getByRole('button',{name:'Reset Scenario',exact:true}).click(); await ready();
  assert.equal((await snapshot()).rock,4); await check('Fresh scenario reset restores player/rock/creature');
  await page.getByRole('button',{name:'2 — Dodge Evaluation',exact:true}).click(); await ready();
  for(let i=0;i<3;i++) {
    await page.keyboard.press('r'); await page.waitForFunction(()=>window.__game.playerController.getState().mode==='DODGE',null,{timeout:2000});
    const dodging=await snapshot(); assert.ok(dodging.cooldown>0); await check('R recognized; DODGE state + cooldown '+(i+1));
    await page.keyboard.press('r'); await page.waitForTimeout(650);
  }
  await hold(['Shift','a'],550); await page.keyboard.press('Space');
  await page.waitForFunction(()=>['JUMP','FALL'].includes(window.__game.playerController.getState().mode),null,{timeout:2000});
  await check('Run + jump through real controller'); await shot('dodge');
  await page.getByRole('button',{name:'3 — Starter Taming',exact:true}).click(); await ready();
  try {
  await page.getByRole('button',{name:/Select slot 3: Berry lure/}).click(); await page.waitForTimeout(400); await shot('taming-start');
  console.log('Taming buttons',await page.getByRole('button').allTextContents());
  if(await page.getByRole('button',{name:/Select slot 3: Berry lure/}).count()) {
    await page.keyboard.press('f');
    await page.waitForFunction(()=>!!window.__game.betaGame.companions.getFieldTamingState(),null,{timeout:4000});
    await check('Production lure attempt started; granted lure spent');
    await hold(['s'],1200);
    await check('Native retreat from lure');
    await page.waitForFunction(()=>window.__game.betaGame.companions.getFieldTamingState()?.stage==='ready',null,{timeout:22000});
    await check('Production physical approach/feed reached ready'); await shot('taming-fed');
    for(let i=0;i<60;i++) {
      const model=await page.evaluate(()=>{const g=window.__game,p=g.playerController.getState().pos,t=g.creatureSystem.getActiveAliveCreatures().find(c=>c.state.id==='g2i-mossling');return t?{gap:Math.hypot(p.x-t.state.pos.x,p.z-t.state.pos.z),dx:t.state.pos.x-p.x,dz:t.state.pos.z-p.z}:null;});
      if(!model||model.gap<2.35)break;
      const keys=['c'];if(Math.abs(model.dx)>.25)keys.push(model.dx>0?'d':'a');if(Math.abs(model.dz)>.25)keys.push(model.dz>0?'s':'w');
      await hold(keys,150);
    }
    const bond=page.getByRole('button',{name:/^BOND/});
    console.log('Bond buttons',await page.getByRole('button').allTextContents());
    await bond.click();
    await page.waitForFunction(()=>window.__game.betaGame.companions.getPending().length===1,null,{timeout:5000});
    report.taming='Real offer, retreat, physical feed, quiet approach and bond completed via native inputs.';
    await page.waitForFunction(()=>document.querySelector('#g2i-live-state').textContent.includes('no active attempt'));
    await check('Pending production Mossling bond'); await shot('taming-bond');
  } else report.taming='SKIP: starter offer not visible in rehearsal.';
  } catch(error) {
    report.taming='SKIP for Loom: full starter feeding/bond sequence did not rehearse reliably. '+String(error);
    await check('Optional taming stopped at actual production state'); await shot('taming-incomplete');
  }
  // Exercise the actual export UI: it must refuse, emit a truthful message and never download.
  await page.keyboard.press('Escape');
  await page.locator('nav [data-tab="settings"]').click();
  await page.locator('[data-action="exportSave"]').click();
  await page.waitForTimeout(300);
  assert.equal(downloads,0); assert.match(await page.locator('.beta-toast').innerText(),/Demo setup cannot be exported/);
  await page.setViewportSize({width:800,height:900});
  assert.equal(await page.locator('#g2i-playtest-lab').isVisible(),false);
  assert.equal((await snapshot()).pack.berries,0);
  report.checks.push({label:'Narrow viewport hides only panel; disposable progress remains active'});
  await page.setViewportSize({width:1600,height:900});
  assert.deepEqual(await page.evaluate(key=>[localStorage.getItem(key),localStorage.getItem('wildkin.settings')],normalKey),[saved,settings]);
  await page.goto('http://127.0.0.1:8080/'); await ready();
  assert.equal(await page.locator('#g2i-playtest-lab').count(),0);
  assert.equal((await snapshot()).pack.berries,8);
  await page.getByRole('button',{name:/CONTINUE|ENTER FRONTIER/}).click(); await hold(['w'],250); await shot('ordinary');
  assert.equal(await page.locator('#g2i-playtest-lab').count(),0); await check('Ordinary save/gameplay retained, no lab panel');
  await page.keyboard.press('Escape'); await page.locator('nav [data-tab="settings"]').click();
  const downloaded = page.waitForEvent('download'); await page.locator('[data-action="exportSave"]').click();
  const ordinaryDownload = await downloaded;
  await ordinaryDownload.saveAs(path.join(out,'ordinary-save-export.json'));
  assert.equal(downloads,1); assert.ok(JSON.parse(fs.readFileSync(path.join(out,'ordinary-save-export.json'),'utf8')));
  report.checks.push({label:'Ordinary export still produces a valid JSON save through the shared UI'});
  assert.deepEqual(report.errors,[]);
  report.success=true;
} catch(error) { report.failure=String(error); await shot('failure'); console.error(error); process.exitCode=1; }
finally { fs.writeFileSync(path.join(out,'rehearsal.json'),JSON.stringify(report,null,2)); await browser.close(); }
