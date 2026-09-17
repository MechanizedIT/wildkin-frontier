// Documentation evidence only: deterministic source placements, not live residents.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sampleFrontierWildlifeChunk } from '../../../../src/world/frontierWildlife.js';
import { WORLD_DATA } from '../../../../src/world/data/world.generated.js';
import { DEFAULT_FRONTIER_WORLD } from '../../../../src/world/frontierWorld.js';
const placements=[];
for(let cx=-11;cx<=-7;cx++) for(let cz=11;cz<=15;cz++) {
  for(const p of sampleFrontierWildlifeChunk(cx,cz,{world:DEFAULT_FRONTIER_WORLD,visualAssets:WORLD_DATA.visualAssets})) {
    if(p.pos.x < -525 || p.pos.x > -325 || p.pos.z < 550 || p.pos.z > 750) continue;
    placements.push({id:p.id,originId:p.originId,speciesTag:p.speciesTag,visualAssetId:p.visualAssetId,
      pos:p.pos,homePos:p.homePos,roamRadius:p.roamRadius,leashRadius:p.leashRadius,temperament:p.temperament});
  }
}
const counts={}; for(const p of placements) counts[p.speciesTag]=(counts[p.speciesTag]??0)+1;
const report={status:'Source placement census, not live residency, capture state or play evidence',
  bounds:{minX:-525,maxX:-325,minZ:550,maxZ:750},world:DEFAULT_FRONTIER_WORLD,
  source:'src/world/frontierWildlife.js',assetData:'src/world/data/world.generated.js',counts,placements};
fs.writeFileSync(fileURLToPath(new URL('./census.json',import.meta.url)),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({counts,placements}));
