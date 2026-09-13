# Incremental scenery recipe evidence

Recorded September 13, 2026 from the completed production implementation. This receipt preserves the existing single measurement; no benchmark or test was rerun while writing it.

## API and lifecycle

`createFrontierSceneryPrepareJob(residency, options, recipeCache)` prepares one supplied anticipated residency through the existing retained recipe cache. It does not predict movement or own runtime scheduling.

- `step(maxWork = 8)` processes at most `maxWork` units. One ordinary chunk recipe is one indivisible unit; each infill candidate attempt is one unit. The returned state contains `done`, `cancelled`, `failed`, `work`, `totalWork`, `preparedOrdinary`, and `preparedInfill`.
- Zero, negative, `NaN`, and infinite budgets return with zero work and leave the active job unchanged.
- `cancel()` releases the job's point memo, regional-place lookup, and pending candidate state. Later steps are inert.
- A thrown terrain or height callback marks the job failed and releases the same local state. A new job can retry normally.
- Only completed immutable ordinary or infill arrays enter the shared recipe cache. Partial cancellation and failure never publish an infill array. Recipes completed before a later failure remain valid cache entries.
- Protected starter, coast, and Skybreak residencies prepare ordinary recipes only. Dense infill remains limited to eligible near 3x3 chunks; outer resident chunks prepare ordinary recipes.
- The synchronous sampler drains the same candidate iterator used by the incremental job, preserving deterministic candidate order, IDs, transforms, support checks, place/ecology exclusions, and fixed Signal-site clearance.

## Exact measured harness

Run from the repository root in PowerShell:

```powershell
@'
import { createFrontierSceneryBuild, createFrontierSceneryPrepareJob, createFrontierSceneryRecipeCache } from './src/world/frontierScenery.js';
import { sampleFrontier, sampleFrontierHeight } from './src/world/frontierTerrain.js';
import { WORLD_DATA } from './src/world/data/world.generated.js';
const grid=(cx,cz)=>{const chunks=[];for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++)chunks.push({id:`${x},${z}`,cx:x,cz:z});return {center:{cx,cz},chunks};};
const options={visualAssets:WORLD_DATA.visualAssets,getTerrainSample:sampleFrontier,getHeight:sampleFrontierHeight,heightMatchesTerrainSample:true};
const cache=createFrontierSceneryRecipeCache();
const current=createFrontierSceneryBuild(grid(-2,4),options,cache); current.releaseTerrainMemo();
const job=createFrontierSceneryPrepareJob(grid(-3,4),options,cache), samples=[];
let state;
do { const start=performance.now(); state=job.step(1); samples.push(performance.now()-start); } while(!state.done);
const sorted=[...samples].sort((a,b)=>a-b), percentile=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))];
console.log(JSON.stringify({steps:samples.length,totalMs:+samples.reduce((a,b)=>a+b,0).toFixed(1),maxStepMs:+Math.max(...samples).toFixed(3),p95Ms:+percentile(.95).toFixed(3),p99Ms:+percentile(.99).toFixed(3),state,cache:cache.getSceneryDebugState()}));
'@ | node --input-type=module
```

Measured westward A transition from a fully built center `(-2,4)` to anticipated center `(-3,4)`:

```json
{"steps":777,"totalMs":121.9,"maxStepMs":5.074,"p95Ms":0.175,"p99Ms":1.723,"state":{"done":true,"cancelled":false,"failed":false,"work":0,"totalWork":776,"preparedOrdinary":5,"preparedInfill":3},"cache":{"ordinaryCount":30,"infillCount":12}}
```

The 776 work units comprise five newly completed ordinary recipes, three newly completed near-infill recipes, their candidate attempts, and infill setup units. The extra 777th call skips remaining cache hits and observes completion with zero work. The 5.074 ms maximum was one indivisible ordinary recipe; candidate units were bounded separately. The 121.9 ms sum is recipe preparation time distributed across calls, not an end-to-end frame or visual rebuild measurement.

## Output and lifecycle proof

The final focused suite passed **30/30** with:

- incremental drain output deeply equal to direct synchronous selection;
- every reported positive step at or below its requested work budget;
- explicit zero, negative, `NaN`, and infinite budget no-ops;
- partial cancellation leaving one completed ordinary entry and zero infill entries, followed by inert stepping;
- a failure after partial candidate work leaving zero infill entries, followed by a successful clean retry;
- immutable cache promotion from outer ordinary to near infill;
- exact protected starter, Skybreak, and coast ordered-ID hashes.

The iterator refactor was also compared with the saved locked-density packet at `.dream-loop/scenery-density/result.json`:

| Fixture | Center | Saved specs | Production specs | IDs/transforms parity |
| --- | --- | ---: | ---: | --- |
| A | `(-2,4)` | 1,109 | 1,109 | exact |
| B | `(-3,6)` | 1,937 | 1,937 | exact |

This preparation removes the whole dense-chunk recipe from the boundary transition only when the runtime begins early enough to finish the job. It does not reduce total recipe computation, incrementalize ordinary recipes internally, build visual instances, prepare ground-cover geometry, or guarantee that the runtime's time budget can finish all 776 units before residency changes.
