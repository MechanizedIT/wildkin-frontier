import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthoredTerrain} from '../src/presentation/authoredTerrain.js';
import {getWaterRadius} from '../src/world/terrainSurfaceModel.js';
import {replaceRegionLandscape} from '../src/author/landscapeDraft.js';

test('optional shore tint preserves default terrain pixels, dry ground and physical mesh through landscape edits',()=>{
  const region={id:'shore-palette-fixture',bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10},surface:{seed:21,water:[{x:0,z:0,rx:4,rz:5,depth:.3}],routes:[],heights:[],detail:{grassDensity:0}}};
  const make=source=>{const terrain=createAuthoredTerrain(source);return{...terrain,mesh:terrain.group.getObjectByName(`terrain_${source.id}`)};};
  const original=make(region),explicit=make({...region,surface:{...region.surface,palette:{shore:'#e7cf9a'}}});
  assert.deepEqual(original.mesh.material.map.image.data,explicit.mesh.material.map.image.data,'Absent tint keeps the old default pixels');
  const world={regions:[structuredClone(region)]};
  replaceRegionLandscape(world,region.id,{...region.surface,palette:{shore:'#487775'}});
  const exported=JSON.parse(JSON.stringify(world)),changed=make(exported.regions[0]);
  assert.equal(exported.regions[0].surface.palette.shore,'#487775');
  assert.deepEqual(changed.vertices,original.vertices);assert.deepEqual(changed.indices,original.indices);
  const a=original.mesh.material.map.image,b=changed.mesh.material.map.image;let changedPixels=0;
  for(let z=0;z<a.height;z++)for(let x=0;x<a.width;x++){
    const i=(z*a.width+x)*4,wx=-10+(x+.5)/a.width*20,wz=-10+(z+.5)/a.height*20;
    const differs=a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2];
    if(differs){changedPixels++;assert.ok(getWaterRadius(region.surface,wx,wz)<1.13,'Only the existing shore mask changes');}
  }
  assert.ok(changedPixels>0,'The local tint reaches the real baked terrain texture');
  for(const terrain of [original,explicit,changed])terrain.group.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});
});
