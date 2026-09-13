# Fungal Hollow source review — R2

Status: **PASS**

No blocking source finding remains.

The R2 repair fitted all three solid Fen cores to the actual two-metre terrain surface while retaining their stable IDs and roles: `stone-a` is now `(-2853, -1247.75)`, scale `.6`; `stone-b` is `(-2846.75, -1252)`, scale `.7`; and `stone-c` is `(-2858.25, -1249)`, scale `.58`. The strict shared test now requires every solid footprint to pass both analytic and rendered-triangle support at max slope `.32`, with grounding delta below `.12 m`; it passes without a per-stone exception. Independent sampling also confirmed all three remain outside both route capsules, the Thorn home disk, and every blossom interaction footprint.

## Closed review risks

- Shared geometry now owns the moved Thorn home at `(-2868, -1260)` while retaining index `450`, chunk `-58,-26`, and origin `f1:w:-58:-26:450`. Its complete 10 m disk is inside the 31 m outing and outside both 3 m route capsules. The focused geometry test asserts these intersections directly.
- Ordinary Fungal resources and wildlife reject the full outing using their scaled movement/interaction footprints. Ordinary solid Fen stones now reject both route capsules and the Thorn home disk; the deterministic seed-69 regression rejects the prior intrusive stone while retaining nonblocking pebble dressing.
- The four blossoms retain exact IDs `f1:r:-57:-25:400`, `f1:r:-58:-25:401`, `f1:r:-57:-26:402`, and `f1:r:-58:-26:403`. They publish before the chunk cap, use the exact canonical harvestable (`wildflower`, three chunks, fiber feedback), and remain finite through the existing persistent depletion owner. The canonical Thorn asset is admitted only as `asset_thornprowler` with role `wildkin` and exact aggressive rusher recipe; its runtime source is noncollectable and keeps normal unload/reload identity.
- The 23 fixed scenery records are stable and fixed-priority. Exact five-family mesh admission is atomic; incomplete recipes are not cached, so a repaired kit retries rather than leaving a partial group. Ground-patch cache identity includes Fungal weight, and existing bounded cache/preparation/lifecycle tests pass.
- Region integration applies one Fungal height/color blend, preserves zero-weight and protected output, and feeds the same terrain sample into full/reduced queries and chunk vertices. Route, blossom, Thorn-home, and all three solid fixed-prop analytic/mesh checks pass.

## Evidence

- Earlier consolidated command: `node --test tests/frontierFungalHollow.test.js tests/frontierEcology.test.js tests/frontierWildlife.test.js tests/frontierScenery.test.js tests/frontierSceneryVisual.test.js tests/frontierPurpose.test.js`; its sole failure was the now-repaired solid-foot mesh check.
- Final bounded command after source freeze: `node --test tests/frontierFungalHollow.test.js tests/frontierScenery.test.js`.
- Final result: **45/45 passed**. Direct integrated sampling returned **23/23 unique fixed IDs** and three solid stones with positive home/resource clearance and no route overlap.
- `git diff --check` on the reviewed production and focused test files passed; line-ending notices are warnings only.
- This review excludes unrelated Verdant working-tree changes and does not substitute for root's native outing, persistence/package, or aggregate gates.
