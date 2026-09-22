import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
const base=process.env.VOXEL_LAB_URL||'http://localhost:8090/lab/voxel/index.html',mesher=process.env.VOXEL_MESHER||'surface-nets',spacing=Number(process.env.VOXEL_SPACING||.5),runs=[];
for(const profile of ['desktop','mobile'])for(const size of [16,32]){
  const browser=await chromium.launch({channel:'msedge',headless:false}),cdp=await browser.newBrowserCDPSession();
  try{
  const page=await browser.newPage({viewport:profile==='desktop'?{width:1920,height:1080}:{width:844,height:390}});
  const measure=async()=>{
    const session=await page.context().newCDPSession(page);await session.send('HeapProfiler.collectGarbage');await session.detach();
    const info=await cdp.send('SystemInfo.getProcessInfo'),ids=info.processInfo.map(p=>Number(p.id));
    const data=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${ids.join(',')} -ErrorAction SilentlyContinue | Select-Object Id,PrivateMemorySize64,WorkingSet64 | ConvertTo-Json -Compress\nexit 0`],{encoding:'utf8',windowsHide:true}));
    const rows=Array.isArray(data)?data:[data];return {processes:rows,privateBytes:rows.reduce((s,p)=>s+p.PrivateMemorySize64,0),workingSetBytes:rows.reduce((s,p)=>s+p.WorkingSet64,0)};
  };
  const url=`${base}?mesher=${mesher}&spacing=${spacing}&size=${size}&profile=${profile}&save=voxel-memory-${Date.now()}`;
  await page.goto(url+'&baseline=1');await page.waitForFunction(()=>window.__voxelLab?.ready);await page.waitForTimeout(500);const baseline=await measure();
  await page.goto(url);await page.waitForFunction(()=>window.__voxelLab?.runtime.stats().chunks>0&&__voxelLab.runtime.pool.pending===0&&__voxelLab.runtime.stats().published===__voxelLab.runtime.stats().chunks,{},{timeout:120000});await page.waitForTimeout(500);const resident=await measure(),report=await page.evaluate(()=>__voxelLab.report());
  runs.push({profile,size,baseline,resident,incrementalPrivateBytes:resident.privateBytes-baseline.privateBytes,geometryAndVoxelBytes:report.runtime.meshAndVoxelBytes,heap:report.heap});
  }finally{await browser.close();}
}
const result={schema:1,timestamp:new Date().toISOString(),mesher,spacing,method:'Fresh isolated browser per run. Empty-lab baseline and fully resident lab with identical viewport/profile; forced main-heap GC before summing browser/renderer/GPU/worker process private bytes. Positive delta is an allocation estimate, not exact GPU attribution; OS allocators may retain memory. Mobile runs use desktop hardware.',runs};
await fs.writeFile(`docs/evidence/voxel-phase0/memory-${mesher}-${spacing}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(runs.map(r=>({profile:r.profile,size:r.size,incrementalMiB:r.incrementalPrivateBytes/1048576})),null,2));
