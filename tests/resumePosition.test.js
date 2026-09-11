import test from 'node:test';
import assert from 'node:assert/strict';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { createCharacterPhysics } from '../src/physics/createCharacterPhysics.js';
import { findSupportedResumeFeet } from '../src/session/resumePosition.js';

test('resume uses real support and full capsule clearance, excluding self/sensors and rejecting hazards', async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
 world.createCollider(RAPIER.ColliderDesc.cuboid(8,.25,8).setTranslation(0,-.25,0));
 const characterPhysics=createCharacterPhysics(RAPIER,world,{x:0,y:.54,z:0});
 world.createCollider(RAPIER.ColliderDesc.cuboid(1,1,1).setTranslation(0,.8,0).setSensor(true));world.step();
 const section={bounds:{minX:-8,maxX:8,minZ:-8,maxZ:8}}, check=(feet,killVolumes=[])=>findSupportedResumeFeet({feet,section,characterPhysics,killVolumes});
 const ground=check({x:0,y:.02,z:0});assert.ok(ground);assert.ok(Math.abs(ground.y)<.001);
 const block=world.createCollider(RAPIER.ColliderDesc.cuboid(.5,.5,.5).setTranslation(0,.5,0));world.step();
 assert.equal(check({x:0,y:0,z:0}),null);
 const raised=check({x:0,y:1,z:0});assert.ok(raised);assert.ok(Math.abs(raised.y-1)<.001);
 assert.equal(check({x:0,y:3,z:0}),null);assert.equal(check({x:9,y:0,z:0}),null);
 world.removeCollider(block,true);world.step();
 assert.equal(check({x:0,y:0,z:0},[{pos:{x:0,y:.3,z:0},size:{w:2,h:1,d:2},rotY:.3}]),null);
 world.free();
});
