import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
const base=process.env.VOXEL_LAB_URL||'http://localhost:8090/lab/voxel/index.html',out='docs/evidence/voxel-phase0';
const mesher=process.env.VOXEL_MESHER||'js-greedy';
const browser=await chromium.launch({channel:'msedge',headless:false,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const browserCdp=await browser.newBrowserCDPSession();
const results={schema:1,started:new Date().toISOString(),cpu:os.cpus()[0].model,ramBytes:os.totalmem(),browser:await browser.version(),mesher,runs:[],limits:['Mobile profile runs here are desktop hardware with emulated touch/viewport, not reference-phone proof.','Renderer timing includes visible frame interval; frameWork measures synchronous JavaScript and WebGL submission, not GPU completion.','Process private bytes are an isolated whole-browser upper bound including browser/GPU/worker overhead, not attributable voxel-only memory.']};
async function memory(){
  const info=await browserCdp.send('SystemInfo.getProcessInfo');const ids=info.processInfo.map(p=>Number(p.id));
  const json=execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${ids.join(',')} -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,PrivateMemorySize64,WorkingSet64 | ConvertTo-Json -Compress`],{encoding:'utf8',windowsHide:true});
  const processes=JSON.parse(json);const rows=Array.isArray(processes)?processes:[processes];return {processes:rows,privateBytes:rows.reduce((s,p)=>s+p.PrivateMemorySize64,0),workingSetBytes:rows.reduce((s,p)=>s+p.WorkingSet64,0)};
}
try{
  for(const profile of ['desktop','mobile'])for(const size of [16,32]){
    const context=await browser.newContext({viewport:profile==='desktop'?{width:1920,height:1080}:{width:844,height:390},hasTouch:profile==='mobile',deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const run={profile,size,errors,phases:{}};const started=performance.now();
    await page.goto(`${base}?mesher=${mesher}&size=${size}&profile=${profile}&save=voxel-benchmark-${mesher}-${profile}-${size}-${Date.now()}`);
    const wait=()=>page.waitForFunction(()=>window.__voxelLab?.runtime.stats().chunks>0&&__voxelLab.runtime.pool.pending===0&&__voxelLab.runtime.stats().published===__voxelLab.runtime.stats().chunks&&!__voxelLab.runtime.dirty.size,{},{timeout:120000});
    await wait();run.coldReadyMs=performance.now()-started;run.phases.cold=await page.evaluate(()=>__voxelLab.report());
    await page.waitForTimeout(500);await page.evaluate(()=>__voxelLab.metrics.reset());await page.waitForTimeout(10000);run.phases.steady=await page.evaluate(()=>__voxelLab.report());
    await page.screenshot({path:`${out}/${mesher}-${profile}-${size}.png`});run.browserMemory=await memory();
    await page.evaluate(()=>{__voxelLab.metrics.reset();__voxelLab.fixture.fly(true);__voxelLab.fixture.setPlayer([0.5,6,10]);__voxelLab.fixture.look(0,0);});
    await page.keyboard.down('KeyW');await page.waitForTimeout(3500);await page.keyboard.up('KeyW');
    await page.keyboard.down('Space');await page.waitForTimeout(3500);await page.keyboard.up('Space');await wait();
    run.phases.streaming=await page.evaluate(()=>__voxelLab.report());
    if(!await page.locator('details').evaluate(e=>e.open))await page.locator('summary').click();
    await page.locator('#home').click();await wait();
    await page.evaluate(async()=>{const l=__voxelLab;l.metrics.reset();await Promise.all([[-1,0,0],[0,0,0],[1,0,0],[-1,0,-1],[0,0,-1],[1,0,-1]].map(cell=>l.fixture.mine(cell)));});await wait();
    await page.evaluate(()=>__voxelLab.fixture.mine([-2,2,-3],'axe'));await wait();await page.waitForTimeout(2500);await page.evaluate(()=>__voxelLab.fixture.shift([256,-256,256]));await page.waitForTimeout(200);
    run.phases.editsCollapseOrigin=await page.evaluate(()=>__voxelLab.report());
    const budget=profile==='desktop'?{frame:16.7,main:8,edit:150,memory:750}:{frame:33.3,main:12,edit:350,memory:300};
    run.checks={steadyFrame:run.phases.steady.metrics.frameMs.p95<=budget.frame,streamMain:run.phases.streaming.metrics.streamMainMs.p99<=budget.main,editVisible:run.phases.editsCollapseOrigin.metrics.editVisibleMs.p50<budget.edit,wholeBrowserWithinWorldBudget:run.browserMemory.privateBytes/1048576<=budget.memory};
    results.runs.push(run);console.log(JSON.stringify({profile,size,coldReadyMs:run.coldReadyMs,steady:run.phases.steady.metrics.frameMs,stream:run.phases.streaming.metrics.streamMainMs,edit:run.phases.editsCollapseOrigin.metrics.editVisibleMs,browserPrivateMiB:run.browserMemory.privateBytes/1048576,checks:run.checks,errors}));
    await context.close();await fs.writeFile(`${out}/benchmark-${mesher}.json`,JSON.stringify(results,null,2));
  }
}finally{await browser.close();}
