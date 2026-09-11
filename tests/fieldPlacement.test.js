import {test} from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {findFieldPlacement} from '../src/companions/fieldTamingVisual.js';

test('field gear checks the creature capsule route, not just the player and landing point', async () => {
  await R.init();
  const world = new R.World({x:0,y:0,z:0});
  try {
    world.createCollider(R.ColliderDesc.cuboid(20,.25,20).setTranslation(0,-.25,0));
    const collider = world.createCollider(R.ColliderDesc.capsule(.16,.3).setTranslation(0,.48,4.5));
    const target = {collider, state:{pos:{x:0,y:.48,z:4.5}}};
    const options = {player:{pos:{x:0,y:.6,z:0},facing:0},target,registry:{getSectionById:()=>({})},sectionId:'field',physicsWorld:{world,RAPIER:R},ignoreCollider:c=>c.handle===collider.handle};
    world.step();
    assert.deepEqual(findFieldPlacement(options),{x:0,z:1.5,y:0},'open ground stays usable and floor contact does not block');
    const root = world.createCollider(R.ColliderDesc.cuboid(.58,.26,.58).setTranslation(0,.26,3));
    world.step();
    assert.equal(findFieldPlacement(options),null,'Sapwood-sized root blocks every direct creature approach in this arc');
    assert.ok(findFieldPlacement({...options,target:undefined}),'the old player-only query would accept this bad attempt');
    world.removeCollider(root,true);
    const thinPost=world.createCollider(R.ColliderDesc.cuboid(.08,.6,.08).setTranslation(0,.6,3));
    world.step();
    const side=findFieldPlacement(options);
    assert.ok(side && Math.abs(side.x)>.5,'a reachable side patch is preferred to spending on the blocked center');
    world.removeCollider(thinPost,true);
    const sensor=world.createCollider(R.ColliderDesc.cuboid(3,2,.2).setTranslation(0,1,3).setSensor(true));
    world.step();
    assert.ok(findFieldPlacement(options),'non-solid region sensors do not block the wildlife route');
    world.removeCollider(sensor,true);
    world.createCollider(R.ColliderDesc.cuboid(3,2,1).setTranslation(0,1,1).setSensor(true));
    world.step();
    assert.ok(findFieldPlacement(options),'a trigger covering the throw and landing patch is also non-solid');
    assert.ok(findFieldPlacement({...options,secondPerch:true}),'the same route check supports the second chime perch');
  } finally { world.free(); }
});
