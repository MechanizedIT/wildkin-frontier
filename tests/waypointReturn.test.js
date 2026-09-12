import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_DATA} from '../src/world/data/world.generated.js';
import {createWorldRegistry} from '../src/world/worldRegistry.js';
import {createFrontierAnchorSystem} from '../src/world/frontierAnchorSystem.js';
import {createFrontierOuting} from '../src/session/frontierOuting.js';
import {createExpeditionSession} from '../src/session/expeditionSession.js';
import {normalizeActiveRun} from '../src/session/activeRunState.js';

test('every authored waypoint start can extract on its first return, including starts outside the action radius', () => {
  const registry=createWorldRegistry(WORLD_DATA),session={isCamp:()=>false,isActive:()=>true};
  for(const waypoint of registry.getAllWaypoints().filter(w=>w.id!=='wp_camp_gate')) {
    const system=createFrontierAnchorSystem(registry,{getSession:()=>session,getActiveSectionId:()=>waypoint.regionId});
    const spawn=registry.getWaypointSpawnPosition(waypoint.id);
    system.prime(spawn);system.suppressUntilExit(waypoint.id);system.update(spawn);
    system.update({x:spawn.x+8,y:spawn.y,z:spawn.z+8});system.update(waypoint.pos);
    assert.equal(system.getNearbyInteraction(waypoint.pos,session)?.id,waypoint.id);
    system.handleKeepGoing(waypoint.id);
    assert.equal(system.getNearbyInteraction(waypoint.pos,session),null,'Keep going still requires departure');
    system.update({x:waypoint.pos.x+4,y:waypoint.pos.y,z:waypoint.pos.z});system.update(waypoint.pos);
    assert.equal(system.getNearbyInteraction(waypoint.pos,session)?.id,waypoint.id);
  }
});

test('a spawn inside its waypoint remains suppressed until it actually leaves', () => {
  const registry=createWorldRegistry(WORLD_DATA),waypoint=registry.getWaypointById('wp_section_1'),session={isCamp:()=>false,isActive:()=>true};
  const system=createFrontierAnchorSystem(registry,{getSession:()=>session,getActiveSectionId:()=>waypoint.regionId});
  system.prime(waypoint.pos);system.suppressUntilExit(waypoint.id);system.update(waypoint.pos);
  assert.equal(system.getNearbyInteraction(waypoint.pos,session),null);
  system.update({...waypoint.pos,x:waypoint.pos.x+3});system.update(waypoint.pos);
  assert.equal(system.getNearbyInteraction(waypoint.pos,session)?.id,waypoint.id);
});

test('the Camp gate offers banking only after the continuous outing crossed the Camp boundary', () => {
  const registry=createWorldRegistry(WORLD_DATA),session={isCamp:()=>false,isActive:()=>true};
  let departed=false;
  const system=createFrontierAnchorSystem(registry,{getSession:()=>session,getActiveSectionId:()=> 'camp',canReturnToCamp:()=>departed});
  const gate=registry.getFrontierGatePos();
  system.prime(gate);
  assert.equal(system.getNearbyInteraction(gate,session),null);
  departed=true;
  assert.equal(system.getNearbyInteraction(gate,session)?.label,'RETURN TO CAMP');
});

test('leaving the frontier, returning inside Camp, and reloading preserves Camp gate eligibility', () => {
  const registry=createWorldRegistry(WORLD_DATA);
  const first=createExpeditionSession({initialStatus:'active',initialRegionId:'camp'});
  const outing=createFrontierOuting({session:first,campBounds:{minX:-50,maxX:50,minZ:-50,maxZ:50},commitStart:()=>({ok:false}),
    onDeparted:()=>first.setFrontierDeparted(true)});
  outing.update(.1,{x:55,y:1,z:0},{grounded:true});
  outing.update(.1,{x:0,y:1,z:0},{grounded:true});
  const snap=first.snapshotRun();
  const persisted=normalizeActiveRun({runId:snap.runId,startAnchorId:snap.startAnchorId,sectionId:'camp',feet:{x:0,y:0,z:0},facingYaw:0,
    health:4,xp:snap.xp,companions:[],corePending:false,kills:snap.kills,maxDepth:snap.maxDepth,frontierDeparted:snap.frontierDeparted,
    newWaypoints:snap.newWaypoints,newBeacons:snap.newBeacons}).run;
  assert.equal(persisted.frontierDeparted,true);
  const restored=createExpeditionSession({initialStatus:'camp'});assert.equal(restored.restoreActiveRun(persisted).ok,true);
  const restoredOuting=createFrontierOuting({session:restored,campBounds:{minX:-50,maxX:50,minZ:-50,maxZ:50},commitStart:()=>({ok:false}),initialDeparted:persisted.frontierDeparted});
  const system=createFrontierAnchorSystem(registry,{getSession:()=>restored,getActiveSectionId:()=> 'camp',canReturnToCamp:()=>restoredOuting.hasDepartedCamp()});
  const gate=registry.getFrontierGatePos();system.prime(gate);
  assert.equal(system.getNearbyInteraction(gate,restored)?.label,'RETURN TO CAMP');
});
