// Phase 0.5A falsification probe. Metres, fixed object frame, no body pose.
// The site IDs are full integer addresses; hashes only generate site jitter.
export const ROCK_SPACING = .5;
export const ROCK_CELL_METERS = 1.5;
const JITTER = .72;

function hash(seed, x, y, z, salt = 0) {
  let h = (seed ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b) ^ Math.imul(z, 0xc2b2ae35) ^ salt) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
function unit(h) { return h / 0x100000000; }
export function rockDomain(seed = 9212026, cellMeters = ROCK_CELL_METERS) {
  if (!Number.isSafeInteger(seed)) throw new Error('rock seed must be an integer');
  if(![1.5,2,2.5].includes(cellMeters))throw new Error('Unsupported rock fracture-cell scale');
  const a = unit(hash(seed, 0, 0, 0, 11)) * Math.PI * 2;
  const b = (unit(hash(seed, 0, 0, 0, 23)) - .5) * .65;
  return Object.freeze({ id: `rock:${seed}${cellMeters===ROCK_CELL_METERS?'':`:s${cellMeters}`}`, version: 1, seed, cellMeters, yaw: a, pitch: b });
}
function fracturePoint(domain, p) {
  const c = Math.cos(domain.yaw), s = Math.sin(domain.yaw), d = Math.cos(domain.pitch), t = Math.sin(domain.pitch);
  const x = c * p[0] - s * p[2], z = s * p[0] + c * p[2];
  return [(x * d - p[1] * t) / domain.cellMeters, (x * t + p[1] * d) / domain.cellMeters, z / domain.cellMeters];
}
function site(domain, x, y, z) {
  const k = domain.seed;
  return {
    bin: [x, y, z], id: `${domain.id}:v${domain.version}:${x},${y},${z},0`,
    p: [x + .5 + (unit(hash(k,x,y,z,1))-.5)*JITTER,
      y + .5 + (unit(hash(k,x,y,z,2))-.5)*JITTER,
      z + .5 + (unit(hash(k,x,y,z,3))-.5)*JITTER],
  };
}
function squared(a,b) { return (a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2; }
function nearest(domain, point, radius) {
  const q=fracturePoint(domain, point), bin=q.map(Math.floor);
  let best=null, distance=Infinity;
  for(let z=bin[2]-radius;z<=bin[2]+radius;z++)
    for(let y=bin[1]-radius;y<=bin[1]+radius;y++)
      for(let x=bin[0]-radius;x<=bin[0]+radius;x++) {
        const candidate=site(domain,x,y,z), d=squared(q,candidate.p);
        if(d<distance || (d===distance && candidate.id<best.id)) {best=candidate;distance=d;}
      }
  if (!best) throw new Error(`No nearest site: ${JSON.stringify({domain,point,q,bin,sample:site(domain,0,0,0)})}`);
  return best;
}
// With one site in each bin and jitter <= .72, a site from a bin more than two
// steps away cannot beat a candidate in the query bin. The radius-four oracle
// tests this bound over negative and positive coordinates.
export function nearestRockSite(domain, point) { return nearest(domain, point, 2); }
export function oracleRockSite(domain, point) { return nearest(domain, point, 4); }
function parseSite(domain, id) {
  const prefix=`${domain.id}:v${domain.version}:`;
  if(!id.startsWith(prefix)) throw new Error('site belongs to another fracture domain');
  const fields=id.slice(prefix.length).split(',').map(Number);
  if(fields.length!==4 || fields[3]!==0 || fields.some(n=>!Number.isSafeInteger(n))) throw new Error('invalid full site ID');
  return site(domain, fields[0],fields[1],fields[2]);
}
export function fractureCellDistance(domain, id, point) {
  const selected=parseSite(domain,id), q=fracturePoint(domain,point), [bx,by,bz]=selected.bin;
  let signed=-Infinity;
  for(let z=bz-3;z<=bz+3;z++)for(let y=by-3;y<=by+3;y++)for(let x=bx-3;x<=bx+3;x++){
    if(x===bx&&y===by&&z===bz)continue;
    const other=site(domain,x,y,z), separation=Math.sqrt(squared(selected.p,other.p));
    const plane=(squared(q,selected.p)-squared(q,other.p))/(2*separation);
    signed=Math.max(signed,plane);
  }
  return signed*domain.cellMeters;
}
export function makeRockSamples({centers=[[0,0,0]]}={}) {
  const spacing=ROCK_SPACING, min=[-3,-3,-3], max=[3,3,8], size=max.map((v,i)=>Math.round((v-min[i])/spacing)+1);
  const length=size[0]*size[1]*size[2], densities=new Float32Array(length), materials=new Uint8Array(length);
  const position=i=>{const x=i%size[0], y=Math.floor(i/size[0])%size[1], z=Math.floor(i/(size[0]*size[1]));return [min[0]+x*spacing,min[1]+y*spacing,min[2]+z*spacing];};
  for(let i=0;i<length;i++){
    const p=position(i);
    densities[i]=Math.min(...centers.map(([cx,cy,cz])=>{
      const x=p[0]-cx,y=p[1]-cy,z=p[2]-cz;
      const warp=.12*Math.sin(2.1*x+1.3*z)*Math.cos(1.7*y-.6*z);
      return Math.hypot(x/.99,y/1.04,z/1.01)-1.95+warp;
    }));
    materials[i]=densities[i]<0?1:0;
  }
  return {spacing,min,max,size,densities,materials,position};
}
export function cutRockSamples(samples,domain,hit,{edgeBandMeters=.04,material=1}={}) {
  if(!Number.isFinite(edgeBandMeters)||edgeBandMeters<.04||edgeBandMeters>.35)throw new Error('Invalid rock cut band');
  let start=-1,best=Infinity;
  const selected=nearestRockSite(domain,hit), id=selected.id;
  for(let i=0;i<samples.densities.length;i++){
    if(samples.densities[i]>=0||samples.materials[i]!==material)continue;
    const p=samples.position(i);if(nearestRockSite(domain,p).id!==id)continue;
    const d=squared(p,hit);if(d<best){best=d;start=i;}
  }
  if(start<0)return {id,changed:0,reason:'no occupied sample in selected fracture cell'};
  const [nx,ny,nz]=samples.size, plane=nx*ny, seen=new Uint8Array(samples.densities.length), stack=[start];seen[start]=1;
  const patch=[];
  while(stack.length){
    const i=stack.pop();patch.push(i);
    const x=i%nx,y=Math.floor(i/nx)%ny,z=Math.floor(i/plane);
    for(const [j,ok] of [[i-1,x>0],[i+1,x<nx-1],[i-nx,y>0],[i+nx,y<ny-1],[i-plane,z>0],[i+plane,z<nz-1]]){
      if(!ok||seen[j]||samples.densities[j]>=0||samples.materials[j]!==material)continue;
      if(nearestRockSite(domain,samples.position(j)).id!==id)continue;
      seen[j]=1;stack.push(j);
    }
  }
  const candidates=new Set(patch);
  if(edgeBandMeters>.04)for(const i of patch){const x=i%nx,y=Math.floor(i/nx)%ny,z=Math.floor(i/plane);
    for(const [j,ok] of [[i-1,x>0],[i+1,x<nx-1],[i-nx,y>0],[i+nx,y<ny-1],[i-plane,z>0],[i+plane,z<nz-1]])if(ok)candidates.add(j);
  }
  let changed=0;
  for(const i of candidates){if(samples.densities[i]<0&&samples.materials[i]!==material)continue;
    const p=samples.position(i),boundary=fractureCellDistance(domain,id,p);
    if(boundary>edgeBandMeters)continue;
    const next=Math.max(samples.densities[i],-boundary+edgeBandMeters);
    if(next>samples.densities[i]+1e-6){samples.densities[i]=next;samples.materials[i]=next<0?1:0;changed++;}
  }
  return {id,changed};
}
