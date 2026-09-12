import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chooseNearbyInteraction } from '../src/game/interactionPriority.js';
test('travel and extraction remain usable beside incidental wildlife, while deliberate taming stays actionable',()=>{
  const field={type:'bond',id:'mossling'},beacon={type:'extractionBeacon',id:'beacon'},gate={type:'portalGate',id:'gate'};
  assert.equal(chooseNearbyInteraction({field,frontier:beacon}),beacon);
  assert.equal(chooseNearbyInteraction({field,frontier:beacon,activeTamingId:'mossling'}),field);
  assert.equal(chooseNearbyInteraction({field,frontier:beacon,gate,activeTamingId:'mossling'}),gate);
  assert.equal(chooseNearbyInteraction({field}),field);
});
test('an occluded or offscreen priority target does not suppress a visible reachable action',()=>{
  const camp={type:'resonator',id:'camp'},gate={type:'portalGate',id:'gate'},field={type:'wildkinBed',id:'nursery'};
  assert.equal(chooseNearbyInteraction({camp,gate,field,isVisible:info=>info.id==='nursery'}),field);
  assert.equal(chooseNearbyInteraction({camp,gate,field,isVisible:()=>false}),null);
});
