import { sampleFrontierHeight } from '../../../../src/world/frontierTerrain.js';
import { sampleFrontierForageChunk } from '../../../../src/world/frontierEcology.js';
import { sampleFrontierWildlifeChunk } from '../../../../src/world/frontierWildlife.js';
import { WORLD_DATA } from '../../../../src/world/data/world.generated.js';
const size={width:1.1,depth:1.1,height:2.45}, player=[-449,675];
const specs=[
 {key:'lantern-margin-left-spread',assetId:'asset_verge_canopy_spread',x:-445,z:683,scale:.52,yaw:.2},
 {key:'lantern-margin-back-tall',assetId:'asset_verge_canopy_tall',x:-439,z:688,scale:.48,yaw:.12},
 {key:'lantern-margin-back-spread',assetId:'asset_verge_canopy_spread',x:-443,z:686,scale:.5,yaw:.1},
];
const sources=[];for(const [cx,cz] of [[-10,13],[-9,13],[-10,14],[-9,14]]){sources.push(...sampleFrontierForageChunk(cx,cz,{visualAssets:WORLD_DATA.visualAssets}).map(v=>({type:'forage',x:v.pos.x,z:v.pos.z})),...sampleFrontierWildlifeChunk(cx,cz,{visualAssets:WORLD_DATA.visualAssets}).map(v=>({type:'home',x:v.homePos.x,z:v.homePos.z})));}
const check=s=>{const hw=size.width*s.scale/2,hd=size.depth*s.scale/2,c=Math.cos(s.yaw),q=Math.sin(s.yaw),pts=[[0,0],[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([x,z])=>[s.x+x*c+z*q,s.z-x*q+z*c]);const h=pts.map(p=>sampleFrontierHeight(...p));return {...s,bearing:{points:pts.map(([x,z],i)=>({x,z,height:h[i]})),min:Math.min(...h),max:Math.max(...h),span:Math.max(...h)-Math.min(...h),baseY:h[0],embeddedBelowMax:Math.max(...h)-h[0],topY:h[0]+size.height*s.scale},playerDistance:Math.hypot(s.x-player[0],s.z-player[1]),nearestSourceM:Math.min(...sources.map(v=>Math.hypot(s.x-v.x,s.z-v.z)))};};
console.log(JSON.stringify({schema:'lantern-composition-r2-bearing-proof/v1',contract:'existing canopy collider uses a 1.1m square trunk; base is the authoritative selection center terrain height and outer lower geometry intentionally embeds where local ground exceeds it',canopies:specs.map(check)},null,2));
