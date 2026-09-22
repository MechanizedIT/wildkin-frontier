import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:false}),page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,deviceScaleFactor:1});
const errors=[],receipt={kind:'desktop-emulated-touch-not-real-phone',viewport:[844,390],errors};page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(`http://localhost:8090/lab/voxel/index.html?mesher=surface-nets&spacing=0.5&profile=mobile&size=16&save=voxel-touch-${Date.now()}`);
  await page.waitForFunction(()=>window.__voxelLab?.runtime.stats().chunks>0&&__voxelLab.runtime.pool.pending===0&&__voxelLab.runtime.stats().published===__voxelLab.runtime.stats().chunks);
  const cdp=await page.context().newCDPSession(page),bounds=await page.locator('[data-key=KeyW]').boundingBox();
  const w={x:Math.round(bounds.x+bounds.width/2),y:Math.round(bounds.y+bounds.height/2),id:1},look={x:500,y:170,id:2};
  receipt.before=await page.evaluate(()=>({p:__voxelLab.physics.playerGlobal(),yaw:__voxelLab.camera.rotation.y}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[w,look]});await page.waitForTimeout(500);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[w,{...look,x:450}]});await page.waitForTimeout(150);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);
  receipt.after=await page.evaluate(()=>({p:__voxelLab.physics.playerGlobal(),yaw:__voxelLab.camera.rotation.y}));
  assert.ok(receipt.before.p[2]-receipt.after.p[2]>1);assert.ok(Math.abs(receipt.before.yaw-receipt.after.yaw)>0.1);
  const stopped=receipt.after.p;await page.waitForTimeout(350);const later=await page.evaluate(()=>__voxelLab.physics.playerGlobal());assert.ok(Math.hypot(later[0]-stopped[0],later[2]-stopped[2])<0.05);
  // Stable aim is a disclosed fixture; the touch action itself is native.
  await page.evaluate(()=>{__voxelLab.fixture.setPlayer([0.5,1.82,8]);__voxelLab.fixture.look(0,-0.35);});await page.waitForTimeout(100);
  await page.locator('#mine').tap();await page.waitForFunction(()=>Object.keys(__voxelLab.state.state.densityEdits).length>0);await page.locator('#collect').tap();await page.waitForFunction(()=>__voxelLab.state.state.inventory['Stone chips']===1);
  receipt.controls=await page.locator('#actions button,#touch-move button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {name:b.textContent,width:r.width,height:r.height,x:r.x,y:r.y};}));assert.ok(receipt.controls.every(c=>c.width>=44&&c.height>=44&&c.x>=0&&c.y>=0&&c.x+c.width<=844&&c.y+c.height<=390));
  await page.screenshot({path:'docs/evidence/voxel-phase0/mobile-touch.png'});await page.locator('summary').tap();await page.screenshot({path:'docs/evidence/voxel-phase0/mobile-panel.png'});
  receipt.inventory=await page.evaluate(()=>__voxelLab.state.state.inventory);assert.deepEqual(errors,[]);receipt.pass=true;
}catch(error){receipt.failure=error.stack;receipt.pass=false;process.exitCode=1;}
finally{await fs.writeFile('docs/evidence/voxel-phase0/touch.json',JSON.stringify(receipt,null,2));await browser.close();}
console.log(JSON.stringify(receipt));
