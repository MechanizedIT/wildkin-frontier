import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { registerModelTemplateForTests, clearModelAssetCacheForTests } from '../src/assets/modelAssetRuntime.js';
import { createResourceSystem, createRuntimeResourcePlacements } from '../src/resources/resourceSystem.js';

test('articulated resources isolate feedback, retain exact remnants and restore safely', async () => {
  await RAPIER.init();
  const world = new RAPIER.World({x:0,y:0,z:0});
  const scene = new THREE.Group(), material = new THREE.MeshLambertMaterial({color:0x6e5341,emissive:0x040302});
  material.map = new THREE.Texture();
  const geometry = new THREE.BoxGeometry(.2,.2,.2);
  const stump = new THREE.Mesh(geometry,material);stump.name='TreeStump';stump.position.set(.1,.2,0);scene.add(stump);
  for(let i=0;i<5;i++){
    const assembly=new THREE.Group();assembly.name=`tree_chunk_${i}`;
    const branch=new THREE.Mesh(geometry,material);branch.position.y=.5+i*.2;assembly.add(branch);scene.add(assembly);
  }
  const asset={id:'test_sapwood',displayName:'Sapwood',model:{path:'assets/models/test-sapwood/model.glb'},gameplay:{role:'harvestable',harvestable:{dropId:'wood',maxChunks:5,respawnSeconds:18,feedbackProfile:'wood'}},collision:{shape:'box',offset:{x:0,y:.26,z:0},size:{w:1.16,h:.52,d:1.16}}};
  registerModelTemplateForTests(asset.model.path,{scene,animations:[]});
  try {
    const system=createResourceSystem(new THREE.Scene(),{world,RAPIER},createRuntimeResourcePlacements([
      {id:'first',type:'tree',regionId:'A',pos:{x:3,y:0,z:4},rotY:.7,uniformScale:1.2,opacity:.65,visualAsset:asset},
      {id:'second',type:'tree',regionId:'A',pos:{x:8,y:0,z:4},visualAsset:asset},
    ]));
    const [first,second]=system.nodes;
    assert.equal(first.chunkMeshes.length,5,'named assemblies exclude the permanent root');
    const firstMat=first.chunkMeshes[0].children[0].material, secondMat=second.chunkMeshes[0].children[0].material;
    assert.notEqual(firstMat,secondMat);assert.notEqual(firstMat,material);
    assert.equal(firstMat,first.chunkMeshes[1].children[0].material,'one palette material per instance');
    assert.equal(firstMat.map,material.map,'textures remain shared');
    first.group.updateMatrixWorld(true);
    assert.ok(first.visualRoot.getObjectByName('TreeStump').getWorldPosition(new THREE.Vector3()).distanceTo(first.remnantMesh.getWorldPosition(new THREE.Vector3()))<1e-6);
    system.applyHit(first);system.update(.04,{x:20,y:.5,z:20},'IDLE');
    assert.equal(first.chunkMeshes.filter(x=>x.visible).length,4);
    assert.equal(firstMat.emissive.getHex(),0x333333);assert.equal(secondMat.emissive.getHex(),0x040302);
    for(let i=0;i<4;i++)system.applyHit(first);
    assert.equal(first.visualRoot.visible,false);assert.equal(first.remnantMesh.visible,true);assert.equal(first.collider,null);
    assert.equal(second.chunkMeshes.filter(x=>x.visible).length,5);
    system.update(18.1,{x:3,y:.5,z:4},'IDLE');
    assert.equal(first.visualRoot.visible,true);assert.equal(first.remnantMesh.visible,false);
    assert.equal(first.collider,null,'occupied regrowth cannot insert a solid under the player');
    assert.equal(first.chunkMeshes.filter(x=>x.visible).length,5);assert.equal(firstMat.opacity,.65);
    assert.equal(firstMat.emissive.getHex(),0x040302,'feedback restores the authored emissive');
    system.update(.1,{x:20,y:.5,z:20},'IDLE');assert.ok(first.collider);
    for(let i=0;i<5;i++)system.applyHit(first);
    system.resetDepleted();
    assert.equal(first.state.nodeState,'READY');assert.equal(first.visualRoot.visible,true);
    assert.equal(first.remnantMesh.visible,false);assert.equal(first.chunkMeshes.filter(x=>x.visible).length,5);
    system.setActiveRegions(new Set(['A']));
    for(let i=0;i<5;i++)system.applyHit(first);
    system.setActiveRegions(new Set(['B']));system.resetDepleted();
    system.setActiveRegions(new Set(['A']));system.update(.1,{x:20,y:.5,z:20},'IDLE');
    assert.ok(first.collider,'a depleted offscreen node also regains collision on a later expedition');
    first.visibleInPlay=false;system.update(.1,{x:20,y:.5,z:20},'IDLE');assert.equal(first.group.visible,false);
  } finally {world.free();clearModelAssetCacheForTests();}
});

test('unnamed legacy resource parts deplete proportionally to their authored hit count', () => {
  const asset={id:'legacy_resource',displayName:'Legacy',gameplay:{role:'harvestable',harvestable:{dropId:'fiber',maxChunks:3,respawnSeconds:12,feedbackProfile:'fiber'}},parts:Array.from({length:9},(_,i)=>({id:`piece${i}`,shape:'box',color:'#77aa66',position:{x:i*.03,y:.2,z:0},rotation:{x:0,y:0,z:0},scale:{x:.1,y:.2,z:.1}}))};
  const system=createResourceSystem(new THREE.Scene(),{},createRuntimeResourcePlacements([{id:'legacy',type:'fiber',pos:{x:0,y:0,z:0},visualAsset:asset}]));
  const node=system.nodes[0];
  for(const remaining of [6,3,0]){system.applyHit(node);assert.equal(node.chunkMeshes.filter(x=>x.visible).length,remaining);}
  assert.equal(node.visualRoot.visible,false);
});
