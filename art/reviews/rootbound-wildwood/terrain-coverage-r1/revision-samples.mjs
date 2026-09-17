import fs from 'node:fs';
import { sampleFrontierRootboundProfile } from '../../../../src/world/frontierRootbound.js';
const primary=[[-475,590],[-478,613],[-480,643],[-472,663],[-449,675],[-452,696],[-480,720],[-493,701],[-495,673],[-494,646],[-492,615],[-475,590]], optional=[[-449,675],[-427,680],[-415,694],[-430,711],[-452,696]];
const d=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)};
const lane=(x,z,points)=>Math.min(...points.slice(1).map((p,i)=>d(x,z,points[i],p)));
const bands={galleryWest:[[-508,620],[-508,646],[-508,674],[-506,698]],galleryEast:[[-458,625],[-457,652],[-457,678],[-459,697]],vergeEast:[[-421,676],[-408,688],[-407,701]],crownWest:[[-508,718],[-510,728],[-506,736]]};
const output={schema:'rootbound-terrain-coverage-r1-revision-samples/v1',samples:{}};
for(const [name,pts] of Object.entries(bands)) output.samples[name]=pts.map(([x,z])=>{const p=sampleFrontierRootboundProfile(x,z,{baseHeight:0,habitatWeight:1,protectDefaultLife:true});return {x,z,heightDelta:p.height,facetDelta:p.facetDelta??0,feature:p.feature.zone,primaryLaneM:lane(x,z,primary),optionalLaneM:lane(x,z,optional)};});
fs.writeFileSync('art/reviews/rootbound-wildwood/terrain-coverage-r1/revision-samples.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
