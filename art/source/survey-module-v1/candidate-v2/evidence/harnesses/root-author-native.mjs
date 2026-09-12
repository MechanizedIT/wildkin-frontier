import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='.dream-loop/overnight2-survey',browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1280,height:860}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const reward=[{type:'item',id:'field_pack_cartridge',amount:1}];
try{
 await page.goto('http://localhost:8080/?author=1');await page.locator('#author-toggle').click({timeout:60000});
 await page.locator('#author-mode-badge').getByText('EDITING').waitFor();
 await page.locator('#author-region-select').selectOption('section_1');
 for(const key of ['region:section_1','cat:section_1:pois']){
   const details=page.locator(`details[data-key="${key}"]`);if(!await details.evaluate(el=>el.open))await details.locator(':scope > summary').click();
 }
 await page.locator('[data-id=chest_secret_section_1]').click();
 const input=page.locator('[data-author-field=lootRewards]');await input.fill(JSON.stringify(reward));await input.press('Tab');
 const details=await page.evaluate(()=>{const d=__author.draftApi,c=d.findObjectById('chest_secret_section_1');return d.getLootTableDetails(c.obj.lootTableId);});
 assert.deepEqual(details.rewards,reward);assert.ok(details.chestCount>1);
 await input.fill('[{"type":"item","id":"typo","amount":1}]');await input.press('Tab');
 const rejected=await page.evaluate(id=>__author.draftApi.getLootTableDetails(id).rewards,details.id);assert.deepEqual(rejected,reward);
 await input.fill(JSON.stringify(reward));await input.press('Tab');
 await page.screenshot({path:`${out}/author-item-rewards.png`});
 const downloadEvent=page.waitForEvent('download');await page.locator('#author-export').click();const download=await downloadEvent;await download.saveAs(`${out}/author-export-fixture.json`);
 const exported=JSON.parse(await fs.readFile(`${out}/author-export-fixture.json`,'utf8'));assert.deepEqual(exported.lootTables.find(t=>t.id===details.id).rewards,reward);
 await page.reload();await page.waitForFunction(()=>window.__author?.draftApi);const reloaded=await page.evaluate(id=>__author.draftApi.getLootTableDetails(id).rewards,details.id);assert.deepEqual(reloaded,reward);
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/author-native.json`,JSON.stringify({fixture:'Isolated Author draft. Actual EDIT/region/hierarchy selection, rewards textarea changes (valid then invalid), exported download and literal reload; no shipped world mutation.',table:details,exportedReward:reward,reloaded,errors,pass:true},null,2));console.log('Native Author item reward edit/reject/export/reload PASS');
}finally{await browser.close();}
