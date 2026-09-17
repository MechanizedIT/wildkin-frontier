# Lantern Log — modular-kit reuse assessment

**Scope:** read-only assessment of retained Lantern evidence and current Rootbound seams. It does not admit an asset, create a new model, or implement harvesting.

## What can be reused

| Family | Evidence | Reuse state | Exact boundary |
| --- | --- | --- | --- |
| Existing decorative log | `asset_fallen_log` is a static `prop`, collision `null`, with 27 anonymous `mesh_0…mesh_26` parts, 590 triangles, and a 2.8443 × 1.1363 × 2.3171m Y-up transformed envelope. | **Reuse-ready as one existing static low prop only.** | Its source parts have no semantic names or established independent attachments. Do not treat its 27 render parts as harvest children. |
| Existing decorative mushroom ring | `asset_mushroom_ring` is a static `prop`, collision `null`, with 30 anonymous `mesh_0…mesh_29` parts, 1,760 triangles, and a 1.8713 × 1.0415 × 1.5923m Y-up transformed envelope. | **Reuse-ready as one existing static low prop only.** | The object is a ring/cluster, so it is useful for present decoration but is not a named individual-cap kit. |
| Manual R4 mushroom pairs | `manual-r4/candidate-r4/candidate-audit.json` retains `stem_{hero,near_medium,back_medium,near_young_a,near_young_b,far_medium}` plus matching `cap_*`: 12 separate copied meshes. The preserved signatures, six local stem-to-log contacts, and six stem-to-cap underside contacts are recorded. | **Needs component review before reuse.** | These are the strongest candidate reusable fungus units, but their materials, pivots, and attachment rule were evaluated only inside the held R4 arrangement. |
| Manual R4 moss | `r4_moss_0`, `r4_moss_1`, and `r4_moss_2` are separately refit meshes over the R4 log. | **Needs component review before reuse.** | Their vertices were ray-fitted to the held R4 log, so they cannot be placed independently without a new support-surface test. |
| Manual R4 wood body | `r4_log`: 163 vertices / 322 triangles, 27 grounded triangles covering 0.3550103624m². | **Provisional static/component candidate; needs size and visual-debt review.** | R4’s independent score is 6.3/10 HOLD: the long extruded body and blade-like far tip are visible debt. The lower whole-object score does not discard its grounded, separately authored wood component. |
| TRELLIS R5 / R6 raw material | R5 is a 2,218,798-triangle, 1,077,634-vertex PLY with 67,425 boundary and 99,060 non-manifold edges. R6 has 240 face-bearing components and independent visual 3.6/10 HOLD. | **Not reusable as a semantic kit.** | Neither study supplies reliable log/moss/mushroom boundaries, grounded components, or a shipping candidate. No seventh repair is authorized. |

The R4 composition totals 16 components / 1,390 triangles: one log, six stems, six caps, and three moss patches. Its authored palette separates warm wood/end grain/recess (`r4_wood0`, `r4_wood1`, `r4_wood2`, `r4_groove`, `r4_endgrain`, `r4_recess`) from `r4_moss`; the source ring supplies cream/violet/pink/muted-green values. This is enough to establish a useful art kit direction, not a released material contract.

## Least-work next variation

First review the retained R4 wood, six stem/cap pairs, and three moss patches as individual source components at the intended size. If the R4 body still reads too thin in that direct comparison, compare one newly authored connected low-poly rootwood body; do not repair or extract R5/R6. The tiny source kit then consists of:

1. one reviewed stable wood base (retained R4 or the compared new body) with a documented local pivot and grounded footprint;
2. the six retained R4 stem/cap pairs, first accepted or rejected individually using their exact names/signatures;
3. three moss patches rebuilt or conformed to that new body from fresh surface contacts.

Create two static arrangements only after those component checks: (a) one mature `hero` cap with two small near caps at the broken end, and (b) one medium cap plus two small caps along a different wood-side attachment band. Each arrangement needs actual wood-surface ray or triangle contacts for every stem base and moss support, no floating placement, one shared local pivot, the complete transformed bounds, and 512/96/48px review views. Keep the open center lane clear. The existing `lantern-log` plus `lantern-ring-a`/`lantern-ring-b` records at X−444/Z678/681 are comparison evidence, not a placement authorization or a reason to reuse their scale blindly.

This tests the useful retained pieces before spending work on replacement geometry, while avoiding a new generation attempt, semantic splitting of malformed raw geometry, and a generic damage framework.

## Current integration seam

`art/source/lantern-log-v1/integration-notes.md` already maps the smallest admission route. The curated `lantern-log` recipe is `ROOTBOUND_CURATED_SCENERY` in `src/world/frontierRootbound.js`, with stable streamed ID `f1:s:rootbound-wildwood:lantern-log`; it currently uses shared `asset_fallen_log` at X=-444/Z=678, scale .95, yaw .45, kind `low`. Its Radius is supplied by `ASSET_RADIUS` in `src/world/frontierScenery.js` (`asset_fallen_log: 1.525`), and the recipe passes ordinary curated footprint admission before `frontierSceneryVisual.js` renders it.

A later admitted replacement must be a new revisioned visual-asset descriptor in canonical `src/world/data/world.json` and a local `assets/models/<revision>/model.glb`; generated data then follows the normal source command. `src/assets/modelAssetRuntime.js` already owns preload, `createExternalModelVisual`, cache sharing, and `disposeExternalModelInstance`. The gap is deliberately narrow: `frontierSceneryVisual.js` currently calls that external-model path only for `kind === 'canopy'`; `kind === 'low'` requires primitive `asset.parts` for instanced batching. A scoped external-low branch can reuse the existing loader/disposer while applying the ordinary low placement transform. It must not label the prop as canopy, which would add the canopy terrain surface/trunk collider.

## Static art versus future harvesting

Static art is feasible only after an asset passes its own visual/admission gates. It can remain a no-collider `prop` with normal Rootbound streaming and no saved state. It does **not** create harvesting, drops, progressive damage, persistence, regrowth, structure suppression, or collision.

The owner-proposed composite direction is separately held for implementation in `docs/habitats/rootbound-wildwood/constituents/composite-harvestables.md`. A later single-parent trial needs stable child IDs, one reward owner, explicit wood→fungus/moss support dependencies, collision/visibility changes together, saved depletion, safe long-timer regrowth, and qualifying-structure suppression. Current generated Frontier forage is `persistentFinite` and skips regrowth; the older 12–18 second resource defaults cannot be repurposed by a timer edit. That is an unimplemented gameplay scope, not a property of any retained Lantern mesh.

## Evidence and known defects

- [R4 matched render](manual-r4/candidate-r4/renders/r4-principal-threequarter-512.png) shows readable colony color and the same held thin plank body. Its independent review scores 6.3/10 and explicitly bars another five-section/rim-offset repair.
- [R5 raw render](geometry-ply-r5/inspection/three-quarter-512.png) retains fuller organic mass but visible fragments and an incomplete-looking underside; independent review scores 4.4/10.
- [R6 diagnostic render](cleanup-r6/diagnostic/renders/r6-three-quarter-512.png) confirms that local closure did not yield one grounded readable object; independent review closes the visit at 3.6/10 with no R7.
- `art/targets/rootbound-wildwood/constituents/lantern-log/existing-kit-census.json`, the R4 audit, and `integration-notes.md` are source evidence. None establishes live residency, runtime admission, component harvesting, or collider behavior.
