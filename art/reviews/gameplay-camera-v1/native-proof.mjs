import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='.dream-loop/gameplay-camera-rerun';
await fs.mkdir(out,{recursive:true});
const files=['src/camera/cameraFollow.js','src/camera/cameraCollision.js','src/input/gameCameraOrbit.js','src/game/config.js','src/main.js','src/world/data/world.json'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await fs.readFile(f)).digest('hex')])));
const receipt={fixture:'Isolated dev Edge844x390 touch context, actual Start. Explicit waypoint unlocks, invulnerability and supported position fixtures isolate camera behavior. Right drag, multitouch pinch/joystick, keyboard movement/Jump and menu actions are browser input. Not earned campaign, continuous visual perception or physical-phone performance.',before:await hashes(),steps:[],errors:[],failed:[],external:[]};
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,hasTouch:true,isMobile:true});
const page=await context.newPage();
page.on('pageerror',e=>receipt.errors.push(e.message));
page.on('requestfailed',r=>receipt.failed.push(r.url()));
page.on('request',r=>{if(!r.url().startsWith('http://localhost:8080/')&&!/^(data|blob):/.test(r.url()))receipt.external.push(r.url());});
const cdp=await context.newCDPSession(page);
const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y,radiusX:8,radiusY:8,force:1}))});
const state=()=>page.evaluate(()=>{const g=window.__game,s=g.playerController.getState();return{...g.cameraFollow._debug(),position:g.camera.position.toArray(),player:{x:s.pos.x,y:s.pos.y,z:s.pos.z,facing:s.facing,grounded:s.grounded,mode:s.mode},movementDirection:g.camera.getWorldDirection(new g.THREE.Vector3()).setY(0).normalize().toArray()};});
const note=async name=>{const s=await state();receipt.steps.push({name,...s});console.log(name,JSON.stringify({pitch:s.pitch,zoom:s.zoom,distance:s.effectiveDistance,requested:s.requestedDistance}));return s;};
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
async function setup(section,x,z,yaw=0,pitch=32*Math.PI/180){
 await page.evaluate(async({section,x,z,yaw,pitch})=>{const g=window.__game;g.frontierProgress.unlockWaypoint(`wp_${section}`);g.beginExpedition(`wp_${section}`);g.playerCombat.grantInvulnerability(1000);g.autoHarvestEnabled=false;const r=g.worldRegistry.getSectionById(section),{getSurfaceHeight}=await import('/src/world/terrainSurfaceModel.js');const y=getSurfaceHeight(r.surface,x,z)+.56;g.characterPhysics.setPosition({x,y,z});g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();g.playerController.prepareRender(1);g.cameraFollow.orbitBy(yaw-g.cameraFollow.getYaw(),pitch-g.cameraFollow.getPitch());g.cameraFollow.setZoom(1);g.cameraFollow.snap();},{section,x,z,yaw,pitch});
 await page.waitForTimeout(400);
}
async function drag(dx,dy){await page.mouse.move(565,185);await page.mouse.down();await page.mouse.move(565+dx,185+dy,{steps:15});await page.mouse.up();await page.waitForTimeout(80);}
try{
 await page.goto('http://localhost:8080/');await page.locator('[data-action=start]').waitFor({timeout:60000});await page.locator('[data-action=start]').tap();await page.waitForFunction(()=>window.__game&&!window.__game.betaGame.isBlocking());
 await setup('section_1',0,29);const base=await note('supported open-ground fixture');assert.equal(base.player.grounded,true);
 await drag(55,-85);const moved=await note('native diagonal orbit');assert.ok(moved.pitch>base.pitch+.4);assert.ok(moved.yaw<base.yaw-.3);assert.ok(Math.abs(moved.player.facing-base.player.facing)<1e-5);assert.ok(Math.hypot(moved.player.x-base.player.x,moved.player.z-base.player.z)<.05);await shot('01-pitch-orbit');
 await drag(0,-150);const high=await note('native upper pitch limit');assert.ok(Math.abs(high.pitch-64*Math.PI/180)<1e-8);
 await drag(0,190);await drag(0,100);const low=await note('native lower pitch limit');assert.ok(Math.abs(low.pitch-20*Math.PI/180)<1e-8);await shot('02-low-pitch');
 // Native left movement plus two right touches. Pinch must retain yaw/pitch.
 await touch('touchStart',[[1,135,285]]);await touch('touchMove',[[1,135,240]]);
 await touch('touchStart',[[1,135,240],[2,485,170]]);await touch('touchStart',[[1,135,240],[2,485,170],[3,615,175]]);
 const pinchBefore=await state();await touch('touchMove',[[1,135,240],[2,460,145],[3,655,195]]);await page.waitForTimeout(200);const pinchAfter=await note('native concurrent joystick and right pinch');
 assert.equal(pinchAfter.yaw,pinchBefore.yaw);assert.equal(pinchAfter.pitch,pinchBefore.pitch);assert.ok(pinchAfter.zoom<pinchBefore.zoom);assert.ok(Math.hypot(pinchAfter.player.x-pinchBefore.player.x,pinchAfter.player.z-pinchBefore.player.z)>.1);await touch('touchEnd',[]);
 // Find a supported point whose desired camera crosses real authored terrain.
 const candidate=await page.evaluate(async()=>{const g=window.__game,{getSurfaceHeight}=await import('/src/world/terrainSurfaceModel.js'),{createCameraCollisionProbe}=await import('/src/camera/cameraCollision.js'),r=g.worldRegistry.getSectionById('section_1');
 const terrain=g.physicsWorld.staticColliders.filter(c=>g.physicsWorld.colliderSections.get(c)==='section_1'&&c.shape.type===g.RAPIER.ShapeType.TriMesh);
 const probe=createCameraCollisionProbe({RAPIER:g.RAPIER,physicsWorld:{world:g.physicsWorld.world,staticColliders:terrain},playerCollider:g.characterPhysics.collider,cfg:{collisionRadius:.24,collisionMargin:.12}});
 const allProbe=createCameraCollisionProbe({RAPIER:g.RAPIER,physicsWorld:g.physicsWorld,playerCollider:g.characterPhysics.collider,cfg:{collisionRadius:.24,collisionMargin:.12}});
 const capsule=new g.RAPIER.Capsule(.2,.34),q={x:0,y:0,z:0,w:1},flags=g.RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|g.RAPIER.QueryFilterFlags.EXCLUDE_SENSORS;
 let best=null;for(let x=15;x<=62;x+=3)for(let z=-30;z<=30;z+=3){const y=getSurfaceHeight(r.surface,x,z);if(y>7.5)continue;
 if(g.physicsWorld.world.intersectionWithShape({x,y:y+.7,z},q,capsule,flags,undefined,g.characterPhysics.collider))continue;
 for(let a=0;a<Math.PI*2;a+=Math.PI/4){const p=25*Math.PI/180,d={x:Math.sin(a)*Math.cos(p),y:Math.sin(p),z:Math.cos(a)*Math.cos(p)},focus={x,y:y+1.46,z},distance=probe.resolveDistance({focus,direction:d,requestedDistance:6.56});
 const allDistance=allProbe.resolveDistance({focus,direction:d,requestedDistance:6.56}),opposite=allProbe.resolveDistance({focus,direction:{x:-d.x,y:d.y,z:-d.z},requestedDistance:6.56});
 if(distance>2&&distance<4&&allDistance>1.8&&opposite>6.5&&(!best||distance>best.distance))best={x,z,y,yaw:a,pitch:p,distance,allDistance,opposite,terrainCount:terrain.length};}}
 return best;});assert.ok(candidate,'real terrain should intersect a desired orbit');receipt.terrainCandidate=candidate;
 await setup('section_1',candidate.x,candidate.z,candidate.yaw,candidate.pitch);const obstructed=await note('actual terrain retracts camera');assert.equal(obstructed.player.grounded,true);assert.ok(obstructed.effectiveDistance<obstructed.requestedDistance-1);assert.equal(obstructed.zoom,1);await shot('03-terrain-retraction');
 // Rotate away using ordinary pointer input; recover only temporary distance.
 await drag(-195,0);await drag(-195,0);await page.waitForTimeout(1000);const clear=await note('native orbit away and recovery');assert.equal(clear.zoom,1);assert.ok(clear.effectiveDistance>obstructed.effectiveDistance+.5);await shot('04-clear-recovery');
 await page.keyboard.press('Space');await page.waitForFunction(()=>window.__game.playerController.getState().mode==='JUMP',null,{timeout:2000});await note('ordinary Jump with collision camera');await page.waitForFunction(()=>window.__game.playerController.getState().grounded,null,{timeout:4000});
 receipt.shoulderMotion=[];await page.keyboard.down('w');for(let i=0;i<8;i++){await page.waitForTimeout(75);receipt.shoulderMotion.push(await page.evaluate(()=>{const g=window.__game,d=g.cameraFollow._debug(),p=g.playerController.getState().pos;return{camera:g.camera.position.toArray(),ground:g.playground.getTerrainHeight(g.camera.position.x,g.camera.position.z),focusRecovery:d.focusRecovery,player:{x:p.x,y:p.y,z:p.z}};}));}await page.keyboard.up('w');assert.ok(receipt.shoulderMotion.every(s=>s.camera[1]>s.ground-.05),'moving camera remains above terrain');await shot('04b-shoulder-motion');
 // Forward intent follows horizontal camera heading, regardless of pitch.
 await setup('section_1',0,29,.6,64*Math.PI/180);const forwardBefore=await state();await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');const forwardAfter=await note('native forward at high pitch');const dx=forwardAfter.player.x-forwardBefore.player.x,dz=forwardAfter.player.z-forwardBefore.player.z;assert.ok(dx*forwardBefore.movementDirection[0]+dz*forwardBefore.movementDirection[2]>.4);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(180);await note('portrait keeps pitch and zoom');await shot('05-portrait');await page.setViewportSize({width:844,height:390});
 // Existing real foliage fade remains operative in its representative fixture.
 await setup('section_1',42,22.3);await page.waitForTimeout(500);const fade=await page.evaluate(()=>{const g=window.__game,r=g.scene.getObjectByName('prop_verdant_woodland_east-toe_01'),op=[];r?.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))op.push(m.opacity);});return op;});receipt.foliageOpacities=fade;assert.ok(fade.length,'current canonical canopy must be loaded');assert.ok(fade.some(x=>x<.99));await shot('06-foliage-fade');
 // Explicit construction/material fixture exercises real runtime collider registration.
 receipt.constructionFixture=await page.evaluate(async()=>{const g=window.__game,{CAMP_DEBRIS_IDS}=await import('/src/base/campLayout.js');g.expeditionSession.resetToCamp();g.resetTransientWorldToCamp();const granted=g.frontierProgress.collectResources({wood:70,stone:50,fiber:20});for(const id of CAMP_DEBRIS_IDS)g.frontierProgress.clearCampDebris(id);const expanded=g.frontierProgress.expandBase(),placed=g.frontierProgress.placeStructure({id:'build_camera_fixture',type:'wall',pos:{x:0,z:18},yaw:0});return{granted,expanded,placed};});assert.equal(receipt.constructionFixture.placed.placed,true);await page.waitForTimeout(500);
 await page.evaluate(()=>{const g=window.__game;g.characterPhysics.setPosition({x:0,y:.56,z:16});g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();g.playerController.prepareRender(1);g.cameraFollow.orbitBy(-g.cameraFollow.getYaw(),20*Math.PI/180-g.cameraFollow.getPitch());g.cameraFollow.setZoom(1);g.cameraFollow.snap();});await page.waitForTimeout(350);const wall=await note('runtime placed wall camera clearance');assert.ok(wall.effectiveDistance<wall.requestedDistance-1);assert.ok(wall.effectiveDistance>.5);await shot('07-built-wall');
 await page.goto('http://localhost:8080/?author=1');await page.waitForFunction(()=>window.__game&&window.__author,null,{timeout:60000});const start=page.locator('[data-action=start]');if(await start.isVisible())await start.tap();const toggle=page.locator('#author-toggle');await toggle.waitFor();if((await toggle.innerText()).trim()==='EDIT')await toggle.click();const authorBefore=await state();await drag(80,60);const authorAfter=await note('Author isolates gameplay orbit');assert.equal(authorAfter.yaw,authorBefore.yaw);assert.equal(authorAfter.pitch,authorBefore.pitch);await toggle.click();await page.waitForTimeout(100);await shot('07-author-return');
 assert.deepEqual(receipt.errors,[]);assert.deepEqual(receipt.failed,[]);assert.deepEqual(receipt.external,[]);receipt.pass=true;
}catch(e){receipt.pass=false;receipt.failure=e.stack;await shot('failure').catch(()=>{});console.error(e);process.exitCode=1;}
finally{receipt.after=await hashes();receipt.sourceStable=JSON.stringify(receipt.before)===JSON.stringify(receipt.after);await fs.writeFile(`${out}/receipt.json`,JSON.stringify(receipt,null,2));await context.close();await browser.close();}
