import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const output='docs/evidence/voxel-phase05e/source';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
  await page.addInitScript(()=>localStorage.clear());
  await page.goto('http://localhost:8099/lab/voxel/cellular-terrain.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#message')?.textContent.startsWith('Ready'),null,{timeout:60000});
  await page.evaluate(()=>window.__voxelTerrainLab.focus([6.2,4.2,9],8,{yaw:-Math.PI/2,pitch:-.1}));await page.waitForTimeout(120);
  const before=await page.evaluate(()=>window.__voxelTerrainLab.inspect());
  if(!before.hit||before.hit.material!==2)throw new Error(`Touch target did not resolve to dirt: ${JSON.stringify(before.hit)}`);
  await page.screenshot({path:`${output}/touch-01-mobile-landscape-before.png`});
  await page.locator('#dirt').tap();await page.touchscreen.tap(422,195);
  await page.waitForFunction(revision=>window.__voxelTerrainLab.inspect().revision>=revision+1,before.revision,{timeout:30000});
  // Allow any synthesized click from the same physical tap to arrive. One
  // tap must publish exactly one terrain transaction.
  await page.waitForTimeout(700);
  const edited=await page.evaluate(()=>window.__voxelTerrainLab.inspect());
  if(edited.revision!==before.revision+1)throw new Error(`One touch tap published ${edited.revision-before.revision} terrain transactions`);
  if(!edited.lastEvent?.directChangedSamples?.length)throw new Error('Touch tap did not commit an ordinary terrain edit');
  await page.screenshot({path:`${output}/touch-02-mobile-landscape-tap-edit.png`});
  const cameraBefore=await page.evaluate(()=>window.__voxelTerrainLab.cameraState()),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:600,y:300,id:1,radiusX:2,radiusY:2,force:1}]});
  // Real mobile browsers may report a swipe as many small move events. Keep
  // each step below the tap threshold while crossing it cumulatively.
  for(let step=1;step<=20;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:600+step*3,y:300+step*1.1,id:1,radiusX:2,radiusY:2,force:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(180);
  const cameraAfter=await page.evaluate(()=>window.__voxelTerrainLab.cameraState()),afterOrbit=await page.evaluate(()=>window.__voxelTerrainLab.inspect());
  if(Math.abs(cameraAfter.yaw-cameraBefore.yaw)<.1)throw new Error('Touch drag did not orbit the camera');
  if(afterOrbit.revision!==edited.revision)throw new Error('Touch orbit accidentally triggered another terrain edit');
  const receipt={viewport:{width:844,height:390,orientation:'landscape',touch:true},
    touchHint:await page.locator('#hint').innerText(),targetHit:before.hit,initialRevision:before.revision,
    editedRevision:edited.revision,transactionsForTap:edited.revision-before.revision,exactlyOneTransaction:true,
    changedSampleCount:edited.lastEvent.changedSampleCount,directDirtyChunkIds:edited.lastEvent.directDirtyChunkIds,
    orbit:{cameraBefore,cameraAfter,revisionStable:true},errors,
    screenshots:[`${output}/touch-01-mobile-landscape-before.png`,`${output}/touch-02-mobile-landscape-tap-edit.png`]};
  await writeFile(`${output}/touch-receipt.json`,JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt));
}finally{await browser.close();}
