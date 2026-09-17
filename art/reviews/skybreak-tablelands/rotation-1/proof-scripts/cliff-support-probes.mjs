import { readFileSync, writeFileSync } from 'node:fs';
import { WORLD_DATA } from '../../src/world/data/world.generated.js';
import { sampleFrontierHeight } from '../../src/world/frontierTerrain.js';
import { SKYBREAK_ROUTE } from '../../src/world/frontierLandform.js';

const OUT = new URL('../../art/reviews/skybreak-tablelands/rotation-1/kit/cliff-support-probes.json', import.meta.url);
const STEP = .25;
const ROUTE_SHOULDER = 1.2;
const HOME = { id: 'mossling-home', x: 9.5, z: -231.5, radius: 3.1 };
const FLOWERS = [
  { id: 'cloudflower-west', x: 13, z: -232, radius: 1.5125 },
  { id: 'cloudflower-center', x: 13.5, z: -231.5, radius: 1.5125 },
  { id: 'cloudflower-east', x: 15, z: -231, radius: 1.5125 },
];
const CRYSTAL = { id: 'crystal', x: 32, z: -214, radius: 2.34 };
const CANDIDATES = [
  { id: 'west-toe-a', assetId: 'asset_verdant_cliff_toe', x: 2.2, z: -223.0, yaw: .35, scale: .62, role: 'west broken-rim toe' },
  { id: 'west-toe-b', assetId: 'asset_verdant_cliff_toe', x: 1.7, z: -225.5, yaw: -.30, scale: .60, role: 'west broken-rim toe' },
  { id: 'west-toe-c', assetId: 'asset_verdant_cliff_toe', x: 3.4, z: -221.8, yaw: .72, scale: .58, role: 'west broken-rim toe' },
  { id: 'north-buttress-a', assetId: 'asset_verdant_cliff_buttress', x: 5.1, z: -238.7, yaw: .08, scale: .56, role: 'north backstop buttress' },
  { id: 'north-buttress-b', assetId: 'asset_verdant_cliff_buttress', x: 4.5, z: -239.5, yaw: -.35, scale: .53, role: 'north backstop buttress' },
  { id: 'north-buttress-c', assetId: 'asset_verdant_cliff_buttress', x: 7.0, z: -240.0, yaw: .22, scale: .50, role: 'north backstop buttress' },
  { id: 'east-ledge-a', assetId: 'asset_verdant_cliff_ledge', x: 21.2, z: -223.0, yaw: Math.PI / 2, scale: .48, role: 'east outlet shelf' },
  { id: 'east-toe-b', assetId: 'asset_verdant_cliff_toe', x: 21.0, z: -221.8, yaw: Math.PI / 2 + .28, scale: .60, role: 'east outlet toe' },
  { id: 'east-ledge-c', assetId: 'asset_verdant_cliff_ledge', x: 22.5, z: -224.5, yaw: 1.18, scale: .45, role: 'east outlet shelf' },
];

