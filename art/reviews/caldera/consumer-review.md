# Caldera consumer review

Read-only independent source review on September 13, 2026. I reviewed the Caldera additions in `frontierScenery`, `frontierEcology`, `frontierWildlife`, and the current-location field-plan chain in `frontierPurpose` / `createBetaGame` / `main`. I relied on the owners' focused 32/32 scenery, 29/29 life, and 14/14 purpose/HUD results rather than rerunning them. I did not review the Caldera profile math.

## R3 foliage verdict: SOURCE PASS; visual score remains separate

The Caldera ground-cover metadata follows the existing immutable scenery-spec path. Full Caldera weight reduces an Ironspine patch from `.4` to `.12` density, scales the existing tuft geometry to `.86` in X/Z and `.42` in Y, and blends its instance tint 90% toward burnt rust. It adds no mesh, owner, or loop. `groundPatchKey` includes density, regional weights, and Caldera weight, so a cached ordinary patch cannot be reused with the new silhouette/tint. Both synchronous and incremental visual construction drain the same `buildFrontierSceneryVisual` generator, including cache hit/miss behavior, bounded placement attempts, matrices, colors, and cleanup. The owner's focused Caldera 3/3 and visual 1/1 results are consistent with these source contracts.

The initial R3 delta had one fixed-coordinate exclusion defect: `admitScenerySpec` and `createFrontierGroundCoverFilter` rejected the Caldera lane at zero Caldera weight. The bounded injected-flat probe was:

```text
custom terrain sample, calderaWeight: 0
ground cover at (850,-1968): false
same sample at nearby control (850,-1920): true
```

**Repaired and independently verified:** both paths now obtain the terrain sample once and apply `overlapsFrontierCalderaClearLane` only when `calderaWeight(sample) > 0`. Admission passes that same sample through `hasSafeFootprint` and `isClear`; the ground-cover filter does likewise. The real Caldera route remains protected, including weighted transition points, while the otherwise identical zero-weight injected sample now returns `true` at `(850,-1968)`. The focused regression records this zero-weight witness alongside the full-Caldera route rejection, and the owner reports the full scenery suite passing 33/33.

Zero Caldera weight preserves density, X/Y/Z scale, tint, and lane admission behavior. The extra zero metadata participates consistently in the current cache key and does not alter rendered output. The fixed kit admission and atomic retry findings below remain valid and were not reopened for R3. Root's final R3 visual HOLD score of 3.8 is presentation evidence and does not change this source-correctness verdict.

## R2 verdict: SOURCE PASS; native presentation remains root-owned

The R2 scenery delta closes the blocking asset-failure defect below. The canonical three-record kit now requires the exact IDs, `gameplay.role === 'prop'`, and a mesh part with bounded position/index arrays before any Caldera staged owner chunk emits its members. Removing, changing the role of, or structurally corrupting any one of the three assets produces zero `stage-caldera-*` records across all three chunks. Canonical data still produces and selects all nine.

This atomic guarantee is deliberately about the shared fixed art-kit preflight. Ordinary generated Caldera dressing still admits each valid asset independently. Normal per-prop support/resource/wildlife clearance also remains individual: a newly overlapping physical source can suppress the affected prop without hiding unrelated safe scenery. That preserves the established exclusion behavior tested by the scaled-resource and full-leash witnesses.

Incomplete fixed recipes carry a private, non-enumerable symbol marker on the temporary returned array. Both synchronous cache insertion and incremental `setScenery` reject that marker. No partial fixed recipe enters the bounded maps, no new collection or lifetime owner was added, and recreating the build after restoring the kit retries the three missing owner recipes and reaches the canonical 25 ordinary cached chunks. The incremental job fails and releases its existing point/place memos rather than publishing a partial completed array.

The scenery owner reports Caldera 3/3 and full scenery 33/33 passing. I inspected the repair source and tests rather than rerunning those accepted results. The new near transforms and native presentation score remain separate from this source verdict.

The root-owned Caldera grass tint also passes this source review. It changes instance color only after every existing placement, scale, yaw, clearance, and count decision. `calderaWeight === 0` preserves sibling habitat colors exactly; the transition blends by the existing weight. It reuses the same bounded 96-instance `InstancedMesh`, geometry, material, and draw path, adding no vegetation owner or loop. Root's extended regional foliage test passed 1/1.

## R1 finding, now repaired

The fixed breach composition is not actually atomic when only part of its required art kit is unavailable or malformed. `sampleFrontierSceneryChunk` calls `admitScenerySpec` independently for each staged record. The existing missing-kit test removes all three Caldera assets together, so it cannot prove the receipt's claim that a missing asset leaves no partial formation.

A bounded source probe against the current data demonstrated the failure:

```text
remove asset_ember_spire   -> 6/9 staged props remain
remove asset_ember_bloom   -> 5/9 staged props remain
remove asset_pebble_cluster -> 7/9 staged props remain
replace ember_spire parts with [{}] -> all four staged specs in chunk 16,-40 are still emitted
```

