import fs from 'node:fs';
import { sampleFrontierHeight } from '../../../../src/world/frontierTerrain.js';
const world=JSON.parse(fs.readFileSync('src/world/data/world.json','utf8'));
const camera=[-455.99276139193347,17.604375352389624,668.7520763407613], target=[-449,10.791309738159185,675];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);const norm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l)};const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const forward=norm(sub(target,camera)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward),tan=Math.tan(52*Math.PI/360),aspect=412/915;
const current=[
 {key:'lantern-log',assetId:'asset_fallen_log',x:-444,z:678,scale:.95,yaw:.45,stable:true},
 {key:'lantern-ring-a',assetId:'asset_mushroom_ring',x:-442,z:678,scale:.9,yaw:.2,stable:true},
 {key:'lantern-ring-b',assetId:'asset_mushroom_ring',x:-444,z:681,scale:.85,yaw:-.4,stable:true},
 {key:'thorn-a',assetId:'asset_fen_stone',x:-448,z:679,scale:.85,yaw:.1,stable:true},
 {key:'thorn-b',assetId:'asset_fen_stone',x:-446,z:679,scale:.8,yaw:-.35,stable:true},
];
const planned=[
 {key:'lantern-colony-r4',assetId:'manual-r4',x:-440,z:688,scale:1.35,yaw:.55,baseY:7.87756252988604,cluster:'rear colony'},
 {key:'lantern-colony-lily',assetId:'asset_fen_lily',x:-441,z:688,scale:1.05,yaw:.2,cluster:'rear colony'},
 {key:'lantern-colony-ring',assetId:'asset_mushroom_ring',x:-441,z:687,scale:.82,yaw:.2,cluster:'rear colony'},
 {key:'lantern-colony-pebbles',assetId:'asset_pebble_cluster',x:-438,z:688,scale:1.05,yaw:.2,cluster:'rear colony'},
];function bounds(id){if(id==='manual-r4')return {min:[-.9449999928474426,2.9802322831784522e-9,-.2917500138282776],max:[.8799999952316284,.824999988079071,.26969558000564575],map:'Blender [X,Y,Z] converted to game [X,Z,-Y]'};const a=world.visualAssets.find(x=>x.id===id);let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of a.parts||[])for(let i=0;i<(p.geometry?.positions?.length||0);i+=3)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p.geometry.positions[i+k]);max[k]=Math.max(max[k],p.geometry.positions[i+k])}return{min,max,map:'game native'};}
function probe(spec){const b=bounds(spec.assetId), c=Math.cos(spec.yaw||0),s=Math.sin(spec.yaw||0), local=[];for(const lx of [b.min[0],b.max[0]])for(const lz of [b.min[2],b.max[2]])local.push([lx*spec.scale*c+lz*spec.scale*s,-lx*spec.scale*s+lz*spec.scale*c]);const hs=[...local.map(([dx,dz])=>sampleFrontierHeight(spec.x+dx,spec.z+dz)),sampleFrontierHeight(spec.x,spec.z)];const base=spec.baseY??Math.min(...hs)-b.min[1]*spec.scale;const pts=[];for(const lx of [b.min[0],b.max[0]])for(const ly of [b.min[1],b.max[1]])for(const lz of [b.min[2],b.max[2]]){const p=[spec.x+(lx*spec.scale)*c+(lz*spec.scale)*s,base+ly*spec.scale,spec.z-(lx*spec.scale)*s+(lz*spec.scale)*c],d=sub(p,camera),dep=dot(d,forward),nx=dot(d,right)/(dep*tan*aspect),ny=dot(d,up)/(dep*tan);pts.push({x:(nx+1)*206,y:(1-ny)*457.5,dep});}return {...spec,bounds:b,support:{min:Math.min(...hs),max:Math.max(...hs),span:Math.max(...hs)-Math.min(...hs),baseY:base},screen:{x:[Math.min(...pts.map(p=>p.x)),Math.max(...pts.map(p=>p.x))],y:[Math.min(...pts.map(p=>p.y)),Math.max(...pts.map(p=>p.y))],inside:pts.filter(p=>p.dep>0&&p.x>=8&&p.x<=404&&p.y>=145&&p.y<=600).length}}}
console.log(JSON.stringify({schema:'lantern-grove-room-placement-probe-v1',scope:'CPU planning only; no registry/runtime mutation',pose:{camera,target,frame:[412,915]},current:current.map(probe),planned:planned.map(probe)





},null,2));

