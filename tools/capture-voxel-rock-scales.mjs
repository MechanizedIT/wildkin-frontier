import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const base=process.env.VOXEL_ROCK_COMPARISON_URL||'http://localhost:8093/lab/voxel/rock-structural-compare.html';
const out='docs/evidence/voxel-phase05a1';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:900},deviceScaleFactor:1}),errors=[],external=[],results=[];
page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!request.url().startsWith(new URL(base).origin+'/'))external.push(request.url());});
try{for(const cuts of [8,12])for(const condition of [0,1]){
  await page.goto(`${base}?cuts=${cuts}&condition=${condition}`);await page.waitForFunction(()=>window.__rockComparison?.ready);
  await page.screenshot({path:`${out}/scale-${cuts}-cuts-${condition?'conditioned':'control'}.png`});
  results.push(await page.evaluate(()=>window.__rockComparison));
}
for(const condition of [0,1]){
  const extraction=base.replace('rock-structural-compare.html','rock-extraction-compare.html');
  await page.goto(`${extraction}?condition=${condition}`);await page.waitForFunction(()=>window.__rockExtractionComparison?.ready,null,{timeout:5000}).catch(async error=>{const trace=await page.evaluate(()=>window.__rockExtractionTrace);throw Error(`${error.message}: ${errors.join(' | ')} TRACE ${JSON.stringify(trace)}`);});
  await page.screenshot({path:`${out}/extraction-${condition?'conditioned':'baseline'}.png`});
  results.push(await page.evaluate(()=>window.__rockExtractionComparison));
}
}finally{await browser.close();}
const receipt={timestamp:new Date().toISOString(),browser:'Edge headless/SwiftShader',viewport:[1500,900],seed:9212026,results,errors,external};
await fs.writeFile(`${out}/scale-comparison.json`,JSON.stringify(receipt,null,2));
console.log(JSON.stringify({results,errors,external}));
