import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import R from '@dimforge/rapier3d-compat';
import { createSightSegment } from '../src/creatures/sightRay.js';
import { createCreatureSystem } from '../src/creatures/creatureSystem.js';

test('raised sight origin reaches the exact target on level and elevated terrain', () => {
  for (const target of [{x:4,y:.5,z:0},{x:0,y:2,z:4},{x:0,y:-1,z:4}]) {
    const ray=createSightSegment({x:0,y:.7,z:0},target);
    for(const axis of ['x','y','z']) assert.ok(Math.abs(ray.origin[axis]+ray.direction[axis]*ray.length-target[axis])<1e-8);
  }
});

test('actual Rapier shared sight respects solid walls, ignores sensors and follows actor filters for rusher/spitter awareness', async () => {
  await R.init();
  for (const type of ['rusher','spitter']) {
    const world=new R.World({x:0,y:0,z:0});
    const system=createCreatureSystem(new THREE.Scene(),{world,RAPIER:R},null,{spawns:[{id:'observer',type,pos:{x:0,y:0,z:0},regionId:'verge',temperament:'SKITTISH',noticeRadius:7,facingYaw:0}]});
    try {
      const creature=system.getCreatures()[0], player={pos:{x:0,y:.5,z:4},mode:'SNEAK',speed:1};
      system.setPlayerState(player); system.setPlayerPos(player.pos); system.setActiveRegions(new Set(['verge']));
      const wall=world.createCollider(R.ColliderDesc.cuboid(1,2,.2).setTranslation(0,1,2)); world.step();
      assert.equal(system.hasClearSightToCreature(creature,player.pos),false);
      system.update(.01); assert.equal(creature.state.playerDetected,false,`${type} cannot see through wall`);
      wall.setSensor(true); world.step();
      assert.equal(system.hasClearSightToCreature(creature,player.pos),true,'sensor does not obscure observation');
      system.update(.01); assert.equal(creature.state.playerDetected,true,`${type} notices visible frontal sneak`);
      wall.setSensor(false); world.step(); system.setCompanionColliderFilter(c=>c.handle===wall.handle);
      assert.equal(system.hasClearSightToCreature(creature,player.pos),true,'follower collider filtered consistently');
      system.setCompanionColliderFilter(()=>false); assert.equal(system.hasClearSightToCreature(creature,player.pos),false);
      system.setActiveRegions(new Set(['other'])); assert.equal(system.hasClearSightToCreature(creature,player.pos),false);
    } finally { system.dispose();world.free(); }
  }
});