function hull2D(points) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z);
  const cross = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const half = list => { const result = []; for (const p of list) { while (result.length >= 2 && cross(result.at(-2), result.at(-1), p) <= 1e-9) result.pop(); result.push(p); } return result; };
  return half(sorted).slice(0, -1).concat(half([...sorted].reverse()).slice(0, -1));
}
function inside(p, polygon) {
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) { const a = polygon[i], b = polygon[(i + 1) % polygon.length]; const c = (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x); if (Math.abs(c) < 1e-9) continue; const s = Math.sign(c); if (sign && s !== sign) return false; sign = s; }
  return true;
}
function segmentDistance(x, z, a, b) { const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz))); return Math.hypot(x-(a.x+dx*t), z-(a.z+dz*t)); }
function nearestRoute(x,z) { let best={distance:Infinity,segment:-1}; for(let i=1;i<SKYBREAK_ROUTE.length;i++){const d=segmentDistance(x,z,SKYBREAK_ROUTE[i-1],SKYBREAK_ROUTE[i]);if(d<best.distance)best={distance:d,segment:i-1};} return best; }
function transformedPlan(asset, spec) { const s=spec.scale*(asset.model?.scale ?? 1),c=Math.cos(spec.yaw),sn=Math.sin(spec.yaw),v=asset.collision.vertices, out=[]; for(let i=0;i<v.length;i+=3)out.push({x:spec.x+(v[i]*c+v[i+2]*sn)*s,z:spec.z+(-v[i]*sn+v[i+2]*c)*s}); return hull2D(out); }
function footprintSamples(poly) { const xs=poly.map(p=>p.x),zs=poly.map(p=>p.z), minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs), points=[...poly]; for(let x=Math.ceil(minX/STEP)*STEP;x<=maxX+1e-9;x+=STEP)for(let z=Math.ceil(minZ/STEP)*STEP;z<=maxZ+1e-9;z+=STEP)if(inside({x,z},poly))points.push({x:+x.toFixed(4),z:+z.toFixed(4)}); return points; }
function radiusFrom(spec, poly) { return Math.max(...poly.map(p=>Math.hypot(p.x-spec.x,p.z-spec.z))); }
function probe(spec) {
 const asset=WORLD_DATA.visualAssets.find(a=>a.id===spec.assetId); const polygon=transformedPlan(asset,spec), samples=footprintSamples(polygon);
 const heightPoints=samples.map(p=>({...p,height:sampleFrontierHeight(p.x,p.z)})); const heights=heightPoints.map(p=>p.height); const min=Math.min(...heights),max=Math.max(...heights); const minSample=heightPoints.find(p=>Math.abs(p.height-min)<1e-9); const radius=radiusFrom(spec,polygon), route=nearestRoute(spec.x,spec.z);
 const proximity=[HOME,...FLOWERS,CRYSTAL].map(item=>({id:item.id, distance:+Math.hypot(spec.x-item.x,spec.z-item.z).toFixed(3), clearance:+(Math.hypot(spec.x-item.x,spec.z-item.z)-radius-item.radius).toFixed(3)}));
 const minClearance=Math.min(...proximity.map(x=>x.clearance));
 const routeClearance=route.distance-radius-ROUTE_SHOULDER;
 const supportRange=max-min;
 const reasons=[];
 if (minClearance < 0) reasons.push('protected-footprint-overlap');
 if (routeClearance < 0) reasons.push('route-shoulder-overlap');
 if (supportRange > .32) reasons.push('terrain-span-exceeds-0.32m');
 return { ...spec, assetHullVertexCount:asset.collision.vertices.length/3, polygonVertexCount:polygon.length, fullFootprintSampleCount:samples.length,
   baseRule:'baseY = minimum sampleFrontierHeight over the 0.25m grid clipped to the transformed convex-hull planform, including planform vertices; use only after full mesh/physics admission.',
   baseY:+min.toFixed(4), baseSample:{x:+minSample.x.toFixed(4),z:+minSample.z.toFixed(4),height:+minSample.height.toFixed(4)}, terrainMaxY:+max.toFixed(4), terrainSpan:+supportRange.toFixed(4), conservativePlanformRadius:+radius.toFixed(4),
   route:{nearestSegment:route.segment, centerDistance:+route.distance.toFixed(4), requiredShoulder:ROUTE_SHOULDER, clearance:+routeClearance.toFixed(4)},
   protectedClearances:proximity, preliminaryStatus:reasons.length?'REJECT': 'SUPPORT-CANDIDATE', rejectionReasons:reasons, planform:polygon.map(p=>({x:+p.x.toFixed(4),z:+p.z.toFixed(4)})) };
}
const probes=CANDIDATES.map(probe);
const result={
  status:'planning diagnostic only; root must still run complete transformed-hull camera projection and native route checks.',
  sampler:'sampleFrontierHeight (current detailed Skybreak triangle sampler)', sampleStepMeters:STEP,
  routeClearanceContract:'candidate hull planform radius must clear the centreline by 1.2m beyond its radius; this conservatively preserves the planned core/shoulder but does not replace physical route testing.',
  protectedFootprints:{mosslingHome:HOME, flowers:FLOWERS, crystal:CRYSTAL},
  probes,
  selectedSupportCandidates:probes.filter(p=>p.preliminaryStatus==='SUPPORT-CANDIDATE').map(p=>p.id),
  rejectedCandidates:probes.filter(p=>p.preliminaryStatus!=='SUPPORT-CANDIDATE').map(p=>({id:p.id,reasons:p.rejectionReasons})),
};
writeFileSync(OUT, JSON.stringify(result,null,2)+'\n');

