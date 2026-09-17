# Trailgloam encounter — minimal Rootbound showcase plan

**Original reviewed scope:** one future Rootbound resident, not catalog-bondable but still attackable through ordinary combat using the retained fitted Trailgloam GLB and existing `rusher`/`SKITTISH` runtime. This is a plan only: it does not admit an asset, change wildlife data, move a home, alter AI, or claim a playable encounter.

## Chosen encounter

Add one new, stable resident at the **west Lantern Grove deadwood edge**:

| Field | Proposed value | Why it is bounded |
|---|---:|---|
| Stable identity | `f1:w:-10:13:700` | A new fixed source identity in chunk `-10,13`; neither existing Rootbound source is reused. |
| Species / visual identity | `trailgloam` / `asset_wildkin_trailgloam` | Keeps the model, source identity, and future save/capture boundary consistent. It does not relabel a Mossling. |
| Home | `(-461, 9.29020, 689)` | The selected point is on the Grove's west outer edge, 9.899 m from the planned primary centerline. It is outside the current hollow dressing and 18.6 m from the closest listed protected-life point at `(-443.3,672.2)`. |
| Existing AI | `rusher` with `SKITTISH` temperament | Reuses the existing generated-creature state machine: roam, warn/flee, return, streaming, and removal. No new behavior states or controller are needed. |
| Movement disk | 1.8 m roam, 3.0 m leash, 3.3 m flee leash | The available clearance is 9.899 - 2.0 (main-route half-width) - 3.3 (movement disk) - R = 4.599 - R metres, where R is the final model/collider horizontal envelope. R is not yet selected; this is a formula, not completed clearance proof. This must be checked against the final actual route, model collider, and visual-only blockout before admission. |
| Facing | toward the Grove / destination room, selected at implementation after the native camera capture | This is a presentational yaw only; it must not move the home or change the AI. |

This produces an optional observer at the room edge: the central Grove apron remains free and both current Mosslings remain in the eastern woodland. It is deliberately a single resident rather than a population system.

### Read-only terrain sample

A CPU query against the current default-world production sampler at `(-461,689)` returned Rootbound terrain height `9.29020`, `hasFrontierLandFootprint(radius: 3)` true, and a maximum sampled 0.5 m finite-difference slope of `0.30301` over that disk. Heights ranged `8.94346..9.34056`. These are screening values only: the implementation must use the fixed-source home-disk test at the selected movement radius, final triangle/contact grounding, all current scenery bounds, and the actual ordinary route. The adjacent `(-460,687)` alternative is not selected despite land support because its sampled slope was `0.32520`.

## Asset and cadence contract

The source master is [the retained fitted GLB](../../../../art/source/trailgloam-v1/rig-prep-r1/fitted-r1a/trailgloam-fitted.glb), SHA-256 `d3163edb5536dfd4d1fa39895f2a8e2bac71372d83cbe854913c667786f4dab7`. The fixture's `WalkDiagnostic` clip has an authored pace of `0.21212121212121213 m/s`; its independent translated-motion result is near 1x at that rate. The generic rusher's normal `0.875 m/s` roam drove the clip about 4.125x and is excluded.

Per-spec authored pacing is already supported without a framework change:

- `model.locomotion.walk` flows through `createExternalModelVisual` into `createVisualAnimationController` and sets the walk clip's time scale from actual translated speed.
- A generated source's existing `configOverrides.moveSpeed` becomes `state.cfg.moveSpeed` in `createWildCreature`; all existing rusher roam/flee/return operations use that value.
- Unlike Mossling, Trailgloam has no hard-coded species speed special case. The new source must therefore explicitly use `configOverrides.moveSpeed: 0.6060606060606061` because ordinary ROAM multiplies that value by .35; the model record uses `locomotion.walk: 0.21212121212121213`. FLEE and RETURN retain the existing faster multipliers. This is intentionally slow, non-hostile observer motion, not a retune of shared `RUSHER_CONFIG`.

The fitted file only supplies `Loaded`, `Neutral`, and `WalkDiagnostic`; the asset record may map `idle: "Loaded"` and `walk: "WalkDiagnostic"`. Do not map fake run, attack, or hurt clips. `createVisualAnimationController` falls back to idle when those action clips are absent. A future richer clip set is separate work.

## Minimal admission seam

