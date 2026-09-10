import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';

const out='dist/qa',base='http://localhost:8080/?author=1';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:1280,height:860}});
page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
const playerSave=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>!key.startsWith('wildkin.author'))));
const result={errors,checks:[]};
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForTimeout(9000);const before=await playerSave();
 await page.locator('#author-toggle').click();await page.locator('#author-mode-badge').getByText('EDITING').waitFor();
 const sectionValue=await page.locator('#author-region-select option').evaluateAll(options=>options.find(option=>/Verdant Verge|section_1/i.test(option.textContent))?.value);assert.ok(sectionValue,'Section 1 must be selectable');await page.locator('#author-region-select').selectOption(sectionValue);
 const details=page.locator('.landscape-editor');await details.locator('summary').click();
 const hill=details.locator('[data-landscape-select]');await hill.waitFor();
 const hillValue=await hill.locator('option').evaluateAll(options=>options.find(option=>/Hill/i.test(option.textContent))?.value);assert.ok(hillValue,'Section 1 needs an editable hill');await hill.selectOption(hillValue);
 const height=details.locator('[data-field="height"]');await height.waitFor();const original=Number(await height.inputValue());
 await page.screenshot({path:`${out}/author-landscape-before.png`});
 await height.fill(String(original+1));await details.locator('[data-apply]').click();
 await assert.doesNotReject(async()=>page.locator('[data-status]').getByText('Landscape applied.').waitFor());
 result.checks.push({check:'Section 1 hill height Apply',from:original,to:original+1,pass:true});
 await page.screenshot({path:`${out}/author-landscape-applied.png`});
 const download=page.waitForEvent('download');await page.locator('#author-export').click();const exported=await download;assert.equal(exported.suggestedFilename(),'world.json');const exportedWorld=JSON.parse(await readFile(await exported.path(),'utf8'));assert.equal(exportedWorld.regions.find(r=>r.id===sectionValue).surface.heights[Number(hillValue.split(':')[1])].height,original+1);
 result.checks.push({check:'Landscape edit exports world JSON',pass:true});
 await page.locator('#author-panel summary').first().focus();await page.keyboard.press('Control+z');await page.waitForTimeout(100);assert.equal(Number(await details.locator('[data-field=height]').inputValue()),original);const undoDownload=page.waitForEvent('download');await page.locator('#author-export').click();const undoneWorld=JSON.parse(await readFile(await (await undoDownload).path(),'utf8'));assert.equal(undoneWorld.regions.find(r=>r.id===sectionValue).surface.heights[Number(hillValue.split(':')[1])].height,original);result.checks.push({check:'Landscape undo restores original hill height in form and exported world',pass:true});
 await page.locator('#author-toggle').click();await page.locator('#author-mode-badge').getByText('PLAY TEST').waitFor();
 assert.deepEqual(await playerSave(),before,'author landscape edit must not change player save');result.checks.push({check:'Player-save isolation',pass:true});
 assert.deepEqual(errors,[],'no browser errors');
 console.log(JSON.stringify({pass:true,...result},null,2));
}catch(error){result.failure=error.stack;console.error(error);process.exitCode=1}finally{await writeFile(`${out}/author-landscape-playtest.json`,JSON.stringify(result,null,2));await browser.close();}
