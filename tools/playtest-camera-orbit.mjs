// Real browser input proof for landscape camera-relative movement.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out='dist/qa'; await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
const errors=[],checks=[]; page.on('pageerror',e=>errors.push(e.message));
const snapshot=()=>page.evaluate(()=>{const g=window.__game,s=g.playerController.getState();return {pos:{...s.pos},facing:s.facing,mode:s.mode,dodgeCooldown:s.dodgeCooldown,yaw:g.cameraFollow.getYaw(),orbit:g.cameraOrbit._debug(),touch:g.touchMovement.getIntent(),keys:g.keyboardInput.getIntent(),forward:g.camera.getWorldDirection(new g.THREE.Vector3()).setY(0).normalize().toArray()};});
const hold=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(180);};
const dot=(a,b,f)=>{const dx=b.x-a.x,dz=b.z-a.z;return (dx*f[0]+dz*f[2])/Math.hypot(dx,dz);};
try{
 await page.goto(process.env.GAME_URL??'http://localhost:8080/');
 await page.waitForFunction(()=>Boolean(window.__game));
 if(await page.locator('[data-action=start]').isVisible())await page.locator('[data-action=start]').click();
 await page.waitForTimeout(700);
 const start=await snapshot();
 await page.mouse.move(700,170);await page.mouse.down();await page.mouse.move(503,170,{steps:16});await page.mouse.up();await page.waitForTimeout(250);
 const turned=await snapshot();
 assert.ok(Math.abs(turned.yaw-start.yaw)>1.5);assert.deepEqual(turned.pos,start.pos);assert.equal(turned.facing,start.facing);assert.equal(turned.keys.attackHeld,false);assert.equal(turned.dodgeCooldown,0);
 checks.push('Right drag orbits about 90 degrees without moving/turning the idle player, attacking or dodging.');
 await hold('w',380);const moved=await snapshot();assert.ok(dot(turned.pos,moved.pos,turned.forward)>.95);assert.ok(Math.hypot(moved.pos.x-turned.pos.x,moved.pos.z-turned.pos.z)>.7);
 await hold('s',380);
 await page.mouse.move(700,170);await page.mouse.down();await page.mouse.move(503,170,{steps:16});await page.mouse.up();await page.waitForTimeout(200);
 const opposite=await snapshot();await hold('w',380);const movedAgain=await snapshot();assert.ok(dot(opposite.pos,movedAgain.pos,opposite.forward)>.95);await hold('s',380);
 checks.push('Forward movement follows the actual horizontal camera direction at two distinct orbit headings.');
 const cdp=await page.context().newCDPSession(page);
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y}))});
 const beforeTouch=await snapshot();
 await touch('touchStart',[[1,100,280]]);await touch('touchMove',[[1,100,225]]);
 await touch('touchStart',[[1,100,225],[2,680,180]]);await touch('touchMove',[[1,100,225],[2,630,180]]);await page.waitForTimeout(250);
 const dual=await snapshot();assert.ok(dual.touch.moveMagnitude>0);assert.ok(Math.abs(dual.yaw-beforeTouch.yaw)>.35);assert.ok(Math.hypot(dual.pos.x-beforeTouch.pos.x,dual.pos.z-beforeTouch.pos.z)>.3);
 await page.keyboard.press('b');await touch('touchEnd',[]);const menu=await snapshot();assert.equal(menu.orbit.enabled,false);assert.equal(menu.orbit.pointerId,null);assert.equal(menu.touch.moveMagnitude,0);
 await page.keyboard.press('Escape');await page.waitForTimeout(250);const stopped=await snapshot();await page.waitForTimeout(300);assert.deepEqual((await snapshot()).pos,stopped.pos);
 checks.push('Native simultaneous two-thumb movement/orbit works; opening Pack cancels both gestures with no stuck movement.');
 const attack=page.locator('.beta-field-tool');
 await attack.dispatchEvent('pointerdown',{pointerId:21,button:0,pointerType:'touch'});assert.equal((await snapshot()).keys.attackHeld,true);
 await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup',{pointerId:21,button:0,pointerType:'touch'})));assert.equal((await snapshot()).keys.attackHeld,false);
 const yawBeforeButton=(await snapshot()).yaw;await page.locator('.beta-dodge').click();await page.waitForTimeout(50);assert.ok((await snapshot()).dodgeCooldown>0);assert.equal((await snapshot()).yaw,yawBeforeButton);
 checks.push('Explicit Attack releases outside its button and Dodge activates without orbiting the camera.');
 await page.setViewportSize({width:1280,height:860});
 await page.goto(`${process.env.GAME_URL??'http://localhost:8080/'}?author=1`);
 await page.waitForFunction(()=>Boolean(window.__game));await page.waitForTimeout(400);
 await page.mouse.move(1000,440);await page.mouse.down();await page.mouse.move(850,440,{steps:10});await page.mouse.up();
 const beforeAuthor=await snapshot();
 await page.locator('#author-toggle').click();await page.locator('#author-mode-badge').getByText('EDITING').waitFor();assert.equal((await snapshot()).orbit.enabled,false);
 await page.locator('#author-toggle').click();await page.locator('#author-mode-badge').getByText('PLAY TEST').waitFor();await page.waitForTimeout(200);
 // The existing Author PLAY action rebuilds by reloading the page. Its new
 // play session starts at the default yaw; no editor camera leaks into play.
 assert.equal((await snapshot()).yaw,0);assert.equal((await snapshot()).orbit.enabled,true);
 checks.push('Author mode blocks gameplay orbit; rebuilding the draft starts a working gameplay camera at its default heading.');
 await page.screenshot({path:`${out}/landscape-orbit-proof.png`});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,checks,errors},null,2));
}catch(error){console.error(error);errors.push(error.stack);process.exitCode=1;}finally{await fs.writeFile(`${out}/landscape-orbit-proof.json`,JSON.stringify({checks,errors},null,2));await browser.close();}
