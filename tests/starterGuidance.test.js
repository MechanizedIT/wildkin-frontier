import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getKnownExtractionTarget,placeEdgeIndicator} from '../src/ui/frontierIndicators.js';
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

test('edge guidance keeps long labels inside the viewport and clear of both thumb controls',()=>{
 const size={width:240,height:28},frame={width:844,height:390};
 const controls=[{left:650,right:835,top:240,bottom:382},{left:242,right:600,top:308,bottom:385},{left:20,right:180,top:255,bottom:385}];
 for(const desired of [{x:822,y:285},{x:650,y:368},{x:22,y:350}]){
  const p=placeEdgeIndicator(desired,size,frame,controls);assert.ok(p);
  const b={left:p.x-120,right:p.x+120,top:p.y-14,bottom:p.y+14};
  assert.ok(b.left>=12&&b.right<=832&&b.top>=12&&b.bottom<=378);
  for(const c of controls)assert.ok(b.right<=c.left||b.left>=c.right||b.bottom<=c.top||b.top>=c.bottom);
 }
 assert.equal(placeEdgeIndicator({x:1,y:1},size,{width:200,height:100}),null);
 assert.equal(placeEdgeIndicator({x:822,y:200},size,frame,[{left:0,right:844,top:0,bottom:390}]),null);
});

test('a second edge indicator reserves the first label rectangle',()=>{
 const frame={width:844,height:390},size={width:220,height:28},desired={x:822,y:220};
 const first=placeEdgeIndicator(desired,size,frame);
 const box={left:first.x-110,right:first.x+110,top:first.y-14,bottom:first.y+14};
 const second=placeEdgeIndicator(desired,size,frame,[box]);assert.ok(second);
 assert.ok(second.y+14<=box.top||second.y-14>=box.bottom||second.x+110<=box.left||second.x-110>=box.right);
});
