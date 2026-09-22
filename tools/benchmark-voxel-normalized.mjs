import {generateSmoothPadded} from '../lab/voxel/generator.js';
import {meshSurfaceNets} from '../lab/voxel/surface-nets.js';
import {meshMarchingTetrahedra} from '../lab/voxel/marching-tetrahedra.js';
import fs from 'node:fs/promises';
import os from 'node:os';
const runs=[];
// Identical physical metre bounds: x [0,16), y/z [-16,0). Cave-bearing terrain.
for(const spacing of [.5,.25])for(const size of [16,32])for(const [mesher,mesh] of [['surface-nets',meshSurfaceNets],['marching-tetrahedra',meshMarchingTetrahedra]]){
 const n=16/(size*spacing),samples=[];let triangleCount,bytes;
 for(let repeat=0;repeat<5;repeat++){
  let generationMs=0,meshMs=0;triangleCount=0;bytes=0;
  for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   let start=performance.now();const input=generateSmoothPadded(size,[x,y-n,z-n],9212026,spacing,{},{});generationMs+=performance.now()-start;
   start=performance.now();const geometry=mesh({size,spacing,...input});meshMs+=performance.now()-start;triangleCount+=geometry.indices.length/3;bytes+=Object.values(geometry).reduce((sum,a)=>sum+a.byteLength,0);
  }
  if(repeat)samples.push({generationMs,meshMs});
 }
 runs.push({spacing,size,mesher,chunks:n**3,physicalCubeMeters:16,triangleCount,bytes,samples});console.log(JSON.stringify(runs.at(-1)));
}
await fs.writeFile('docs/evidence/voxel-phase0/benchmark-normalized-smooth.json',JSON.stringify({timestamp:new Date().toISOString(),cpu:os.cpus()[0].model,method:'One warmup and four measured repetitions; same 16m cube, generation separately timed, complete JS geometry allocation included. Node CPU only, no renderer/collider. Chunk coordinates adjusted to identical physical bounds.',runs},null,2));
