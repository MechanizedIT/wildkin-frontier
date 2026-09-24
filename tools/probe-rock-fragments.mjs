import fs from 'node:fs/promises';
import R from '../vendor/rapier.js';
import { collisionStudyFixtures } from '../lab/voxel/rock-collision-study.js';
import { planFragmentColliders, adjacentFragmentPairs, mergeFragmentPair } from '../lab/voxel/rock-fragment-collider.js';
import { auditCollisionCandidate } from '../lab/voxel/rock-collision-audit.js';
await R.init();
const rows=[],out='docs/evidence/voxel-phase05a3';await fs.mkdir(out,{recursive:true});
function audit(fixture,fragments){
  const world=new R.World({x:0,y:0,z:0});
  try{
    const colliders=fragments.map(f=>{const d=R.ColliderDesc.convexHull(f.hull);if(!d)throw Error('Degenerate fragment');return world.createCollider(d);});
    world.step();return auditCollisionCandidate(R,world,fixture.mesh,fixture.record,colliders);
  }finally{world.free();}
}
for(const fixture of collisionStudyFixtures()){
  const start=performance.now(),original=planFragmentColliders(fixture),plannedMs=performance.now()-start;
  const initial=audit(fixture,original),attempts=[];let fragments=original,current=initial;
  // One deterministic smallest-adjacent-pair proposal per reduction. A failed
  // complete gameplay gate stops reduction; never accept a knowingly bad merge
  // merely to fill a 16/24/32 table. No extra decomposition search is hidden here.
  while(fragments.length>16){
    const pair=adjacentFragmentPairs(fragments)[0];if(!pair)break;
    const proposal=mergeFragmentPair(fragments,pair),result=audit(fixture,proposal);
    attempts.push({from:fragments.length,to:proposal.length,ids:pair.map(i=>fragments[i].id),passes:result.passes,legacy:result.legacy,audit:result.audit,playerProfiles:result.playerProfiles});
    if(!result.passes)break;fragments=proposal;current=result;
  }
  const row={fixture:fixture.name,fragmentCount:original.length,plannedMs,totalMs:performance.now()-start,
    inputBytes:original.reduce((n,f)=>n+f.hull.byteLength,0),initial,mergeAttempts:attempts,
    comparisons:[16,24,32].map(cap=>({cap,actualHulls:fragments.length,withinBudget:fragments.length<=cap,
      passes:fragments.length<=cap&&current.passes,status:fragments.length<=cap&&current.passes?'PROVISIONAL':'HOLD',
      reason:fragments.length>cap?'Cannot reach cap through a gate-passing adjacent merge':'Fragment hull compound fails gameplay collision gates'}))};
  rows.push(row);console.log(`${fixture.name}: ${original.length} actual fragments, legacy=${initial.legacy.maxGap}, full=${initial.passes}, retained=${fragments.length}`);
}
await fs.writeFile(`${out}/fragment-study.json`,JSON.stringify({timestamp:new Date().toISOString(),decision:'HOLD',
  scope:'One connected-fracture-fragment method; 16/24/32 ceilings. Over-ceiling raw compounds are diagnostics, never admitted runtime actors.',rows},(_,v)=>v===Infinity?'Infinity':v,2));
