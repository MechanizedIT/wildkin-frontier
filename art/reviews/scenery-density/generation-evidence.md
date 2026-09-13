# Dense scenery production receipt

Recorded September 13, 2026 from the production source after the fixed Signal Cache clearance repair. This preserves one measured run; the benchmark was not repeated or averaged.

## Exact timing harness

Run from the repository root in PowerShell:

```powershell
@'
import { createFrontierSceneryBuild, createFrontierSceneryRecipeCache } from './src/world/frontierScenery.js';
import { sampleFrontier, sampleFrontierHeight } from './src/world/frontierTerrain.js';
import { WORLD_DATA } from './src/world/data/world.generated.js';
const grid=(cx,cz)=>{const chunks=[];for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++)chunks.push({id:`${x},${z}`,cx:x,cz:z});return {center:{cx,cz},chunks};};
const options={visualAssets:WORLD_DATA.visualAssets,getTerrainSample:sampleFrontier,getHeight:sampleFrontierHeight,heightMatchesTerrainSample:true};
for(const [name,cx,cz] of [['A',-2,4],['B',-3,6]]){
  const cache=createFrontierSceneryRecipeCache();
  const start=performance.now(); const cold=createFrontierSceneryBuild(grid(cx,cz),options,cache); const coldMs=performance.now()-start;
  const coldCount=cold.specs.length; const coldLow=cold.specs.filter(s=>s.kind==='low').length; cold.releaseTerrainMemo();
  const shiftedStart=performance.now(); const shifted=createFrontierSceneryBuild(grid(cx-1,cz),options,cache); const shiftMs=performance.now()-shiftedStart;
  const state=cache.getSceneryDebugState();
  console.log(JSON.stringify({name,coldMs:+coldMs.toFixed(1),coldCount,coldLow,shiftWestMs:+shiftMs.toFixed(1),shiftCount:shifted.specs.length,shiftLow:shifted.specs.filter(s=>s.kind==='low').length,cache:state,memo:shifted.getTerrainMemoDebugState()}));
  shifted.releaseTerrainMemo();
}
'@ | node --input-type=module
```

## Results

| Fixture | Cold center | Cold build | Cold specs | One-chunk west shift | Shift build | Shift specs | Retained recipe cache after shift | Point memo after build |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- | --- |
| A | `(-2, 4)` | 692.6 ms | 1,109 total / 1,102 low | `(-3, 4)` | 127.9 ms | 1,558 total / 1,548 low | 30 ordinary / 12 infill | 0 height / 0 sample |
| B | `(-3, 6)` | 452.3 ms | 1,937 total / 1,925 low | `(-4, 6)` | 150.0 ms | 2,218 total / 2,206 low | 30 ordinary / 12 infill | 0 height / 0 sample |

Each fixture starts with a fresh recipe cache. Its west-shift build reuses that fixture's cache. Completed ordinary and infill recipes are immutable cached arrays. The temporary exact-point memo is released after each completed chunk recipe, so it is empty after selection while the bounded recipe cache retains overlapping chunks.

## Implementation receipt

- Near 3x3 chunks generate deterministic low-prop infill; outer 5x5 residency chunks retain ordinary canopy recipes only.
- Infill targets range from 64 to 256 accepted props per chunk according to effective Lush weight, from at most 512 stratified attempts. Residency remains bounded at 2,304 near and 2,312 total, with 12 canopies and 8 desired outer silhouettes.
- Ordinary and infill recipes have separate cache entries, so an outer-first ordinary lookup cannot suppress later near infill. Null results and throws are not cached; retry, prune, inactive clear, and disposal clear are covered by focused tests.
- `heightMatchesTerrainSample: true` is the explicit contract that permits height/sample memo coalescing. Independent custom height callbacks remain authoritative without that option.
- The shared lily support radius is 0.93. Existing solid scenery, coast, place, ecology, wildlife, forage, route, Camp, and terrain support checks remain in admission.
- The canonical Signal Cache receiver and offset chest exclude ordinary scenery, infill, and ground cover by their shared 5 m clearance plus each candidate's actual footprint. Alternate generated worlds do not inherit that fixed-site reservation.

## Protected residency proof

The focused test hashes the ordered selected ID list for three protected windows and confirms that no infill IDs enter them:

| Window | Center | IDs | SHA-256 of `JSON.stringify(ids)` |
| --- | --- | ---: | --- |
| Starter | `(0, -2)` | 26 | `0c740db352a0f532b203b5c85fe0433002a55531fcde4d3e175d0cc50af886b6` |
| Skybreak | `(0, -4)` | 26 | `df0945c1bfd1579cb86b8591fd844d8846ed7a4cb5d87c55a16c0a624708dc16` |
| Coast | `(6, 2)` | 20 | `8f1cf5b2207864a29d78befa3d93c8763054b334986987c6b15c96735809e514` |

Focused verification command:

```powershell
node --test tests/frontierScenery.test.js
```

Result: **28 tests passed, 0 failed** in 10.43 seconds. `git diff --check` for `src/world/frontierScenery.js` and `tests/frontierScenery.test.js` also passed.

## Limits

These figures measure synchronous recipe/build selection with the exact height-only callback and memo opt-in. They exclude model decoding, visual instance construction, collision registration, rendering, and unrelated frame work. The retained cache reduces a one-chunk transition to 127.9–150.0 ms in these fixtures, but that cost can still cause a visible streaming hitch; this receipt does not claim the hitch is resolved. Mixed inland windows intentionally admit dense selection, so only the explicitly protected starter, Skybreak, and coastal fixtures are asserted to retain their exact legacy resident lists.
