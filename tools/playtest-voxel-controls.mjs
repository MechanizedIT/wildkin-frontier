import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.VOXEL_CONTROLS_URL||'http://localhost:8123/lab/voxel/cellular-mixed.html',
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']}),
  page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),id=`controls-${Date.now()}`,url=new URL(base),errors=[];
url.searchParams.set('save',id);page.on('pageerror',error=>errors.push(error.message));
const view=()=>page.evaluate(()=>window.__cellularLab.view),ready=()=>page.waitForFunction(()=>window.__cellularLab?.ready&&!window.__cellularLab?.editing,null,{timeout:60000});
try{
  await page.goto(url.href);await ready();
  const movement=[];
  for(const yaw of [0,Math.PI/2]){
    await page.evaluate(value=>{window.__cellularLab.focusAt([0,3,0]);window.__cellularLab.aim(value,.32);},yaw);
    const before=await view();await page.keyboard.down('w');await page.waitForTimeout(220);await page.keyboard.up('w');
    const after=await view(),delta=after.focus.map((v,i)=>v-before.focus[i]);movement.push({yaw,delta});
    assert.ok(Math.hypot(...delta)>0.2,`W did not pan at yaw ${yaw}`);
    if(yaw===0)assert.ok(delta[2]<-.2&&Math.abs(delta[0])<.03,JSON.stringify(delta));
    else assert.ok(delta[0]<-.2&&Math.abs(delta[2])<.03,JSON.stringify(delta));
  }
  await page.evaluate(()=>{window.__cellularLab.focusAt([0,4,0]);window.__cellularLab.aim(0,0);});
  await page.mouse.wheel(0,10000);await page.waitForTimeout(80);
  const before=await page.evaluate(()=>window.__cellularLab.state.revision);await page.locator('#mine').click();await ready();
  const result=await view(),after=await page.evaluate(()=>window.__cellularLab.state.revision);
  assert.ok(result.lastHitDistance>8,`expected hit beyond 8 units, got ${result.lastHitDistance}`);
  assert.ok(after>before,'far visible matter was not mined');assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,movement,farHitDistance:result.lastHitDistance,revisionDelta:after-before,errors}));
}catch(error){console.error(error);console.log(JSON.stringify({pass:false,error:error.stack,errors}));process.exitCode=1;}
finally{await browser.close();}
