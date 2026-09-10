import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL??"msedge"});
const page=await browser.newPage({viewport:{width:390,height:844}});
const url=process.env.GAME_URL??"http://localhost:8081/",origin=new URL(url).origin;
const errors=[],external=[],requests=[];
page.on("pageerror",e=>errors.push(e.stack));
page.on("request",r=>requests.push(r.url()));
await page.route("**/*",route=>{
  const address=route.request().url();
  if(address.startsWith("http")&&new URL(address).origin!==origin){external.push(address);return route.abort();}
  return route.continue();
});
try{
  await page.goto(url);
  page.setDefaultTimeout(60000);
  await page.locator('[data-action="start"]').click();
  assert.equal(await page.title(),"Wildkin Frontier");
  assert.equal(await page.evaluate(()=>window.__game.worldRegistry.getAllRegions().length),6);
  assert.equal(await page.locator("#boot-status").isVisible(),false);
  const artwork = await page.evaluate(async () => {
    await document.fonts.ready;
    return Promise.all(['assets/ui/frontier-icons.png','assets/ui/wildkin-portraits.png'].map(src => new Promise(resolve => {
      const image = new Image(); image.onload = () => resolve({src,width:image.naturalWidth,height:image.naturalHeight}); image.onerror = () => resolve({src,width:0}); image.src=src;
    })));
  });
  assert.ok(artwork.every(image=>image.width>0 && image.height>0),'both original atlases decode in the portable build');
  await page.context().setOffline(true);
  const pos=await page.evaluate(()=>({...window.__game.playerController.getState().pos}));
  await page.keyboard.down("d");await page.waitForTimeout(500);await page.keyboard.up("d");
  assert.ok(await page.evaluate(x=>window.__game.playerController.getState().pos.x>x+.8,pos.x));
  await page.keyboard.press("b");
  for (const tab of ['inventory','skills','wildkin','settings']) {
    await page.locator('.beta-panel nav [data-tab="'+tab+'"]').click();
    assert.ok(await page.locator('.beta-panel').isVisible());
  }
  await page.screenshot({path:"dist/qa/package-offline-settings.png"});
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  await page.keyboard.press("Escape");
  // Exercise WebGL loss messaging without forcing a driver reset on the host.
  await page.evaluate(()=>document.querySelector("#c").dispatchEvent(new Event("webglcontextlost",{cancelable:true})));
  assert.match(await page.locator("#boot-status").innerText(),/graphics session paused/);
  await page.screenshot({path:"dist/qa/package-context-recovery.png"});
  const result={pass:true,checks:["Packaged same-shell boot, six regions, no external requests","Already-loaded movement and menus work with network offline","Graphics context-loss recovery message"],artwork,requests,external,errors};
  fs.writeFileSync("dist/qa/package-playtest.json",JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(e){console.error(e);process.exitCode=1;}
finally{await browser.close();}
