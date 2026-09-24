import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out='docs/evidence/voxel-phase05c1/source',base=process.env.VOXEL_C1_URL||'http://localhost:8123/lab/voxel/cellular-mixed.html';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']}),page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),id=`mixed-phase05c1-${Date.now()}`,url=new URL(base),errors=[],external=[];
url.searchParams.set('save',id);const host=url.origin;page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(host+'/')&&!r.url().startsWith('data:'))external.push(r.url());});
try{
  await page.goto(url.href);await page.waitForFunction(()=>window.__cellularLab?.ready,{timeout:60000});
  const before=await page.evaluate(()=>window.__cellularLab.report());assert.equal(before.material,'mixed');
  await page.screenshot({path:`${out}/seam-current-interpolation.png`});
  await page.locator('#seam').click();await page.waitForTimeout(100);
  const crisp=await page.evaluate(()=>window.__cellularLab.report());assert.equal(crisp.seamMode,'crisp-triangle-regions');
  assert.deepEqual(crisp.triangles,before.triangles,'crisp mode uses the same shared surface topology');
  await page.screenshot({path:`${out}/seam-crisp-triangles.png`});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await page.goto(new URL('./composition-preview.html',url).href);await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/buried-rock-initial.png`});await page.locator('#scoop').click();await page.waitForTimeout(100);
  await page.screenshot({path:`${out}/buried-rock-first-reveal.png`});await page.locator('#more').click();await page.waitForTimeout(100);
  await page.screenshot({path:`${out}/buried-rock-expanded-reveal.png`});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  const receipt={pass:true,timestamp:new Date().toISOString(),browser:'Microsoft Edge headless / SwiftShader',viewport:{width:1280,height:720},before,crisp,errors,external};
  await fs.writeFile(`${out}/seam-comparison.json`,JSON.stringify(receipt,null,2));console.log(JSON.stringify({pass:true,triangles:crisp.triangles,verticesBefore:before.renderVertices,verticesCrisp:crisp.renderVertices,errors,external}));
}catch(error){await fs.writeFile(`${out}/seam-comparison.json`,JSON.stringify({pass:false,error:error.stack,errors,external},null,2));throw error;}
finally{await browser.close();}
