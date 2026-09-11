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
