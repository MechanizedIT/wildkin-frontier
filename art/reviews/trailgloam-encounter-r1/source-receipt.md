# Trailgloam encounter R1 — source receipt

## Implemented sampler boundary

`frontierWildlife.js` adds exactly one default-world, asset-gated fixed source in chunk `-10,13`: `f1:w:-10:13:700` at **`(-463,685)`**. It requires the exact `asset_wildkin_trailgloam` identity, the fully matching `trailgloam` SKITTISH/rusher gameplay recipe, model package `assets/models/trailgloam-fitted-r1/model.glb`, unit scale/zero pivot, `Loaded`/`WalkDiagnostic` mapping, and walk locomotion value `0.21212121212121213`.

The selected home was screened at 0.5 m across the literal 3.3 m flee disk: current Rootbound height `9.36442`, maximum neighboring slope `0.29206`, and existing full-footprint support pass. Selector simulation retains **43/43** curated Rootbound records; the displaced prior home removed only `gallery-east-rib-3` because the normal low-scenery filter uses its 4.3 m wildlife threshold. The selected home is 6.08276 m from that root's center, compared with 2.23607 m at the rejected home. The root has no collision; its scaled oriented visual bounds can overlap the wider wildlife disk, which is a visual-composition caveat rather than a capsule obstruction.

The source checks Rootbound habitat/height/slope then existing full footprint land/support. It has 1.8 m roam, 3.0 m return leash, and literal 3.3 m flee leash. It is absent for any non-default seed or edition, missing/mismatched asset, or failed support. In all of those cases the branch falls through to the unchanged generic sampler; it never converts the chunk into an empty special case.

## Cadence and body boundary

Existing `wander()` uses `cfg.moveSpeed * .35`. The source and admitted asset recipe use `moveSpeed: .6060606060606061`, producing ordinary ROAM `0.21212121212121213 m/s`, matching the fitted `WalkDiagnostic` clip's tested authored pace. Existing SKITTISH FLEE is `1.6x` early (`0.9696969696969697 m/s`) then `1.35x`; existing RETURN is `.85x` (`0.5151515151515151 m/s`). These faster states are intentionally existing behavior, not a new Trailgloam motion rule.

The source sets only existing rusher configuration fields `capsuleRadius: .48` and `capsuleHalfHeight: .02`: a 1.0 m total upright capsule enclosing the central body. The eight feet and paired fronds remain decorative for this admission. This is a bounded physical-body decision, not an anatomical collision model.

## Focused proof

`node --test tests/frontierWildlife.test.js` covers the fixed identity/recipe/path fields, cadence, complete current disk, missing/alias/locomotion/path/recipe drift rejection, default and alternate fallback equivalence, unchanged Mossling source IDs, and runtime stream-out/re-entry. Native body contact, ordinary combat HURT/FLEE/RETURN, and portrait readability remain root-owned checks.
