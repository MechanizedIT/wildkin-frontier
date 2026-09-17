import fs from 'node:fs';
import { sampleFrontierHeight } from '../../../../src/world/frontierTerrain.js';

const audit = JSON.parse(fs.readFileSync('art/source/lantern-log-v1/manual-r4/candidate-r4/candidate-audit.json'));
const [bx, by, bz] = audit.shared_bounds; // Blender X length, Y depth, Z up.
const camera = [-455.99276139193347, 17.604375352389624, 668.7520763407613];
const target = [-449, 10.791309738159185, 675];
const sub=(a,b)=>a.map((v,i)=>v-b[i]); const norm=a=>{const l=Math.hypot(...a); return a.map(v=>v/l)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const forward=norm(sub(target,camera)), right=norm(cross(forward,[0,1,0])), up=cross(right,forward);
const tan=Math.tan(52*Math.PI/360), aspect=412/915;
const yaw=.55, scale=1.35, c=Math.cos(yaw), s=Math.sin(yaw);
const localXZ=[];
for (const lx of bx) for (const blenderY of by) { // game z is -Blender Y.
  const rx=lx*scale, rz=(-blenderY)*scale;
  localXZ.push([rx*c+rz*s, -rx*s+rz*c]);
}
const protectedSources=[[-440.5,670.9],[-443.3,672.2],[-443,668.9],[-432.6,676.4],[-435.5,677.8],[-435,674.6]];
function project(x,z,baseY){
 const pts=[];
 for(const lx of bx)for(const blenderY of by)for(const blenderZ of bz){
  const rx=lx*scale, rz=(-blenderY)*scale;
  const p=[x+rx*c+rz*s,baseY+blenderZ*scale,z-rx*s+rz*c], d=sub(p,camera), depth=dot(d,forward);
  const nx=dot(d,right)/(depth*tan*aspect), ny=dot(d,up)/(depth*tan);
  pts.push({x:(nx+1)*206,y:(1-ny)*457.5,depth});
 }
 return {x:[Math.min(...pts.map(p=>p.x)),Math.max(...pts.map(p=>p.x))],y:[Math.min(...pts.map(p=>p.y)),Math.max(...pts.map(p=>p.y))],inside:pts.filter(p=>p.depth>0&&p.x>=0&&p.x<=412&&p.y>=145&&p.y<=600).length};
}
function support(x,z){
 const samples=[];
 for(const [dx,dz] of localXZ) samples.push({x:x+dx,z:z+dz,h:sampleFrontierHeight(x+dx,z+dz)});
 samples.push({x,z,h:sampleFrontierHeight(x,z)});
 const hs=samples.map(p=>p.h);
 return {min:Math.min(...hs),max:Math.max(...hs),span:Math.max(...hs)-Math.min(...hs),samples};
}
const all=[];
for(let x=-448;x<=-430;x+=1)for(let z=680;z<=700;z+=1){
 const surface=support(x,z), screen=project(x,z,surface.min), sourceDistance=Math.min(...protectedSources.map(([px,pz])=>Math.hypot(x-px,z-pz)));
 const candidate={x,z,yaw,scale,baseY:surface.min,supportSpan:surface.span,sourceDistance,screen};
 if(screen.inside===8 && screen.x[0]>=8 && screen.x[1]<=404 && screen.y[0]>=165 && screen.y[1]<=600 && sourceDistance>=4) all.push(candidate);
}
all.sort((a,b)=>a.supportSpan-b.supportSpan || Math.abs((a.screen.x[0]+a.screen.x[1])/2-206)-Math.abs((b.screen.x[0]+b.screen.x[1])/2-206));
console.log(JSON.stringify({schema:'lantern-r4-placement-scan-v1',scope:'CPU-only planning scan; no runtime admission',asset:{candidate:'manual-r4',triangles:1390,blenderBounds:audit.shared_bounds,gameBoundsAtScale:{length:(bx[1]-bx[0])*scale,depth:(by[1]-by[0])*scale,height:(bz[1]-bz[0])*scale}},pose:{camera,target,frame:[412,915],usefulRect:{x:[8,404],y:[165,600]}},groundRule:'single baseY equals the minimum sampled current terrain height over four transformed ground-box corners plus center; span is visual-grounding risk, not a relaxed collider contract',scan:{x:[-448,-430],z:[680,700],step:1,yaw,scale,protectedSources},visibleCandidates:all.slice(0,25),bestUnder032:all.filter(c=>c.supportSpan<=.32).slice(0,10),bestUnder05:all.filter(c=>c.supportSpan<=.5).slice(0,10),count:all.length},null,2));
