// Comparator for Surface Nets: a compact marching-tetrahedra implementation.
// It uses the same padded signed-density and material contract, but does not
// share vertices; useful here as a robust visual/triangle-count baseline.
import { MATERIALS } from './config.js';
import { smoothAmbientOcclusion } from './smooth-shading.js';
const C=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
const T=[[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]];
function idx(x,y,z,n){return (x+1)+n*((y+1)+n*(z+1));}
function norm(x,y,z){const l=Math.hypot(x,y,z)||1;return[x/l,y/l,z/l];}
export function meshMarchingTetrahedra({size,densities,materials,spacing=1}){
 const n=size+2;if(!Number.isInteger(size)||!(densities instanceof Float32Array)||densities.length!==n**3||!(materials instanceof Uint8Array)||materials.length!==n**3)throw new Error('marching tetrahedra expects matching padded density and material fields');
 const pos=[],nor=[],col=[],ind=[];const val=(x,y,z)=>densities[idx(x,y,z,n)];
 const add=(x,y,z,a,b,base,vs,ms)=>{const av=vs[a],bv=vs[b],t=av/(av-bv),pa=C[a],pb=C[b];let best=vs[a]<vs[b]?a:b;const localPoint=[pa[0]+(pb[0]-pa[0])*t,pa[1]+(pb[1]-pa[1])*t,pa[2]+(pb[2]-pa[2])*t],p=localPoint.map((v,i)=>([x,y,z][i]+v)*spacing);const m=ms[best]||1, id=pos.length/3;pos.push(...p);const gx=val(Math.min(size,x+pa[0]+1),y+pa[1],z+pa[2])-val(Math.max(-1,x+pa[0]-1),y+pa[1],z+pa[2]),gy=val(x+pa[0],Math.min(size,y+pa[1]+1),z+pa[2])-val(x+pa[0],Math.max(-1,y+pa[1]-1),z+pa[2]),gz=val(x+pa[0],y+pa[1],Math.min(size,z+pa[2]+1))-val(x+pa[0],y+pa[1],Math.max(-1,z+pa[2]-1)),normal=norm(gx,gy,gz),shade=smoothAmbientOcclusion(vs,localPoint,normal);nor.push(...normal);col.push(...(MATERIALS[m]?.color||MATERIALS[1].color).map(c=>c*shade));return id;};
 for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){const vs=C.map(([a,b,c])=>val(x+a,y+b,z+c)),ms=C.map(([a,b,c])=>materials[idx(x+a,y+b,z+c,n)]);for(const tt of T){const inside=tt.filter(i=>vs[i]<0),out=tt.filter(i=>vs[i]>=0);if(!inside.length||inside.length===4)continue;let tris=[];if(inside.length===1||inside.length===3){const pivot=(inside.length===1?inside:out)[0],others=(inside.length===1?out:inside);tris=[[add(x,y,z,pivot,others[0],tt,vs,ms),add(x,y,z,pivot,others[1],tt,vs,ms),add(x,y,z,pivot,others[2],tt,vs,ms)]];}else{const[a,b]=inside,[d,e]=out;const q=[add(x,y,z,a,d,tt,vs,ms),add(x,y,z,a,e,tt,vs,ms),add(x,y,z,b,e,tt,vs,ms),add(x,y,z,b,d,tt,vs,ms)];tris=[[q[0],q[1],q[2]],[q[0],q[2],q[3]]];}for(const tri of tris){const A=tri[0]*3,B=tri[1]*3,D=tri[2]*3,ux=pos[B]-pos[A],uy=pos[B+1]-pos[A+1],uz=pos[B+2]-pos[A+2],vx=pos[D]-pos[A],vy=pos[D+1]-pos[A+1],vz=pos[D+2]-pos[A+2],dot=(uy*vz-uz*vy)*nor[A]+(uz*vx-ux*vz)*nor[A+1]+(ux*vy-uy*vx)*nor[A+2];if(dot<0)ind.push(tri[0],tri[2],tri[1]);else ind.push(...tri);}}}
 return{positions:new Float32Array(pos),normals:new Float32Array(nor),colors:new Float32Array(col),indices:new Uint32Array(ind)};
}
