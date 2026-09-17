# Thornprowler rotation 1 — source audit

**Status: planning only.** This audit authorizes neither a mesh change nor a behavior change. Root must first capture actual neutral views, then a separate target author and reviewer must decide whether a bounded visual lane is worth opening.

## Actual shipped path

`asset_thornprowler` is an admitted baked visual-asset recipe in `src/world/data/world.json`, generated into `src/world/data/world.generated.js`: version 1, 23 authored mesh parts, gameplay role `wildkin`. A Frontier resident is sampled by `sampleFrontierWildlifeChunk` / `makeFixedFungalEncounter`, passed to `frontierWildlifeRuntime`, then `createWildCreature`. Because the spawn carries `visualAsset`, `createWildCreature` resolves `{ kind: 'asset', id: 'asset_thornprowler' }`; `createVisualAssetVisual` renders the baked `asset.parts` recipe. That is the current rendered mesh path.

`src/world/wildkinMeshKit.js` also contains both an older `thornprowler()` helper and the current `thorn3()` constructor selected by `createWildkinMeshVisual`. This is authoring/reference code and backs the generic `createRusherVisual`, but it is **not** proof that a constructor edit would alter the admitted Frontier resident: any prospective source change must rebake the focused asset and compare the baked recipe before visual judgment.

The current `thorn3()` describes a low crouched quadruped: a faceted green torso and low brow/head, a cream angular jaw, four articulated legs with clawed paws, seven staggered dorsal thorns, and a swept tail. This identifies intended parts from literal geometry; it does not establish their current screen thickness, attachment quality, or readable silhouette. Those require the pending neutral captures.

## Existing species and gameplay contract

The baked recipe identifies an **AGGRESSIVE rusher**: health 7, damage 1, move speed 2.6, notice 7m, personal space 2m, roam 4.5m, leash 10m, respawn 28s. The generic rusher controller supplies the existing `ROAM → ALERT → CHASE → WINDUP → LUNGE → RECOVER → RETURN` sequence. The Fungal Hollow receipt records one landed hit (player health 5→4) and a return; it does not prove human-readable telegraphing, defeat, reward, bonding, capture, companion behavior, or persistence as an owned individual.

The canonical Fungal Hollow resident is stable origin `f1:w:-58:-26:450`, home `(-2868,-1260)`, in a 10m disk inside the 31m outing. It guards the risky blossom, while the two planned route capsules remain clear. The same asset may appear in existing static catalog fixtures, but those do not grant a new habitat role. Its current niche is therefore a noncollectable avoidable predator guarding optional gathering, not a companion or headline ability.

## Narrow visual candidate after baselines

The strongest bounded hypothesis is **attachment/readability only**: verify whether the low body and each of the four articulated leg/paw silhouettes still read as grounded at portrait gameplay size, and whether the seven dorsal thorns form a deliberate continuous threat line rather than an undifferentiated dark fringe. If the neutral front/rear/side/three-quarter captures confirm a defect, a visual plan may adjust only leg volume/grounded joins and dorsal-thorn grouping on the baked Thornprowler asset. It preserves the green-and-cream crouched predator identity, tail, dimensions until measured, all rusher behavior, source ID, home disk, recipes, collision, and all other species.

## Evidence and unknowns

- `docs/FUNGAL_HOLLOW_CONTRACT.md` fixes the resident identity, protected routes, niche, and explicit no-bond/no-capture rule.
- `art/reviews/fungal-hollow/closure-review.md` supports lifecycle and one damage/retreat event, while explicitly withholding telegraph readability.
- `src/world/frontierWildlife.js`, `src/world/frontierWildlifeRuntime.js`, and `src/creatures/createWildCreature.js` establish sampling, runtime reconstruction, and baked-asset resolution.
- `src/world/wildkinMeshKit.js` identifies authoring geometry only; no current actual neutral mesh capture, bounds receipt, part-level topology audit, or species-specific visual review has been found by this audit.

Do not infer anatomical success or failure from helper names, old Fungal habitat visual HOLD, or the generic rusher state machine. No image generation, model build, or runtime edit belongs to this audit.
