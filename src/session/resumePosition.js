// Restore queries use the same Rapier world and capsule as movement. They never
// move the player as a probe or accept a missing/failed collision query.
export function findSupportedResumeFeet({ feet, section, killVolumes = [], characterPhysics, ignoreCollider = () => false }) {
  if (!feet || ![feet.x,feet.y,feet.z].every(Number.isFinite)) return null;
  const bounds=section?.bounds;
  if(!bounds || feet.x<bounds.minX+.4 || feet.x>bounds.maxX-.4 || feet.z<bounds.minZ+.4 || feet.z>bounds.maxZ-.4)return null;
  const {world,RAPIER,cfg,collider}=characterPhysics;
  const filter=other=>other.handle!==collider.handle && !other.isSensor() && !ignoreCollider(other);
  try {
    const origin={x:feet.x,y:feet.y+.25,z:feet.z};
    const hit=world.castRayAndGetNormal(new RAPIER.Ray(origin,{x:0,y:-1,z:0}),.85,true,RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,undefined,collider,undefined,filter);
    if(!hit || hit.normal.y<Math.cos(cfg.maxSlopeClimbAngle) || !Number.isFinite(hit.timeOfImpact))return null;
    const y=origin.y-hit.timeOfImpact;
    if(Math.abs(y-feet.y)>.3)return null;
    const center={x:feet.x,y:y+cfg.capsuleHalfHeight+cfg.capsuleRadius+.025,z:feet.z};
    for(const volume of killVolumes){
      const dx=center.x-volume.pos.x,dz=center.z-volume.pos.z,c=Math.cos(volume.rotY??0),s=Math.sin(volume.rotY??0);
      if(Math.abs(dx*c-dz*s)<volume.size.w/2+cfg.capsuleRadius && Math.abs(dx*s+dz*c)<volume.size.d/2+cfg.capsuleRadius && Math.abs(center.y-volume.pos.y)<volume.size.h/2+cfg.capsuleHalfHeight+cfg.capsuleRadius)return null;
    }
    const overlap=world.intersectionWithShape(center,{x:0,y:0,z:0,w:1},new RAPIER.Capsule(cfg.capsuleHalfHeight,cfg.capsuleRadius),RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,undefined,collider,undefined,filter);
    return overlap ? null : {x:feet.x,y,z:feet.z};
  } catch { return null; }
}
