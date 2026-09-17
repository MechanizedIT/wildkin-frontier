import fs from 'node:fs';
import * as THREE from '../../../../../vendor/three.module.js';
import {WORLD_DATA} from '../../../../../src/world/data/world.generated.js';
import {ROOTBOUND_CURATED_SCENERY} from '../../../../../src/world/frontierRootbound.js';
const ids=['asset_fallen_log','asset_mushroom_ring'];
const assets=ids.map(id=>{
  const asset=WORLD_DATA.visualAssets.find(a=>a.id===id), box=new THREE.Box3();
  let triangles=0;
  for(const part of asset.parts){
    if(part.shape!=='mesh') throw new Error('Census only handles actual mesh parts');
    const t=new THREE.Object3D();
    t.position.set(part.position.x,part.position.y,part.position.z);
    t.rotation.set(part.rotation.x,part.rotation.y,part.rotation.z);
    t.scale.set(part.scale.x,part.scale.y,part.scale.z);t.updateMatrix();
    const p=part.geometry.positions;
    for(let i=0;i<p.length;i+=3)box.expandByPoint(new THREE.Vector3(p[i],p[i+1],p[i+2]).applyMatrix4(t.matrix));
    triangles+=part.geometry.indices.length/3;
  }
  return {id,displayName:asset.displayName,role:asset.gameplay?.role,collision:asset.collision,
    partCount:asset.parts.length,triangles,bounds:{min:box.min.toArray(),max:box.max.toArray(),extent:box.getSize(new THREE.Vector3()).toArray()},
    palette:[...new Set(asset.parts.map(p=>p.color))]};
});
const report={status:'Source-only kit inventory; no render, live residency, harvestability or placement proof',
  axis:'Three.js Y-up metres; source part transforms applied',assets,
  lanternRecords:ROOTBOUND_CURATED_SCENERY.filter(p=>p.key.startsWith('lantern-'))};
fs.writeFileSync(new URL('./existing-kit-census.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
