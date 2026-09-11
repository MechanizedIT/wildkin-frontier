import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {WORLD_DATA} from './fixtures/crescentWorld.generated.js';
import {validateConvexCollider, getCollisionBounds} from '../src/world/convexCollider.js';
import {normalizeWorldData} from '../src/world/worldValidator.js';
import {describeVisualAssetCollider, getColliderCenter} from '../src/world/colliderDescriptor.js';
import {createAuthorDraft} from '../src/author/authorDraft.js';
import {applyColliderProxyTransform, previewColliderDescriptor, syncEditProxy} from '../src/author/authorPreview.js';
import {createStaticWorld} from '../src/world/staticWorldBuilder.js';
import {createPhysicsWorld} from '../src/physics/createPhysicsWorld.js';
import {getCampReserved} from '../src/base/basePlacement.js';

// Clipped northeast corner and a genuinely sloped crown: its box is deliberately wrong.
function hull() {
  const plan=[[0,0],[2,0],[2,.8],[.8,2],[0,2]], vertices=[], indices=[];
  for(const [x,z] of plan)vertices.push(x,0,z);
  for(const [x,z] of plan)vertices.push(x,.6+.5*x,z);
  for(let i=1;i<4;i++)indices.push(0,i,i+1,5,5+i+1,5+i);
  for(let i=0;i<5;i++){const j=(i+1)%5;indices.push(i,5+j,j,i,5+i,5+j);}
  return {shape:'convexHull',vertices,indices,offset:{x:.2,y:.1,z:-.3}};
}
function fixture() {
  const data=structuredClone(WORLD_DATA), region=data.regions[0], collision=hull();
  const asset={id:'asset_test_outcrop',displayName:'Outcrop',version:1,category:'Test',gameplay:{role:'prop'},collision,
    parts:[{id:'body',shape:'mesh',geometry:{positions:collision.vertices,indices:collision.indices},
      position:{...collision.offset},rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1},color:'#667777'}]};
  data.visualAssets??=[];data.visualAssets.push(asset);
  region.props.push({id:'test_outcrop',subtype:'visualAsset',visualAssetId:asset.id,
    pos:{x:(region.bounds.minX+region.bounds.maxX)/2,y:0,z:(region.bounds.minZ+region.bounds.maxZ)/2},
    uniformScale:.8,rotY:.7,visibleInPlay:false,collisionEnabled:true});
  return data;
}
test('only closed outward convex fixed-prop hulls enter the asset registry',()=>{
  validateConvexCollider(hull());normalizeWorldData(fixture());
  for(const mutate of [c=>c.indices.pop(),c=>c.indices.splice(0,3),c=>c.vertices[0]=NaN,
    c=>c.indices[0]=200,c=>c.vertices.splice(15,3,...c.vertices.slice(0,3)),
    c=>{c.vertices[18]=.3;c.vertices[19]=.2;c.vertices[20]=.3;},
    c=>{for(let i=1;i<c.vertices.length;i+=3)c.vertices[i]=0;}]) {
    const collision=hull();mutate(collision);assert.throws(()=>validateConvexCollider(collision));
  }
  for(const role of ['wildkin','harvestable']){const data=fixture();data.visualAssets.at(-1).gameplay={role};assert.throws(()=>normalizeWorldData(data),/fixed prop/);}
});
test('hull scale/yaw/offset survive Author export, hidden proxy and runtime without a second box',()=>{
  const draft=createAuthorDraft(fixture()), found=draft.findObjectById('test_outcrop');
  const pos={...found.obj.pos,y:1.2};
  assert.ok(draft.updateNormalizedTransform('test_outcrop',{position:pos,rotationY:1.1,uniformScale:1.4}).ok);
  const current=draft.findObjectById('test_outcrop'), collision=current.visualAssets.find(a=>a.id==='asset_test_outcrop').collision;
  const scene=new THREE.Scene(), proxy=syncEditProxy(scene,current,true);
  assert(proxy?.visible);assert.equal(proxy.geometry.attributes.position.count,10);
  const preview=previewColliderDescriptor(current,{position:pos,rotationY:.4,uniformScale:.6});
  applyColliderProxyTransform(proxy,preview);proxy.updateMatrixWorld();
  const actual=new THREE.Vector3().fromBufferAttribute(proxy.geometry.attributes.position,6).applyMatrix4(proxy.matrixWorld);
  const expected=new THREE.Vector3(2+collision.offset.x,1.6+collision.offset.y,collision.offset.z).multiplyScalar(.6).applyAxisAngle(new THREE.Vector3(0,1,0),.4).add(new THREE.Vector3(pos.x,pos.y,pos.z));
  assert(actual.distanceTo(expected)<1e-6);
  const data=normalizeWorldData(JSON.parse(draft.exportStableJson()));
  assert.deepEqual(data.visualAssets.find(a=>a.id==='asset_test_outcrop').collision,collision);
  const built=createStaticWorld(data), obstacles=built.obstacles.filter(o=>o.id==='test_outcrop');
  assert.equal(obstacles.length,1);assert.equal(obstacles[0].collider.shape,'convexHull');
  assert.equal(obstacles[0].rotY,1.1);assert.equal(built.group.getObjectByName('test_outcrop').visible,false);
  current.obj.collisionEnabled=false;assert.equal(syncEditProxy(scene,current,true)?.visible,false);
  data.regions[0].props.find(p=>p.id==='test_outcrop').collisionEnabled=false;
  assert.equal(createStaticWorld(data).obstacles.some(o=>o.id==='test_outcrop'),false);
});
test('real Rapier hull leaves clipped corner clear, supports its sloped top and follows region activation',async()=>{
  await RAPIER.init();
  const collision=hull(), pos={x:5,y:0,z:5}, scale=.8, yaw=.7;
  const desc=describeVisualAssetCollider({collision,position:pos,uniformScale:scale,rotationY:yaw}), center=getColliderCenter(desc);
  const o={id:'hull',collider:desc,x:center.x,z:center.z,w:desc.size.width,h:desc.size.depth,height:desc.size.height,baseY:center.y-desc.size.height/2,rotY:yaw,sectionId:'A'};
  const physics=createPhysicsWorld(RAPIER,{obstacles:[o],platforms:[],groundPatches:[],boundaries:[]});
  const collider=physics.staticColliders.find(c=>physics.colliderSections.get(c)==='A');
  const worldPoint=(x,y,z)=>new THREE.Vector3(x+collision.offset.x,y+collision.offset.y,z+collision.offset.z).multiplyScalar(scale).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(new THREE.Vector3(pos.x,pos.y,pos.z));
  const rayAt=(x,z)=>{const p=worldPoint(x,0,z);p.y=5;return new RAPIER.Ray(p,{x:0,y:-1,z:0});};
  const query=ray=>physics.world.castRay(ray,10,true,undefined,undefined,undefined,undefined,c=>c.handle===collider.handle);
  physics.setActiveSection('A');
  assert.equal(query(rayAt(1.85,1.85)),null,'missing corner must not inherit its bounding box');
  const hit=query(rayAt(1,.5));assert(hit);assert(Math.abs((5-hit.timeOfImpact)-(.1+1.1)*scale)<1e-4,'support must follow the sloped crown');
  physics.setActiveSection('B');assert.equal(query(rayAt(1,.5)),null);
  physics.setActiveSection('A');assert(query(rayAt(1,.5)));
  physics.world.free();
});
test('Camp clearance uses conservative derived hull bounds and the rotated offset',()=>{
  const collision=hull(), bounds=getCollisionBounds(collision), pos={x:3,y:0,z:4};
  const reserved=getCampReserved({data:{visualAssets:[{id:'rock',collision}]},getSectionById:()=>({props:[{id:'outcrop',visualAssetId:'rock',pos,uniformScale:2,rotY:Math.PI/2}]}),getCampSpawnPosition:()=>({x:0,z:0})});
  assert.equal(reserved[0].radius,Math.hypot(bounds.size.w,bounds.size.d));
  assert(Math.abs(reserved[0].pos.x-(pos.x+bounds.offset.z*2))<1e-6);
  assert(Math.abs(reserved[0].pos.z-(pos.z-bounds.offset.x*2))<1e-6);
});
