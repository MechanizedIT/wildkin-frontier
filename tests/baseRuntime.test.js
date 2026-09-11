import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import WORLD_DATA from '../src/world/data/world.js';
import { createWorldRegistry } from '../src/world/worldRegistry.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createBaseSystem } from '../src/base/baseSystem.js';
import { initializePlayerOcclusion } from '../src/presentation/playerOcclusion.js';

test('Camp runtime preserves doorway opening and owns collider travel/removal/disposal lifecycle',async()=>{
  await RAPIER.init();
  // Warm Rapier's first-step runtime before installing a tiny DOM-only stub.
  const world=new RAPIER.World({x:0,y:0,z:0});world.step();
  const oldWindow=global.window,oldDocument=global.document;
  const element=()=>({hidden:false,classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},removeEventListener(){},append(){},remove(){},querySelector(){return element();}});
  global.window={addEventListener(){},removeEventListener(){}};global.document={createElement:element,addEventListener(){},removeEventListener(){}};
  let base;
  try{
    const registry=createWorldRegistry(WORLD_DATA),progress=createFrontierProgress({worldRegistry:registry,resourceDrops:WORLD_DATA.resourceDrops,isAuthorMode:true,inMemoryAuthor:true});
    progress.bankRun({wood:100,stone:100,fiber:100},0,'test');
    assert.equal(progress.placeStructure({id:'build_door',type:'doorway',pos:{x:0,z:18},yaw:0}).placed,true);
    assert.equal(progress.placeStructure({id:'build_lantern',type:'lantern',pos:{x:4,z:18},yaw:0}).placed,true);
    let camp=true;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
    const occlusion=initializePlayerOcclusion({scene,camera,getPlayerPosition:()=>({x:0,y:0,z:14})});
    base=createBaseSystem({app:element(),scene,camera,progress,registry,physicsWorld:{world,RAPIER},getPlayerState:()=>({pos:{x:0,y:0,z:14}}),isCamp:()=>camp,onVisualAdded:occlusion.register,onVisualRemoving:occlusion.unregister});
    base.update(.4);world.step();
    assert.equal(occlusion.candidateCount,2,'saved construction registers after visibility system initialization');
    assert.equal(world.colliders.len(),4);
    assert.equal(world.castRay(new RAPIER.Ray({x:0,y:1,z:16},{x:0,y:0,z:1}),4,true),null,'The doorway center is physically open');
    assert.ok(world.castRay(new RAPIER.Ray({x:1.09,y:1,z:16},{x:0,y:0,z:1}),4,true),'The visible doorway post is solid');
    assert.equal(base.open('foundation').ok,true);assert.equal(base.isBlocking(),true);
    const enabled=()=>{const flags=[];world.forEachCollider(c=>flags.push(c.isEnabled()));return flags;};
    camp=false;base.update(.4);assert.equal(base.isBlocking(),false);assert.deepEqual(enabled(),[false,false,false,false]);
    camp=true;base.update(.4);assert.deepEqual(enabled(),[true,true,true,true]);
    base.update(0,{hidden:true});assert.deepEqual(enabled(),[false,false,false,false]);assert.equal(scene.getObjectByName('player-base').visible,false,'Author mode hides all player construction');
    base.update(0,{hidden:false});assert.deepEqual(enabled(),[true,true,true,true]);
    assert.equal(base.onAction('removeStructure','build_door').ok,true);assert.equal(world.colliders.len(),1);
    assert.equal(occlusion.candidateCount,1,'removal releases the same presentation root');
    base.dispose();base=null;assert.equal(world.colliders.len(),0);assert.equal(scene.children.length,0);
    assert.equal(occlusion.candidateCount,0);occlusion.dispose();
  }finally{try{base?.dispose();world.free();}catch{}global.window=oldWindow;global.document=oldDocument;}
});