console.log(JSON.stringify({selected:result.selectedSupportCandidates,rejected:result.rejectedCandidates,probes:probes.map(p=>({id:p.id,status:p.preliminaryStatus,span:p.terrainSpan,route:p.route.clearance,minProtected:Math.min(...p.protectedClearances.map(v=>v.clearance))}))},null,2));
function scan({id,assetId,x0,x1,z0,z1,scale,yaws}) {
 const rows=[];
 for(let x=x0;x<=x1+1e-9;x+=.5)for(let z=z0;z<=z1+1e-9;z+=.5)for(const yaw of yaws){
  const p=probe({id:`${id}@${x.toFixed(1)},${z.toFixed(1)},${yaw.toFixed(2)}`,assetId,x:+x.toFixed(2),z:+z.toFixed(2),yaw,scale,role:`${id} bounded scan`});
  if(!p.rejectionReasons.includes('protected-footprint-overlap') && !p.rejectionReasons.includes('route-shoulder-overlap')) rows.push(p);
 }
 return rows.sort((a,b)=>a.terrainSpan-b.terrainSpan || b.route.clearance-a.route.clearance).slice(0,8);
}
const scans=[
 {id:'west-toe',assetId:'asset_verdant_cliff_toe',x0:0,x1:5,z0:-227,z1:-219,scale:.58,yaws:[-.45,0,.45]},
 {id:'north-buttress',assetId:'asset_verdant_cliff_buttress',x0:1,x1:8,z0:-242,z1:-235,scale:.50,yaws:[-.45,0,.45]},
 {id:'east-ledge',assetId:'asset_verdant_cliff_ledge',x0:18,x1:25,z0:-227,z1:-219,scale:.45,yaws:[.8,1.2,1.6]},
].map(def=>({id:def.id,best:scan(def)}));
result.shelfScans=scans;
for(const entry of scans) console.log(entry.id, entry.best.map(p=>({id:p.id,span:p.terrainSpan,route:p.route.clearance,clear:Math.min(...p.protectedClearances.map(v=>v.clearance))})));
writeFileSync(OUT, JSON.stringify(result,null,2)+'\n');


const refinements=[
 { id:'west-toe-refined-0.55', assetId:'asset_verdant_cliff_toe', x:5, z:-227, yaw:-.45, scale:.55, role:'west broken-rim toe refinement' },
 { id:'west-toe-refined-0.50', assetId:'asset_verdant_cliff_toe', x:5, z:-227, yaw:-.45, scale:.50, role:'west broken-rim toe refinement' },
];
result.refinements=refinements.map(probe);
console.log('refinements', result.refinements.map(p=>({id:p.id,span:p.terrainSpan,route:p.route.clearance,clear:Math.min(...p.protectedClearances.map(v=>v.clearance)),status:p.preliminaryStatus})));
writeFileSync(OUT, JSON.stringify(result,null,2)+'\n');


