import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { projectInteractionPoint, projectInteractionBounds, placeInteractionLabel, resolveInteractionRecord, createWorldInteractionAnchor } from '../src/ui/worldInteractionAnchor.js';

test('projection follows orbit, rejects offscreen, near-plane and behind-camera points', () => {
  const camera = new THREE.PerspectiveCamera(60, 844 / 390, .1, 60);
  camera.position.set(0, 2, 8); camera.lookAt(0, 2, 0);
  assert.deepEqual(projectInteractionPoint({x:0,y:2,z:0}, camera,844,390), {x:422,y:195});
  assert.equal(projectInteractionPoint({x:0,y:2,z:10},camera,844,390),null);
  assert.equal(projectInteractionPoint({x:0,y:2,z:7.95},camera,844,390),null);
  assert.equal(projectInteractionPoint({x:100,y:2,z:0},camera,844,390),null);
  const point={x:2,y:2,z:0}, before=projectInteractionPoint(point,camera,844,390);
  camera.position.set(8,2,0);camera.lookAt(0,2,0);
  assert.ok(Math.abs(projectInteractionPoint(point,camera,844,390).x-before.x)>50);
});
test('label retains a connection at screen edges and avoids controls, or hides when no space remains', () => {
  const bounds={left:12,top:12,right:832,bottom:378}, size={width:140,height:48};
  const placed=placeInteractionLabel({x:15,y:170},size,bounds);
  assert.equal(placed.left,12); assert.ok(placed.endX>=placed.left);
  const obstacle={left:250,right:590,top:12,bottom:95};
  const avoided=placeInteractionLabel({x:422,y:110},size,bounds,[obstacle]);
  assert.ok(avoided.top>=101);
  assert.equal(placeInteractionLabel({x:422,y:190},size,bounds,[bounds]),null);
});
test('all authored families and placed workbenches resolve the same selected ID', () => {
  const authored={id:'chosen',pos:{x:1,y:0,z:2}};
  for(const [type,getter] of Object.entries({portalGate:'getPortalGateById',gate:'getPortalGateById',majorWaypoint:'getWaypointById',extractionBeacon:'getBeaconById',lootChest:'getLootChestById'})) {
    assert.equal(resolveInteractionRecord({id:'chosen',type},{registry:{[getter]:id=>id==='chosen'?authored:null}}),authored);
  }
  assert.equal(resolveInteractionRecord({id:'chosen',type:'campSanctuary'},{registry:{data:{regions:[{props:[authored]}]}}}),authored);
  assert.equal(resolveInteractionRecord({id:'chosen',type:'resonator'},{getBase:()=>({getModel:()=>({structures:[authored]})})}),authored);
});
test('actual visual height anchors labels and live creature state continues moving without target replacement', () => {
  const scene=new THREE.Scene(), mesh=new THREE.Mesh(new THREE.BoxGeometry(2,3,2),new THREE.MeshBasicMaterial());
  mesh.name='creature';mesh.position.set(2,1.5,3);scene.add(mesh);
  const creature={state:{id:'creature',pos:{x:2,y:.5,z:3}}};
  const anchor=createWorldInteractionAnchor({scene});const info={id:'creature',type:'bond',target:creature};
  assert.ok(Math.abs(anchor.getPoint(info).y-3.18)<.001);
  creature.state.pos.x=5;assert.equal(anchor.getPoint(info).x,5);
  creature.state.isDead=true;assert.equal(anchor.getPoint(info),null);
});
test('opaque scenery hides the anchor; faded scenery and the object itself do not', () => {
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera();camera.position.set(0,1,8);camera.lookAt(0,1,0);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(3,3,1),new THREE.MeshBasicMaterial());wall.position.set(0,1,4);wall.userData.propId='wall';scene.add(wall);scene.updateMatrixWorld(true);
  const record={pos:{x:0,y:0,z:0}};
  const anchor=createWorldInteractionAnchor({scene,registry:{getLootChestById:()=>record}});
  const point=anchor.getPoint({id:'chest',type:'lootChest'});
  assert.equal(anchor.isOccluded(camera,point,.1),true);
  wall.material.opacity=.25;assert.equal(anchor.isOccluded(camera,point,.1),false);
});

