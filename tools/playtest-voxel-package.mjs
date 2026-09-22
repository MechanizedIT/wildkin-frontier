import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:false}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],external=[];
const receipt={timestamp:new Date().toISOString(),entry:'dist/voxel-lab/index.html',errors,external};
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>{const url=route.request().url();if(!url.startsWith('http://localhost:8091/')&&!url.startsWith('data:')){external.push(url);return route.abort();}return route.continue();});
const ready=async()=>{await page.waitForTimeout(100);await page.waitForFunction(()=>window.__voxelLab?.runtime.stats().chunks>0&&__voxelLab.runtime.pool.pending===0&&__voxelLab.runtime.stats().published===__voxelLab.runtime.stats().chunks&&!__voxelLab.runtime.dirty.size,null,{timeout:60000});};
try{
 await page.goto(`http://localhost:8091/index.html?save=voxel-package-${Date.now()}`);await ready();
 await page.evaluate(()=>{__voxelLab.fixture.setPlayer([.5,1.82,8]);__voxelLab.fixture.look(0,-.35);});await page.waitForTimeout(150);await page.locator('#mine').click();await ready();await page.locator('#collect').click();await page.waitForFunction(()=>__voxelLab.state.state.inventory['Stone chips']===1);
 const saved=await page.evaluate(()=>structuredClone(__voxelLab.state.state));await page.locator('#reload').click();await page.waitForLoadState('domcontentloaded');await ready();receipt.report=await page.evaluate(()=>__voxelLab.report());
 assert.deepEqual(receipt.report.save.densityEdits,saved.densityEdits);assert.deepEqual(receipt.report.save.inventory,saved.inventory);assert.equal(receipt.report.mesher,'surface-nets');assert.equal(receipt.report.size,16);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(receipt.report.runtime.errors,[]);receipt.pass=true;
 await page.screenshot({path:'docs/evidence/voxel-phase0/packaged-smooth.png'});
}catch(e){receipt.pass=false;receipt.failure=e.stack;process.exitCode=1;console.error(e);}
finally{await fs.writeFile('docs/evidence/voxel-phase0/package.json',JSON.stringify(receipt,null,2));await browser.close();}
console.log(JSON.stringify({pass:receipt.pass,errors,external}));