const plannedZoneChecks=[
 { id:'north-buttress-plan-zone-4,-236', assetId:'asset_verdant_cliff_buttress',x:4,z:-236,yaw:0,scale:.5,role:'north band x=4 edge'},
 { id:'north-buttress-plan-zone-5,-236', assetId:'asset_verdant_cliff_buttress',x:5,z:-236,yaw:0,scale:.5,role:'north band'},
 { id:'north-buttress-plan-zone-6,-236', assetId:'asset_verdant_cliff_buttress',x:6,z:-236,yaw:0,scale:.5,role:'north band'},
 { id:'north-buttress-plan-zone-8,-238', assetId:'asset_verdant_cliff_buttress',x:8,z:-238,yaw:0,scale:.5,role:'north band centre'},
];
result.plannedZoneChecks=plannedZoneChecks.map(probe);
console.log('planned zone',result.plannedZoneChecks.map(p=>({id:p.id,span:p.terrainSpan,status:p.preliminaryStatus,reasons:p.rejectionReasons})));
writeFileSync(OUT, JSON.stringify(result,null,2)+'\n');


const forwardScans=[
 {id:'forward-toe',assetId:'asset_verdant_cliff_toe',x0:20,x1:29,z0:-228,z1:-213,scale:.52,yaws:[-.6,0,.6]},
 {id:'forward-ledge',assetId:'asset_verdant_cliff_ledge',x0:20,x1:29,z0:-228,z1:-213,scale:.44,yaws:[.4,.9,1.4]},
 {id:'forward-buttress',assetId:'asset_verdant_cliff_buttress',x0:20,x1:29,z0:-228,z1:-213,scale:.42,yaws:[-.4,0,.4]},
].map(def=>({id:def.id,best:scan(def)}));
result.forwardScans=forwardScans;
console.log('forward',forwardScans.map(entry=>({id:entry.id,best:entry.best.map(p=>({id:p.id,span:p.terrainSpan,route:p.route.clearance,pro:Math.min(...p.protectedClearances.map(v=>v.clearance))}))})));
writeFileSync(OUT, JSON.stringify(result,null,2)+'\n');


const forwardAlternatives=[
 {id:'forward-toe-low',assetId:'asset_verdant_cliff_toe',x:20,z:-213,yaw:.6,scale:.52,role:'forward low toe'},
 {id:'forward-buttress-cap',assetId:'asset_verdant_cliff_buttress',x:22,z:-226,yaw:.4,scale:.42,role:'forward cap buttress'},
 {id:'forward-ledge-east-a',assetId:'asset_verdant_cliff_ledge',x:26,z:-220,yaw:1.2,scale:.42,role:'forward east ledge'},
 {id:'forward-ledge-east-b',assetId:'asset_verdant_cliff_ledge',x:27,z:-222,yaw:1.2,scale:.40,role:'forward east ledge'},
 {id:'forward-toe-east',assetId:'asset_verdant_cliff_toe',x:27,z:-220,yaw:0,scale:.50,role:'forward east toe'},
 {id:'forward-buttress-east',assetId:'asset_verdant_cliff_buttress',x:26,z:-220,yaw:0,scale:.40,role:'forward east buttress'},
].map(probe);
result.forwardAlternatives=forwardAlternatives;
console.log('alternatives',forwardAlternatives.map(p=>({id:p.id,span:p.terrainSpan,route:p.route.clearance,pro:Math.min(...p.protectedClearances.map(v=>v.clearance)),status:p.preliminaryStatus,reasons:p.rejectionReasons})));
writeFileSync(OUT, JSON.stringify(result,null,2)+'\n');
result.recommendedCandidates = result.forwardAlternatives.filter(p => ['forward-toe-low', 'forward-buttress-cap'].includes(p.id));
for (const candidate of result.recommendedCandidates) candidate.recommendationCaveat = 'Forward-corridor support candidate only; full transformed mesh projection plus post-profile and physical-route proof remain required.';
writeFileSync(OUT, JSON.stringify(result,null,2)+'\n');

