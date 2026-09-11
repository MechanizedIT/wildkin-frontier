// Small, matte decoration shared by runtime and Author terrain. Two bounded
// instance batches; never collidable or placed on a playable route/water.
import * as THREE from 'three';
import { getSurfaceHeight, getPathDistance, getWaterRadius } from '../world/terrainSurfaceModel.js';

export const MEADOW_DETAIL_CONFIG = Object.freeze({ flowerDensity: .034, stoneDensity: .012, maxFlowers: 300, maxStones: 120 });
const random = (i, seed) => { let v = Math.imul(i + 1, 374761393) ^ Math.imul(seed, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967295; };

function flowers() {
  const vertices = [], colors = [];
  const ivory = new THREE.Color('#fff5cd'), amber = new THREE.Color('#edba43'), green = new THREE.Color('#327b39');
  function triangle(a, b, c, color) { for (const p of [a, b, c]) { vertices.push(...p); colors.push(color.r, color.g, color.b); } }
  for (const [x, z, h, size] of [[0, 0, .29, 1], [.25, .17, .21, .74], [-.17, .22, .18, .62]]) {
    triangle([x-.018,0,z],[x+.018,0,z],[x,h,z],green);
    for (let n=0;n<5;n++) {
      const a=n/5*Math.PI*2, r=.16*size, w=.065*size;
      const c=Math.cos(a),s=Math.sin(a);
      const center=[x,h,z], left=[x+c*r-s*w,h+.025,z+s*r+c*w], tip=[x+c*(r+.035),h+.018,z+s*(r+.035)],right=[x+c*r+s*w,h+.025,z+s*r-c*w];
      triangle(center,left,tip,ivory);triangle(center,tip,right,ivory);
      const next=a+Math.PI*.4;
      triangle(center,[x+Math.cos(a)*.055,h+.032,z+Math.sin(a)*.055],[x+Math.cos(next)*.055,h+.032,z+Math.sin(next)*.055],amber);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  return geometry;
}

export function addMeadowDetails(group, surface, bounds, palette = {}) {
  const area=(bounds.maxX-bounds.minX)*(bounds.maxZ-bounds.minZ),density=surface.detail?.grassDensity??.65;
  const flowersCount=Math.min(MEADOW_DETAIL_CONFIG.maxFlowers,Math.round(area*MEADOW_DETAIL_CONFIG.flowerDensity*density));
  const stonesCount=Math.min(MEADOW_DETAIL_CONFIG.maxStones,Math.round(area*MEADOW_DETAIL_CONFIG.stoneDensity*density));
  const flowerBatch=new THREE.InstancedMesh(flowers(),new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),flowersCount);
  flowerBatch.name='meadow_flowers';
  const stoneGeo=new THREE.DodecahedronGeometry(.28,0);
  const normals=stoneGeo.getAttribute('normal'),stoneColors=[];
  for(let i=0;i<normals.count;i++) {const c=new THREE.Color(palette.rock??'#8e9b8d').lerp(new THREE.Color('#dbd9c3'),normals.getY(i)>.25?.4:.05);stoneColors.push(c.r,c.g,c.b);}
  stoneGeo.setAttribute('color',new THREE.Float32BufferAttribute(stoneColors,3));
  const stoneBatch=new THREE.InstancedMesh(stoneGeo,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1,metalness:0}),stonesCount);
  stoneBatch.name='meadow_stones';stoneBatch.receiveShadow=true;
  const pose=new THREE.Object3D();
  for(const [batch,count,seed] of [[flowerBatch,flowersCount,317],[stoneBatch,stonesCount,811]]) {
    let placed=0;
    for(let i=0;i<count*8&&placed<count;i++) {
      const x=bounds.minX+.8+random(i,seed+(surface.seed??0))*(bounds.maxX-bounds.minX-1.6),z=bounds.minZ+.8+random(i,seed+37)*(bounds.maxZ-bounds.minZ-1.6);
      const pathDistance=getPathDistance(surface,x,z);
      if(pathDistance<.65||getWaterRadius(surface,x,z)<1.13)continue;
      const ground=getSurfaceHeight(surface,x,z);
      if(Math.abs(getSurfaceHeight(surface,x+.3,z)-ground)>.14)continue;
      const scale=.8+random(i,seed+73)*.8;
      pose.position.set(x,ground+(batch===stoneBatch?.12*scale:.01),z);
      pose.rotation.set(0,random(i,seed+19)*Math.PI*2,0);
      pose.scale.set(scale,batch===stoneBatch?scale*.65:scale,scale);pose.updateMatrix();batch.setMatrixAt(placed++,pose.matrix);
    }
    batch.count=placed;batch.instanceMatrix.needsUpdate=true;group.add(batch);
  }
}
