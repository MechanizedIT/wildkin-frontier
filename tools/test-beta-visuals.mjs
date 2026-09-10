import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL??"msedge"});
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on("pageerror",e=>errors.push(e.stack));
try {
  await page.goto(process.env.GAME_URL??"http://localhost:8080/");await page.locator('[data-action="start"]').click();
  await page.evaluate(()=>{
    const g=window.__game;g.beginExpeditionFromDefaultEntry();
    const target=g.worldRegistry.getSectionById("section_1").props.find(p=>p.id==="prop_s1_entry_tree");
    const p={x:target.pos.x,y:.55,z:target.pos.z-1.7};
    g.characterPhysics.setPosition(p);g.playerController.syncPosFromPhysics();g.playerController.snapRenderPose();
  });
  await page.waitForTimeout(2800);
  const state=await page.evaluate(()=>{
    const g=window.__game,values=[];
    g.scene.traverse(o=>{if(o.isMesh&&o.material?.opacity===.25)values.push({asset:o.userData.visualAssetId,part:o.userData.assetPartId});});
    return{faded:values,calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};
  });
  assert.ok(state.faded.some(o=>o.asset==="asset_verge_canopy"),"Foreground canopy fades for the player");
  await page.screenshot({path:"dist/qa/canopy-visibility-final.png"});
  await page.keyboard.press("j");
  const fadedPaused=await page.evaluate(()=>{let n=0;window.__game.scene.traverse(o=>{if(o.isMesh&&o.material?.opacity===.25)n++;});return n;});
  assert.equal(fadedPaused,0,"Pause restores authored materials");
  assert.deepEqual(errors,[]);
  fs.writeFileSync("dist/qa/visual-playtest.json",JSON.stringify({pass:true,state,errors},null,2));console.log(JSON.stringify({pass:true,state,errors},null,2));
}catch(e){await page.screenshot({path:"dist/qa/visual-failure.png"});console.error(e);process.exitCode=1;}
finally{await browser.close();}
