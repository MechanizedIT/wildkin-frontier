// Smooth-density Surface Nets probe for Phase 0.  It deliberately consumes a
// one-sample shell: samples are addressed from -1 through size in every axis.
// Cells -1 through size-1 supply ghost vertices, while each sign-changing
// sample edge is emitted by exactly one chunk (the chunk owning its lower
// endpoint).  That makes adjacent output watertight without duplicate faces.
import { MATERIALS } from './config.js';
import { smoothAmbientOcclusion } from './smooth-shading.js';

const CORNERS = [[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
const EDGE_AXES = [
  // edge axis, then the four incident cell offsets in the other two axes.
  [0, [[0,-1,-1],[0,0,-1],[0,0,0],[0,-1,0]]],
  [1, [[-1,0,-1],[-1,0,0],[0,0,0],[0,0,-1]]],
  [2, [[-1,-1,0],[0,-1,0],[0,0,0],[-1,0,0]]],
];
const CUBE_EDGES = [[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];

function assertInput({ size, densities, materials, spacing = 1 }) {
  const n = size + 2;
  if (!Number.isInteger(size) || size < 1 || !(densities instanceof Float32Array) || densities.length !== n ** 3) throw new Error('surface nets expects a padded Float32Array density field');
  if (!(materials instanceof Uint8Array) || materials.length !== densities.length) throw new Error('surface nets expects matching padded Uint8Array materials');
  if (!(spacing > 0)) throw new Error('surface nets spacing must be positive');
  return n;
}
function index(x, y, z, n) { return (x + 1) + n * ((y + 1) + n * (z + 1)); }
function clamp(x, hi) { return Math.max(-1, Math.min(hi, x)); }
function sample(d, x, y, z, n, size) { return d[index(clamp(x,size),clamp(y,size),clamp(z,size),n)]; }
function normalize(x,y,z) { const l=Math.hypot(x,y,z)||1; return [x/l,y/l,z/l]; }
function hashCell(x,y,z) { return `${x},${y},${z}`; }

function makeVertex(cx, cy, cz, densities, materials, n, size, spacing) {
  const values = CORNERS.map(([x,y,z]) => sample(densities,cx+x,cy+y,cz+z,n,size));
  let hasNeg=false,hasPos=false;
  for (const value of values) { hasNeg ||= value < 0; hasPos ||= value >= 0; }
  if (!hasNeg || !hasPos) return null;
  let px=0,py=0,pz=0,count=0,best=Infinity, material=1,rockEvidence=0,totalEvidence=0;
  for (const [a,b] of CUBE_EDGES) {
    const av=values[a], bv=values[b];
    if ((av < 0) === (bv < 0)) continue;
    const t = av / (av - bv);
    px += CORNERS[a][0] + (CORNERS[b][0]-CORNERS[a][0])*t;
    py += CORNERS[a][1] + (CORNERS[b][1]-CORNERS[a][1])*t;
    pz += CORNERS[a][2] + (CORNERS[b][2]-CORNERS[a][2])*t;
    count++;
  }
  for(let i=0;i<8;i++)if(values[i]<0){
    const id=materials[index(cx+CORNERS[i][0],cy+CORNERS[i][1],cz+CORNERS[i][2],n)],evidence=Math.min(1,Math.max(.05,-values[i]));
    totalEvidence+=evidence;if(id===1)rockEvidence+=evidence;
    if(values[i]<best){best=values[i];material=id;}
  }
  px=cx+px/count; py=cy+py/count; pz=cz+pz/count;
  // Trilinear gradient gives the same normal when this cell is a neighbour's
  // ghost cell; it does not depend on which triangles happened to be emitted.
  const u=px-cx,v=py-cy,w=pz-cz;
  const q=(x,y,z)=>values[x+2*y+4*z];
  const gx=(1-v)*(1-w)*(q(1,0,0)-q(0,0,0))+v*(1-w)*(q(1,1,0)-q(0,1,0))+(1-v)*w*(q(1,0,1)-q(0,0,1))+v*w*(q(1,1,1)-q(0,1,1));
  const gy=(1-u)*(1-w)*(q(0,1,0)-q(0,0,0))+u*(1-w)*(q(1,1,0)-q(1,0,0))+(1-u)*w*(q(0,1,1)-q(0,0,1))+u*w*(q(1,1,1)-q(1,0,1));
  const gz=(1-u)*(1-v)*(q(0,0,1)-q(0,0,0))+u*(1-v)*(q(1,0,1)-q(1,0,0))+(1-u)*v*(q(0,1,1)-q(0,1,0))+u*v*(q(1,1,1)-q(1,1,0));
  const normal=normalize(gx,gy,gz);return { position:[px*spacing,py*spacing,pz*spacing], normal, material,
    rockWeight:totalEvidence?rockEvidence/totalEvidence:material===1?1:0,shade:smoothAmbientOcclusion(values,[px-cx,py-cy,pz-cz],normal) };
}

export function meshSurfaceNets(input) {
  const { size, densities, materials, spacing=1 }=input, n=assertInput(input);
  const vertices=new Map(), positions=[], normals=[], colors=[], materialIds=[], rockWeights=[], shades=[], indices=[];
  const vertex=(x,y,z)=>{
    const key=hashCell(x,y,z); let id=vertices.get(key); if(id !== undefined) return id;
    const v=makeVertex(x,y,z,densities,materials,n,size,spacing); if(!v) return -1;
    id=positions.length/3; vertices.set(key,id); positions.push(...v.position); normals.push(...v.normal);materialIds.push(v.material);rockWeights.push(v.rockWeight);shades.push(v.shade);
    const color=MATERIALS[v.material]?.color || MATERIALS[1].color; colors.push(...color.map(c=>c*v.shade)); return id;
  };
  for(let axis=0;axis<3;axis++) for(let z=0;z<size;z++) for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const p=[x,y,z], q=[x,y,z]; q[axis]++;
    const a=sample(densities,...p,n,size), b=sample(densities,...q,n,size); if((a<0)===(b<0)) continue;
    const ids=EDGE_AXES[axis][1].map(offset=>vertex(x+offset[0],y+offset[1],z+offset[2])); if(ids.some(id=>id<0)) continue;
    // With density negative in solid, the interpolation gradient points outward.
    // This ordering is corrected against that gradient below for all three axes.
    const tri=[ids[0],ids[1],ids[2],ids[0],ids[2],ids[3]];
    const ax=positions[ids[1]*3]-positions[ids[0]*3], ay=positions[ids[1]*3+1]-positions[ids[0]*3+1], az=positions[ids[1]*3+2]-positions[ids[0]*3+2];
    const bx=positions[ids[2]*3]-positions[ids[0]*3], by=positions[ids[2]*3+1]-positions[ids[0]*3+1], bz=positions[ids[2]*3+2]-positions[ids[0]*3+2];
    const cx=ay*bz-az*by, cy=az*bx-ax*bz, cz=ax*by-ay*bx;
    const nx=normals[ids[0]*3],ny=normals[ids[0]*3+1],nz=normals[ids[0]*3+2];
    if(cx*nx+cy*ny+cz*nz < 0) indices.push(tri[0],tri[2],tri[1],tri[3],tri[5],tri[4]); else indices.push(...tri);
  }
  return { positions:new Float32Array(positions), normals:new Float32Array(normals), colors:new Float32Array(colors), materialIds:new Uint8Array(materialIds), rockWeights:new Float32Array(rockWeights), shades:new Float32Array(shades), indices:new Uint32Array(indices) };
}
