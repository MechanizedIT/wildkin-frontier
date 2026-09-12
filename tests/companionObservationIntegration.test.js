import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCompanionSystem } from '../src/companions/companionSystem.js';

test('world taming queries never discover wildlife, hold a valid target, and still prioritize actionable animals', () => {
  const target = (id,x) => ({state:{id,visualAssetId:'asset_wildkin_mossling',pos:{x,y:.5,z:0},playerDamaged:false}});
  const animals=[target('a',4),target('b',4.5)]; let writes=0;
  const system=createCompanionSystem({scene:new THREE.Scene(),registry:{getLootChestById:()=>null},
    progress:{getState:()=>({securedCompanions:[],discoveredSpecies:[]}),getModifiers:()=>({captureCapacity:1}),discoverSpecies:()=>{writes++;}},
    creatures:{getActiveAliveCreatures:()=>animals},playerController:{getState:()=>({pos:{x:0,y:.5,z:0}})},isActive:()=>true,getSectionId:()=> 'verge'});
  const pos={x:0,y:.5,z:0};
  assert.equal(system.getNearbyInteraction(pos).id,'a');
  animals[1].state.pos.x=3.6;
  assert.equal(system.getNearbyInteraction(pos).id,'a','small distance crossover does not flicker target');
  animals[0].state.playerDamaged=true;
  assert.equal(system.getNearbyInteraction(pos).id,'b','actionable animal outranks previous wary one');
  animals[0].state.playerDamaged=false; animals[1].state.pos.x=9;
  assert.equal(system.getNearbyInteraction(pos).id,'a','invalid range drops previous immediately');
  assert.equal(writes,0,'UI query has no encounter/save mutation');
});
