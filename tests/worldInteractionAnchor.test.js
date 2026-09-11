import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { projectInteractionPoint, placeInteractionLabel, resolveInteractionRecord, createWorldInteractionAnchor } from '../src/ui/worldInteractionAnchor.js';

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
