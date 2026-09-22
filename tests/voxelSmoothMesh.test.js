import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { meshSurfaceNets } from '../lab/voxel/surface-nets.js';
import { meshMarchingTetrahedra } from '../lab/voxel/marching-tetrahedra.js';

function field(size, offset, fn) {
  const n=size+2,densities=new Float32Array(n**3),materials=new Uint8Array(n**3);
  for(let z=-1;z<=size;z++)for(let y=-1;y<=size;y++)for(let x=-1;x<=size;x++) { const i=(x+1)+n*((y+1)+n*(z+1)); densities[i]=fn(x+offset[0],y+offset[1],z+offset[2]); materials[i]=densities[i]<0 ? (x+y+z&1?2:1) : 0; }
  return {size,densities,materials,spacing:.5};
}
function hash(mesh) { const h=createHash('sha256'); for(const a of Object.values(mesh))h.update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));return h.digest('hex'); }
function winding(mesh) { for(let i=0;i<mesh.indices.length;i+=3){const a=mesh.indices[i]*3,b=mesh.indices[i+1]*3,c=mesh.indices[i+2]*3,ux=mesh.positions[b]-mesh.positions[a],uy=mesh.positions[b+1]-mesh.positions[a+1],uz=mesh.positions[b+2]-mesh.positions[a+2],vx=mesh.positions[c]-mesh.positions[a],vy=mesh.positions[c+1]-mesh.positions[a+1],vz=mesh.positions[c+2]-mesh.positions[a+2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;assert.ok(nx*nx+ny*ny+nz*nz>1e-12,'every emitted triangle has physical area');assert.ok(nx*mesh.normals[a]+ny*mesh.normals[a+1]+nz*mesh.normals[a+2]>1e-8,'every sphere face winds outward');} }

test('smooth mesh: density interpolation creates curved sphere and deterministic outward surfaces',()=>{
  const input=field(16,[0,0,0],(x,y,z)=>(x-7.5)**2+(y-7.5)**2+(z-7.5)**2-31);
  for(const mesher of [meshSurfaceNets,meshMarchingTetrahedra]) { const a=mesher(input),b=mesher(input);assert.ok(a.indices.length>0);assert.equal(hash(a),hash(b));assert.ok(Math.min(...a.positions)<3.5&&Math.max(...a.positions)>4);winding(a); }
  const smooth=meshSurfaceNets(input);const fractional=Array.from(smooth.positions).some(v=>Math.abs(v*2-Math.round(v*2))>1e-4);assert.ok(fractional,'crossing interpolation is not cube-aligned');
});

test('smooth mesh: sign edit opens a local physical hole',()=>{
  const input=field(16,[0,0,0],(x,y,z)=> x<8 ? -1 : 1);const before=meshSurfaceNets(input);const n=18;
  // Excavate a 3x3 patch through the otherwise planar solid face.
  for(let z=6;z<=9;z++)for(let y=6;y<=9;y++)for(let x=6;x<=9;x++) input.densities[(x+1)+n*((y+1)+n*(z+1))]=1;
  const after=meshSurfaceNets(input);assert.notEqual(hash(before),hash(after));assert.ok(after.indices.length>before.indices.length,'the hole gains local interior faces');
});

test('smooth mesh: bounded density AO darkens a concavity more than an exposed plane',()=>{
  const plane=field(16,[0,0,0],x=>x-8),cavity=field(16,[0,0,0],(x,y,z)=>4-Math.hypot(x-8,y-8,z-8));
  plane.materials.fill(1);cavity.materials.fill(1);
  for(const mesher of [meshSurfaceNets,meshMarchingTetrahedra]) { const brightness=mesh=>mesh.colors.reduce((s,v)=>s+v,0)/mesh.colors.length;const flat=brightness(mesher(plane)),inside=brightness(mesher(cavity));assert.ok(inside<flat-.01,`${mesher.name} samples nearby solid in the concavity`); }
});

test('smooth mesh: all-axis chunk seams have equal ghost vertices/normals and one face owner',()=>{
  const size=16;
  for(let axis=0;axis<3;axis++) { const fn=(x,y,z)=>[x,y,z][axis]+.41*[x,y,z][(axis+1)%3]+.19*[x,y,z][(axis+2)%3]-(15.5+.41*8+.19*8), a=field(size,[0,0,0],fn),o=[0,0,0];o[axis]=size;const b=field(size,o,fn),ma=meshSurfaceNets(a),mb=meshSurfaceNets(b);
    const points=(m,translate)=>{const r=[];for(let i=0;i<m.positions.length;i+=3)r.push([m.positions[i]+translate[0]*.5,m.positions[i+1]+translate[1]*.5,m.positions[i+2]+translate[2]*.5,m.normals[i],m.normals[i+1],m.normals[i+2],m.colors[i],m.colors[i+1],m.colors[i+2]].map(v=>v.toFixed(5)).join(','));return new Set(r);};
    const pa=points(ma,[0,0,0]),pb=points(mb,o),shared=[...pa].filter(p=>pb.has(p));assert.ok(shared.length>=8,`axis ${axis} seam vertex and normal`);
    const faceKey=(m,translate)=>{const keys=new Set();for(let i=0;i<m.indices.length;i+=3){const v=[0,1,2].map(k=>m.indices[i+k]*3).map(j=>[m.positions[j]+translate[0]*.5,m.positions[j+1]+translate[1]*.5,m.positions[j+2]+translate[2]*.5].map(x=>x.toFixed(5)).join(',')).sort().join('|');assert.ok(!keys.has(v),'no duplicate owned triangles');keys.add(v);}return keys;};
    const ka=faceKey(ma,[0,0,0]),kb=faceKey(mb,o);for(const k of ka)assert.ok(!kb.has(k),`axis ${axis} has unique face ownership`);
  }
});