const projectionGridChecks=[
 {id:'grid-left-buttress-16,-228',assetId:'asset_verdant_cliff_buttress',x:16,z:-228,yaw:.4,scale:.65,role:'crown left edge medium buttress'},
 {id:'grid-right-buttress-16,-222',assetId:'asset_verdant_cliff_buttress',x:16,z:-222,yaw:.4,scale:.65,role:'crown right edge medium buttress'},
 {id:'grid-left-buttress-18,-226',assetId:'asset_verdant_cliff_buttress',x:18,z:-226,yaw:.4,scale:.65,role:'crown left edge medium buttress'},
 {id:'grid-left-buttress-20,-226',assetId:'asset_verdant_cliff_buttress',x:20,z:-226,yaw:.4,scale:.65,role:'crown left edge medium buttress'},
].map(probe);
result.projectionGridChecks=projectionGridChecks;
result.recommendedCandidates=projectionGridChecks.filter(p=>p.preliminaryStatus==='SUPPORT-CANDIDATE');
console.table(projectionGridChecks.map(p=>({id:p.id,span:p.terrainSpan,base:p.baseY,route:p.route.clearance,protected:Math.min(...p.protectedClearances.map(v=>v.clearance)),status:p.preliminaryStatus,reasons:p.rejectionReasons})));
writeFileSync(OUT, JSON.stringify(result,null,2)+'\n');

const projectionGrid = JSON.parse(readFileSync(new URL('../../art/reviews/skybreak-tablelands/rotation-1/kit/cliff-projections-grid.json', import.meta.url), 'utf8'));
const centralProjectionRows = projectionGrid.views[0].probes.filter(row => row.mesh.central / row.mesh.total > .75);
const centralSupportRows = centralProjectionRows.map(row => {
 const p = probe({id:`grid:${row.name}`,assetId:row.asset,x:row.x,z:row.z,yaw:row.yaw,scale:row.scale,role:'full projection-grid candidate'});
 p.projection = { centralFraction:+(row.mesh.central / row.mesh.total).toFixed(4), meshBounds:{minX:+row.mesh.minX.toFixed(2),minY:+row.mesh.minY.toFixed(2),maxX:+row.mesh.maxX.toFixed(2),maxY:+row.mesh.maxY.toFixed(2)} };
 return p;
});
const centralAdmissible = centralSupportRows.filter(p=>p.preliminaryStatus==='SUPPORT-CANDIDATE').sort((a,b)=>b.projection.centralFraction-a.projection.centralFraction || a.terrainSpan-b.terrainSpan || b.route.clearance-a.route.clearance);
result.embeddedAttachmentPlan=[...centralSupportRows.filter(p=>p.assetId==='asset_verdant_cliff_buttress' && ((p.x===20&&p.z===-226)||(p.x===28&&p.z===-220)))];
result.projectionGridJoin={totalRows:projectionGrid.views[0].probes.length, centralRows:centralProjectionRows.length, admissibleRows:centralAdmissible.length, admissible:centralAdmissible, rejected:centralSupportRows.filter(p=>p.preliminaryStatus!=='SUPPORT-CANDIDATE').map(p=>({id:p.id,assetId:p.assetId,x:p.x,z:p.z,yaw:p.yaw,scale:p.scale,reason:p.rejectionReasons,span:p.terrainSpan,route:p.route.clearance,protectedClearance:Math.min(...p.protectedClearances.map(v=>v.clearance)),centralFraction:p.projection.centralFraction,bounds:p.projection.meshBounds}))};
console.table(centralAdmissible.map(p=>({id:p.id,x:p.x,z:p.z,asset:p.assetId,span:p.terrainSpan,route:p.route.clearance,protected:Math.min(...p.protectedClearances.map(v=>v.clearance)),central:p.projection.centralFraction,bounds:JSON.stringify(p.projection.meshBounds)})));
writeFileSync(OUT, JSON.stringify(result,null,2)+'\n');
