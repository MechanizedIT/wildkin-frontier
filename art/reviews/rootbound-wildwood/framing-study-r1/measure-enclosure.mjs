import fs from 'node:fs';
import * as THREE from '../../../../vendor/three.module.js';
import {WORLD_DATA} from '../../../../src/world/data/world.generated.js';
import {composeRootboundEnclosureAssets} from '../../../../tools/compose-rootbound-enclosure.mjs';
import {sampleFrontierHeight} from '../../../../src/world/frontierTerrain.js';
import {PRIMARY,BRANCH} from '../../../../src/world/rootboundShoulders.js';
export const placements = [
 {key:'gallery-shelter-west',assetId:'asset_rootbound_gallery_shelter_placeholder',x:-484.34,z:646.86,yaw:-1.19029,scale:1,kind:'low'},
 {key:'gallery-shelter-east',assetId:'asset_rootbound_gallery_shelter_placeholder',x:-474.56,z:643.14,yaw:-1.19029,scale:1,kind:'low'},
 {key:'gallery-terminus',assetId:'asset_rootbound_gallery_lintel_placeholder',x:-477.84,z:661.86,yaw:-1.19029,scale:1,kind:'low'},
 {key:'heartroot-core',assetId:'asset_rootbound_heartroot_core_placeholder',x:-471,z:726,yaw:0,scale:1.6,kind:'low'},
 {key:'heartroot-wing-west',assetId:'asset_rootbound_heartroot_wing_placeholder',x:-483,z:725,yaw:0,scale:1.5,kind:'low'},
 {key:'heartroot-wing-east',assetId:'asset_rootbound_heartroot_wing_placeholder',x:-458,z:727,yaw:0,scale:1.5,kind:'low'},
];
const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
function hull(points){const p=[...new Map(points.map(p=>[p.join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const half=a=>{const h=[];for(const q of a){while(h.length>1&&cross(h.at(-2),h.at(-1),q)<=0)h.pop();h.push(q)}return h};return [...half(p).slice(0,-1),...half(p.reverse()).slice(0,-1)]}
function pointSegment(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz)}
function inside(p,h){return h.every((a,i)=>cross(a,h[(i+1)%h.length],p)>=-1e-8)}
function segmentDistance(a,b,c,d){if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0)return 0;return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b))}
function routeDistance(h,route){if(route.some(p=>inside(p,h)))return 0;let min=Infinity;for(let i=1;i<route.length;i++)for(let j=0;j<h.length;j++)min=Math.min(min,segmentDistance(route[i-1],route[i],h[j],h[(j+1)%h.length]));return min}
const composed=composeRootboundEnclosureAssets(WORLD_DATA.visualAssets);
const rows=placements.map(spec=>{
 const asset=composed.assets.find(a=>a.id===spec.assetId),y=sampleFrontierHeight(spec.x,spec.z);
 const matrix=new THREE.Matrix4().compose(new THREE.Vector3(spec.x,y,spec.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,spec.yaw,0)),new THREE.Vector3().setScalar(spec.scale));
 const vertices=asset.parts.flatMap(p=>Array.from({length:p.geometry.positions.length/3},(_,i)=>new THREE.Vector3(...p.geometry.positions.slice(i*3,i*3+3)).applyMatrix4(matrix)));
 const h=hull(vertices.map(v=>[v.x,v.z])),box=new THREE.Box3().setFromPoints(vertices),station=spec.key.startsWith('gallery')?'galleries':'crown';
 const receipt=JSON.parse(fs.readFileSync(new URL(`${station}-baseline.json`,import.meta.url)));
 const camera=new THREE.PerspectiveCamera(52,412/915,.1,300);camera.position.fromArray(receipt.camera);camera.lookAt(new THREE.Vector3().fromArray(receipt.cameraFollow.center));camera.updateMatrixWorld(true);
 const projected=vertices.map(v=>v.clone().project(camera)).filter(v=>v.z>-1&&v.z<1),visible=projected.filter(v=>Math.abs(v.x)<1&&Math.abs(v.y)<1);
 const baseCorners=[[box.min.x,box.min.z],[box.min.x,box.max.z],[box.max.x,box.min.z],[box.max.x,box.max.z]].map(([x,z])=>({x,z,ground:sampleFrontierHeight(x,z),baseGap:box.min.y-sampleFrontierHeight(x,z)}));
 return {...spec,y,worldBounds:{min:box.min,max:box.max},hull:h,mainClearance:routeDistance(h,PRIMARY),branchClearance:routeDistance(h,BRANCH),baseCorners,visibleVertices:visible.length,totalVertices:vertices.length,screenBounds:visible.length?[Math.min(...visible.map(v=>(v.x+1)*206)),Math.max(...visible.map(v=>(v.x+1)*206)),Math.min(...visible.map(v=>(1-v.y)*457.5)),Math.max(...visible.map(v=>(1-v.y)*457.5))]:null};
});
fs.writeFileSync(new URL('enclosure-measurements.json',import.meta.url),JSON.stringify({measurements:composed.measurements,rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(({key,mainClearance,branchClearance,baseCorners,visibleVertices,screenBounds})=>({key,mainClearance,branchClearance,maxCornerGap:Math.max(...baseCorners.map(p=>p.baseGap)),minCornerGap:Math.min(...baseCorners.map(p=>p.baseGap)),visibleVertices,screenBounds})),null,2));
