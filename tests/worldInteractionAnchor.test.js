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

test('a moving label retains its valid side when preferred space opens, but never crosses body or HUD',()=>{
  const bounds={left:12,top:12,right:832,bottom:378},size={width:140,height:48};
  const body={left:360,right:484,top:100,bottom:230},point={x:422,y:100};
  const first=placeInteractionLabel(point,size,bounds,[{left:260,right:590,top:12,bottom:94}],body);
  assert.equal(first.left,502);
  const movedBody={left:361,right:485,top:101,bottom:231};
  const preferred={left:first.left+1,top:first.top+1};
  const moved=placeInteractionLabel({x:423,y:101},size,bounds,[],movedBody,preferred);
  assert.equal(moved.left,preferred.left);assert.equal(moved.top,preferred.top,'no jump back above on a one-pixel move');
  const blocked=placeInteractionLabel({x:423,y:101},size,bounds,[{left:490,right:700,top:80,bottom:250}],movedBody,preferred);
  assert.ok(blocked);assert.notEqual(blocked.left,preferred.left,'new obstruction wins over continuity');
  const overlap=placeInteractionLabel(point,size,bounds,[],body,{left:360,top:130});
  assert.notEqual(overlap.top,130,'preferred placement cannot sit on animal');
});
test('all authored families and placed workbenches resolve the same selected ID', () => {
  const authored={id:'chosen',pos:{x:1,y:0,z:2}};
  for(const [type,getter] of Object.entries({portalGate:'getPortalGateById',gate:'getPortalGateById',majorWaypoint:'getWaypointById',extractionBeacon:'getBeaconById',lootChest:'getLootChestById'})) {
    assert.equal(resolveInteractionRecord({id:'chosen',type},{registry:{[getter]:id=>id==='chosen'?authored:null}}),authored);
  }
  assert.equal(resolveInteractionRecord({id:'chosen',type:'campSanctuary'},{registry:{data:{regions:[{props:[authored]}]}}}),authored);
  assert.equal(resolveInteractionRecord({id:'chosen',type:'resonator'},{getBase:()=>({getModel:()=>({structures:[authored]})})}),authored);
  assert.deepEqual(resolveInteractionRecord({id:'camp-yard-console',type:'campYard'},{getBase:()=>({getCampYardAnchor:()=>authored.pos})}),{pos:authored.pos});
  assert.equal(resolveInteractionRecord({id:'camp-yard-console',type:'campYard'},{getBase:()=>({getCampYardAnchor:()=>null})}),null);
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
  wall.material.opacity=1;wall.removeFromParent();
  assert.equal(anchor.isOccluded(camera,point,.1),false,'a retired cached occluder cannot keep blocking LOS');
});

test('nested prop metadata cannot admit the selected storage body before its root exclusion', () => {
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,1,8);
  const root=new THREE.Group(),nested=new THREE.Group();root.name='pod';nested.userData.propId='pod';root.add(nested);scene.add(root);
  const body=new THREE.Mesh(new THREE.BoxGeometry(2,2,4),new THREE.MeshBasicMaterial());body.position.y=1;nested.add(body);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(3,3,.4),new THREE.MeshBasicMaterial());wall.position.set(0,1.5,4);wall.userData.propId='neighbor';wall.material.opacity=.25;scene.add(wall);scene.updateMatrixWorld(true);
  const record={id:'pod',pos:{x:0,y:0,z:0}},anchor=createWorldInteractionAnchor({scene,registry:{data:{regions:[{props:[record]}]}}});
  const point=anchor.getPoint({type:'storage',id:'pod'});
  const ray=new THREE.Raycaster(camera.position,point.clone().sub(camera.position).normalize());
  assert.ok(ray.intersectObject(body).length,'the chosen view really intersects the selected body');
  assert.equal(anchor.isOccluded(camera,point,.1),false,'selected root wins over lower prop metadata');
  wall.material.opacity=1;assert.equal(anchor.isOccluded(camera,point,.1),true,'independent solid scenery still blocks');
  wall.visible=false;assert.equal(anchor.isOccluded(camera,point,.1),false,'hidden sibling does not block');
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

test('creature anchor is correct before the first visual-root position sync', () => {
  const scene=new THREE.Scene(),group=new THREE.Group(),visual=new THREE.Group();group.name='generated';group.add(visual);scene.add(group);
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial());mesh.position.y=1;visual.add(mesh);
  const state={id:'generated',pos:new THREE.Vector3(4.23,5.16,-89.65),cfg:{capsuleRadius:.3,capsuleHalfHeight:.2}};
  const creature={group,mainMesh:mesh,state};
  // createWildCreature initially leaves the render root at authored base Y;
  // its first controller move later places that root at capsule feet.
  group.position.set(state.pos.x,0,state.pos.z);
  const anchor=createWorldInteractionAnchor({scene}),info={id:'generated',type:'bond',target:creature};
  const before=anchor.getPoint(info).clone();
  assert.ok(Math.abs(before.y-6.84)<.001,'initial anchor uses local body height, not unsynced root Y');
  group.position.y=state.pos.y-(state.cfg.capsuleRadius+state.cfg.capsuleHalfHeight);
  assert.ok(Math.abs(anchor.getPoint(info).y-before.y)<.001,'first controller sync cannot move the cached anchor');
});

