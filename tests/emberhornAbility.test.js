import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createCompanionSystem } from '../src/companions/companionSystem.js';
import { COMPANION_BY_ID } from '../src/companions/companionCatalog.js';

function fixture({ speciesId='emberhorn', active=true, chest=null, completeSeal=true, strikeResult={hits:0,sources:0,depleted:0,interrupted:false} }={}) {
  const calls={strike:0,damage:0,ward:0,ability:0,pulse:0,audio:0,seal:0};
  const completedPoiIds=[];
  const progress={
    getActiveWildkin:()=>({id:`wildkin_${speciesId}`,speciesId}),getOwnedWildkin:()=>[],
    getState:()=>({completedPoiIds}),getModifiers:()=>({captureCapacity:2,fieldToolDamageMultiplier:2,abilityCooldownMultiplier:1}),
    completePoi(id){calls.seal++;if(!completeSeal)return false;completedPoiIds.push(id);return true;},
  };
  const enemy={state:{id:'enemy',pos:{x:2,y:0,z:0}}};
  const creatures={getActiveAliveCreatures:()=>[enemy],damageCreature:()=>{calls.damage++;},setBondingTarget(){},getCreatures:()=>[],hasClearSightToCreature:()=>true,setFieldTamingIntent(){},clearFieldTamingIntent(){}};
  const species=COMPANION_BY_ID[speciesId];
  const system=createCompanionSystem({scene:new THREE.Scene(),progress,creatures,
    registry:{getLootChestById:id=>chest&&id===species.secret?chest:null},
    playerController:{getState:()=>({pos:{x:0,y:.5,z:0},grounded:true}),launchFromJumpPad(){}},
    playerCombat:{getHealth:()=>2,getMaxHealth:()=>5,heal(){},grantWard(){calls.ward++;}},
    isActive:()=>active,getSectionId:()=> 'field',toast(){},pulse(){calls.pulse++;},audio:{playParkour(){calls.audio++;}},onAbility(){calls.ability++;},
    strikeMinerals(pos){calls.strike++;assert.deepEqual(pos,{x:0,y:.5,z:0});return strikeResult;},
  });
  return {system,calls};
}

test('selected Emberhorn strikes minerals once alongside combat and spends one ordinary cooldown',t=>{
  const {system,calls}=fixture({strikeResult:{hits:7,sources:2,depleted:1,interrupted:false}});t.after(()=>system.dispose());
  const result=system.useAbility();
  assert.deepEqual(result,{ok:true,message:'Cragbreaker · 2 outcrops cracked.'});
  assert.equal(calls.strike,1);assert.equal(calls.damage,1);assert.equal(calls.ability,1);assert.equal(calls.pulse,1);assert.equal(calls.audio,1);
  assert.equal(system.getAbility().ready,false);assert.equal(system.getAbility().cooldown,COMPANION_BY_ID.emberhorn.cooldown);
  assert.equal(system.useAbility().ok,false);assert.equal(calls.strike,1,'cooldown blocks duplicate mineral bursts');assert.equal(calls.damage,1);
});

test('inactive, other-companion and cooldown gates never call the Emberhorn mineral utility',t=>{
  const inactive=fixture({active:false}),tidefin=fixture({speciesId:'tidefin'}),quiet=fixture();t.after(()=>{inactive.system.dispose();tidefin.system.dispose();quiet.system.dispose();});
  assert.equal(inactive.system.useAbility().ok,false);assert.equal(inactive.calls.strike,0);
  assert.equal(tidefin.system.useAbility().ok,true);assert.equal(tidefin.calls.ward,1);assert.equal(tidefin.calls.strike,0);
  assert.equal(tidefin.system.useAbility().ok,false);assert.equal(tidefin.calls.strike,0);
  assert.deepEqual(quiet.system.useAbility(),{ok:true,message:'Emberhorn · Cragbreaker'},'no mineral hit retains the existing ability message');
});

test('failed seal persistence aborts mining, combat and cooldown before any ability effect',t=>{
  const chest={id:COMPANION_BY_ID.emberhorn.secret,sectionId:'field',pos:{x:0,y:0,z:0}};
  const {system,calls}=fixture({chest,completeSeal:false,strikeResult:{hits:3,sources:1,depleted:0,interrupted:false}});t.after(()=>system.dispose());
  const result=system.useAbility();
  assert.equal(result.ok,false);assert.match(result.message,/save/i);assert.equal(calls.seal,1);
  assert.equal(calls.strike,0);assert.equal(calls.damage,0);assert.equal(calls.ability,0);assert.equal(system.getAbility().ready,true);
});

test('partial mineral interruption retains prior hits and still consumes the ordinary ability cooldown',t=>{
  const {system,calls}=fixture({strikeResult:{hits:5,sources:2,depleted:0,interrupted:true}});t.after(()=>system.dispose());
  const result=system.useAbility();
  assert.deepEqual(result,{ok:true});assert.equal(calls.strike,1);
  assert.equal(calls.ability,1);assert.equal(calls.pulse,1);assert.equal(calls.audio,1,'interruption leaves the ordinary committed ability effects intact');
  assert.equal(system.getAbility().ready,false);assert.equal(system.useAbility().ok,false);assert.equal(calls.strike,1);
});

test('a saved seal keeps its existing message priority over mineral feedback',t=>{
  const chest={id:COMPANION_BY_ID.emberhorn.secret,sectionId:'field',pos:{x:0,y:0,z:0}};
  const {system,calls}=fixture({chest,strikeResult:{hits:4,sources:1,depleted:1,interrupted:false}});t.after(()=>system.dispose());
  assert.deepEqual(system.useAbility(),{ok:true,message:'The cache is now accessible.'});
  assert.equal(calls.seal,1);assert.equal(calls.strike,1);assert.equal(system.getAbility().ready,false);
});
