import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createPlayerCombat } from '../src/combat/playerCombat.js';
import { createProjectileSystem } from '../src/combat/projectileSystem.js';
import { createCompanionSystem } from '../src/companions/companionSystem.js';
import { COMPANION_BY_ID } from '../src/companions/companionCatalog.js';

const idle={moveX:0,moveY:0,moveMagnitude:0,movementBand:'idle'};
function combatFixture() {
  const state={pos:{x:0,y:.5,z:0},facing:0,mode:'IDLE',traversalMode:'IDLE'};
  const combat=createPlayerCombat({playerMesh:new THREE.Group(),getPlayerState:()=>state});
  const tick=seconds=>combat.update(seconds,idle,state.pos,0,[]);
  return {combat,state,tick};
}

function companionFixture({speciesId='tidefin',sealSaved=true,chest=null}={}) {
  const {combat,tick}=combatFixture(),completedPoiIds=[];
  const progress={getActiveWildkin:()=>({id:`wildkin_${speciesId}`,speciesId}),getOwnedWildkin:()=>[],getState:()=>({completedPoiIds}),
    getModifiers:()=>({captureCapacity:2,abilityCooldownMultiplier:1,fieldToolDamageMultiplier:1}),
    completePoi(id){if(!sealSaved)return false;completedPoiIds.push(id);return true;},discoverSpecies(){},earnObservationClue(){}};
  const creatures={getActiveAliveCreatures:()=>[],getCreatures:()=>[],setBondingTarget(){},hasClearSightToCreature:()=>true,setFieldTamingIntent(){},clearFieldTamingIntent(){}};
  const species=COMPANION_BY_ID[speciesId];
  const system=createCompanionSystem({scene:new THREE.Scene(),registry:{getLootChestById:id=>chest&&id===species.secret?chest:null,getSectionById:()=>({surface:null})},progress,creatures,
    playerController:{getState:()=>({pos:{x:0,y:.5,z:0},grounded:true}),launchFromJumpPad(){}},playerCombat:combat,isActive:()=>true,getSectionId:()=> 'field',toast(){},pulse(){},audio:{}});
  return {combat,tick,system};
}

test('ward remains independent from post-hit and dodge grace, expires, and clears on reset/restore',()=>{
  const {combat,state,tick}=combatFixture();
  assert.equal(combat.takeDamage(1,{x:1,y:0,z:0}),true);assert.equal(combat.getHealth(),4);
  assert.equal(combat.grantWard(3),true);assert.equal(combat.getWardRemaining(),3);
  tick(.7);assert.equal(combat.getState().postHitInvuln,0);assert.ok(combat.getWardRemaining()>2.29);
  assert.equal(combat.takeDamage(4,null),false,'the landing-damage path is blocked without changing health');assert.equal(combat.getHealth(),4);
  state.mode='DODGE';tick(.01);assert.ok(combat.getState().dodgeInvuln>0);state.mode='IDLE';
  tick(2.3);assert.equal(combat.getWardRemaining(),0);assert.ok(combat.getState().dodgeInvuln===0);assert.equal(combat.isInvulnerable(),false);
  assert.equal(combat.takeDamage(1,null),true);assert.equal(combat.getHealth(),3);
  combat.grantWard(2);combat.grantWard(1);assert.equal(combat.getWardRemaining(),2,'a shorter grant cannot truncate an active ward');
  combat.grantWard(99);assert.equal(combat.getWardRemaining(),5,'ward grants retain the existing five-second transient cap');
  combat.reset();assert.equal(combat.getWardRemaining(),0);assert.equal(combat.isInvulnerable(),false);
  combat.grantWard(3);assert.equal(combat.restoreHealth(2).ok,true);assert.equal(combat.getWardRemaining(),0,'active-run health restore does not restore transient ward state');
});

test('the real projectile guard consumes a blocked shot and permits damage after ward expiry',()=>{
  const {combat,tick}=combatFixture(),projectiles=createProjectileSystem(new THREE.Scene(),null,null);
  projectiles.setPlayerPos({x:5,y:.5,z:0});projectiles.setInvulnChecker(()=>combat.isInvulnerable());projectiles.setDamageCallback((damage,pos)=>combat.takeDamage(damage,pos));
  combat.grantWard(3);projectiles.spawnProjectile({x:0,y:.5,z:0},{x:1,y:0,z:0},null);
  for(let i=0;i<80;i++)projectiles.update(.02);
  assert.equal(projectiles.getCount(),0);assert.equal(combat.getHealth(),5);
  tick(3);projectiles.spawnProjectile({x:0,y:.5,z:0},{x:1,y:0,z:0},null);
  for(let i=0;i<80;i++)projectiles.update(.02);
  assert.equal(combat.getHealth(),4);
});

test('Tidefin exposes authoritative active time, keeps cooldown, and returns no routine success message',t=>{
  const {combat,tick,system}=companionFixture();t.after(()=>system.dispose());
  assert.deepEqual(system.getAbility(),{individualId:'wildkin_tidefin',speciesId:'tidefin',name:'Tidal Ward',ready:true,cooldown:0,activeRemaining:0,activeDuration:3});
  assert.deepEqual(system.useAbility(),{ok:true});
  assert.deepEqual(system.getAbility(),{individualId:'wildkin_tidefin',speciesId:'tidefin',name:'Tidal Ward',ready:false,cooldown:26,activeRemaining:3,activeDuration:3});
  tick(1);assert.ok(system.getAbility().activeRemaining>1.99&&system.getAbility().activeRemaining<=2);
  assert.equal(system.useAbility().ok,false);assert.equal(combat.getWardRemaining(),2,'cooldown cannot refresh the ward');
});

test('failed seal save leaves ward and cooldown untouched; other ability models keep zero active time',t=>{
  const chest={id:COMPANION_BY_ID.tidefin.secret,sectionId:'field',pos:{x:0,y:0,z:0}};
  const failed=companionFixture({chest,sealSaved:false}),moss=companionFixture({speciesId:'mossling'});t.after(()=>{failed.system.dispose();moss.system.dispose();});
  const result=failed.system.useAbility();assert.equal(result.ok,false);assert.match(result.message,/save/i);
  assert.equal(failed.combat.getWardRemaining(),0);assert.equal(failed.system.getAbility().ready,true);
  assert.deepEqual(moss.system.getAbility(),{individualId:'wildkin_mossling',speciesId:'mossling',name:'Bloom',ready:true,cooldown:0,activeRemaining:0,activeDuration:0});
});
