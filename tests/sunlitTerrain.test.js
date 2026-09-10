import {test} from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {getSurfaceHeight,getPathDistance,validateSurface} from '../src/world/terrainSurfaceModel.js';
import {createAuthoredTerrain} from '../src/presentation/authoredTerrain.js';
import {createVisualAssetVisual,computeVisualAssetBounds} from '../src/world/visualFactory.js';
const surface={heights:[{x:0,z:0,rx:8,rz:8,height:1,plateau:.4}],water:[],routes:[{width:3,points:[{x:0,z:10},{x:0,z:-10}]}]};
test('terrain render vertices and authored height share one owner',()=>{
  const t=createAuthoredTerrain({id:'test',surface,bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10}});
  for(let i=0;i<t.vertices.length;i+=3)assert.ok(Math.abs(t.vertices[i+1]+.018-getSurfaceHeight(surface,t.vertices[i],t.vertices[i+2]))<.00001);
  assert.equal(getSurfaceHeight(surface,0,0),1);assert.equal(getSurfaceHeight(surface,10,0),0);assert.ok(getPathDistance(surface,0,4)<0);
  const geo=t.group.children[0].geometry;assert.ok(geo.attributes.normal.array[1]>.9);
});
test('surface validation rejects unsafe mesh input and bounded paths',()=>{
  assert.throws(()=>validateSurface({...surface,heights:[{x:0,z:0,rx:0,rz:5,height:1}]}));
  assert.throws(()=>validateSurface({...surface,routes:[{width:NaN,points:[]}]}));
});
test('graded course path keeps the full approach flat while retaining its surrounding hills',()=>{
  const graded={...surface,routes:[{width:3.6,elevation:.15,feather:1.5,points:[{x:0,z:6},{x:0,z:-6}]}]};
  assert.ok(Math.abs(getSurfaceHeight(graded,0,0)-.15)<.000001);assert.ok(Math.abs(getSurfaceHeight(graded,1.5,2)-.15)<.000001);
  assert.ok(getSurfaceHeight(graded,3.5,0)>.8);
  assert.throws(()=>validateSurface({...graded,routes:[{...graded.routes[0],elevation:Infinity}]}));
});
test('authored mesh parts retain transforms and real fitted bounds',()=>{
  const asset={id:'custom',parts:[{id:'piece',shape:'mesh',geometry:{positions:[0,0,0,2,0,0,0,3,0],indices:[0,1,2]},position:{x:1,y:2,z:3},rotation:{x:0,y:0,z:0},scale:{x:2,y:1,z:1},color:'#abcdef'}]};
  const visual=createVisualAssetVisual(asset),bounds=computeVisualAssetBounds(asset);
  assert.equal(visual.children[0].userData.assetPartId,'piece');assert.equal(bounds.size.w,4);assert.equal(bounds.size.h,3);
  asset.parts[0].position.y=5;assert.equal(computeVisualAssetBounds(asset).offset.y,6.5);
});
