import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
const out='docs/evidence/voxel-phase0',mesher=process.env.VOXEL_MESHER||'surface-nets';
const normalized=process.env.VOXEL_NORMALIZED==='1',suffix=normalized?'-normalized':'';
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const result={timestamp:new Date().toISOString(),cpu:os.cpus()[0].model,ram:os.totalmem(),browser:await browser.version(),mesher,runs:[],limits:['Mobile viewport uses desktop GPU/CPU; real phone is a separate gate.','Resident rounded chunk windows differ in physical extent; normalized CPU comparison holds physical volume constant.','Timing covers bounded lab fixtures, not production-scale destruction.']};
if(process.env.VOXEL_RESUME==='1')result.runs=JSON.parse(await fs.readFile(`${out}/benchmark-smooth-${mesher}${suffix}.json`,'utf8')).runs;
try{
 for(const spacing of (mesher==='surface-nets'?[.5,.25]:[.5]))for(const profile of (normalized?['desktop']:['desktop','mobile']))for(const size of [16,32]){
  if(result.runs.some(r=>r.spacing===spacing&&r.profile===profile&&r.size===size))continue;
  const context=await browser.newContext({viewport:profile==='desktop'?{width:1920,height:1080}:{width:844,height:390},hasTouch:profile==='mobile'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));const run={spacing,profile,size,errors,phases:{}},start=performance.now();
  const ready=async()=>{await page.waitForTimeout(100);await page.waitForFunction(()=>window.__voxelLab?.runtime.stats().chunks>0&&__voxelLab.runtime.pool.pending===0&&__voxelLab.runtime.stats().published===__voxelLab.runtime.stats().chunks&&!__voxelLab.runtime.dirty.size,null,{timeout:180000});};
  await page.goto(`http://localhost:8090/lab/voxel/index.html?mesher=${mesher}&spacing=${spacing}&size=${size}&profile=${profile}${normalized?'&window=32':''}&save=smooth-bench-${Date.now()}`);await ready();run.coldReadyMs=performance.now()-start;
  await page.evaluate(()=>__voxelLab.metrics.reset());await page.waitForTimeout(5000);run.phases.steady=await page.evaluate(()=>__voxelLab.report());
  await page.screenshot({path:`${out}/${mesher}-${spacing}-${profile}-${size}${suffix}.png`});
  await page.evaluate(()=>{const l=__voxelLab;l.metrics.reset();l.fixture.fly(true);l.fixture.setPlayer([.5,6,10]);l.fixture.look(0,0);});await page.keyboard.down('KeyW');await page.waitForTimeout(2000);await page.keyboard.up('KeyW');await page.keyboard.down('Space');await page.waitForTimeout(2000);await page.keyboard.up('Space');await ready();run.phases.streaming=await page.evaluate(()=>__voxelLab.report());
  await page.evaluate(()=>__voxelLab.fixture.setPlayer([.5,2,10]));await ready();
  await page.evaluate(async()=>{const l=__voxelLab,s=l.state.state.spacing;l.metrics.reset();await Promise.all([[-.3,.7,-.3],[.4,.7,.4],[-.4,.7,.4]].map(center=>l.fixture.mine(center.map(v=>Math.floor(v/s)),'pick',{center,radius:.8})));});await ready();
  await page.evaluate(()=>{const l=__voxelLab,s=l.state.state.spacing;return l.fixture.mine([-1.5,2.5,-2.5].map(v=>Math.round(v/s)),'axe',{center:[-1.5,2.5,-2.5],radius:.8});});await ready();await page.waitForTimeout(1500);await page.evaluate(()=>__voxelLab.fixture.shift([256,-256,256]));await page.waitForTimeout(100);run.phases.editCollapseOrigin=await page.evaluate(()=>__voxelLab.report());
  result.runs.push(run);await fs.writeFile(`${out}/benchmark-smooth-${mesher}${suffix}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({mesher,normalized,spacing,profile,size,cold:run.coldReadyMs,frame:run.phases.steady.metrics.frameMs.p95,stream:run.phases.streaming.metrics.streamMainMs,edit:run.phases.editCollapseOrigin.metrics.editVisibleMs,actors:run.phases.editCollapseOrigin.save.actors.length,errors}));await context.close();
 }
}finally{await browser.close();}
