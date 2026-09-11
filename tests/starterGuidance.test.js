import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getKnownExtractionTarget} from '../src/ui/frontierIndicators.js';
import {ingredientGuidance} from '../src/ui/betaShell.js';
test('map and marker return target excludes unknown and other-region anchors',()=>{
 const point=(id,x,regionId='s1')=>({id,regionId,pos:{x,y:2,z:0}}),registry={getAllWaypoints:()=>[point('other',0,'s2'),point('unknown',.1),point('lookout',4)],getAllBeacons:()=>[point('beacon',2)]};
 const progress={isUnlockedWaypoint:id=>id!=='unknown',isDiscoveredBeacon:()=>false};
 assert.equal(getKnownExtractionTarget(registry,progress,'s1',{x:0,z:0}).id,'lookout');
 progress.isDiscoveredBeacon=()=>true;
 assert.equal(getKnownExtractionTarget(registry,progress,'s1',{x:0,z:0}).id,'beacon');
 assert.equal(getKnownExtractionTarget(registry,progress,'camp',{x:0,z:0}),null);
 assert.equal(getKnownExtractionTarget(registry,progress,'empty',{x:0,z:0}),null);
});
test('recipe guidance separates missing, carried and spendable ingredients without mutating them',()=>{
 const cost={berries:2,fiber:1},bank={berries:1},cargo={fiber:6};
 assert.equal(ingredientGuidance(cost,'2 berries · 1 fiber',bank,cargo,false),'Find 1 Berries · Extract 1 Fiber');
 assert.equal(ingredientGuidance(cost,'2 berries · 1 fiber',bank,cargo,true),'Need 1 Berries + 1 Fiber');
 assert.equal(ingredientGuidance(cost,'2 berries · 1 fiber',{berries:2,fiber:1},cargo,true),'Ready: 2 berries · 1 fiber');
 assert.deepEqual(bank,{berries:1});assert.deepEqual(cargo,{fiber:6});
});
