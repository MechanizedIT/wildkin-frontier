// Small, matte decoration shared by runtime and Author terrain. Two bounded
// instance batches; never collidable or placed on a playable route/water.
import * as THREE from 'three';
import { getSurfaceHeight, getPathDistance, getWaterRadius } from '../world/terrainSurfaceModel.js';

export const MEADOW_DETAIL_CONFIG = Object.freeze({ flowerDensity: .034, stoneDensity: .012, maxFlowers: 300, maxStones: 120 });
const random = (i, seed) => { let v = Math.imul(i + 1, 374761393) ^ Math.imul(seed, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967295; };

// Low, closed alien cushions and mineral fans. Their broad muted tops differ
// from the bright pointed crystals, berries and trunks that can be harvested.
export function createGroundcoverGeometry(kind='cushion',variant=0) {
  const vertices = [], colors = [];
  const swatches={cushion:['#345957','#579779','#83ad75'],mineral:['#4d414c','#99634e','#c28151'],fan:['#476675','#759caa','#a4bbaf'],spore:['#35465e','#597b91','#9989ad']};
  const [dark,mid,top]=(swatches[kind]??swatches.cushion).map(c=>new THREE.Color(c));
  function triangle(a, b, c, color) { for (const p of [a, b, c]) { vertices.push(...p); colors.push(color.r, color.g, color.b); } }
  const lobes=variant?[[0,0,.32,.25],[.21,.09,.23,.18],[-.18,.16,.17,.16],[.06,-.21,.13,.16]]:[[0,0,.23,.24],[.24,.1,.15,.18],[-.16,.2,.12,.15]];
  for (const [x,z,height,radius] of lobes) {
    const h=kind==='spore'?height*1.3:height, tilt=kind==='fan'?.22:kind==='mineral'?.08:.035;
    const rings=[[0,radius*.72,0],[h*.42,radius,tilt*.25],[h*.88,radius*.83,tilt],[h,radius*.28,tilt*1.15]];
    const point=(ring,n)=>{const a=n/6*Math.PI*2+variant*.3;return[x+Math.cos(a)*ring[1]+ring[2],ring[0],z+Math.sin(a)*ring[1]*(kind==='fan'?.48:1)];};
    for(let row=0;row<rings.length-1;row++)for(let n=0;n<6;n++){
      const a=point(rings[row],n),b=point(rings[row],n+1),c=point(rings[row+1],n),d=point(rings[row+1],n+1),color=row===0?dark:row===1?mid:top;
      triangle(a,c,b,color);triangle(b,c,d,color);
    }
    for(let n=0;n<6;n++){triangle([x+tilt*1.15,h,z],point(rings[3],n+1),point(rings[3],n),top);triangle([x,0,z],point(rings[0],n),point(rings[0],n+1),dark);}
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
  const flowerBatch=new THREE.InstancedMesh(createGroundcoverGeometry(surface.detail?.groundcover),new THREE.MeshBasicMaterial({vertexColors:true}),flowersCount);
  flowerBatch.name='meadow_groundcover';
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
