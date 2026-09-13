import { BASE_CONFIG, BASE_PIECE_BY_ID, FIELD_RECIPES } from './baseCatalog.js';
import { getSurfaceHeight, getWaterRadius } from '../world/terrainSurfaceModel.js';
import { describeVisualAssetCollider, getColliderCenter } from '../world/colliderDescriptor.js';
import { CAMP_WORKPAD_ROUTE_ID, cloneCampLayout, getCampBuildAreas, getCampLayoutReserved, readCampLayout } from './campLayout.js';

export function getBuildBounds(tier=0) {
  if (tier && typeof tier === 'object' && tier.layout) {
    const areas = getCampBuildAreas(tier);
    return { minX: Math.min(...areas.map(a=>a.minX)), maxX: Math.max(...areas.map(a=>a.maxX)), minZ: Math.min(...areas.map(a=>a.minZ)), maxZ: Math.max(...areas.map(a=>a.maxZ)) };
  }
  if (tier && typeof tier === 'object') tier = tier.tier;
  const half=BASE_CONFIG.halfSizes[Math.max(0,Math.min(2,Math.floor(tier)||0))], c=BASE_CONFIG.center;
  return {minX:c.x-half,maxX:c.x+half,minZ:c.z-half,maxZ:c.z+half};
}
export function footprint(record) {
  const p=BASE_PIECE_BY_ID[record.type], c=Math.cos(record.yaw),s=Math.sin(record.yaw);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>({x:record.pos.x+x*p.size[0]/2*c+z*p.size[2]/2*s,z:record.pos.z-x*p.size[0]/2*s+z*p.size[2]/2*c}));
}
function polygonsOverlap(a,b) {
  for(const poly of [a,b])for(let i=0;i<4;i++){
    const edge={x:poly[(i+1)%4].x-poly[i].x,z:poly[(i+1)%4].z-poly[i].z}, axis={x:-edge.z,z:edge.x};
    const av=a.map(p=>p.x*axis.x+p.z*axis.z),bv=b.map(p=>p.x*axis.x+p.z*axis.z);
    if(Math.max(...av)<=Math.min(...bv)+.015||Math.max(...bv)<=Math.min(...av)+.015)return false;
  }
  return true;
}
function fullyOnFoundation(record,foundation) {
  const c=Math.cos(foundation.yaw),s=Math.sin(foundation.yaw),half=BASE_PIECE_BY_ID.foundation.size[0]/2+.02;
  return footprint(record).every(p=>{const dx=p.x-foundation.pos.x,dz=p.z-foundation.pos.z;return Math.abs(dx*c-dz*s)<=half&&Math.abs(dx*s+dz*c)<=half;});
}
function circleOverlaps(record,point,radius) {
  const dx=point.x-record.pos.x,dz=point.z-record.pos.z,c=Math.cos(record.yaw),s=Math.sin(record.yaw),size=BASE_PIECE_BY_ID[record.type].size;
  return Math.hypot(Math.max(0,Math.abs(dx*c-dz*s)-size[0]/2),Math.max(0,Math.abs(dx*s+dz*c)-size[2]/2))<radius;
}
function reservedOverlaps(record, reserved) {
  if (!reserved.size) return circleOverlaps(record,reserved.pos,reserved.radius);
  const c=Math.cos(reserved.yaw??0),s=Math.sin(reserved.yaw??0);
  const polygon=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>({x:reserved.pos.x+x*reserved.size.width/2*c+z*reserved.size.depth/2*s,z:reserved.pos.z-x*reserved.size.width/2*s+z*reserved.size.depth/2*c}));
  return polygonsOverlap(footprint(record),polygon);
}
function polygonArea(points) {
  return Math.abs(points.reduce((sum,p,i)=>{const next=points[(i+1)%points.length];return sum+p.x*next.z-next.x*p.z;},0))/2;
}
function clipToArea(polygon, area) {
  let points=polygon;
  for(const [axis,value,sign] of [['x',area.minX,1],['x',area.maxX,-1],['z',area.minZ,1],['z',area.maxZ,-1]]){
    const next=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length],aInside=(a[axis]-value)*sign>=0,bInside=(b[axis]-value)*sign>=0;
      if(aInside)next.push(a);
      if(aInside!==bInside){const t=(value-a[axis])/(b[axis]-a[axis]);next.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
    }
    points=next;
  }
  return points;
}
// Disjoint authored rectangles form a union; corners alone cannot validate its concave shoulders.
function insideBuildAreas(corners,areas){return Math.abs(areas.reduce((sum,area)=>sum+polygonArea(clipToArea(corners,area)),0)-polygonArea(corners))<.000001;}
export function getCampReserved(registry) {
  const camp=registry?.getSectionById?.('camp'); if(!camp)return [];
  const items=[...(camp.props??[]).map(p=>{
    const collision=registry.data?.visualAssets?.find(a=>a.id===p.visualAssetId)?.collision;
    const descriptor=collision?describeVisualAssetCollider({collision,position:p.pos,uniformScale:p.uniformScale??1,rotationY:p.rotY??0}):null;
    const size=descriptor?.size, pos=descriptor?getColliderCenter(descriptor):p.pos;
    const radius=size?Math.hypot(size.width,size.depth)/2:p.size?Math.hypot(p.size.w??1,p.size.d??1)*(p.uniformScale??1)/2:(p.uniformScale??1)*1.3;
    return {sourceId:p.id,pos,radius:/workshop|sanctuary|resonator|dropPod/.test(p.id)?2.4:Math.max(.8,radius)};
  }),
    ...(camp.portalGates??[]).map(p=>({pos:p.pos,radius:(p.triggerRadius??2)+1.5})),...(camp.entryPoints??[]).map(p=>({pos:p.pos,radius:2})),...(camp.pois??[]).map(p=>({pos:p.pos,radius:2}))];
  const spawn=registry.getCampSpawnPosition?.()??registry.getCamp?.()?.playerSpawn?.position??{x:0,z:2};
  items.push({pos:spawn,radius:2});
  // Keep authored walking/service spurs accessible even after the clearing expands.
  for(const route of camp.surface?.routes??[]){
    if(route.id===CAMP_WORKPAD_ROUTE_ID)continue; // Material-only construction pad, not a walking/service spur.
    for(let i=1;i<route.points.length;i++){
      const a=route.points[i-1],b=route.points[i],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length);
      for(let j=0;j<=steps;j++){const t=j/(steps||1);items.push({pos:{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},radius:(route.width??2)/2+.5});}
    }
  }
  return items;
}
export function validatePlacement(record,{tier=0,layout=null,structures=[],playerPosition=null,reserved=[],surface=null,preserveLegacy=false}={}) {
  if(!record||!BASE_PIECE_BY_ID[record.type]||!record.pos||![record.pos.x,record.pos.z,record.yaw].every(Number.isFinite))return {ok:false,reason:'invalid-piece'};
  if(structures.length>=BASE_CONFIG.maxStructures)return {ok:false,reason:'structure-limit'};
  const corners=footprint(record),bounds=getBuildBounds(tier);
  if(layout?!insideBuildAreas(corners,getCampBuildAreas({layout})):corners.some(p=>p.x<bounds.minX||p.x>bounds.maxX||p.z<bounds.minZ||p.z>bounds.maxZ))return {ok:false,reason:'outside-clearing'};
  if(playerPosition&&circleOverlaps(record,playerPosition,.75))return {ok:false,reason:'player-overlap'};
  const liveReserved=reserved.filter(r=>!r.sourceId||!layout?.clearedDebrisIds.includes(r.sourceId));
  if(!preserveLegacy&&[...liveReserved,...(layout?getCampLayoutReserved({layout,structures}):[])].some(r=>reservedOverlaps(record,r)))return {ok:false,reason:'keep-path-clear'};
  if(getWaterRadius(surface,record.pos.x,record.pos.z)<1)return {ok:false,reason:'wet-ground'};
  const heights=[record.pos,...corners].map(p=>getSurfaceHeight(surface,p.x,p.z));
  if(Math.max(...heights)-Math.min(...heights)>BASE_CONFIG.maxSlope)return {ok:false,reason:'uneven-ground'};
  let y=Math.max(...heights),supportId=null;
  for(const other of structures){
    if(!polygonsOverlap(corners,footprint(other)))continue;
    if(record.type!=='foundation'&&other.type==='foundation'&&fullyOnFoundation(record,other)) {y=other.pos.y+BASE_CONFIG.foundationHeight;supportId=other.id;continue;}
    return {ok:false,reason:'structure-overlap'};
  }
  return {ok:true,pos:{x:record.pos.x,y,z:record.pos.z},supportId};
}

