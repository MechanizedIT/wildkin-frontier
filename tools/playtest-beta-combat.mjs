// Real keyboard combat against the Guardian from a diagnostic endgame loadout.
// Never inject enemy damage, player health, or fight outcome after starting.
import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL??"msedge"});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[]; page.on("pageerror",e=>errors.push(e.stack));
try {
  await page.goto(process.env.GAME_URL??"http://localhost:8080/");
  await page.locator('[data-action="start"]').click();
  await page.evaluate(()=>{
    const g=window.__game;
    g.frontierProgress.bankRun({wood:200,stone:200,berries:200,fiber:200,iron_ore:200,crystal_shard:200,wildflower:200},900,"qa-combat-kit");
    for(const id of ["field_tool","vitality","field_medicine"]) for(let n=0;n<3;n++)g.frontierProgress.purchaseUpgrade(id);
    for(let n=0;n<8;n++)g.frontierProgress.craftConsumable("medkit");
    g.frontierProgress.secureCompanions(["tidefin"],"qa-shield");
    g.frontierProgress.selectCompanion("tidefin");
    g.frontierProgress.unlockWaypoint("wp_section_5");
    g.beginExpedition("wp_section_5");
  });
  const read=()=>page.evaluate(()=>{
    const g=window.__game,c=g.creatureSystem.getCreatures().find(c=>c.state.id==="wildkin_guardian");
    const rings=g.scene.children.filter(o=>o.name.startsWith("guardianHazardRing")&&o.visible).map(o=>({x:o.position.x,z:o.position.z}));
    return{player:{...g.playerController.getState().pos},hp:g.playerCombat.getHealth(),boss:c?{...c.state.pos,health:c.state.health,dead:c.state.isDead,ai:c.state.aiState}:null,
      active:g.expeditionSession.isActive(),rings,medkits:g.frontierProgress.getState().craftedConsumables.medkit,ability:g.betaGame.companions.getAbility()};
  });
  const initial=await read(); let strikes=0,dodges=0,frames=0,lastHealth=initial.boss.health,ringShot=false;
  for(;frames<300;frames++) {
    const s=await read();
    if(s.boss?.dead) break;
    assert.equal(s.active,true,"Player survived the encounter");
    if(s.hp<=4&&s.medkits>0) await page.keyboard.press("h");
    if(s.ability?.ready) await page.keyboard.press("q");
    const dx=s.boss.x-s.player.x,dz=s.boss.z-s.player.z,dist=Math.hypot(dx,dz);
    const keys=[];
    if(s.rings.some(r=>Math.hypot(r.x-s.player.x,r.z-s.player.z)<2.7)) {
      if(!ringShot){await page.screenshot({path:"dist/qa/guardian-fight-warning.png"});ringShot=true;}
      keys.push(s.player.x>0?"d":"a");await page.keyboard.down(keys[0]);await page.keyboard.press("Space");dodges++;
    } else {
      if(Math.abs(dx)>.4)keys.push(dx>0?"d":"a");
      if(Math.abs(dz)>.4)keys.push(dz>0?"s":"w");
      for(const key of keys)await page.keyboard.down(key);
      if(dist<2.6)await page.keyboard.down("f");
    }
    await page.waitForTimeout(200);
    await page.keyboard.up("f");for(const key of keys)await page.keyboard.up(key);
    if(s.boss.health<lastHealth){strikes++;lastHealth=s.boss.health;}
  }
  const end=await read();
  assert.equal(end.boss.dead,true,"Guardian can be beaten using normal combat input");
  assert.ok(strikes>0);assert.ok(dodges>0);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:"dist/qa/guardian-fight-victory.png"});
  const report={pass:true,proof:"Diagnostic endgame upgrades/medkits and Waypoint start; all movement, attack, dodge, shield and healing use real keyboard input",strikes,dodges,steps:frames,initial,end,errors};
  fs.writeFileSync("dist/qa/combat-playtest.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(e){await page.screenshot({path:"dist/qa/combat-failure.png"});console.error(e);console.error(errors);process.exitCode=1;}
finally{await browser.close();}