1. Copy the unmodified retained GLB to `assets/models/trailgloam-fitted-r1/model.glb`; record both file hashes in its receipt. The fixture path under `art/source` is not validator-admissible.
2. Add one authored `asset_wildkin_trailgloam` record to `src/world/data/world.json`, then regenerate `src/world/data/world.generated.js`. It needs `gameplay.role: "wildkin"`, `speciesTag: "trailgloam"`, `archetype: "rusher"`, `temperament: "SKITTISH"`, explicit existing-schema behavior values, a local packaged model path, and only the verified idle/walk clip mapping and locomotion value above. The final collision body is an explicit admission decision; do not inherit the fixture's generic upright capsule as proof of an anatomical fit.
3. Add a single `makeFixedRootboundTrailgloamEncounter` branch to `src/world/frontierWildlife.js`, before normal random selection for `(-10,13)`. Gate it on the exact visual asset, default world identity, Rootbound habitat sample, supported home disk, full land footprint, and no conflicting fixed resident. Build it through the existing source record / `frontierWildlifeRuntime → addGeneratedCreatures → createWildCreature` chain.
4. Keep `src/creatures/createWildCreature.js`, generic rusher configuration, the two Mossling source records, companion catalog, taming, capture, abilities, and save schema unchanged. The existing runtime already supplies stable source streaming and capture removal by origin ID.

## Required focused proof before retention

- Extend `tests/frontierWildlife.test.js` for default-world-only source selection, stable origin/source fields, missing-asset suppression, supported-home/land rejection, unchanged two-Mossling Rootbound census, and alternate-world neutrality.
- Add the model-record validator case in its existing focused validator coverage: local package path, `Loaded`/`WalkDiagnostic` mappings, positive `0.212121...` locomotion, and required `wildkin` fields.
- Exercise the existing runtime with the real asset record: one source loads as a generated resident, unload/re-entry preserves `f1:w:-10:13:700`, and neither Mossling changes. Verify actual external-model clip selection/time scale at the selected authored speed.
- Run a native encounter capture: fitted body contact/collider fit over the full 3.3 m disk, route/apron clearance, flee/return, stream-out/re-entry, and no console error. It must visibly read from the destination camera before calling it a showcase gain.

## Concrete blockers and risks

1. **Collision is unresolved.** The retained travel fixture explicitly used a generic upright rusher capsule. It is not evidence that the fitted low, eight-leg body has an appropriate production collider or that its feet stay grounded on this sloped disk.
2. **The current clip set is diagnostic.** Slow `rusher` movement is technically supported and cadence-correct, but there is no production attack/hurt/run set. The `SKITTISH` choice minimizes that limitation; it does not make missing clips exist.
3. **Home screening is not final support proof.** The selected west-edge point is promising but must be rechecked after any Rootbound enclosure/terrain changes against actual scenery and the final walk corridor.
4. **No companion claim.** Trailgloam is absent from COMPANIONS, so this admission offers no bond prompt. It remains attackable through ordinary combat; this is not a new interaction prohibition. No companion/catalog/ability/save expansion is included.

This is the smallest living Rootbound addition that retains the fitted GLB's useful motion and leaves all current homes, gameplay identities, and broad region work intact.

## Independent-review correction

The existing combat path remains available. Native proof must show slow ROAM and an ordinary field-tool hit followed by HURT/FLEE/RETURN, plus no bond prompt, stable streaming and chosen-body contact. No fake attack/run/hurt animation is mapped. Literal fleeLeashRadius is3.3m; final route-edge clearance uses4.599-R and remains unproven until the actual model/capsule envelope R is measured. No anatomical rebuilding or new behavior system is required. See trailgloam-encounter-plan-review.md.

## Final placement correction

Native/source integration shifts the home to (-463,685), height9.36442. The earlier (-461,689) suppressed one existing root assembly through the normal scenery clearance filter. The selected home retains all43 curated records and both Mossling identities. Full3.3m disk support passes (maximum sampled slope.29206). The final primary-centerline distance is12.44508m; subtracting2m lane half-width,3.3m movement disk and1.29767m model envelope leaves5.84741m. Knockback can briefly exceed the flee disk; that is existing combat behavior, not a hard3.3m physical clamp. Capsule radius.48/half-height.02 is a simple central-body placeholder; feet and fronds are decorative. Retain the unmodified TRELLIS GLB and defer faster escape gait refinement. Native evidence and final status are in art/reviews/trailgloam-encounter-r1/.