test('guide-blocked creature labels use body sides, recheck clamps, and preserve a 48px target', () => {
  const bounds={left:12,top:12,right:832,bottom:378}, size={width:140,height:48};
  const body={left:360,right:484,top:100,bottom:230}, guide={left:260,right:590,top:12,bottom:94};
  const p=placeInteractionLabel({x:422,y:100},size,bounds,[guide],body);
  assert.equal(p.left,body.right+18);assert.equal(p.top,141);
  const edge={left:670,right:825,top:100,bottom:240};
  const q=placeInteractionLabel({x:740,y:100},size,bounds,[{...guide,left:600,right:832}],edge);
  assert.equal(q.left,edge.left-size.width-18);assert.ok(q.top+48<=bounds.bottom);
  assert.equal(placeInteractionLabel({x:422,y:100},size,bounds,[bounds],body),null);
  const orbitBody={left:231,right:333,top:109,bottom:233};
  const orbit=placeInteractionLabel({x:282,y:108},size,bounds,[{left:12,right:160,top:12,bottom:180},{left:257,right:587,top:12,bottom:87},{left:380,right:602,top:96,bottom:124},{left:397,right:447,top:199,bottom:272}],orbitBody);
  assert.ok(orbit);assert.ok(orbit.top>=130&&orbit.top+48<=193);
  const closeBody={left:336,right:475,top:121,bottom:227};
  const near=placeInteractionLabel({x:405,y:116},{width:189,height:48},bounds,[
    {left:257,right:587,top:12,bottom:87},{left:600,right:822,top:136,bottom:164},
    {left:12,right:173,top:122,bottom:166},{left:397,right:447,top:198,bottom:271},
    {left:660,right:832,top:239,bottom:378},{left:44,right:152,top:260,bottom:367},
  ],closeBody);
  assert.ok(near);assert.equal(near.left,493);assert.equal(near.top,170,'fits beside body just below extraction strip');
});

test('cached creature body follows live scale/yaw, excludes health/effects and clears on capture/disposal', () => {
  const scene=new THREE.Scene(),group=new THREE.Group(),visual=new THREE.Group();group.name='animal';scene.add(group);group.add(visual);
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(3,1,1),new THREE.MeshBasicMaterial());mesh.position.y=.5;visual.add(mesh);
  const health=new THREE.Mesh(new THREE.BoxGeometry(20,20,20),new THREE.MeshBasicMaterial());health.name='creatureHealthBar';group.add(health);
  const creature={group,mainMesh:mesh,state:{id:'animal',pos:new THREE.Vector3()}};
  const anchor=createWorldInteractionAnchor({scene}),info={id:'animal',type:'bond',target:creature};
  const camera=new THREE.PerspectiveCamera(60,844/390,.1,60);camera.position.set(0,2,9);camera.lookAt(0,.5,0);
  anchor.getPoint(info);const first={...anchor.getBodyRectangle(camera,844,390)};
  assert.ok(first.right-first.left<200,'unrelated health geometry excluded');
  visual.traverse=()=>{throw new Error('body must not be traversed after selection');};
  group.rotation.y=Math.PI/2;group.scale.setScalar(.9);group.position.x=1;group.updateMatrixWorld(true);
  const moved=anchor.getBodyRectangle(camera,844,390);assert.ok(moved.right-moved.left<first.right-first.left);assert.ok(moved.left>first.left);
  creature.state.bondCaptured=true;assert.equal(anchor.getPoint(info),null);assert.equal(anchor.getBodyRectangle(camera,844,390),null);
  creature.state.bondCaptured=false;group.removeFromParent();assert.equal(anchor.getBodyRectangle(camera,844,390),null);
});

test('bounds projection rejects near-plane/offscreen envelopes without changing point projection', () => {
  const camera=new THREE.PerspectiveCamera(60,844/390,.1,60);camera.position.set(0,0,5);camera.lookAt(0,0,0);
  const box=new THREE.Box3(new THREE.Vector3(-1,-1,-1),new THREE.Vector3(1,1,1));
  assert.ok(projectInteractionBounds(box,new THREE.Matrix4(),camera,844,390));
  assert.equal(projectInteractionBounds(box,new THREE.Matrix4().makeTranslation(0,0,4.5),camera,844,390),null);
  assert.equal(projectInteractionBounds(box,new THREE.Matrix4().makeTranslation(100,0,0),camera,844,390),null);
});
