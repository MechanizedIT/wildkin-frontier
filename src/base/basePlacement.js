import { BASE_CONFIG, BASE_PIECE_BY_ID, FIELD_RECIPES } from './baseCatalog.js';
import { getSurfaceHeight, getWaterRadius } from '../world/terrainSurfaceModel.js';

export function getBuildBounds(tier=0) {
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
export function getCampReserved(registry) {
  const camp=registry?.getSectionById?.('camp'); if(!camp)return [];
  const items=[...(camp.props??[]).map(p=>{const collision=registry.data?.visualAssets?.find(a=>a.id===p.visualAssetId)?.collision,size=collision?.size??p.size;return {pos:p.pos,radius:/workshop|sanctuary|resonator|dropPod/.test(p.id)?2.4:Math.max(.8,size?Math.hypot(size.w??1,size.d??1)*(p.uniformScale??1)/2:(p.uniformScale??1)*1.3)};}),
    ...(camp.portalGates??[]).map(p=>({pos:p.pos,radius:(p.triggerRadius??2)+1.5})),...(camp.entryPoints??[]).map(p=>({pos:p.pos,radius:2})),...(camp.pois??[]).map(p=>({pos:p.pos,radius:2}))];
  const spawn=registry.getCampSpawnPosition?.()??registry.getCamp?.()?.playerSpawn?.position??{x:0,z:2};
  items.push({pos:spawn,radius:2});
  // Keep authored walking/service spurs accessible even after the clearing expands.
  for(const route of camp.surface?.routes??[])for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length);
    for(let j=0;j<=steps;j++){const t=j/(steps||1);items.push({pos:{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},radius:(route.width??2)/2+.5});}
  }
  return items;
}
export function validatePlacement(record,{tier=0,structures=[],playerPosition=null,reserved=[],surface=null}={}) {
  if(!record||!BASE_PIECE_BY_ID[record.type]||!record.pos||![record.pos.x,record.pos.z,record.yaw].every(Number.isFinite))return {ok:false,reason:'invalid-piece'};
  if(structures.length>=BASE_CONFIG.maxStructures)return {ok:false,reason:'structure-limit'};
  const corners=footprint(record),bounds=getBuildBounds(tier);
  if(corners.some(p=>p.x<bounds.minX||p.x>bounds.maxX||p.z<bounds.minZ||p.z>bounds.maxZ))return {ok:false,reason:'outside-clearing'};
  if(playerPosition&&circleOverlaps(record,playerPosition,.75))return {ok:false,reason:'player-overlap'};
  if(reserved.some(r=>circleOverlaps(record,r.pos,r.radius)))return {ok:false,reason:'keep-path-clear'};
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
export function normalizeFieldSupplies(raw) {return Object.fromEntries(FIELD_RECIPES.map(r=>[r.id,Number.isFinite(raw?.[r.id])?Math.min(BASE_CONFIG.maxSupply,Math.max(0,Math.floor(raw[r.id]))):0]));}
export function cloneBase(base){return {tier:base.tier,structures:base.structures.map(p=>({...p,pos:{...p.pos}}))};}
export function normalizeBase(raw,{reserved=[],surface=null}={}){
  const tier=Number.isFinite(raw?.tier)?Math.max(0,Math.min(2,Math.floor(raw.tier))):0,structures=[],ids=new Set();
  const candidates=Array.isArray(raw?.structures)?raw.structures.slice(0,BASE_CONFIG.maxStructures):[];
  // Foundations first makes normalization independent of imported list ordering.
  for(const r of [...candidates.filter(p=>p?.type==='foundation'),...candidates.filter(p=>p?.type!=='foundation')]){
    if(typeof r?.id!=='string'||!/^build_[a-zA-Z0-9_-]{1,80}$/.test(r.id)||ids.has(r.id))continue;
    const result=validatePlacement(r,{tier,structures,reserved,surface});if(!result.ok)continue;
    ids.add(r.id);structures.push({id:r.id,type:r.type,pos:result.pos,yaw:((r.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2),supportId:result.supportId});
  }
  return {tier,structures};
}
