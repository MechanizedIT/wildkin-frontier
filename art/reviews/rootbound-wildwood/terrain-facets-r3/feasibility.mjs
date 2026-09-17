// CPU-only audit of the literal R3 facet field against current 2m terrain chunks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFrontierChunk, sampleFrontier } from '../../../../src/world/frontierTerrain.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const p = JSON.parse(fs.readFileSync(path.join(here, 'parameters.json'), 'utf8'));
const out = path.join(here, 'feasibility.json');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sub = (a,b) => a.map((v,i)=>v-b[i]), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const n=Math.hypot(...a); if(!n)throw Error('zero normal'); return a.map(v=>v/n);};
const normal=(a,b,c)=>unit(cross(sub(b,a),sub(c,a)));
const range=a=>({min:Math.min(...a),max:Math.max(...a),mean:a.reduce((s,v)=>s+v,0)/a.length});
const key=(x,z)=>x+','+z;
const f=p.field, n=(f.maxX-f.minX)/f.stepM+1;
if (!Number.isInteger(n) || p.vertexReliefM.length !== n || p.vertexReliefM.some(r=>r.length!==n)) throw Error('literal lattice dimensions');
if (p.vertexReliefM[0].some(Boolean) || p.vertexReliefM.at(-1).some(Boolean) || p.vertexReliefM.some(r=>r[0]||r.at(-1))) throw Error('literal edge must be zero');
const chunks=new Map([[-10,createFrontierChunk(-10,13)],[-9,createFrontierChunk(-9,13)]]);
function exact(x,z) {
  const c=chunks.get(x<-450?-10:-9), ix=Math.round((x-c.origin.x)/2), iz=Math.round((z-c.origin.z)/2), w=c.grid.xs.length, i=iz*w+ix;
  if (Math.abs(c.origin.x+c.grid.xs[ix]-x)>1e-6||Math.abs(c.origin.z+c.grid.zs[iz]-z)>1e-6) throw Error('grid mismatch');
  return {y:c.vertices[i*3+1],cx:x<-450?-10:-9,ix,iz,index:i};
}
const vs=[];
for(let rz=0;rz<n;rz++)for(let rx=0;rx<n;rx++){
  const x=f.minX+rx*f.stepM,z=f.minZ+rz*f.stepM,b=exact(x,z),delta=p.vertexReliefM[rz][rx],q=sampleFrontier(x,z).height;
  vs.push({x,z,rx,rz,...b,deltaM:delta,candidateY:b.y+delta,queryMinusMeshM:q-b.y});
}
const at=new Map(vs.map(v=>[key(v.rx,v.rz),v]));
const tri=[];
for(let rz=0;rz<n-1;rz++)for(let rx=0;rx<n-1;rx++)for(const face of [[at.get(key(rx,rz)),at.get(key(rx,rz+1)),at.get(key(rx+1,rz))],[at.get(key(rx+1,rz)),at.get(key(rx,rz+1)),at.get(key(rx+1,rz+1))]]){
  const a=normal(...face.map(v=>[v.x,v.y,v.z])),b=normal(...face.map(v=>[v.x,v.candidateY,v.z]));
  const mean=face.reduce((s,v)=>s+v.deltaM,0)/3, sign=clamp(mean/p.perFaceMapMultiplier.fromMeanReliefM[0],-1,1), gain=p.perFaceMapMultiplier.fromMeanReliefM[1], warm=p.perFaceMapMultiplier.fromMeanReliefM[2];
  tri.push({grid:face.map(v=>[v.x,v.z]),normalRotationDeg:Math.acos(clamp(dot(a,b),-1,1))*180/Math.PI,candidateSlopeDeg:Math.acos(clamp(b[1],-1,1))*180/Math.PI,meanReliefM:mean,faceMultiplier:[1+sign*warm,1+sign*gain,1+sign*warm]});
}
const yaw=p.camera.yaw,pitch=p.camera.pitchRad,d=p.camera.effectiveDistanceM,center=[-449,10.459901237487797,675];
const orbit=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)],camera=center.map((v,i)=>v+orbit[i]*d),forward=orbit.map(v=>-v),right=unit(cross(forward,[0,1,0])),up=unit(cross(right,forward)),tan=Math.tan(p.camera.fovDeg*Math.PI/360),wh=p.camera.framePx,w=wh[0],h=wh[1],aspect=w/h;
function project(q){const rel=sub(q,camera),depth=dot(rel,forward),xn=dot(rel,right)/(depth*tan*aspect),yn=dot(rel,up)/(depth*tan);return {depthM:depth,xPx:(xn+1)*w/2,yPx:(1-yn)*h/2,inFrame:depth>0&&Math.abs(xn)<=1&&Math.abs(yn)<=1};}
const projected=tri.map(t=>{const pts=t.grid.map(pair=>at.get(key((pair[0]-f.minX)/2,(pair[1]-f.minZ)/2))),centroid=[pts.reduce((s,v)=>s+v.x,0)/3,pts.reduce((s,v)=>s+v.candidateY,0)/3,pts.reduce((s,v)=>s+v.z,0)/3],screen=project(centroid);return {...t,centroid,screen,useful:screen.inFrame&&screen.xPx>=p.camera.usefulRectPx[0]&&screen.xPx<=p.camera.usefulRectPx[1]&&screen.yPx>=p.camera.usefulRectPx[2]&&screen.yPx<=p.camera.usefulRectPx[3]};});
const result={schema:'rootbound-terrain-facets-r3-feasibility-v1',status:'CPU-only private-preview evidence',parameters:p,actualChunks:[...chunks.values()].map(c=>({id:c.id,vertices:c.vertices.length/3,triangles:c.indices.length/3})),summary:{vertices:vs.length,triangles:tri.length,changedVertices:vs.filter(v=>v.deltaM!==0).length,edgeZero:vs.filter(v=>v.rx===0||v.rz===0||v.rx===n-1||v.rz===n-1).every(v=>v.deltaM===0),queryMeshAbsM:range(vs.map(v=>Math.abs(v.queryMinusMeshM))),deltaM:range(vs.map(v=>v.deltaM)),normalRotationDeg:range(tri.map(t=>t.normalRotationDeg)),candidateSlopeDeg:range(tri.map(t=>t.candidateSlopeDeg)),faceMultiplier:range(tri.flatMap(t=>t.faceMultiplier)),usefulFaceCount:projected.filter(t=>t.useful).length,inFrameFaceCount:projected.filter(t=>t.screen.inFrame).length},vertices:vs,triangles:projected,limits:['Literal vertex relief is preview-only and does not enter terrain query, source mesh, physics, resource/home admission or route support.','The harness must duplicate indexed ground only for preview so each face has one correlated multiplier, preserve the baked map, then restore original geometry/material.','Flat material shading uses face normals from the actual modified positions; color is a restrained per-face multiplier, not random normal noise.']};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary,null,2));

