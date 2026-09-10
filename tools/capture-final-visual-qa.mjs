import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://localhost:8080/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(9000);await page.locator('[data-action=start]').click();await page.waitForTimeout(900);
const out=[];const capture=async(name)=>{await page.screenshot({path:`dist/qa/final-visual-${name}.png`});out.push({name,state:await page.evaluate(()=>({region:window.__game.regionManager.getCurrentRegionId(),position:window.__game.player.root?.position?.toArray?.(),hud:[...document.querySelectorAll('#combat-hud,.beta-objective,#frontier-map-button,.beta-hud')].map(e=>({id:e.id||e.className,rect:(()=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})()}))}))})};
await capture('camp');
// Use the real portal transition API after the Camp scene is rendered, preserving the normal destination setup.
await page.evaluate(()=>window.__game.beginExpeditionFromDefaultEntry());await page.waitForTimeout(1700);await capture('section1-arrival');
await page.evaluate(async()=>{const g=window.__game;for(const id of ['section_2','section_3','section_4','section_5']){const gate=(g.worldRegistry.getAllPortalGates?.()||[]).find(x=>x.targetSectionId===id);if(gate)g.transitionThroughPortalGate(gate);}});await page.waitForTimeout(1800);await capture('section5-entry');
await writeFile('dist/qa/final-visual-qa.json',JSON.stringify({errors,out},null,2));console.log(JSON.stringify({errors,out},null,2));await browser.close();
