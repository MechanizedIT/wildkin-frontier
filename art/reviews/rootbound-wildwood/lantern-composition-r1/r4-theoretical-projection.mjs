import fs from 'node:fs';
const audit=JSON.parse(fs.readFileSync('art/source/lantern-log-v1/manual-r4/candidate-r4/candidate-audit.json'));
const b=audit.shared_bounds; // Blender: X length, Y depth, Z up
const camera=[-455.99276139193347,17.604375352389624,668.7520763407613], target=[-449,10.791309738159185,675];
const sub=(a,b)=>a.map((v,i)=>v-b[i]), norm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l)}, cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const forward=norm(sub(target,camera)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward),tan=Math.tan(52*Math.PI/360),aspect=412/915;
function project(x,z,yaw,scale){const pts=[];for(const lx of b[0])for(const lz of b[1])for(const ly of b[2]){const rx=lx*scale,rz=lz*scale,c=Math.cos(yaw),s=Math.sin(yaw),p=[x+rx*c+rz*s,ly*scale,z-rx*s+rz*c],d=sub(p,camera),depth=dot(d,forward),nx=dot(d,right)/(depth*tan*aspect),ny=dot(d,up)/(depth*tan);pts.push({x:(nx+1)*206,y:(1-ny)*457.5,depth})}return {x,z,yaw,scale,bounds:{x:[Math.min(...pts.map(p=>p.x)),Math.max(...pts.map(p=>p.x))],y:[Math.min(...pts.map(p=>p.y)),Math.max(...pts.map(p=>p.y))]},inside:pts.filter(p=>p.depth>0&&p.x>=0&&p.x<=412&&p.y>=145&&p.y<=600).length};}
console.log(JSON.stringify({schema:'lantern-r4-theoretical-projection-v1',nativeMapping:'Blender [X,Y,Z] maps to game [X,-Z,Y]; parameters converted before any registry candidate.',camera:{camera,target,forward},r4BoundsBlender:b,candidates:[project(-444,680,.55,1.35),project(-444,682,.55,1.35),project(-442,682,.55,1.35),project(-446,680,.55,1.35),project(-440,686,.55,1.35),project(-438,686,.55,1.35),project(-442,686,.55,1.35)]},null,2));

