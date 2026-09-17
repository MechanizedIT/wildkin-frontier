import { WORLD_DATA } from '../../../../src/world/data/world.generated.js';
import { sampleFrontierHeight } from '../../../../src/world/frontierTerrain.js';
import { sampleFrontierForageChunk } from '../../../../src/world/frontierEcology.js';
import { sampleFrontierWildlifeChunk } from '../../../../src/world/frontierWildlife.js';

const asset = WORLD_DATA.visualAssets.find(item => item.id === 'asset_rootfall_center');
const verts = asset.collision.vertices;
const camera = [-455.99276139193347, 17.604375352389624, 668.7520763407613];
const target = [-449, 10.791309738159185, 675];
const normalize = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };
const sub = (a,b) => a.map((v,i)=>v-b[i]);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot = (a,b) => a.reduce((sum,v,i)=>sum+v*b[i],0);
const forward=normalize(sub(target,camera)), right=normalize(cross(forward,[0,1,0])), up=cross(right,forward);
const fov=52*Math.PI/180, aspect=412/915;
const resources=[];
for(const [cx,cz] of [[-10,13],[-9,13]]) resources.push(...sampleFrontierForageChunk(cx,cz,{visualAssets:WORLD_DATA.visualAssets}));
const homes=[];
for(const [cx,cz] of [[-10,13],[-9,13]]) homes.push(...sampleFrontierWildlifeChunk(cx,cz,{visualAssets:WORLD_DATA.visualAssets}));
function candidate(x,z,yaw){
 const c=Math.cos(yaw),s=Math.sin(yaw), world=[];
 for(let i=0;i<verts.length;i+=3){const lx=verts[i],ly=verts[i+1],lz=verts[i+2];world.push([x+lx*c+lz*s,ly,z-lx*s+lz*c]);}
 const h=world.map(p=>sampleFrontierHeight(p[0],p[2])); const base=Math.min(...h);
 const projected=world.map(p=>{const d=sub([p[0],base+p[1],p[2]],camera),depth=dot(d,forward);const nx=dot(d,right)/(depth*Math.tan(fov/2)*aspect),ny=dot(d,up)/(depth*Math.tan(fov/2));return {x:(nx+1)*206,y:(1-ny)*457.5,depth};});
 const visible=projected.filter(p=>p.depth>0&&p.x>=0&&p.x<=412&&p.y>=145&&p.y<=600);
 const clear=Math.min(...resources.map(r=>Math.hypot(x-r.pos.x,z-r.pos.z)),...homes.map(r=>Math.hypot(x-r.homePos.x,z-r.homePos.z)));
 return {x,z,yaw,baseY:base,supportSpan:Math.max(...h)-base,screen:{visibleVertices:visible.length,totalVertices:world.length,bounds:{x:[Math.min(...projected.map(p=>p.x)),Math.max(...projected.map(p=>p.x))],y:[Math.min(...projected.map(p=>p.y)),Math.max(...projected.map(p=>p.y))]}},nearestSourceM:clear};
}
const candidates=[];
for(const [x,z,yaw] of [[-439,684,0],[-438,684,.5],[-439,686,0],[-437,684,0],[-440,684,.5],[-438,682,0]])candidates.push(candidate(x,z,yaw));
console.log(JSON.stringify({schema:'lantern-composition-r1-rootfall-center-probe-v1',asset:{id:asset.id,collisionVertices:verts.length/3},camera:{camera,target,forward,right,up,fovDeg:52,frame:[412,915],useful:[0,412,145,600]},candidates},null,2));

