# Heartwood circuit source review

Initial verdict: **REPAIR** (superseded by the final review below). The 28-record table matches the frozen placement fields, the three cloudflower exceptions are narrowly gated, non-circuit selection filters the new records, and a manual shared-cache circuit → dense → circuit probe returned exact fresh-build outputs. One source selection boundary was wrong, and the focused tests did not yet prove three named closure contracts.

## Repair packet

1. **P1 — the declared starter budget misses protected lowland center `1,-4`.** `isHeartwoodCircuitResidency` adds a requirement that a circuit owner chunk be within the center's near radius. That condition is narrower than the contract's explicit lowland rectangle (`cx=-1..1`, `cz=-4..-1`) after special-surface/coast precedence. With the shipping sampler, center `1,-4` has `surfaceKind=null`, `coastDistance=380.3`, and an existing staged chunk in its near window, yet selection returns the legacy 26 records, zero `f2c:h:` records, and 12 canopies. Its `-1,-3` circuit canopy is at outer distance two and is filtered because circuit mode is false. Remove the extra near-circuit predicate (or otherwise encode the exact rectangular eligibility plus existing surface/coast precedence). Add a table-driven assertion for every center in the stated rectangle; the two actual Skybreak-shoulder centers must retain prior selection, while every remaining lowland/protected center must use the 44/52/18 maxima and admit only the circuit records geometrically visible to that window.

2. **P2 — shared-cache mode re-entry is unproved.** The new test prepares and rebuilds only center `0,-2`. It never reuses one `createFrontierSceneryRecipeCache` across a circuit window and an adjacent dense window. Add circuit → dense-adjacent → circuit and dense-adjacent → circuit → dense-adjacent sequences using the same cache. Compare each result to a fresh synchronous build, assert circuit IDs disappear from dense output, assert dense infill remains byte-exact, and assert the returned circuit recipe is exact after re-entry. The current source passed a manual `0,-2 → 2,-2 → 0,-2` probe (`52/28/0 → 1305/0/1248 → 52/28/0`), so this is a regression-proof gap rather than a demonstrated cache defect.

3. **P2 — the new canopy proof stops before the actual physics publication path.** The placement test calls `hasFootprintSupport` with a conservative 1.45 m analytic radius and checks wildlife distance, but it never builds the seven circuit canopies through `createFrontierSceneryVisual`, never inspects their emitted trunk surfaces, and never publishes those surfaces to Rapier. Add focused proof that the exact seven circuit canopy IDs produce seven trunk surfaces with the shipped 1.1 × 2.45 × 1.1 scaled/yawed footprint, center-grounded bottoms, unique surface IDs, and working collision after publication. Keep the existing analytic full-footprint support assertions; together they establish terrain support and the real collider path.

4. **P2 — “exact old gameplay identities” is only partially asserted.** The target's witness contains 14 forage IDs and four wildlife IDs. The new test asserts only the four wildlife homes; its old hashes cover scenery recipes, not gameplay. Assert the complete target forage and wildlife ID/position witness (or stable hashes derived from the base commit) for the relevant owner chunks. This closes the named identity requirement without changing generation code.

## Reviewed limits

- Source diff reviewed against `37b7d43` only for `src/world/frontierScenery.js` and `tests/frontierScenery.test.js`.
- The frozen `placements.json` fields agree with all 28 emitted records: seven canopies, 21 lows, and exactly three cloudflowers.
- Existing hash checks cover representative Skybreak, generic dense, Caldera, and adjacent selections, but they do not substitute for the missing rectangular edge and shared-cache transition cases above.
- No aggregate, package, browser, or production edit was run as part of this review.

## Final review after repair

Final verdict: **PASS** for the owned source/test scope.

- The P1 eligibility defect is fixed: `isHeartwoodCircuitResidency` now applies the starter budget to the exact `cx=-1..1`, `cz=-4..-1` rectangle only when the center is already staged-protected lowland and is neither special surface nor protected coast. The full 12-center fixture covers the result. `1,-4` now receives 44 near / 52 total with the unchanged 12 canopies; the two Skybreak-shoulder centers remain byte-exact at 18 near / 26 total and contain no circuit records.
- Both shared-cache transition orders are now exercised with one cache and compared with fresh synchronous builds. Circuit → dense → circuit and dense → circuit → dense preserve exact recipes; dense output contains no circuit IDs and retains its 1,248 infill records in the exercised adjacent window.
- The target comparison still proves all 28 exact placement fields, seven canopies / 21 lows, true owner chunks, and exactly three narrowly admitted decorative cloudflowers. Generic lowland cloudflower rejection remains covered.
- The old-gameplay witness now hashes the complete 14 forage records and all four wildlife records, in addition to the byte-exact old scenery recipes and the explicit canopy-to-leash clearances.
- Root's actual browser receipt `trunk-contact.json` closes the previously requested physical publication evidence: all seven new canopy IDs have distinct enabled Rapier static colliders, all seven are excluded from climb eligibility, and an ordinary three-second forward push hits the yawed departure trunk face and slides left while health remains five. This is stronger boundary evidence than a duplicate physics-framework unit in the owned test file.
- Focused source tests were reported passing 39/39 in 27.3 seconds. My independent post-repair probes reproduced the full rectangle counts and both cache-mode re-entry outputs.

Limits: this verdict covers `src/world/frontierScenery.js`, `tests/frontierScenery.test.js`, the frozen placement JSON, and the cited actual collider receipt. Root retains the aggregate, runtime/visual focused suites, package gate, and final native visual judgment.
