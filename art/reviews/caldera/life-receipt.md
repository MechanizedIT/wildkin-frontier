# Emberglass Caldera life receipt

Date: 2026-09-13  
Scope: `frontierEcology`, `frontierWildlife`, and their focused tests only.

## Frozen contract

- The broad Caldera habitat uses `habitatWeights['emberglass-caldera']` to replace the temporary forest read with at least 75% rock at full influence, rust-tinted sparse forage, admitted regional crystal/iron, and an Emberhorn regional signature. Zero Caldera weight retains the exact previous recipes.
- The fixed crater core removes ordinary resource footprints and ordinary wildlife movement disks before adding authored content through the existing streamed owners.
- Crystal is `f1:r:16:-40:300` at `(846.5, 10.35188, -1976)`, footprint radius `1.30m`, yield four crystal shards.
- Iron is `f1:r:17:-40:301` at `(854, 10.29709, -1980)`, footprint radius `.93m`, yield five iron ore.
- Emberhorn is `f1:w:17:-40:300` at home `(850, 10.31384, -1986)`, priority `1`, roam `4.5m`, notice `7m`, leash `10m`, health `12`, speed `2.1`, damage `2`, respawn `28s`.
- The mineral anchors reject missing/non-harvestable assets, missing or invalid box colliders, wet footprints, support above slope `.18`, regional-place overlap, or radius-adjusted overlap with the reserved `4m` lane.
- The Emberhorn rejects a missing Wildkin asset, non-Caldera terrain, any non-bowl/breach point or internal step across its complete `10m` disk, slope above `.32`, wet land, or an unsafe outer support ring. Its fixed signature wins the existing four-resident selection and disappears through the existing capture predicate.
- Exported immutable anchor records are the shared coordinate and clearance source for scenery. No save schema, runtime, collider, AI, harvest, reward, loop, or `main.js` owner changed.

The fixed resources intentionally sit within the territorial outing while remaining outside the physical escape lane. The nearer iron is `7.21m` from the home, just beyond initial notice at the undisturbed home; player/creature movement supplies the danger transition. Native framing may choose a different disclosed player witness without weakening these clearances.

## Focused proof

Command:

```text
node --test tests/frontierEcology.test.js tests/frontierWildlife.test.js
```

Result: **29/29 passed**, zero failures, `829.464ms` Node test duration.

The added checks cover deterministic finite IDs, actual default admission, full resource support and collider/yield mapping, partial/exhausted depletion normalization, missing-asset failure, broad Caldera resource/life identity, exact zero-weight compatibility, core duplicate exclusion, the complete Emberhorn movement disk, existing signature/resident caps, and same-session capture removal.

No aggregate, build, package, browser, or native claim is included here. Root owns integrated physics, actual approach/combat/harvest, save continuation, framing, and final gates.

## Frozen file hashes

```text
B9750DE2CBB6AAD4351B4E6A3BBB7B85766DD2167B0E52FB120CC87A0D758C24  src/world/frontierEcology.js
2563CC3A24660E2504DE10E2F5D039B59960FFE0DB36B98E0837FAF6BA9C8D27  src/world/frontierWildlife.js
04F368EDE536051C4344F68E69FBDF7F4DFDC8B7C15F2E3ED0841FE196DC6529  tests/frontierEcology.test.js
BD9C1D4AA77BCE377ECBFF93E4343BC772898EA9A81CA5522A2FE0CDC9DC1086  tests/frontierWildlife.test.js
```

`git diff --check` passed for these four files. The repository's configured line-ending warning remains informational.
