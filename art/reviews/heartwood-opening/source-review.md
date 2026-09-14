# Heartwood opening source review — PASS

Independent bounded review finds no source repair required for R2.

- `composeHeartwoodOpening()` owns only `prop_camp_heartwood_*`: it filters that prefix, appends the exact 20 locked records in spec order, and leaves every other collection and record untouched. A second composition is byte-identical.
- `author-beta-world.mjs` calls the composer after Verdant and Shatterfen composition, immediately before the canonical write, so later authoring cannot displace the opening records.
- Canonical `world.json` contains four collision-enabled trees and 16 collision-disabled lows matching `blockout-specs.json`; it deep-equals exported `WORLD_DATA`.
- All placements use the current authored Camp surface. The focused proof reproduces `createAuthoredTerrain()`'s `ceil(span/.7)` grid, triangle split, and `-.018 m` mesh offset, then samples 64 perimeter points across each complete support footprint.
- Each tree resolves to the admitted asset's scaled box collider with authored yaw. Rotated trunk extents retain at least the four-metre central lane; complete low footprints retain the three-metre readable floor and lows resolve to no collider.
- Existing background canopy footprints and Camp bounds remain clear. The copy-only `frontierPurpose` change retains `gather-berry-lure`, live missing-cost text, and existing branch priority while stating exploration, building supplies, optional Mossling lure, and Camp `Work → Craft` access.

Focused verification: `node --test tests/heartwoodOpeningComposition.test.js tests/frontierPurpose.test.js` — 13/13 PASS.

The support artifact is `.dream-loop/heartwood/blockout-support.md` (the assigned shorthand `support.md` does not exist). Native forward/return traversal, side-trunk contact, and ordinary portrait framing remain root-owned closure evidence.

Root closure: the later ready-supplies copy also offers Build and optional lure crafting, preserving branch IDs/priorities;12 purpose tests and the1,404-test aggregate pass. Normal server generation passed after the exact holder was restarted. Actual permanent contact/walking and builder/portable continuation are recorded in receipt.md.

Final root proof correction: the test-only support sampler initially used an incorrect second-triangle interpolation. It now interpolates the actual b,c,d triangle, agrees at non-flat authored vertices, and its focused composition/support tests pass 2/2. The runtime geometry and packaged candidate were unchanged.
