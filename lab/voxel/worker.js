import { generatePadded, generateSmoothPadded, hashBytes } from './generator.js';
import { meshGreedy } from './js-mesher.js';
import { meshSurfaceNets } from './surface-nets.js';
import { meshMarchingTetrahedra } from './marching-tetrahedra.js';
import { meshRockSamples } from './matter-mesh.js';
const candidates = new Map();
self.onmessage = async ({ data: job }) => {
  try {
    if(job.kind==='cellular-rock-mesh'||job.kind==='cellular-matter-mesh'){
      const started=performance.now();
      const sample={min:[-3,0,-3],size:[13,13,13],densities:new Float32Array(job.densities),materials:new Uint8Array(job.materials)};
      const {positions,normals,colors,materialIds,shades,indices}=meshRockSamples(sample);
      const meshHash=[positions,normals,colors,materialIds,shades,indices].map(a=>hashBytes(new Uint8Array(a.buffer,a.byteOffset,a.byteLength))).join(':');
      self.postMessage({id:job.id,kind:job.kind,actorId:job.actorId,revision:job.revision,meshMs:performance.now()-started,meshHash,
        positions,normals,colors,materialIds,shades,indices},[positions.buffer,normals.buffer,colors.buffer,materialIds.buffer,shades.buffer,indices.buffer]);
      return;
    }
    let mesher;
    const smooth=['surface-nets','marching-tetrahedra'].includes(job.mesher);
    if(smooth)mesher={mesh:job.mesher==='surface-nets'?meshSurfaceNets:meshMarchingTetrahedra};
    else if (job.mesher === 'js-greedy') mesher = { mesh: meshGreedy };
    else if (job.mesher === 'block-mesh' || job.mesher === 'voxelize') {
      if(!candidates.has(job.mesher))candidates.set(job.mesher,job.mesher==='block-mesh'?import('./candidates/block-mesh-wasm-adapter.js').then(m=>m.createBlockMeshCandidate()):import('./candidates/voxelize-wasm-adapter.js').then(m=>m.createVoxelizeCandidate()));
      mesher=await candidates.get(job.mesher);
    }
    else throw new Error(`Unsupported lab mesher: ${job.mesher}`);
    const generationStart = performance.now();
    const input=smooth?generateSmoothPadded(job.size,job.chunk,job.seed,job.spacing,job.edits,job.densityEdits):{voxels:generatePadded(job.size,job.chunk,job.seed,job.edits)};
    const generationMs = performance.now()-generationStart, hash = smooth?hashBytes(new Uint8Array(input.densities.buffer))+':'+hashBytes(input.materials):hashBytes(input.voxels), meshStart = performance.now();
    const output = mesher.mesh({ size: job.size, spacing:job.spacing,...input });
    const { positions, normals, colors, indices } = output;
    const meshMs = performance.now()-meshStart;
    const meshHash = [positions,normals,colors,indices].map(a=>hashBytes(new Uint8Array(a.buffer,a.byteOffset,a.byteLength))).join(':');
    self.postMessage({ id: job.id, key: job.key, token: job.token, generationMs, meshMs, hash, meshHash, positions, normals, colors, indices }, [positions.buffer, normals.buffer, colors.buffer, indices.buffer]);
  } catch (error) { self.postMessage({ id: job.id, key: job.key, token: job.token, error: error.stack || error.message }); }
};
