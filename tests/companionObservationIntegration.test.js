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

test('nearby Wildkin refreshes from Omni-tool attack to only its selected matching catch item', () => {
  const animal = { state: { id: 'moss', visualAssetId: 'asset_wildkin_mossling', pos: { x: 3, y: .5, z: 0 }, playerDamaged: false } };
  let selected = { id: 'omni_tool', kind: 'tool' };
  const system = createCompanionSystem({ scene: new THREE.Scene(), registry: { getLootChestById: () => null },
    progress: { getState: () => ({ securedCompanions: [], discoveredSpecies: [] }), getModifiers: () => ({ captureCapacity: 1 }) },
    creatures: { getActiveAliveCreatures: () => [animal] }, playerController: { getState: () => ({ pos: { x: 0, y: .5, z: 0 } }) },
    isActive: () => true, getSectionId: () => 'verge', getSelectedEquipment: () => selected });
  const pos = { x: 0, y: .5, z: 0 };
  let interaction = system.getNearbyInteraction(pos);
  assert.equal(interaction.label, 'ATTACK'); assert.equal(interaction.action, 'attack');
  selected = { id: 'berry_lure', kind: 'taming' };
  interaction = system.getNearbyInteraction(pos);
  assert.equal(interaction.label, 'PLACE BERRIES'); assert.equal(interaction.action, 'catch');
  selected = { id: 'woven_snare', kind: 'taming' };
  interaction = system.getNearbyInteraction(pos);
  assert.equal(interaction.action, 'select-taming-item'); assert.equal(interaction.disabled, true);
  selected = null;
  interaction = system.getNearbyInteraction(pos);
  assert.equal(interaction.action, 'select-taming-item'); assert.equal(interaction.disabled, true);
});
