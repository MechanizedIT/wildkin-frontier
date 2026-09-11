import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import { createCreatureSystem } from '../src/creatures/creatureSystem.js';
import { selectStartleRecipient } from '../src/creatures/socialStartle.js';
import { composeSocialEncounters } from '../tools/compose-social-encounters.mjs';
import { getSurfaceHeight, getWaterRadius } from '../src/world/terrainSurfaceModel.js';
import { validateWorldData } from '../src/world/worldValidator.js';

const spawn = (id, x, z, extra={}) => ({ id, type:'rusher', pos:{x,y:0,z}, regionId:'verge', speciesTag:'mossling', temperament:'SKITTISH', facingYaw:0, noticeRadius:7, roamRadius:4.5, leashRadius:10, configOverrides:{health:8}, ...extra });
function fixture(spawns) {
  const system=createCreatureSystem(new THREE.Scene(),null,null,{spawns});
  const player={pos:{x:0,y:.5,z:-4},mode:'SNEAK',speed:1};
  system.setPlayerState(player);system.setPlayerPos(player.pos);system.setActiveRegions(new Set(['verge']));
  return {system,player,all:system.getCreatures(),tick:(n)=>system.update(n)};
}

test('quiet rear approach keeps Moss pair calm; a direct rush starts only one neighboring alarm',()=>{
  const f=fixture([spawn('a',0,0),spawn('b',0,8),spawn('c',0,16)]);
  f.tick(.05);assert.equal(f.all[0].state.playerDetected,false);assert.equal(f.all[1].state.aiState,'ROAM');
  f.player.mode='RUN';f.tick(.05);
  assert.equal(f.all[0].state.aiState,'FLEE');assert.equal(f.all[1].state.aiState,'STARTLED');
  assert.equal(f.all[1].state.lastKnownPlayerPos,null,'Alarm does not grant sight of a distant player');
  f.tick(.4);f.tick(.1);
  assert.equal(f.all[1].state.aiState,'FLEE');assert.equal(f.all[2].state.aiState,'ROAM','No chained alarm to third animal');
});

test('recipient selection skips other regions, heights, held/captured animals and active field attempts',()=>{
  const a={...spawn('a',0,0),aiState:'ROAM'},b={...spawn('b',0,2),aiState:'ROAM'},c={...spawn('c',0,4),aiState:'ROAM'};
  assert.equal(selectStartleRecipient(a,[b,c]),b);
  for(const change of [{regionId:'other'},{_regionInactive:true},{bondingHeld:true},{bondCaptured:true},{isDead:true},{aiState:'RESPAWNING'},{pos:{x:0,y:5,z:2}}])assert.equal(selectStartleRecipient(a,[{...b,...change},c]),c);
  assert.equal(selectStartleRecipient(a,[b,c],{isTaming:id=>id==='b'}),c);
  assert.equal(selectStartleRecipient(a,[b,c],{isTaming:id=>id==='a'}),null);
});

test('damage alarms a partner without marking partner as player-damaged; taming remains protected',()=>{
  const f=fixture([spawn('a',0,0),spawn('b',0,5)]);
  f.player.pos.z=-30;
  f.system.damageCreature(f.all[0],1,{x:0,y:.5,z:-2},null,'player');
  assert.equal(f.all[1].state.aiState,'STARTLED');assert.equal(f.all[1].state.playerDamaged,false);
  assert.equal(f.system.setFieldTamingIntent('b',{hold:true}),true);f.tick(.2);
  assert.equal(f.all[1].state.aiState,'ROAM');assert.equal(f.all[1].state.fleeThreatPos,null);
  f.system.damageCreature(f.all[0],1,{x:0,y:.5,z:-2},null,'player');f.tick(.2);
  assert.equal(f.all[1].state.aiState,'ROAM');
  f.system.reset();assert.equal(f.all[0].state.startleCooldown,0);assert.equal(f.all[1].state.lastKnownPlayerPos,null);
});

for(const type of ['rusher','spitter']) {
  test(`${type} flees once per elapsed second from remembered hit location, never hidden live player`,()=>{
    const f=fixture([spawn('a',0,0,{type})]);f.player.pos.z=100;
    f.system.damageCreature(f.all[0],1,{x:-2,y:.5,z:0},null,'player');
    f.tick(.2);assert.equal(f.all[0].state.aiState,'FLEE');
    const remaining=f.all[0].state.fleeTime;
    f.player.pos.x=100;f.tick(1);
    assert.ok(Math.abs(f.all[0].state.fleeTime-(remaining-1))<1e-6);
    assert.deepEqual(f.all[0].state.fleeThreatPos,{x:-2,y:.5,z:0});
    assert.ok(f.all[0].state.pos.x>0,'Moves away from the hit, not the unseen player');
  });
  test(`${type} ignores predators in inactive sections with identical local coordinates`,()=>{
    const f=fixture([spawn('a',0,0,{type}),spawn('predator',0,-2,{regionId:'other',temperament:'AGGRESSIVE',speciesTag:'thorn'})]);
    f.player.pos.z=100;f.tick(.2);assert.equal(f.all[0].state.aiState,'ROAM');
    f.system.damageCreature(f.all[0],1,{x:-2,y:.5,z:0},null,'player');f.tick(.2);f.tick(.2);
    assert.deepEqual(f.all[0].state.fleeThreatPos,{x:-2,y:.5,z:0});
  });
}

test('aggressive empty hostile list preserves same-species peace; explicit hostility still works',()=>{
  for(const hostileSpecies of [[],['thorn']]){
    const f=fixture([spawn('a',0,0,{temperament:'AGGRESSIVE',speciesTag:'thorn',hostileSpecies}),spawn('b',0,2,{temperament:'DEFENSIVE',speciesTag:'thorn'})]);f.player.pos.z=100;f.tick(.05);
    assert.equal(f.all[0].state.aiState,hostileSpecies.length?'ALERT':'ROAM');
  }
});

test('composition preserves all old IDs and changes only second Moss home on dry terrain',()=>{
  const before=JSON.parse(fs.readFileSync(new URL('../src/world/data/world.json',import.meta.url),'utf8')),after=composeSocialEncounters(structuredClone(before));
  assert.deepEqual(composeSocialEncounters(structuredClone(after)),after);validateWorldData(structuredClone(after));
  const r=after.regions.find(r=>r.id==='section_1'),b=r.props.find(p=>p.id==='prop_s1_creek_mossling_b');
  assert.equal(b.pos.y,getSurfaceHeight(r.surface,b.pos.x,b.pos.z));assert.ok(getWaterRadius(r.surface,b.pos.x,b.pos.z)>1);
  b.pos=before.regions.find(r=>r.id==='section_1').props.find(p=>p.id===b.id).pos;
  assert.deepEqual(after,before);
});
