import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const out='docs/evidence/voxel-phase05';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:820},deviceScaleFactor:1});
const errors=[],external=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(!request.url().startsWith('http://localhost:8090/')&&!request.url().startsWith('data:'))external.push(request.url());});
try{
  await page.goto('http://localhost:8090/lab/voxel/fracture-probe.html');
  await page.waitForFunction(()=>window.__fractureProbe?.cellResult,{},{timeout:30000}).catch(e=>{throw new Error(`${e.message}; page errors: ${errors.join('; ')}`);});
  await page.screenshot({path:`${out}/rock-fracture-probe.png`});
  const receipt={timestamp:new Date().toISOString(),browser:'Edge headless/SwiftShader',viewport:[1500,820],
    seed:9212026,spacing:.5,chunkSize:16,probe:await page.evaluate(()=>window.__fractureProbe),errors,external};
  await fs.writeFile(`${out}/rock-fracture-probe.json`,JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt));
  if(errors.length||external.length||receipt.probe.triangleCount.some(n=>n===0))process.exitCode=1;
} finally {await browser.close();}
