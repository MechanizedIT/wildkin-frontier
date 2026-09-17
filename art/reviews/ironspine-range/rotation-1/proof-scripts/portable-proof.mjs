import fs from 'node:fs';
import {chromium} from 'playwright';
import {isDeepStrictEqual} from 'node:util';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const phase=process.argv[2]??'r1-final';
const reports=[];
const same=isDeepStrictEqual;
for(const [label,url,file] of [
 ['portable-route','http://localhost:8081/',`.dream-loop/ironspine-rotation-1/${phase}-save-private.json`],
 ['developer-original','http://localhost:8080/','.dream-loop/heartwood-circuit/original-save-private.json'],
 ['portable-original','http://localhost:8081/','.dream-loop/heartwood-circuit/original-save-private.json']
]){
 const context=await browser.newContext({viewport:{width:412,height:915}}),page=await context.newPage();
 const payload=JSON.parse(fs.readFileSync(file)); const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!==new URL(url).origin)external.push(r.url());});
 await page.goto(url);await page.waitForFunction(()=>window.__game?.frontierProgress);
 const imported=await page.evaluate(p=>window.__game.frontierProgress.importSave(p).ok,payload);
 await page.reload();await page.waitForFunction(()=>window.__game?.frontierProgress);await page.locator('[data-action=start]').click();await page.waitForTimeout(1800);
 const restored=await page.evaluate(()=>window.__game.frontierProgress.exportSave());
 const a=payload.progress,b=restored.payload?.progress;
 const row={label,url,setup:'Isolated browser, public validated importSave API then literal reload and Start; no user browser storage touched.',imported,exportOk:restored.ok,exact:same(a,b),inventoryExact:same(a.inventory,b?.inventory),ecologyExact:same(a.ecology,b?.ecology),errors,external};
 row.positionDelta=a.activeRun?.feet&&b?.activeRun?.feet?Math.hypot(...['x','y','z'].map(k=>a.activeRun.feet[k]-b.activeRun.feet[k])):null;
 await page.screenshot({path:`art/reviews/ironspine-range/rotation-1/${label}.png`});
 if(label==='portable-route') {await page.setViewportSize({width:915,height:412});await page.waitForTimeout(800);await page.screenshot({path:'art/reviews/ironspine-range/rotation-1/portable-landscape.png'});}
 fs.writeFileSync(`.dream-loop/ironspine-rotation-1/${label}-restored-private.json`,JSON.stringify(restored.payload));
 reports.push(row);console.log(JSON.stringify(row));await context.close();
}
await browser.close();fs.writeFileSync('art/reviews/ironspine-range/rotation-1/portable-proof.json',JSON.stringify(reports,null,2));

