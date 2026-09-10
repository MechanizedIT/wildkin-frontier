import { getSurfaceHeight, validateSurface } from '../world/terrainSurfaceModel.js';
import { enumerateRegionAuthorObjects } from './authorObjectCollections.js';

// Preserve every authored object's offset above its supporting landscape. This
// operates on a transaction candidate, so invalid terrain cannot move half a world.
export function replaceRegionLandscape(world, regionId, surface) {
  validateSurface(surface);
  const region=world.regions.find(r=>r.id===regionId);
  if(!region)throw Error('Section not found');
  const previous=region.surface;
  const delta=(x,z)=>getSurfaceHeight(surface,x,z)-getSurfaceHeight(previous,x,z);
  const shift=position=>{if(position&&Number.isFinite(position.x)&&Number.isFinite(position.z))position.y=Number(((position.y??0)+delta(position.x,position.z)).toFixed(4));};
  for(const {obj,type} of enumerateRegionAuthorObjects(region)){
    if(type==='boundaryCollider')continue;
    if(obj.pos)shift(obj.pos);
    else if(Number.isFinite(obj.x)&&Number.isFinite(obj.z)){
      const dy=delta(obj.x,obj.z);
      if(type.startsWith('climbable')){obj.bottomY=(obj.bottomY??0)+dy;obj.topY=(obj.topY??2.4)+dy;}
      else if(type==='platform'||type==='obstacle'){obj.baseY=Number(((obj.baseY??obj.y??0)+dy).toFixed(4));obj.y=obj.baseY;}
      else obj.y=(obj.y??0)+dy;
    }
    shift(obj.respawnPosition);shift(obj.runSpawn?.position);shift(obj.homePos);
  }
  shift(region.playerSpawn?.position);
  if(regionId==='camp')shift(world.camp?.playerSpawn?.position);
  region.surface=structuredClone(surface);
}
