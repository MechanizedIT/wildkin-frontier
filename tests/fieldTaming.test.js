import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createFieldTaming } from "../src/companions/fieldTaming.js";
import { COMPANION_BY_ID } from "../src/companions/companionCatalog.js";
import { createCreatureSystem } from "../src/creatures/creatureSystem.js";
import { canBond } from "../src/companions/bondingLogic.js";

function fixture(id, options = {}) {
  const species = COMPANION_BY_ID[id], supplies = { berry_lure: 3, woven_snare: 2, reinforced_tether: 2, calming_chime: 2 };
  const player = { pos: { x: 0, y: .5, z: -4 }, speed: 0, facing: 0, grounded: true, dodgeTime: 0 };
  let section = "field", active = true, damage = 0, captured = [];
  const system = createCreatureSystem(new THREE.Scene(), null, null, { spawns: [{ id: "wild", type: "rusher", pos: { x: 0, y: 0, z: 0 }, temperament: id === "emberhorn" ? "TERRITORIAL" : "SKITTISH", regionId: "field", visualAsset: { id: species.assetId } }], onPlayerDamage() { damage++; return true; } });
  const target = system.getCreatures()[0];
  system.setPlayerState(player); system.setPlayerPos(player.pos); system.setInvulnChecker(() => player.dodgeTime > 0);
  let pointCount = 0;
  const taming = createFieldTaming({ getPlayer: () => player, getTarget: () => system.getActiveAliveCreatures()[0], getSectionId: () => section, isActive: () => active,
    canStart: (target, species) => canBond({ speciesId: species?.id, damaged: target?.state.playerDamaged, pending: captured, capacity: 1, active }),
    consume(id) { if (options.storageFail) return { consumed: false, reason: "storage" }; if (!supplies[id]) return { consumed: false, reason: "empty" }; supplies[id]--; return { consumed: true }; },
    placePoint: () => options.blocked ? null : ({ x: pointCount++ ? 3 : 0, y: 0, z: -2 }),
    setIntent: system.setFieldTamingIntent, clearIntent: system.clearFieldTamingIntent,
    capture(id, s) { system.setBondingTarget(id); if (!system.secureBondTarget(id)) return false; captured.push(s.id); return true; },
  });
  function tick(seconds) { for (let t=0;t<seconds;t+=1/60) { system.update(1/60); taming.update(1/60); } }
  return { taming, system, target, player, supplies, captured, tick, begin: () => taming.begin("wild", species), damage: () => damage, travel: () => { section = "other"; }, leave: () => { active = false; } };
}

test("gear placement validates terrain and storage before spending or holding wildlife", () => {
  for (const options of [{ blocked: true }, { storageFail: true }]) {
    const f = fixture("mossling", options);
    assert.equal(f.begin(), false); assert.equal(f.supplies.berry_lure, 3); assert.equal(f.taming.getState(), null);
    const before = f.target.state.pos.clone(); f.tick(1); assert.ok(f.target.state.pos.distanceTo(before) > .1);
  }
});

test("Mossling physically reaches berries before trust; approaching gently captures once", () => {
  const f = fixture("mossling"); assert.equal(f.begin(), true); assert.equal(f.supplies.berry_lure, 2);
  f.tick(3); assert.equal(f.taming.getState().stage, "lure", "Crowding does not advance trust");
  f.player.pos.z = -6; f.tick(7); assert.equal(f.taming.getState().stage, "ready");
  assert.ok(Math.hypot(f.target.state.pos.x, f.target.state.pos.z+2)<.85, "Creature walked to actual food");
  f.player.pos.z = -3.5; assert.equal(f.taming.act(), true); assert.deepEqual(f.captured, ["mossling"]);
  assert.equal(f.taming.act(), false); assert.equal(f.system.getActiveAliveCreatures().length, 0);
});

test("Tidefin's real snare can expire; a new attempt costs fresh gear and can release to bond", () => {
  const f = fixture("tidefin"); f.begin(); f.player.pos.z=-6; f.tick(4);
  assert.equal(f.taming.getState().stage, "trapped"); f.tick(15); assert.equal(f.taming.getState(), null); assert.deepEqual(f.captured, []);
  f.player.pos.x=f.target.state.pos.x; f.player.pos.z=f.target.state.pos.z-4;
  assert.equal(f.begin(), true); assert.equal(f.supplies.woven_snare, 0); f.player.pos.z=-7; f.tick(8);
  assert.equal(f.taming.getState().stage, "trapped"); f.player.pos={...f.target.state.pos,z:f.target.state.pos.z-1.8};
  assert.equal(f.taming.act(), true); assert.deepEqual(f.captured, ["tidefin"]);
});

