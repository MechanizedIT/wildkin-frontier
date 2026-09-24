import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.VOXEL_COLLISION_URL??'http://localhost:8097/lab/voxel/rock-collision-study.html';
const out=process.env.VOXEL_COLLISION_OUT??'docs/evidence/voxel-phase05a2/views';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']}),page=await browser.newPage({viewport:{width:1500,height:900},deviceScaleFactor:1});
const errors=[],external=[],views=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(new URL(base).origin+'/'))external.push(r.url());});
try{
  for(const [fixture,methods] of [['initial-detached',['eight-sector-tight','occupancy-median']],['central-cut-2',['four-sector','occupancy-median','occupancy-voronoi']],['conditioned-child-0',['four-sector','occupancy-median']]])for(const method of methods){
    await page.goto(`${base}?fixture=${fixture}&method=${method}`);await page.waitForFunction(()=>window.__rockCollisionStudy?.ready);
    const data=await page.evaluate(()=>window.__rockCollisionStudy),file=`${fixture}-${method}.png`;
    await page.screenshot({path:`${out}/${file}`});views.push({...data,file});
  }
  await page.locator('#view').click();await page.screenshot({path:`${out}/child-opposite.png`});
  // A landscape compatibility check of the inspector and preserved mine UI.
  await page.setViewportSize({width:844,height:390});await page.screenshot({path:`${out}/landscape.png`});
  const viewport=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.equal(viewport.width,viewport.scrollWidth);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await fs.writeFile(`${out}/receipt.json`,JSON.stringify({timestamp:new Date().toISOString(),base,browser:'Edge headless / SwiftShader',views,viewport,errors,external,pass:true},null,2));
}finally{await browser.close();}
console.log(JSON.stringify({views:views.length,errors,external,pass:true}));
