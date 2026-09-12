# Emberfall ravine composer handoff

Stopped September 12, 2026 at Chris's requested boundary. This is an **unintegrated standalone candidate** only: it does not modify `world.json`, `world.generated.js`, runtime code, or assets.

## Candidate files

- `tools/compose-emberfall-ravine.mjs`
- `tests/emberfallRavine.candidate.mjs`

The composer keeps section_3 at 120×120m and produces six irregular ravine masses plus the three original foundry-support fields. It creates wide graded west ascent/foundry-descent and east ascent/separate-descent routes, retains all existing prop/resource/chest/anchor IDs and X/Z, restores the 27 foundry-root Y transforms exactly, preserves the foundry tie at `(-25,-4)` / `Y=2.2`, rebases other grounded records, and clears legacy pad/course containers. It adds no props, rewards, assets, or dependencies.

## Focused proof status

Last command: `node --test tests/emberfallRavine.candidate.mjs`.

- PASS: idempotence, section isolation, terrain/world validation, bounds, ledger/XZ/reward preservation, foundry roots, protected return support, cache/summit height, and legacy course clearing.
- HOLD: the `ember-west-foundry-descent` full-width shared-surface grade assertion still fails. Its route centerline stays at or below 0.45, but a sampled lateral transition near the protected foundry corridor exceeds that limit. Do not integrate or claim native walking proof until that merge is rerouted/smoothed and the focused test passes.

No full suite, aggregate verification, ZIP, browser/native proof, canonical generation, assets, or docs changes were performed by this candidate.

## Resume procedure

This candidate test is intentionally opt-in and currently fails one assertion. Run node --test tests/emberfallRavine.candidate.mjs to reproduce. Fix the sampled full-width transition at the west descent/foundry merge, retaining protected foundry support and all existing IDs/XZ. Once the focused suite passes, rename it back to .test.js and have root integrate the composer into the canonical authoring flow serially. Preserve the previous world and regenerate through child-process completion before computing hashes.

Target/role audit: art/targets/emberfall-ravine-v1/. Exact plan: docs/EMBERFALL_RAVINE_SLICE.md. Baseline: art/reviews/emberfall-ravine-v1/baseline/. Then capture the actual revised atlas and prove an ordinary ascent → existing cache → different descent loop with camera and companion before scenic dressing. No new target generation is needed to resume.
