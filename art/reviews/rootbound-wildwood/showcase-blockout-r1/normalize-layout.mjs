import fs from 'node:fs';
import {normalizeRootboundBlockoutRecipes} from '../../../../tools/compose-rootbound-blockout.mjs';
import {ROOTBOUND_CURATED_SCENERY} from '../../../../src/world/frontierRootbound.js';
const path='src/world/data/world.json',world=JSON.parse(fs.readFileSync(path,'utf8'));
const ids=['asset_rootbound_block_leaf','asset_rootbound_block_root','asset_rootbound_block_thorn'];
const receipt=normalizeRootboundBlockoutRecipes(world);
fs.writeFileSync(path,JSON.stringify(world));
const route=[[-475,590],[-478,613],[-480,643],[-472,663],[-449,675],[-452,696],[-480,720],[-493,701],[-495,673],[-494,646],[-492,615],[-475,590]];
const opt=[[-449,675],[-427,680],[-415,694],[-430,711],[-452,696]];
function dist(x,z,a,b){let dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)}
const rd=(x,z,points)=>Math.min(...points.slice(1).map((b,i)=>dist(x,z,points[i],b)));
let source=fs.readFileSync('src/world/frontierRootbound.js','utf8');const rows=[];
for(const s of ROOTBOUND_CURATED_SCENERY.filter(s=>ids.includes(s.assetId))){const scale=s.key.includes('gallery')?Math.min(s.scale,2.7):s.scale;let x=s.x,z=s.z;if(s.key==='gallery-west-rib'){x=-487;z=645}if(s.key==='gallery-east-rib'){x=-470;z=649}if(s.key==='heartroot-crown-right'){x=-467;z=729}if(s.key==='heartroot-crown-left'){x=-478;z=729}if(s.key==='heartroot-crown-wing-1'){x=-481;z=731}if(s.key==='heartroot-crown-wing-2'){x=-463;z=731}if(s.key==='verge-west-seam'){x=-424;z=675}if(s.key==='verge-east-shards'){x=-409;z=694}let best=null;for(let dx=-14;dx<=14;dx+=.5)for(let dz=-14;dz<=14;dz+=.5){const nx=x+dx,nz=z+dz;if(rd(nx,nz,route)<scale+3||rd(nx,nz,opt)<scale+2)continue;const cost=dx*dx+dz*dz;if(!best||cost<best.cost)best={x:nx,z:nz,cost}}if(!best)throw Error('No valid '+s.key);const n={...s,x:best.x,z:best.z,scale};const line=`  { key: '${n.key}', assetId: '${n.assetId}', x: ${n.x}, z: ${n.z}, scale: ${n.scale}, yaw: ${n.yaw}, kind: 'low' },`;source=source.replace(new RegExp("  \\{ key: '"+s.key+"',.*?\\},"),line);rows.push({...n,fullVisualRadius:scale,primaryEdgeClearance:rd(n.x,n.z,route)-scale,branchEdgeClearance:rd(n.x,n.z,opt)-scale});}
fs.writeFileSync('src/world/frontierRootbound.js',source);fs.writeFileSync('art/reviews/rootbound-wildwood/showcase-blockout-r1/normalized-layout.json',JSON.stringify({note:'Triangle count independent of scale. Conservative full-geometry circle; primary6m/branch4m lane clear of new visual groups. Existing collision unchanged.',assets:receipt,rows},null,2)+'\n');
