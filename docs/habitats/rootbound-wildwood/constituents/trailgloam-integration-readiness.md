# Trailgloam integration readiness — Rootbound showcase lookup

**Scope:** read-only source and evidence lookup. This note does not admit a model, change a resident, or approve gameplay behavior.

## Retained model evidence

The retained fitted master is [trailgloam-fitted.glb](../../../../art/source/trailgloam-v1/rig-prep-r1/fitted-r1a/trailgloam-fitted.glb) (SHA-256 `d3163edb5536dfd4d1fa39895f2a8e2bac71372d83cbe854913c667786f4dab7`). The isolated native fixture used that exact file through `createWildCreature`, the external-model runtime, real flat-floor Rapier movement, and independent skeleton clones.

[The independent native review](../../../../art/reviews/trailgloam-travel-r1/independent-native-review.md) retains the authored-speed result: at 0.212121 m/s the walk plays at approximately 1×, stays grounded, and has at most `5.69e-7 m` contiguous-stance drift and `8.34 mm` absolute sole height. It also records removal/skeleton independence. It explicitly does **not** prove a fitted collision shape, production AI, placement, persistence, capture, or a complete animation set. The generic rusher roam speed produces about 4.125× playback and is unsuitable as Trailgloam’s cadence.

The file’s current `art/source/...` location is valid for the fixture but cannot be the production `model.path`: `worldValidator.js` accepts only `assets/models/<revision>/model.glb` paths. A later admission therefore needs a copied/package-owned GLB at such a path, with the same source hash retained in its asset receipt.

## Existing Rootbound residents

`sampleFrontierWildlifeChunk` in [frontierWildlife.js](../../../../src/world/frontierWildlife.js) is the authoritative generated-source sampler. Sampling every Rootbound chunk in x `[-525,-325]`, z `[550,750]` under the default world produces exactly these two source residents:

| Stable origin ID | Chunk | Species / AI | Home position | Movement range |
| --- | --- | --- | --- | --- |
| `f1:w:-9:14:0` | `-9,14` | Mossling; `rusher`, `SKITTISH`, `asset_wildkin_mossling` | `(-416.027891, 9.051011, 739.909387)` | roam 4.4 m; leash 8.5 m |
| `f1:w:-8:13:0` | `-8,13` | Mossling; `rusher`, `SKITTISH`, `asset_wildkin_mossling` | `(-380.076957, 8.361136, 686.456677)` | roam 4.4 m; leash 8.5 m |

Both homes are east of the intended five-room showcase route. They should remain intact. There is no Trailgloam resident, asset ID, or current Rootbound fixed-encounter branch.

## Existing factory and AI seam

- [main.js](../../../../src/main.js) preloads every world visual asset and constructs `createFrontierWildlifeRuntime` with the world asset registry.
- [frontierWildlifeRuntime.js](../../../../src/world/frontierWildlifeRuntime.js) receives stable sampler records, resolves `visualAssetId`, and calls `creatureSystem.addGeneratedCreatures` while preserving origin IDs and chunk streaming.
- [creatureSystem.js](../../../../src/creatures/creatureSystem.js) routes each record to `createWildCreature`.
- [createWildCreature.js](../../../../src/creatures/createWildCreature.js) already accepts a model-backed visual asset, `rusher` AI, temperament, supported home/ranges, animation clips, and stable generated-resident identity. It only has Mossling-specific speed adjustment; Trailgloam needs its own explicit spawn/configured walking cadence rather than borrowing that special case or generic rusher speed.
- [worldValidator.js](../../../../src/world/worldValidator.js) permits a `wildkin` asset with either existing AI archetype (`rusher` or `spitter`) and a nonempty `speciesTag`; it does not contain a closed species allow-list. It does validate model path, standard clips, and numeric wildkin behavior fields.

## Minimum coherent showcase encounter

The appropriate single scene role is the proposed Lantern Grove deadwood edge, around the existing hollow/reference point `(-445,678)`, rather than either protected Mossling home. That coordinate is a **placement candidate**, not a passed home/support result.

A minimal visual encounter still requires a distinct `trailgloam` identity. Replacing a Mossling’s `visualAssetId` while retaining `speciesTag: mossling` would make the encounter’s visual and AI/save identity disagree and would alter one of the two protected residents. It is not a valid placeholder route.

The smallest later implementation boundary is:

1. Package the retained GLB beneath `assets/models/<trailgloam-revision>/model.glb`; add one `asset_wildkin_trailgloam` record in authored `src/world/data/world.json` with model/clip metadata and `gameplay.wildkin.speciesTag: 'trailgloam'`, then regenerate `world.generated.js`.
2. Add one fixed Rootbound sampler record in `frontierWildlife.js`, analogous to the explicit Caldera/Fungal anchors, with a new stable origin ID, checked supported home disk, and an explicit existing `rusher` temperament/config. Keep the two Mossling source records unchanged.
3. Prove the new record travels through `frontierWildlifeRuntime → addGeneratedCreatures → createWildCreature`, loads/unloads by its source identity, and plays at a Trailgloam-specific tested pace. A fitted collision/body review remains required before declaring physical encounter readiness.

This is sufficient for one non-capture encounter using existing factory/AI; it does **not** require a new AI framework. It does require a new species tag and visual-asset identity.

## Deliberately separate companion boundary

If the encounter must be observable, tameable, saveable as a companion, or use the proposed forage cue, it is no longer the minimum showcase step. `COMPANION_BY_ID`, `identifyCompanion`, field-taming stage selection, individual validation, and ability presentation must be updated together, as already documented in [rotation-1 gameplay review](../../../../docs/species/rootbound-native/rotation-1-gameplay-review.md). The current catalog contains no Trailgloam entry. Do not claim those features from a model-backed resident alone.

## Open choices for the next owner

1. Confirm whether the next scope is only a distinct, non-capture encounter or the larger companion admission.
2. Choose an existing `rusher` temperament/config only after a home-support and actual cadence check; the generic `0.875 m/s` stress case is rejected by the native review.
3. Verify the Lantern Grove candidate’s full home disk, clearance from the route and sources, fitted body contact/collider, streaming, and save/capture semantics before source changes.