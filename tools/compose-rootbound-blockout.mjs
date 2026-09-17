// Maintained blockout recipe normalization for authored tree/log/mineral groups.
// world.json owns the composed parts; this tool bakes local transforms, fits
// explicit metre-scale envelopes and merges equal-color parts. No GPU required.
import * as THREE from '../vendor/three.module.js';
export const ROOTBOUND_BLOCKOUT_ASSET_IDS = Object.freeze(['asset_rootbound_block_leaf','asset_rootbound_block_root','asset_rootbound_block_thorn']);
export function normalizeRootboundBlockoutRecipes(world) {
const ids=ROOTBOUND_BLOCKOUT_ASSET_IDS,receipt=[];
for(const id of ids){const a=world.visualAssets.find(a=>a.id===id);const expanded=a.parts.map(p=>{const m=new THREE.Matrix4().compose(new THREE.Vector3(p.position.x,p.position.y,p.position.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rotation.x,p.rotation.y,p.rotation.z)),new THREE.Vector3(p.scale.x,p.scale.y,p.scale.z));return {p,vs:Array.from({length:p.geometry.positions.length/3},(_,i)=>new THREE.Vector3(...p.geometry.positions.slice(i*3,i*3+3)).applyMatrix4(m))}});const all=expanded.flatMap(e=>e.vs);const box=new THREE.Box3().setFromPoints(all),c=box.getCenter(new THREE.Vector3());const radius=Math.max(...all.map(v=>Math.hypot(v.x-c.x,v.z-c.z)));const targetHeight=id.endsWith('leaf')?1.8:id.endsWith('root')?.6:1.5;const sx=1/radius,sy=targetHeight/(box.max.y-box.min.y);const buckets=new Map();for(const {p,vs} of expanded){const key=p.color;let b=buckets.get(key);if(!b){b={...p,id:'blockout_'+buckets.size,position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1},geometry:{positions:[],indices:[]}};buckets.set(key,b)}const offset=b.geometry.positions.length/3;for(const v of vs)b.geometry.positions.push(...[(v.x-c.x)*sx,(v.y-box.min.y)*sy,(v.z-c.z)*sx].map(n=>Number(n.toFixed(5))));b.geometry.indices.push(...p.geometry.indices.map(i=>i+offset));}a.parts=[...buckets.values()];receipt.push({id,triangleCount:a.parts.reduce((n,p)=>n+p.geometry.indices.length/3,0),parts:a.parts.length,localRadius:1,height:targetHeight});}

return receipt;
}
