import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import WORLD_DATA from '../src/world/data/world.js';
import { createWorldRegistry } from '../src/world/worldRegistry.js';
import { createFrontierProgress } from '../src/save/frontierProgress.js';
import { createBaseSystem } from '../src/base/baseSystem.js';
import { initializePlayerOcclusion } from '../src/presentation/playerOcclusion.js';
import { CAMP_DEBRIS_IDS } from '../src/base/campLayout.js';
import { registerModelTemplateForTests, clearModelAssetCacheForTests } from '../src/assets/modelAssetRuntime.js';

test('Camp runtime preserves doorway opening and owns collider travel/removal/disposal lifecycle',async()=>{
  await RAPIER.init();
  // Warm Rapier's first-step runtime before installing a tiny DOM-only stub.
  const world=new RAPIER.World({x:0,y:0,z:0});world.step();
  const oldWindow=global.window,oldDocument=global.document;
  const element=()=>({hidden:false,classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},removeEventListener(){},append(){},remove(){},querySelector(){return element();}});
  global.window={addEventListener(){},removeEventListener(){}};global.document={createElement:element,addEventListener(){},removeEventListener(){}};
  let base;
  try{
    // This fixture tests construction lifecycle, not art; native review uses the GLB.
    const template=new THREE.Group();template.add(new THREE.Mesh(new THREE.BoxGeometry(2.8,1.7,.4),new THREE.MeshLambertMaterial()));
    registerModelTemplateForTests('assets/models/emergency-barricade-v1/model.glb',{scene:template,animations:[]});
    const registry=createWorldRegistry(WORLD_DATA),progress=createFrontierProgress({worldRegistry:registry,resourceDrops:WORLD_DATA.resourceDrops,isAuthorMode:true,inMemoryAuthor:true});
    const supplies={wood:18,stone:12,fiber:4};
    assert.deepEqual(progress.collectResources(supplies).added,supplies);
    assert.equal(progress.getInventoryState().pack.length,16);
    for(const id of CAMP_DEBRIS_IDS)assert.equal(progress.clearCampDebris(id).cleared,true);
    assert.equal(progress.expandBase().expanded,true);
    assert.equal(progress.placeStructure({id:'build_door',type:'doorway',pos:{x:0,z:18},yaw:0}).placed,true);
    assert.equal(progress.placeStructure({id:'build_lantern',type:'lantern',pos:{x:4,z:18},yaw:0}).placed,true);
    let camp=true;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),cameraColliders=new Set();
    const physicsWorld={world,RAPIER,cameraColliders,registerCameraCollider:collider=>cameraColliders.add(collider),unregisterCameraCollider:collider=>cameraColliders.delete(collider)};
    const occlusion=initializePlayerOcclusion({scene,camera,getPlayerPosition:()=>({x:0,y:0,z:14})});
    base=createBaseSystem({app:element(),scene,camera,progress,registry,physicsWorld,getPlayerState:()=>({pos:{x:0,y:0,z:14}}),isCamp:()=>camp,onVisualAdded:occlusion.register,onVisualRemoving:occlusion.unregister});
    base.update(.4);world.step();
    const defenseRoots=scene.getObjectByName('camp-defenses').children.length,defenseColliders=world.colliders.len()-4;
    assert.ok(defenseColliders>0);assert.equal(occlusion.candidateCount,defenseRoots+2,'construction and defenses register after visibility initialization');
    assert.equal(cameraColliders.size,world.colliders.len(),'only solid construction, defenses and console join camera collision');
    assert.equal(world.castRay(new RAPIER.Ray({x:0,y:1,z:16},{x:0,y:0,z:1}),4,true),null,'The doorway center is physically open');
    assert.ok(world.castRay(new RAPIER.Ray({x:1.09,y:1,z:16},{x:0,y:0,z:1}),4,true),'The visible doorway post is solid');
    assert.equal(base.open('foundation').ok,true);assert.equal(base.isBlocking(),true);
    const enabled=()=>{const flags=[];world.forEachCollider(c=>flags.push(c.isEnabled()));return flags;};
    camp=false;base.update(.4);assert.equal(base.isBlocking(),false);assert.ok(enabled().every(v=>!v));
    camp=true;base.update(.4);assert.ok(enabled().every(Boolean));
    base.update(0,{hidden:true});assert.ok(enabled().every(v=>!v));assert.equal(scene.getObjectByName('player-base').visible,false,'Author mode hides all player construction');
    base.update(0,{hidden:false});assert.ok(enabled().every(Boolean));
    assert.equal(base.onAction('removeStructure','build_door').ok,true);assert.equal(world.colliders.len(),defenseColliders+1);assert.equal(cameraColliders.size,world.colliders.len());
    assert.equal(occlusion.candidateCount,defenseRoots+1,'removal releases the same presentation root');
    base.dispose();base=null;assert.equal(world.colliders.len(),0);assert.equal(cameraColliders.size,0);assert.equal(scene.children.length,0);
    assert.equal(occlusion.candidateCount,0);occlusion.dispose();
  }finally{try{base?.dispose();world.free();}catch{}clearModelAssetCacheForTests();global.window=oldWindow;global.document=oldDocument;}
});
