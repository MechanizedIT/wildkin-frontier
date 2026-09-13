# Fungal Hollow scenery production receipt — final R2

## Result

- Promoted the 23-prop shelf garden into stable `f1:s:fungal-hollow:*` records across four owner chunks.
- Required the complete canonical baked kit—mushroom ring, fallen log, Fen stone, trail stones and pebble cluster—before any fixed member publishes. Missing or malformed kit leaves the owner recipes uncached so the existing immutable recipe cache can retry the complete group.
- Recomputed every Y from integrated terrain. All 23 complete scaled footprints pass canonical analytic support at slope `.32`; every prop clears all four blossom footprints.
- The three final solid Fen stones retain their roles and IDs at:
  - stone-a: `(-2853,-1247.75)`, scale `.6`, yaw `.18`
  - stone-b: `(-2846.75,-1252)`, scale `.7`, yaw `-.31`
  - stone-c: `(-2858.25,-1249)`, scale `.58`, yaw `.42`
- All three solid stones clear both 6 m route capsules and the complete 10 m Thorn home at `(-2868,-1260)`. Independent final terrain sampling also proves each full footprint on the rendered 2 m surface at max slope `.32`.
- Full `1.525 * scale` fallen-log support and resource-aware Fungal clearances remain active. Nonblocking mushrooms, logs, pebbles and ground tufts may dress the outing and Thorn home; solid Fen stones reserve the complete route and home envelopes.
- Strong Fungal ordinary scenery selects from the existing mushroom, pebble, trail-stone, fallen-log and Fen-stone palette. Full-weight Fungal emits no ordinary canopy, reed or lily candidate. Counts, infill caps and 12.5 m render cells are unchanged.
- Fungal ground patches retain 78% of the existing lush density and shift the existing grass tint toward muted teal. `fungalWeight` remains part of the complete patch cache key, and fixed Fungal dressing keeps allocation priority ahead of infill.

## Bound and proof

The fixed group builds as 23 low instances, 15 low draws, 16,842 triangles, five shared geometries / 10,740 vertices, and three Fen-stone physical surfaces. It adds no canopy and does not raise scenery or ground-cluster caps.

The scenery owner’s focused command was:

`node --test tests/frontierScenery.test.js tests/frontierSceneryVisual.test.js`

That run passed **60/60** before the final bounded stone fits. It covered exact admission/counts, full-footprint support, route/home/resource clearance, adversarial ordinary Fen-stone rejection, atomic asset failure/retry, render cost, Fungal ordinary selection, patch cache identity, and existing Caldera/Camp/Skybreak/grove/cap/lifecycle siblings.

After root fitted the three final stone transforms, the independent bounded command was:

`node --test tests/frontierFungalHollow.test.js tests/frontierScenery.test.js`

Final result: **45/45 passed**, including 23/23 unique fixed IDs and strict analytic/rendered support for all three solid stones. Exact terrain slopes and grounding deltas are recorded in `.dream-loop/fungal/terrain-receipt.md`; review closure is recorded in `.dream-loop/fungal/source-review.md`.

No aggregate, build, package, browser judgment, asset or dependency change is claimed by this receipt. Native R2 appearance remains **6.5/10 HOLD**; root owns the final outing and visual evidence.