test('bounds projection rejects near-plane/offscreen envelopes without changing point projection', () => {
  const camera=new THREE.PerspectiveCamera(60,844/390,.1,60);camera.position.set(0,0,5);camera.lookAt(0,0,0);
  const box=new THREE.Box3(new THREE.Vector3(-1,-1,-1),new THREE.Vector3(1,1,1));
  assert.ok(projectInteractionBounds(box,new THREE.Matrix4(),camera,844,390));
  assert.equal(projectInteractionBounds(box,new THREE.Matrix4().makeTranslation(0,0,4.5),camera,844,390),null);
  assert.equal(projectInteractionBounds(box,new THREE.Matrix4().makeTranslation(100,0,0),camera,844,390),null);
});

test('candidate presentation rejects blocked LOS and permits a visible nearby fallback', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, .1, 60);
  camera.position.set(0, 1, 8); camera.lookAt(0, 1, 0);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 3, .4), new THREE.MeshBasicMaterial());
  wall.position.set(0, 1.5, 4); wall.userData.propId = 'wall'; scene.add(wall); scene.updateMatrixWorld(true);
  const records = new Map([
    ['blocked', { id: 'blocked', pos: { x: 0, y: 0, z: 0 } }],
    ['visible', { id: 'visible', pos: { x: 3, y: 0, z: 0 } }],
  ]);
  const anchor = createWorldInteractionAnchor({ scene, registry: { getLootChestById: id => records.get(id) } });
  assert.equal(anchor.canPresent({ type: 'lootChest', id: 'blocked' }, camera), false);
  assert.equal(anchor.canPresent({ type: 'lootChest', id: 'visible' }, camera), true);
});

test('candidate switches reuse cached scene and LOS work, with eight-target eviction', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, .1, 60);
  camera.position.set(0, 1, 8); camera.lookAt(0, 1, 0);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 3, .4), new THREE.MeshBasicMaterial());
  wall.position.set(0, 1.5, 4); wall.userData.propId = 'wall'; scene.add(wall); scene.updateMatrixWorld(true);
  const records = new Map(Array.from({ length: 9 }, (_, i) => [`c${i}`, { id: `c${i}`, pos: { x: i ? 2.5 : 0, y: 0, z: 0 } }]));
  const originalTraverse = scene.traverse.bind(scene); let traversals = 0;
  scene.traverse = callback => { traversals++; return originalTraverse(callback); };
  const anchor = createWorldInteractionAnchor({ scene, registry: { getLootChestById: id => records.get(id) } });
  const first = { type: 'lootChest', id: 'c0' }, second = { type: 'lootChest', id: 'c1' };
  assert.equal(anchor.canPresent(first, camera), false);
  anchor.canPresent(second, camera);
  anchor.canPresent(first, camera);
  assert.equal(traversals, 2, 'switching back reuses the target snapshot');
  wall.material.opacity = .2;
  assert.equal(anchor.canPresent(first, camera), false, 'same-frame selection and display share the LOS result');
  const point = anchor.getPoint(first);
  assert.equal(anchor.isOccluded(camera, point, .11), false, 'the target refreshes after the bounded 10Hz interval');
  for (let i = 1; i < 9; i++) anchor.canPresent({ type: 'lootChest', id: `c${i}` }, camera);
  anchor.canPresent(first, camera);
  assert.equal(traversals, 10, 'the ninth distinct target evicts the least-recently-used snapshot');
});

test('wall time and render dt share one LOS timebase', () => {
  const performanceDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  let now = 0;
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } });
  try {
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, .1, 60);
    camera.position.set(0, 1, 8); camera.lookAt(0, 1, 0);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 3, .4), new THREE.MeshBasicMaterial());
    wall.position.set(0, 1.5, 4); wall.userData.propId = 'wall'; scene.add(wall); scene.updateMatrixWorld(true);
    const record = { id: 'chest', pos: { x: 0, y: 0, z: 0 } }, info = { type: 'lootChest', id: 'chest' };
    const anchor = createWorldInteractionAnchor({ scene, registry: { getLootChestById: () => record } });
    assert.equal(anchor.canPresent(info, camera), false);
    wall.material.opacity = .2;
    now = 60;
    assert.equal(anchor.canPresent(info, camera), false);
    const point = anchor.getPoint(info);
    assert.equal(anchor.isOccluded(camera, point, .06), true, 'the same 60ms is not counted once from each clock');
    now = 100;
    assert.equal(anchor.isOccluded(camera, point, .04), false, 'LOS refreshes after 100ms of total elapsed time');
  } finally {
    if (performanceDescriptor) Object.defineProperty(globalThis, 'performance', performanceDescriptor);
    else delete globalThis.performance;
  }
});

test('cached targets exclude their own geometry and recover after retirement and recreation', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, .1, 60);
  camera.position.set(0, 1, 8); camera.lookAt(0, 1, 0);
  let record = { id: 'pod', pos: { x: 0, y: 0, z: 0 } };
  const makeRoot = x => {
    const root = new THREE.Group(); root.name = 'pod'; root.position.x = x;
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
    body.position.y = 1; body.userData.propId = 'pod-body'; root.add(body); scene.add(root); return root;
  };
  const firstRoot = makeRoot(0); scene.updateMatrixWorld(true);
  const info = { type: 'storage', id: 'pod' };
  const anchor = createWorldInteractionAnchor({ scene, registry: { getAllPois: () => record ? [record] : [] } });
  assert.equal(anchor.canPresent(info, camera), true, 'selected body is not its own occluder');
  firstRoot.removeFromParent(); record = null;
  assert.equal(anchor.getPoint(info), null, 'retired target is invalidated');
  record = { id: 'pod', pos: { x: 2, y: 0, z: 0 } }; makeRoot(2); scene.updateMatrixWorld(true);
  assert.equal(anchor.getPoint(info).x, 2, 'replacement with the same ID gets a fresh record and root');
  assert.equal(anchor.canPresent(info, camera), true);
});
