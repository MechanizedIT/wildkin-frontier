import {TerrainChunkWorld,excavateSphere} from '../lab/voxel/terrain-chunks.js';
import {MATTER_MATERIAL} from '../lab/voxel/matter-material-policy.js';
const centers=[[6.2,4.2,9],[6.8,4.2,9],[7.4,4.2,9],[6.2,4.7,9],[6.8,4.7,9],[7.4,4.7,9],[6.2,5.2,9],[6.8,5.2,9],[7.4,5.2,9],[6.2,5.7,9]],world=new TerrainChunkWorld();
for(const center of centers){const result=await world.editSamples(excavateSphere(world,center,.88,MATTER_MATERIAL.DIRT));if(result.status!=='COMMITTED')throw new Error(JSON.stringify(result));if(world.actors.length){
  const evidence=result.event.supportEvidence;console.log(JSON.stringify({queries:evidence.queries.map(({pass,status,candidateCount,workUnits,reason})=>({pass,status,candidateCount,workUnits,reason})),
    collapse:result.event.collapseEvidence,postTransferDirtCells:result.event.postTransferDirtCells,ledger:result.event.ledger},null,2));break;}}
