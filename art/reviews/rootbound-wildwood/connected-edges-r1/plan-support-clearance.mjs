import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';
import { WORLD_DATA } from '../../../../src/world/data/world.generated.js';
import { DEFAULT_FRONTIER_WORLD } from '../../../../src/world/frontierWorld.js';
import { sampleFrontier } from '../../../../src/world/frontierTerrain.js';
import { sampleFrontierForageChunk } from '../../../../src/world/frontierEcology.js';
import { sampleFrontierWildlifeChunk } from '../../../../src/world/frontierWildlife.js';
import { hasFootprintSupport } from '../../../../src/world/frontierPlacement.js';
import { computeVisualAssetBounds } from '../../../../src/world/visualFactory.js';

const OUT = new URL('./plan-support-clearance.json', import.meta.url);
const assets = WORLD_DATA.visualAssets;
const terrainOptions = { world: DEFAULT_FRONTIER_WORLD };
const heightAt = (x, z) => sampleFrontier(x, z, terrainOptions).height;
const terrainSample = (x, z) => sampleFrontier(x, z, terrainOptions);

// The sequence has 10 grouped shoulders / breaks built from 14 existing,
// already-admitted low recipes. All are non-colliding visual lows. Coordinates
// are a single bounded selection, not a search recipe.
const placements = Object.freeze([
  { group:'gallery-entry-west', key:'edge-gallery-west-01', assetId:'asset_rootbound_block_root', x:-485.5, z:625.0, scale:3.3, yaw:.30 },
  { group:'gallery-entry-east', key:'edge-gallery-east-01', assetId:'asset_rootbound_block_leaf', x:-470.4, z:630, scale:3.25, yaw:-.32 },
  { group:'gallery-west-mid', key:'edge-gallery-west-02', assetId:'asset_rootbound_block_leaf', x:-486.0, z:646.5, scale:3.55, yaw:.18 },
  { group:'gallery-east-mid', key:'edge-gallery-east-02', assetId:'asset_rootbound_block_root', x:-470.0, z:644.5, scale:3.3, yaw:-.28 },
  { group:'gallery-west-return', key:'edge-gallery-west-03', assetId:'asset_rootbound_block_root', x:-486.0, z:660.5, scale:3.45, yaw:.10 },
  { group:'gallery-east-return', key:'edge-gallery-east-03', assetId:'asset_rootbound_block_leaf', x:-467.5, z:656.5, scale:3.35, yaw:-.20 },
  { group:'gallery-west-north', key:'edge-gallery-west-04', assetId:'asset_rootbound_block_leaf', x:-486.0, z:672.0, scale:3.45, yaw:.28 },
  { group:'gallery-east-north', key:'edge-gallery-east-04', assetId:'asset_rootbound_block_root', x:-466.0, z:659.0, scale:3.2, yaw:-.14 },
  { group:'verge-outer-a', key:'edge-grove-east-01', assetId:'asset_rootbound_block_leaf', x:-425.0, z:660.0, scale:3.15, yaw:-.24 },
  { group:'verge-outer-b', key:'edge-grove-east-02', assetId:'asset_rootbound_block_root', x:-424.0, z:669.0, scale:3.0, yaw:.18 },
  { group:'grove-rear-cluster', key:'edge-grove-rear-01', assetId:'asset_rootbound_block_leaf', x:-439.5, z:696.0, scale:3.35, yaw:.08 },
  { group:'grove-rear-cluster', key:'edge-grove-rear-02', assetId:'asset_rootbound_block_root', x:-450.0, z:710.0, scale:3.2, yaw:-.22 },
  { group:'grove-west-break', key:'edge-grove-west-01', assetId:'asset_rootbound_block_leaf', x:-472.5, z:688.0, scale:2.8, yaw:.18 },
  { group:'grove-west-break', key:'edge-grove-west-02', assetId:'asset_rootbound_block_root', x:-476.5, z:693.5, scale:2.85, yaw:-.16 },
]);

