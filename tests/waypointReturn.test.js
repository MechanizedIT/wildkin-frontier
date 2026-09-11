import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_DATA} from '../src/world/data/world.generated.js';
import {createWorldRegistry} from '../src/world/worldRegistry.js';
import {createFrontierAnchorSystem} from '../src/world/frontierAnchorSystem.js';

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
