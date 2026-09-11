import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {VISUAL_KIT_BUILDERS} from '../tools/visual-kit-registry.mjs';
import {FOUNDRY_HABITAT_ASSET_IDS} from '../tools/compose-foundry-habitat.mjs';
import {facetedRings,chippedBox} from '../src/world/facetedMeshKit.js';
import {createVisual,applyVisualTransform,createVisualAssetVisual} from '../src/world/visualFactory.js';
import {createResourceNode,hideOneChunk,showAllChunks} from '../src/resources/createResourceNode.js';
import {createPlayer} from '../src/player/createPlayer.js';
import {createFieldTool} from '../src/tools/fieldTool.js';

test('every Author asset has a maintained mesh kit or a local model, and kit transforms stay finite',()=>{
  const world=JSON.parse(fs.readFileSync(new URL('../src/world/data/world.json',import.meta.url),'utf8'));
  assert.deepEqual([...VISUAL_KIT_BUILDERS.keys()].sort(),world.visualAssets.filter(a=>VISUAL_KIT_BUILDERS.has(a.id)).map(a=>a.id).sort());
  const builders=new Map(VISUAL_KIT_BUILDERS);
  for(const id of FOUNDRY_HABITAT_ASSET_IDS){
    const asset=world.visualAssets.find(a=>a.id===id);
    assert.ok(asset?.parts?.length,`${id} maintained composer recipe`);
    builders.set(id,()=>createVisualAssetVisual(asset));
  }
  for(const asset of world.visualAssets){
    if(builders.has(asset.id))continue;
    assert.match(asset.model?.path??'',/^assets\/models\/[^.][\w/-]*\.glb$/,`${asset.id} must have a local model when no primitive kit exists`);
    const bytes=fs.readFileSync(new URL(`../${asset.model.path}`,import.meta.url));
    assert.equal(bytes.readUInt32LE(0),0x46546c67,`${asset.id} GLB header`);
    assert.equal(bytes.readUInt32LE(8),bytes.length,`${asset.id} complete GLB`);
  }
  for(const[id,build]of builders){const root=build(id);assert.ok(root,id);root.updateMatrixWorld(true);let count=0;
    root.traverse(node=>{if(!node.isMesh)return;count++;assert.ok(node.matrixWorld.elements.every(Number.isFinite),`${id}/${node.name} matrix`);assert.ok(Math.abs(node.matrixWorld.determinant())>1e-9,`${id}/${node.name} must not disappear from a zero scale`);assert.ok(node.geometry.attributes.position.array.every(Number.isFinite),`${id}/${node.name} geometry`);});assert.ok(count>0,id);
  }
});
test('closed faceted meshes face outward on both caps',()=>{
  for(const geometry of[facetedRings([[0,1],[1,1]],8),chippedBox(2,1,2)]){
    const p=geometry.attributes.position,i=geometry.index.array,b=new THREE.Box3().setFromBufferAttribute(p),a=new THREE.Vector3(),v=new THREE.Vector3(),c=new THREE.Vector3();let top=0,bottom=0;
    for(let n=0;n<i.length;n+=3){a.fromBufferAttribute(p,i[n]);v.fromBufferAttribute(p,i[n+1]);c.fromBufferAttribute(p,i[n+2]);const y=a.y;if(Math.abs(v.y-y)>1e-6||Math.abs(c.y-y)>1e-6)continue;const normal=v.sub(a).cross(c.sub(a));if(Math.abs(y-b.max.y)<1e-6){assert.ok(normal.y>0);top++;}if(Math.abs(y-b.min.y)<1e-6){assert.ok(normal.y<0);bottom++;}}
    assert.ok(top&&bottom);
  }
});
test('resource visual rebuild retains the harvest chunk contract and Author/runtime bounds',()=>{
  for(const[type,prefix,count]of[['tree','tree_chunk_',5],['rock','rock_chunk_',4],['fiber','fiber_tuft_',3]]){
    const direct=createVisual({kind:'builtin',id:`resource/${type}`},{objectId:'parity'}),runtime=createResourceNode(type,{x:0,y:0,z:0},0,'parity');
    const chunks=[];direct.traverse(n=>{if(n.isMesh&&n.name.startsWith(prefix))chunks.push(n);});assert.equal(chunks.length,count);
    assert.ok(runtime.group.getObjectByName('resourceReadyVisual'));
    const a=new THREE.Box3().setFromObject(direct),b=new THREE.Box3().setFromObject(runtime.group.getObjectByName('resourceReadyVisual'));assert.ok(a.min.distanceTo(b.min)<1e-6&&a.max.distanceTo(b.max)<1e-6);
    for(let i=0;i<count;i++)assert.ok(hideOneChunk(runtime));assert.equal(hideOneChunk(runtime),null);showAllChunks(runtime);assert.equal(runtime.chunkMeshes.filter(m=>m.visible).length,count);
  }
});
test('explorer rig and equipped tool instantiate with bounded geometry and preserved gait anchors',()=>{
  const player=createPlayer();for(const name of['leftLeg','rightLeg','leftArm'])assert.ok(player.getObjectByName(name));const tool=createFieldTool(player);assert.ok(tool.handAnchor&&tool.head);player.updateMatrixWorld(true);player.traverse(n=>{assert.ok(n.matrixWorld.elements.every(Number.isFinite));});
});
test('builtin dimensional fits survive authored placement for either fence axis and scaled machines',()=>{
  for(const size of[{w:.5,h:1.3,d:28},{w:28,h:1.3,d:.5}]){
    const root=createVisual({kind:'builtin',id:'prop/fence'},{size});const before=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());applyVisualTransform(root,{position:{x:2,y:0,z:3},rotationY:0,uniformScale:1,sizeMode:'uniform'});const after=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());assert.ok(before.distanceTo(after)<1e-5);assert.ok(size.w>size.d?after.x>after.z*10:after.z>after.x*10);
  }
  for(const id of['prop/dropPod','prop/gate','prop/resonator']){const size={width:3,height:2,depth:2.5},root=createVisual({kind:'builtin',id},{size});const before=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());applyVisualTransform(root,{position:{x:1,y:0,z:2},rotationY:0,uniformScale:1,sizeMode:'uniform'});const after=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());assert.ok(before.distanceTo(after)<1e-5,id);}
});
