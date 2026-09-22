import { generatePadded, generateSmoothPadded, hashBytes } from './generator.js';
import { meshGreedy } from './js-mesher.js';
import { meshSurfaceNets } from './surface-nets.js';
import { meshMarchingTetrahedra } from './marching-tetrahedra.js';
const candidates = new Map();
self.onmessage = async ({ data: job }) => {
  try {
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