const mainRoute = Object.freeze([
  [-475,590],[-478,613],[-480,643],[-472,663],[-449,675],[-452,696],[-480,720],[-493,701],[-495,673],[-494,646],[-492,615],[-475,590],
]);
const optionalRoute = Object.freeze([[-449,675],[-427,680],[-415,694],[-430,711],[-452,696]]);
const hashFile = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function pointSegDistance(p, a, b) {
  const dx=b[0]-a[0], dz=b[1]-a[1], len=dx*dx+dz*dz;
  const t=len ? clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/len,0,1) : 0;
  return Math.hypot(p[0]-(a[0]+dx*t), p[1]-(a[1]+dz*t));
}
function orient(a,b,c) { return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); }
function intersects(a,b,c,d) {
  const ab1=orient(a,b,c),ab2=orient(a,b,d),cd1=orient(c,d,a),cd2=orient(c,d,b);
  return ((ab1===0 && ab2===0) || ab1*ab2<=0) && ((cd1===0 && cd2===0) || cd1*cd2<=0);
}
function pointInPoly(p, poly) {
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j];
    if(((a[1]>p[1]) !== (b[1]>p[1])) && p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
function polySegDistance(poly,a,b) {
  if(pointInPoly(a,poly)||pointInPoly(b,poly)) return 0;
  let best=Infinity;
  for(let i=0;i<poly.length;i++) {
    const c=poly[i],d=poly[(i+1)%poly.length];
    if(intersects(a,b,c,d)) return 0;
    best=Math.min(best,pointSegDistance(c,a,b),pointSegDistance(a,c,d),pointSegDistance(b,c,d));
  }
  return best;
}
function routeDistance(poly, route) {
  let best=Infinity, segment=-1;
  for(let i=0;i<route.length-1;i++) { const d=polySegDistance(poly,route[i],route[i+1]); if(d<best){best=d;segment=i;} }
  return { distance:best, segment };
}
function transformedEnvelope(asset, p) {
  const b=computeVisualAssetBounds(asset), hw=b.size.w*p.scale/2, hd=b.size.d*p.scale/2;
  const c=Math.cos(p.yaw),s=Math.sin(p.yaw);
  const corners=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([u,v]) => [p.x+u*c+v*s,p.z-u*s+v*c]);
  const radius=Math.hypot(hw,hd);
  const samplePoints=[[p.x,p.z],...corners,...corners.map((q,i)=>[(q[0]+corners[(i+1)%4][0])/2,(q[1]+corners[(i+1)%4][1])/2])];
  const heights=samplePoints.map(([x,z])=>heightAt(x,z));
  const base=heightAt(p.x,p.z);
  const maxGradient=Math.max(...samplePoints.slice(1).map((q,i)=>Math.abs(heights[i+1]-base)/Math.hypot(q[0]-p.x,q[1]-p.z)));
  return { bounds:b, corners, radius, base, heightSpan:Math.max(...heights)-Math.min(...heights), maxGradient, sampleCount:samplePoints.length };
}
function currentForage() {
  const all=[];
  for(let cz=11;cz<=14;cz++) for(let cx=-11;cx<=-7;cx++) all.push(...sampleFrontierForageChunk(cx,cz,{getHeight:heightAt,getTerrainSample:terrainSample,visualAssets:assets,world:DEFAULT_FRONTIER_WORLD}));
  return all;
}
function currentWildlife() {
  const all=[];
  for(let cz=11;cz<=14;cz++) for(let cx=-11;cx<=-7;cx++) all.push(...sampleFrontierWildlifeChunk(cx,cz,{getTerrainSample:terrainSample,visualAssets:assets,world:DEFAULT_FRONTIER_WORLD}));
  return all;
}
const forage=currentForage(), wildlife=currentWildlife();
const output=placements.map(p=>{
  const asset=assets.find(a=>a.id===p.assetId); if(!asset) throw new Error(`Missing ${p.assetId}`);
  const envelope=transformedEnvelope(asset,p);
  const sourceFootprintRadius=.62*p.scale;
  const sourceFootprintSupport=hasFootprintSupport(p.x,p.z,{getHeight:heightAt,radius:sourceFootprintRadius,maxSlope:.32});
  const meshRecipe=Array.isArray(asset.parts)&&asset.parts.some(part=>part?.shape==='mesh'&&Array.isArray(part.geometry?.positions)&&part.geometry.positions.length>=9&&Array.isArray(part.geometry?.indices)&&part.geometry.indices.length>=3);
  const main=routeDistance(envelope.corners,mainRoute), optional=routeDistance(envelope.corners,optionalRoute);
  const resource=forage.map(n=>({id:n.id, distance:Math.hypot(p.x-n.pos.x,p.z-n.pos.z), envelopeDistance:polySegDistance(envelope.corners,[n.pos.x,n.pos.z],[n.pos.x,n.pos.z])})).sort((a,b)=>a.distance-b.distance)[0] ?? null;
  const animal=wildlife.map(n=>({id:n.id,speciesTag:n.speciesTag,distance:polySegDistance(envelope.corners,[n.homePos.x,n.homePos.z],[n.homePos.x,n.homePos.z]),movementRadius:Math.max(n.roamRadius??0,n.leashRadius??0,n.fleeLeashRadius??0)})).sort((a,b)=>a.distance-b.distance)[0] ?? null;
  return {
    ...p, kind: 'low', visualOnly: true, y: envelope.base,
    envelope: {
      local: envelope.bounds,
      cornersXZ: envelope.corners.map(q => q.map(v => Number(v.toFixed(3)))),
      radius: Number(envelope.radius.toFixed(3)),
    },
    support: {
      samples: envelope.sampleCount,
      baseHeight: Number(envelope.base.toFixed(4)),
      heightSpan: Number(envelope.heightSpan.toFixed(4)),
      maxCenterGradient: Number(envelope.maxGradient.toFixed(4)),
      sourceFootprintRadius: Number(sourceFootprintRadius.toFixed(3)), sourceFootprintSupport,
    },
    clearance: {
      mainM: Number(main.distance.toFixed(3)), mainSegment: main.segment,
      optionalM: Number(optional.distance.toFixed(3)), optionalSegment: optional.segment,
      nearestForage: resource && { ...resource, distance: Number(resource.distance.toFixed(3)) },
      nearestWildlife: animal && { ...animal, distance: Number(animal.distance.toFixed(3)) },
    },
  };
});
const report={
  purpose:'bounded connected Root Galleries and Lantern Grove outer-edge plan; visual-only low props, no source mutation',
  world:{seed:DEFAULT_FRONTIER_WORLD.seed,edition:DEFAULT_FRONTIER_WORLD.edition},
  requiredClearanceM:{mainHalfWidth:2,optionalHalfWidth:1.5,forageCenter:3.2,trailgloamMovementDisk:3.3},
  routes:{mainRoute,optionalRoute},
  currentResidentCounts:{curatedRootbound:43,forage:forage.length,wildlife:wildlife.length,trailgloam: wildlife.filter(w=>w.speciesTag==='trailgloam').map(w=>({id:w.id,home:w.homePos,leash:w.leashRadius,fleeLeash:w.fleeLeashRadius}))},
  placementCount:output.length,groupCount:new Set(output.map(p=>p.group)).size,
  naturalAdmissionCandidate:{currentCurated:43,proposedCurated:output.length,expectedCurated:43+output.length,defaultWorldOnly:true,allExistingMeshRecipes:output.every(p=>Array.isArray(assets.find(a=>a.id===p.assetId)?.parts)),allSourceFootprintsSupported:output.every(p=>p.support.sourceFootprintSupport),note:'Pre-integration candidate count. Existing selector must admit all 14 after the reviewed source append; one bounded coordinate adjustment is permitted if an actual selector exclusion differs from this evidence.'},placements:output,
  pass:{mainLane:output.every(p=>p.clearance.mainM>=2),optionalLane:output.every(p=>p.clearance.optionalM>=1.5),forageCenters:output.every(p=>!p.clearance.nearestForage||p.clearance.nearestForage.distance>=3.2),trailgloamDisk:output.every(p=>!p.clearance.nearestWildlife||p.clearance.nearestWildlife.speciesTag!=='trailgloam'||p.clearance.nearestWildlife.distance>=3.3)},
  sourceHashes:{rootbound:hashFile(new URL('../../../../src/world/frontierRootbound.js',import.meta.url)),scenery:hashFile(new URL('../../../../src/world/frontierScenery.js',import.meta.url)),wildlife:hashFile(new URL('../../../../src/world/frontierWildlife.js',import.meta.url)),worldGenerated:hashFile(new URL('../../../../src/world/data/world.generated.js',import.meta.url))}
};
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({pass:report.pass,count:output.length,groups:report.groupCount,minMain:Math.min(...output.map(x=>x.clearance.mainM)),minOptional:Math.min(...output.map(x=>x.clearance.optionalM)),minForage:Math.min(...output.map(x=>x.clearance.nearestForage?.distance??Infinity)),minTrail:Math.min(...output.filter(x=>x.clearance.nearestWildlife?.speciesTag==='trailgloam').map(x=>x.clearance.nearestWildlife.distance))},null,2));











