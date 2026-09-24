// Opt-in Phase 0.5A.3 physics products. Never a material or visible-mesh owner.
import { parcelBits } from './matter-ownership.js';

export function planVoxelCollider(sample, spacing = .25) {
  if (sample.spacing !== .5 || ![.25, .5].includes(spacing)) throw Error('Unsupported collision sampling');
  const coordinates = [];
  let occupiedParcels = 0;
  for (let z=0; z<sample.size[2]-1; z++) for (let y=0; y<sample.size[1]-1; y++) for (let x=0; x<sample.size[0]-1; x++) {
    const bits=parcelBits(sample,[x,y,z]);
    occupiedParcels += bits.filter(Boolean).length;
    if (spacing === .5) {
      // Conservative cheaper control: retain a scalar cell if any subparcel
      // is occupied. This coarsens collision only, never quantity ownership.
      if (bits.some(Boolean)) coordinates.push(x,y,z);
    } else for (let i=0;i<8;i++) if(bits[i]) coordinates.push(2*x+(i&1),2*y+((i>>1)&1),2*z+((i>>2)&1));
  }
  if (!coordinates.length) throw Error('Empty occupied collider');
  return { coordinates:new Int32Array(coordinates), voxelSize:{x:spacing,y:spacing,z:spacing},
    translation:[...sample.min], voxelCount:coordinates.length/3, inputBytes:coordinates.length*4, occupiedParcels, spacing };
}

export function createVoxelDescriptor(R, plan) {
  // Verified against vendored 0.20.0: Int32Array lattice addresses FIRST,
  // full voxel-size vector SECOND. Address zero occupies [0,size], not +/-size/2.
  return R.ColliderDesc.voxels(plan.coordinates,plan.voxelSize).setTranslation(...plan.translation);
}

export function voxelSurfaceMesh(plan) {
  // Inspector only; exposed voxel faces, never installed as the rock's visual.
  const occupied=new Set(),positions=[],indices=[],s=plan.spacing;
  for(let i=0;i<plan.coordinates.length;i+=3)occupied.add(Array.from(plan.coordinates.slice(i,i+3)).join(','));
  const faces=[[[1,0,0],[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]],[[-1,0,0],[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]],
    [[0,1,0],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]],[[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]],
    [[0,0,1],[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]],[[0,0,-1],[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]]];
  for(const key of occupied){const p=key.split(',').map(Number);for(const [d,corners] of faces){
    if(occupied.has(p.map((v,a)=>v+d[a]).join(',')))continue;
    const base=positions.length/3;for(const c of corners)positions.push(...p.map((v,a)=>plan.translation[a]+(v+c[a])*s));
    indices.push(base,base+1,base+2,base,base+2,base+3);
  }}
  return {positions:new Float32Array(positions),indices:new Uint32Array(indices)};
}
