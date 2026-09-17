import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { createWildkinMeshVisual } from '../src/world/wildkinMeshKit.js';

const close=(a,b)=>a.length===b.length&&a.every((value,index)=>Math.abs(value-b[index])<1e-7);
function closedDirectedAudit(mesh, vertices, triangles) {
  const geometry=mesh.geometry, position=geometry.getAttribute('position'), index=geometry.getIndex();
  assert.ok(position&&index, `${mesh.name} is indexed`);
  assert.equal(position.count, vertices); assert.equal(index.count/3, triangles);
  const edges=new Map(); let volume=0;
  for(let i=0;i<index.count;i+=3){
    const tri=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    for(let e=0;e<3;e++){const a=tri[e],b=tri[(e+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`,list=edges.get(key)||[];list.push([a,b]);edges.set(key,list);}
    const a=tri[0]*3,b=tri[1]*3,c=tri[2]*3,p=position.array;
    volume+=(p[a]*(p[b+1]*p[c+2]-p[b+2]*p[c+1])+p[a+1]*(p[b+2]*p[c]-p[b]*p[c+2])+p[a+2]*(p[b]*p[c+1]-p[b+1]*p[c]))/6;
  }
  assert.ok([...edges.values()].every(list=>list.length===2&&list[0][0]===list[1][1]&&list[0][1]===list[1][0]), `${mesh.name} has opposite traversal on every shared edge`);
  assert.ok(Number.isFinite(volume)&&volume>1e-5, `${mesh.name} has positive outward signed volume`);
}
function verticalSkin(torso,x,z){const ray=new THREE.Raycaster();ray.set(new THREE.Vector3(x,3,z),new THREE.Vector3(0,-1,0));const top=ray.intersectObject(torso,false)[0];ray.set(new THREE.Vector3(x,-2,z),new THREE.Vector3(0,1,0));const bottom=ray.intersectObject(torso,false)[0];assert.ok(top&&bottom,`torso receives contact ray at ${x},${z}`);return{top:top.point.y,bottom:bottom.point.y};}
const plan=JSON.parse(readFileSync(new URL('../docs/species/thornprowler/anatomy-plan-v1.json',import.meta.url),'utf8'));

test('Thornprowler R1 consumes four literal closed limbs and seven literal closed thorns',()=>{
  const model=createWildkinMeshVisual('asset_thornprowler');
  const limbs=model.children.filter(part=>part.name==='articulated_leg'), thorns=model.children.filter(part=>part.name==='staggered_dorsal_thorn');
  assert.equal(limbs.length,4); assert.equal(thorns.length,7); assert.equal(model.children.length,23);
  for(let i=0;i<4;i++){closedDirectedAudit(limbs[i],32,60);assert.ok(close(Array.from(limbs[i].geometry.getAttribute('position').array),plan.limbs[i].vertices.flat()),`${plan.limbs[i].name} literal geometry`);}
  for(let i=0;i<7;i++){closedDirectedAudit(thorns[i],7,10);assert.ok(close(Array.from(thorns[i].geometry.getAttribute('position').array),plan.thorns[i].vertices.flat()),`thorn ${i} literal geometry`);}
  assert.equal(limbs.reduce((sum,mesh)=>sum+mesh.geometry.getIndex().count/3,0)+thorns.reduce((sum,mesh)=>sum+mesh.geometry.getIndex().count/3,0),310);
});

test('Thornprowler R1 preserves paw/torso attachment volume and changed-parts envelope',()=>{
  const model=createWildkinMeshVisual('asset_thornprowler');model.updateMatrixWorld(true);
  const torso=model.children.find(part=>part.name==='crouched_predator_torso'), limbs=model.children.filter(part=>part.name==='articulated_leg'), paws=model.children.filter(part=>part.name==='clawed_paw'), thorns=model.children.filter(part=>part.name==='staggered_dorsal_thorn');
  for(let i=0;i<4;i++){
    const spec=plan.limbs[i], position=limbs[i].geometry.getAttribute('position');
    for(const [ring,host,label] of [[spec.rings[0],paws[i],"paw"],[spec.rings[3],torso,"torso"]])for(const probe of ring.probes){const skin=verticalSkin(host,probe.x,probe.z);assert.ok(probe.capY>=skin.bottom&&probe.capY<=skin.top,`${spec.name} ${label} cap remains in the actual shell interval`);}
    assert.deepEqual(paws[i].position.toArray(),spec.pawCenter,`${spec.name} paw center stays exact`);
    assert.ok(position.count===32);
  }
  for(let i=0;i<7;i++)for(const probe of plan.thorns[i].baseProbes){const skin=verticalSkin(torso,probe.x,probe.z);assert.ok(probe.baseY>=skin.bottom&&probe.baseY<=skin.top,`thorn ${i} base stays buried at ${probe.x},${probe.z}`);}
  const changed=new THREE.Box3();for(const part of [...limbs,...thorns])changed.expandByObject(part);const min=plan.changedBounds.min,max=plan.changedBounds.max;
  assert.ok(changed.min.x>=min[0]-1e-6&&changed.min.y>=min[1]-1e-6&&changed.min.z>=min[2]-1e-6);assert.ok(changed.max.x<=max[0]+1e-6&&changed.max.y<=max[1]+1e-6&&changed.max.z<=max[2]+1e-6);
});

test('Thornprowler R1 keeps all twelve protected components exactly at frozen snapshot transforms and geometry',()=>{
  const baseline=JSON.parse(readFileSync(new URL('../.dream-loop/thornprowler-rotation-1/baseline-mesh-snapshots.json',import.meta.url),'utf8')).find(entry=>entry.id==='asset_thornprowler');
  assert.ok(baseline); const model=createWildkinMeshVisual('asset_thornprowler'); const protectedNames=new Set(['crouched_predator_torso','low_brow_head','angular_jaw','clawed_paw','inset_almond_eye','eye_glint','sweeping_tail']);
  const expected=baseline.parts.filter(part=>protectedNames.has(part.name)), actual=model.children.filter(part=>protectedNames.has(part.name));
  assert.equal(actual.length,12);assert.equal(expected.length,12);
  for(let i=0;i<12;i++){assert.equal(actual[i].name,expected[i].name);assert.ok(close(actual[i].position.toArray(),expected[i].position),`${actual[i].name} position`);assert.ok(close(actual[i].quaternion.toArray(),expected[i].quaternion),`${actual[i].name} rotation`);assert.ok(close(actual[i].scale.toArray(),expected[i].scale),`${actual[i].name} scale`);assert.ok(close(Array.from(actual[i].geometry.getAttribute('position').array),expected[i].attributes.position.array),`${actual[i].name} geometry`);assert.deepEqual(Array.from(actual[i].geometry.getIndex()?.array||[]),expected[i].index||[]);}
});



test('Thornprowler R1 leaves the six sibling code-native visual component orders untouched',()=>{
  const baseline=JSON.parse(readFileSync(new URL('../.dream-loop/thornprowler-rotation-1/baseline-mesh-snapshots.json',import.meta.url),'utf8'));
  for(const expected of baseline.filter(entry=>entry.id!=='asset_thornprowler')){
    const model=createWildkinMeshVisual(expected.id), names=[];model.traverse(part=>{if(part.isMesh)names.push(part.name);});
    assert.deepEqual(names,expected.parts.map(part=>part.name),`${expected.id} component order`);
  }
});
