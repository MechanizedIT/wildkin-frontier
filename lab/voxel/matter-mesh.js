import { meshSurfaceNets } from './surface-nets.js';
import { MATERIALS } from './config.js';

export const ROCK_MESH_START=[-4,-1,-4];
export const ROCK_CHUNK_SIZE=16;
export function paddedRockSnapshot(samples){
  const size=ROCK_CHUNK_SIZE,n=size+2,densities=new Float32Array(n**3),materials=new Uint8Array(n**3);
  for(let z=-1;z<=size;z++)for(let y=-1;y<=size;y++)for(let x=-1;x<=size;x++){
    const meter=[x,y,z].map((v,i)=>ROCK_MESH_START[i]+v*.5),
      q=meter.map((v,i)=>Math.round((v-samples.min[i])/.5)),j=(x+1)+n*((y+1)+n*(z+1));
    if(q.some((v,i)=>v<0||v>=samples.size[i])){densities[j]=2;continue;}
    const i=q[0]+samples.size[0]*(q[1]+samples.size[1]*q[2]);
    densities[j]=samples.densities[i];materials[j]=densities[j]<0?samples.materials[i]:0;
  }
  return {size,spacing:.5,densities,materials};
}
export function meshRockSamples(samples){
  const mesh=meshSurfaceNets(paddedRockSnapshot(samples));
  for(let i=0;i<mesh.positions.length;i++)mesh.positions[i]+=ROCK_MESH_START[i%3];
  if(mesh.indices.length/3>8192)throw new Error('Rock render triangle budget exceeded');
  return mesh;
}
// Same Surface Nets topology and exact positions. Each triangle receives the
// deterministic majority material of its three resolved vertex classifications
// (ties use the lower material ID); vertices are duplicated only when one
// source vertex borders triangles assigned to different materials.
export function crispMatterSeams(mesh){
  const positions=[],normals=[],colors=[],materialIds=[],indices=[],cache=new Map();
  const triangleCount=mesh.indices.length/3;
  for(let t=0;t<triangleCount;t++){
    const tri=[mesh.indices[t*3],mesh.indices[t*3+1],mesh.indices[t*3+2]],counts=new Map();
    for(const v of tri){const id=mesh.materialIds[v];counts.set(id,(counts.get(id)??0)+1);}
    const material=[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0],base=MATERIALS[material]?.color??MATERIALS[1].color;
    for(const source of tri){
      const key=`${source}:${material}`;let target=cache.get(key);
      if(target===undefined){target=positions.length/3;cache.set(key,target);
        positions.push(mesh.positions[source*3],mesh.positions[source*3+1],mesh.positions[source*3+2]);
        normals.push(mesh.normals[source*3],mesh.normals[source*3+1],mesh.normals[source*3+2]);
        const shade=mesh.shades?.[source]??1;colors.push(base[0]*shade,base[1]*shade,base[2]*shade);
        materialIds.push(material);
      }
      indices.push(target);
    }
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),colors:new Float32Array(colors),materialIds:new Uint8Array(materialIds),indices:new Uint32Array(indices),
    sourceVertexCount:mesh.positions.length/3,renderVertexCount:positions.length/3,triangleCount};
}
export const meshMatterSamples=meshRockSamples;