test("Emberhorn requires an actual dodged player charge; failed charges and generic recovery cannot open tether", () => {
  const f = fixture("emberhorn"); f.player.pos.z=-2; f.begin();
  f.tick(3); assert.ok(f.damage()>0); assert.equal(f.taming.getState().stage,"challenge"); assert.equal(f.supplies.reinforced_tether,2);
  // Observe a real committed lunge, then supply the player's dodge state and
  // displacement; the live AI owns collision-independent attack resolution.
  for(let i=0;i<600 && f.target.state.aiState!=="LUNGE";i++) f.tick(1/60);
  assert.equal(f.target.state.aiState,"LUNGE"); f.player.dodgeTime=.3; f.player.pos.x+=2.2; f.tick(.3); f.player.dodgeTime=0;
  assert.equal(f.taming.getState().stage,"tether");
  f.player.pos={...f.target.state.pos,z:f.target.state.pos.z-1.5};
  assert.equal(f.taming.act(),true); assert.equal(f.supplies.reinforced_tether,1); assert.equal(f.taming.getState().stage,"offer");
  assert.equal(f.taming.act(),true); assert.equal(f.supplies.berry_lure,2); assert.deepEqual(f.captured,["emberhorn"]);
});

test("Skydancer walks to two different perches; remote repeated calls never shortcut the bond", () => {
  const f=fixture("skydancer"); f.begin(); assert.equal(f.taming.act(),true); f.player.pos.z=-6; f.tick(5);
  assert.equal(f.taming.getState().stage,"call"); assert.equal(f.taming.getState().perch,1); assert.equal(f.supplies.calming_chime,1);
  assert.equal(f.taming.act(),false,"Must follow into call range of second perch"); f.player.pos.x=3; f.player.pos.z=-4.6;
  assert.equal(f.taming.act(),true); f.tick(5); assert.equal(f.taming.getState().stage,"ready");
  assert.equal(f.taming.act(),false,"Must approach to welcome it"); f.player.pos.z=-3.5; assert.equal(f.taming.act(),true);
  assert.deepEqual(f.captured,["skydancer"]);
});

test("cancel, damage, travel and Author clear transient gear and restore wild AI without refund or capture", () => {
  for (const cause of ["clear","damage","travel","hidden","inactive"]) {
    const f=fixture("mossling"); f.begin();
    if(cause==="clear")f.taming.clear();
    if(cause==="damage")f.system.damageCreature(f.target,1,{x:1,y:0,z:0},null,"player");
    if(cause==="travel")f.travel();
    if(cause==="inactive")f.leave();
    f.taming.update(.02,{hidden:cause==="hidden"});
    assert.equal(f.taming.getState(),null,cause); assert.equal(f.supplies.berry_lure,2); assert.deepEqual(f.captured,[]);
    assert.equal(f.target.state.bondingHeld,false);
  }
});

test("captured wildlife leaves sibling predator targeting and damage paths until expedition reset", () => {
  const system = createCreatureSystem(new THREE.Scene(), null, null, { spawns: [
    { id: "grazer", type: "rusher", pos: {x:0,y:0,z:0}, temperament: "SKITTISH" },
    { id: "predator", type: "rusher", pos: {x:2,y:0,z:0}, temperament: "AGGRESSIVE" },
  ] });
  system.setPlayerPos({x:50,y:.5,z:50});
  const [grazer,predator] = system.getCreatures();
  assert.equal(system._selectTarget(predator).targetCreature,grazer);
  system.setBondingTarget("grazer"); system.secureBondTarget("grazer");
  assert.equal(system._selectTarget(predator),null);
  assert.equal(system._dealWildkin(predator,grazer),false);
  assert.equal(system.setFieldTamingIntent("grazer",{hold:true}),false);
  system.reset(); assert.equal(system._selectTarget(predator).targetCreature,grazer);
});
