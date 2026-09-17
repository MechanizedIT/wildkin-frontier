import fs from 'node:fs';
import { sampleFrontierHeight } from '../../../../src/world/frontierTerrain.js';
import { WORLD_DATA } from '../../../../src/world/data/world.generated.js';
import { sampleFrontierForageChunk } from '../../../../src/world/frontierEcology.js';
import { sampleFrontierWildlifeChunk } from '../../../../src/world/frontierWildlife.js';
const camera=[-455.99276139193347,17.604375352389624,668.7520763407613],target=[-449,10.791309738159185,675],tan=Math.tan(52*Math.PI/360),aspect=412/915;
const sub=(a,b)=>a.map((v,i)=>v-b[i]),norm=a=>{const n=Math.hypot(...a);return a.map(v=>v/n)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0); const forward=norm(sub(target,camera)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward);
function glbJson(path){const b=fs.readFileSync(path);let o=12;while(o<b.length){let l=b.readUInt32LE(o),t=b.readUInt32LE(o+4);o+=8;if(t===0x4e4f534a)return JSON.parse(b.subarray(o,o+l).toString().trim());o+=l;}throw Error('JSON chunk missing');}
function externalBounds(id){const path=WORLD_DATA.visualAssets.find(a=>a.id===id).model.path;const j=glbJson(path);let mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];for(const m of j.meshes)for(const p of m.primitives){const a=j.accessors[p.attributes.POSITION];for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],a.min[k]);mx[k]=Math.max(mx[k],a.max[k]);}}return{path,min:mn,max:mx};}
const sources=[];for(const [cx,cz] of [[-10,13],[-9,13],[-10,14],[-9,14]]){sources.push(...sampleFrontierForageChunk(cx,cz,{visualAssets:WORLD_DATA.visualAssets}).map(v=>({kind:'forage',x:v.pos.x,z:v.pos.z})));sources.push(...sampleFrontierWildlifeChunk(cx,cz,{visualAssets:WORLD_DATA.visualAssets}).map(v=>({kind:'home',x:v.homePos.x,z:v.homePos.z})));}
function test(c){const b=externalBounds(c.assetId),co=Math.cos(c.yaw),si=Math.sin(c.yaw),foot=[];for(const x of [b.min[0],b.max[0]])for(const z of [b.min[2],b.max[2]])foot.push([c.x+x*c.scale*co+z*c.scale*si,c.z-x*c.scale*si+z*c.scale*co]);const h=foot.map(p=>sampleFrontierHeight(...p));const base=Math.min(...h)-b.min[1]*c.scale;const p=[];for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]]){const w=[c.x+x*c.scale*co+z*c.scale*si,base+y*c.scale,c.z-x*c.scale*si+z*c.scale*co],d=sub(w,camera),dep=dot(d,forward),nx=dot(d,right)/(dep*tan*aspect),ny=dot(d,up)/(dep*tan);p.push({x:(nx+1)*206,y:(1-ny)*457.5,dep});}const minSource=Math.min(...sources.map(s=>Math.hypot(c.x-s.x,c.z-s.z)));return {...c,bounds:b,supportSpan:Math.max(...h)-Math.min(...h),baseY:base,nearestSourceM:minSource,screen:{x:[Math.min(...p.map(q=>q.x)),Math.max(...p.map(q=>q.x))],y:[Math.min(...p.map(q=>q.y)),Math.max(...p.map(q=>q.y))],inside:p.filter(q=>q.dep>0&&q.x>=8&&q.x<=404&&q.y>=145&&q.y<=600).length}};}
const candidates=[
 {key:'left-margin-spread-a',assetId:'asset_verge_canopy_spread',x:-441,z:681,scale:.52,yaw:.2},
 {key:'left-margin-spread-b',assetId:'asset_verge_canopy_spread',x:-442,z:683,scale:.5,yaw:.15},
 {key:'left-margin-base',assetId:'asset_verge_canopy',x:-442,z:681,scale:.5,yaw:.25},
 {key:'right-margin-tall-a',assetId:'asset_verge_canopy_tall',x:-438,z:685,scale:.5,yaw:-.2},
 {key:'right-margin-tall-b',assetId:'asset_verge_canopy_tall',x:-437,z:684,scale:.48,yaw:-.2},
 {key:'right-margin-base',assetId:'asset_verge_canopy',x:-439,z:685,scale:.48,yaw:.25},
 {key:'back-margin-spread',assetId:'asset_verge_canopy_spread',x:-443,z:686,scale:.5,yaw:.1},
 {key:'back-margin-tall',assetId:'asset_verge_canopy_tall',x:-440,z:687,scale:.48,yaw:.12}
];
console.log(JSON.stringify({schema:'lantern-composition-r2-canopy-probe/v1',pose:{camera,target,frame:[412,915]},sources:{count:sources.length},candidates:candidates.map(test)},null,2));
