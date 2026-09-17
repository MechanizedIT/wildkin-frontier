# Heartwood Guardian rotation-1 source audit

Read-only audit; no target, model, bake, or runtime work is authorized.

## Actual visual path

`asset_heartwood_guardian` is the authoritative asset. `guardian()` in `src/world/wildkinMeshKit.js` is the code-native authoring constructor and `createWildkinMeshVisual()` dispatches it. The shipping factory path is constructor → `tools/bake-visual-kits.mjs --asset asset_heartwood_guardian` → `src/world/data/world.json` → `npm run world:generate` → `world.generated.js` → visual-asset factory. Editing the constructor alone cannot change the shipped resident.

The current native group has scale `1.2`: four-ring, seven-sided brown body; brow/head and cream muzzle lofts; four heavy leg + dodeca paw pairs; eye pairs; paired two-segment branching antlers; and 21 flat mantle leaves (three rows of seven) in plum/moss. Its intended reading is a large rooted four-legged guardian with pale muzzle, antlers, and mantle.

## Resident and frozen contract

One `wildkin_guardian` is authored in Heartwood Vault `section_5`, at current generated position `(4, .75, -28)`, scale `1.15`, collision enabled, between the approach and Heartwood Core. Baked gameplay is `spitter` / `AGGRESSIVE`, health 36, damage 2, speed 1.5, notice 7, personal 2, leash 10, roam 4.5, respawn metadata 28; collider offset `(0,1.6,0)`, size `(2,3.2,2)`.

It is not a companion. `guardianEncounter.js` activates in section 5 within 8m, telegraphs 1.3s, impacts at radius 2.4 for 2 damage, queues one extra strike at half health, and has an 8s cooldown. Guardian death gates `chest_heartwood_core`; `creatureSystem` marks this asset `noRespawnThisRun`. These values, the asset/resident IDs, core gate, collider, and reset behavior are frozen for visual work.

## Motion/component evidence and next uncertainty

No guardian-specific skeletal animation path is present in the native mesh constructor. Readability currently depends on static geometry plus the separate hazard-ring telegraph. The visual iteration must not change that contract.

The actual constructor creates three specific visual uncertainties for neutral factory captures: (1) 21 mantle leaves may read as thin cards rather than a rooted shoulder mantle; (2) four legs/dodeca paws may appear detached beneath the long body; (3) antler/branch head joins require side and rear inspection. These are hypotheses, not accepted defects.

After root captures baked neutral front/rear/left/right/top/three-quarter and 48/96 views, the separate target lane should measure complete bounds and mesh/triangle count, body-to-leg attachment depth, paw contact, mantle card visibility/shoulder rooting, antler joins, and source-to-factory parity. Preserve the four-legged guardian role and do not infer a new ability, tame flow, habitat mechanic, or body plan.