const INITIAL_PLACEMENT_CONFIG = Object.freeze({
  legacyOffset: 2.5,
  radii: Object.freeze([2, 2.5, 3, 3.2, 4]),
});

// Finds a legal opening target without weakening any ordinary placement rule.
// The caller still owns preview/camera state and retains its red target on null.
export function findInitialPlacement({type, yaw = 0, pos} = {}, options = {}) {
  const definition = BASE_PIECE_BY_ID[type];
  if (!definition || !pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.z)) return null;
  const directions = [[1,0],[1,1],[1,-1],[0,1],[0,-1],[-1,1],[-1,-1],[-1,0]];
  const seen = new Set();
  const candidates = [{x: pos.x + INITIAL_PLACEMENT_CONFIG.legacyOffset, z: pos.z}];
  for (const radius of INITIAL_PLACEMENT_CONFIG.radii) for (const [dx,dz] of directions) {
    const scale = dx && dz ? radius / Math.SQRT2 : radius;
    candidates.push({x: pos.x + dx * scale, z: pos.z + dz * scale});
  }
  for (const candidate of candidates) {
    const candidatePos = {
      x: Math.round(candidate.x * 10) / 10,
      z: Math.round(candidate.z * 10) / 10,
    };
    const key = `${candidatePos.x},${candidatePos.z}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const result = validatePlacement({type, yaw, pos: candidatePos}, options);
    if (result.ok) return result;
  }
  return null;
}
export function normalizeFieldSupplies(raw) {return Object.fromEntries(FIELD_RECIPES.map(r=>[r.id,Number.isFinite(raw?.[r.id])?Math.min(BASE_CONFIG.maxSupply,Math.max(0,Math.floor(raw[r.id]))):0]));}
export function cloneBase(base){return {tier:base.tier,...(base.layout?{layout:cloneCampLayout(base.layout)}:{}),structures:base.structures.map(p=>({...p,pos:{...p.pos}}))};}
export function normalizeBase(raw,{reserved=[],surface=null}={}){
  const layout=readCampLayout(raw),tier=Number.isFinite(raw?.tier)?Math.max(0,Math.min(2,Math.floor(raw.tier))):0,structures=[],ids=new Set();
  const candidates=Array.isArray(raw?.structures)?raw.structures.slice(0,BASE_CONFIG.maxStructures):[];
  // Foundations first makes normalization independent of imported list ordering.
  // New scenery/reservations must never erase grandfathered construction (and
  // orphan its physical container). New placements still obey every reservation.
  for(const r of [...candidates.filter(p=>p?.type==='foundation'),...candidates.filter(p=>p?.type!=='foundation')]){
    if(typeof r?.id!=='string'||!/^build_[a-zA-Z0-9_-]{1,80}$/.test(r.id)||ids.has(r.id))continue;
    const result=validatePlacement(r,{tier,layout,structures,reserved,surface,preserveLegacy:layout.legacyApron});if(!result.ok)continue;
    ids.add(r.id);structures.push({id:r.id,type:r.type,pos:result.pos,yaw:((r.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2),supportId:result.supportId});
  }
  return {tier,layout,structures};
}