The malformed-parts case is material because the visual builder rejects parts without mesh positions/indices, after selection and ground-cover ownership have accepted the spec. That can leave invisible composition members and grass associated with an object that never rendered.

**Repair applied in R2:** `frontierScenery.js` now has one Caldera-kit admission helper requiring the exact three IDs, `gameplay.role === 'prop'`, and at least one structurally renderable mesh part with position/index arrays. It preflights the complete kit before emitting a `stage-caldera-*` member in any of the three owner chunks. Generated ordinary/infill Caldera props continue through the same helper individually, so an unavailable decorative type does not erase the habitat's broad dressing.

**Focused proof now present:** each required asset is separately removed, assigned the wrong role, and given malformed mesh parts; every case asserts zero staged Caldera IDs across chunks `16,-40`, `17,-40`, and `17,-41`. Canonical data emits all nine and residency centered at `17,-40` selects all nine. The same bounded cache is then repaired from 22 completed ordinary recipes to the canonical 25 without retaining the three incomplete owner recipes.

## Contracts that pass source review

- **Stable identities and persistence:** crystal is `f1:r:16:-40:300`, iron is `f1:r:17:-40:301`, and the territorial Emberhorn is `f1:w:17:-40:300`. Resource depletion and creature capture continue through their existing ledgers and runtime retirement paths. The scenery IDs remain the nine `f2c:s:<cx>:<cz>:stage-caldera-*` records.
- **Current canonical asset records:** crystal and iron are exact harvestable assets with positive box colliders; Emberhorn is the exact `wildkin` asset with `speciesTag: emberhorn`. Its catalog values match the emitted encounter: 12 health, 2.1 speed, 2 damage, 4.5m roam, 7m notice, and 10m leash. The three scenery assets exist as canonical prop records. The scenery admission defect above concerns partial or malformed input, not today's canonical records.
- **Scaled physical clearance:** fixed scenery uses radius times instance scale; crystal uses 1.30m, iron 0.93m, and the Emberhorn exclusion uses its complete 10m movement disk plus the scenery footprint. The shared lane predicate rejects any footprint intersection. Both minerals use their full land/support radii and positive collider admission. The Emberhorn validates its whole 10m disk on land, through bowl/breach zones, and against local height steps/support.
- **Ordinary exclusions and caps:** ordinary resource disks and wildlife movement disks are kept outside the fixed crater core; strong-Caldera scenery suppresses inherited canopy/reed/lily/mushroom output. In the canonical owner chunks, ordinary forage is suppressed and each chunk emits its one fixed mineral. The wildlife center chunk returns only the fixed encounter, which has resident priority 1 and wins the existing four-actor / one-signature cap. Scenery residency centered at `17,-40` selects all nine staged IDs within the unchanged 18-item protected-window cap. Low Caldera scenery remains deliberately nonblocking; terrain owns the shoulders.
- **Residency/failure lifecycle:** ecology rebuilds only the near 3x3 and retires unloaded chunk placements; wildlife uses the same near 3x3, removes captured/unloaded sources, and never restores the captured fixed ID. Scenery continues through completed immutable recipe arrays and transactional visual publication. No new lifetime scan, save owner, collider owner, or unbounded collection was introduced.
- **HUD priority and disclosure:** the field plan receives one sample at the player's current position only. It exposes the current dry habitat name and chooses Caldera shelf/breach copy only while the player's sampled `habitatId` is `emberglass-caldera`; it does not enumerate remote habitats, place a map marker, or reveal the fixed content coordinates. Swimming remains the outer presentation priority. In the pure purpose path, pending bonds remain first, ready Mossling healing remains ahead of critical-health return, critical health remains ahead of Caldera guidance, and Camp/core paths remain outside the Caldera branch. The displayed habitat name updates from the same current sample and falls back to `Frontier` for unavailable/water samples.

## Nonblocking proof gap

The pure purpose tests cover the Caldera branch and urgent priorities, and the HUD presentation tests cover suppression/highlighting. There is no focused test at the `createBetaGame.getModel()` seam proving that two player positions yield two current habitat names while the injected sampler is called only for that position, or that `contentLand:false` suppresses the name/hint. Root's native run can verify the visible result now; a later narrow game-model test would close this wiring gap without adding quest or map state.

Bounded probes used for this review:

```text
node --input-type=module -e "...remove one Caldera scenery asset and sample the three staged chunks..."
node --input-type=module -e "...replace ember_spire parts with [{}] and sample chunk 16,-40..."
node --input-type=module -e "...sample canonical Caldera resources and selected scenery residency..."
```

Canonical probe results were one crystal, one iron, 18 selected protected-window scenery specs including all nine staged members, and no cap loss. These probes establish source behavior only; they do not replace root's native visibility, interaction, combat, harvesting, escape, or reload evidence.
