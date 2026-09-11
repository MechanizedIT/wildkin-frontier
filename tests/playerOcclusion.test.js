import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {initializePlayerOcclusion} from '../src/presentation/playerOcclusion.js';

test('sloped foreground rock fades when the upper sightline clears it but the body is hidden',()=>{
  // Exact approved rock surface and the failed native foreground camera/position.
  const hull=JSON.parse(fs.readFileSync(new URL('../art/source/fen-bank-outcrop-right-v1/collider.json',import.meta.url),'utf8'));
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(hull.vertices,3));geometry.setIndex(hull.indices);
  const material=new THREE.MeshBasicMaterial(),scene=new THREE.Scene(),section=new THREE.Group();scene.add(section);
  function rock(id,x){const root=new THREE.Group();root.userData={propId:id,visualAssetId:'asset_fen_bank_outcrop_right'};root.position.set(x,-.08,7.7);root.scale.setScalar(1.25);const mesh=new THREE.Mesh(geometry,material);root.add(mesh);section.add(root);return mesh;}
  const foreground=rock('foreground',31.65),sibling=rock('sibling',45);
  const player={x:31.3,y:.521998465,z:5.65},camera=new THREE.PerspectiveCamera();camera.position.set(31.3,5.56661605,12.2);
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const upper=new THREE.Vector3(player.x,player.y+.4,player.z).sub(camera.position),distance=upper.length();
  assert.equal(new THREE.Raycaster(camera.position,upper.normalize(),0,distance).intersectObject(foreground).length,0,'original upper ray misses the sloped crown');
  const system=initializePlayerOcclusion({scene,camera,getPlayerPosition:()=>player});system.update(.11);
  assert.equal(foreground.material.opacity,.25,'body remains visible through the foreground mass');
  assert.equal(sibling.material.opacity,1,'a shared-material sibling remains opaque');assert.equal(material.opacity,1);
  camera.position.set(33.23,5.52,-.61);camera.updateMatrixWorld(true);system.update(.11);
  assert.equal(foreground.material.opacity,1,'ordinary orbit restores the rock');
  camera.position.set(31.3,5.56661605,12.2);camera.updateMatrixWorld(true);system.update(.11);
  section.visible=false;system.update(.11);assert.equal(foreground.material.opacity,1,'inactive scenery is restored');
  // Second native pose: center clears the crown too, leaving just legs hidden.
  section.visible=true;foreground.parent.position.set(27.65,.1476,8.4);
  Object.assign(player,{x:27.6663208,y:1.080242276,z:6.195804596});camera.position.set(27.665300159,6.07522434,12.746066943);
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);system.update(.11);
  assert.equal(foreground.material.opacity,.25,'a visible chest does not waive lower-body occlusion');
  foreground.parent.position.set(31.65,-.08,7.7);scene.updateMatrixWorld(true);
  section.visible=true;player.x=31.65;player.z=7.7;player.y=2.442;camera.position.set(31.65,7.442,14.25);camera.updateMatrixWorld(true);system.update(.11);
  assert.equal(foreground.material.opacity,1,'standing above the crown does not erase its support');
  system.dispose();assert.equal(foreground.material,material);geometry.dispose();material.dispose();
});

test('placed scenery can join and leave visibility ownership without leaking shared material state',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,4,6);camera.updateMatrixWorld(true);
  const system=initializePlayerOcclusion({scene,camera,getPlayerPosition:()=>({x:0,y:.52,z:0})});
  const material=new THREE.MeshBasicMaterial(),geometry=new THREE.BoxGeometry(2,2,.6),root=new THREE.Group(),wall=new THREE.Mesh(geometry,material);
  wall.position.set(0,1,2);root.add(wall);scene.add(root);scene.updateMatrixWorld(true);
  system.register(root);system.register(root);assert.equal(system.candidateCount,1,'placement registers once');system.update(.11);
  assert.equal(wall.material.opacity,.25);assert.notEqual(wall.material,material);assert.equal(material.opacity,1);
  const clone=wall.material;let disposed=0;clone.addEventListener('dispose',()=>disposed++);
  system.unregister(root);system.unregister(root);assert.equal(system.candidateCount,0);assert.equal(wall.material,material);assert.equal(disposed,1);
  system.update(.11);assert.equal(material.opacity,1,'removed geometry no longer receives fade writes');
  system.register(root);system.update(.11);assert.equal(wall.material.opacity,.25,'a reloaded placement can register again');
  root.visible=false;system.update(.11);assert.equal(wall.material.opacity,1);
  system.dispose();assert.equal(system.candidateCount,0);assert.equal(wall.material,material);geometry.dispose();material.dispose();
});
