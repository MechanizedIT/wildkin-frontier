# Wildkin Frontier code map

Use this lookup after [SESSION_START.md](SESSION_START.md). Paths below were checked against the September11 source tree. “Owner” means the module that owns the behavior/state, not permanent assignment to an agent. Search a function before reading a whole large file.

## Runtime owners and focused proof

| Area / owner | Entry points to inspect | Focused tests under `tests/` |
| --- | --- | --- |
| Boot, composition, single frame/fixed update | `src/boot.js`, `src/main.js`; beta wiring `src/game/createBetaGame.js` | `betaRuntime.test.js`, `interactionPriority.test.js` |
| Player movement and feel | `src/player/playerController.js`, `src/game/config.js`, `src/movement/` | `movementBands.test.js`, `airControl.test.js`, `facingFreeze.test.js` |
| Input and orbit camera | `src/input/keyboardInput.js`, `touchMovement.js`, `inputController.js`, `gameCameraOrbit.js`; `src/camera/cameraFollow.js` | `landscapeCameraInput.test.js`, `landscapeInputAdapters.test.js` |
| Rapier world, KCC and collision | `src/physics/createPhysicsWorld.js`, `createCharacterPhysics.js`; `src/world/collision.js`, `colliderDescriptor.js`, `convexCollider.js` | `rapierPhase12.test.js`, `collision.test.js`, `convexPropCollider.test.js` |
| Persistent progress and saved quantities | **`src/save/frontierProgress.js`**; owns commits, migration and inventory authority | `physicalInventoryProgress.test.js`, `activeRunRestore.test.js` |
| Pure pack/container rules | `src/inventory/itemCatalog.js`, `slotOperations.js`, `inventoryState.js`; transaction adapter `inventoryActions.js` owns no quantities | `inventorySlots.test.js`, `inventoryState.test.js`, `inventoryActions.test.js` |
| Physical storage reach / UI selection | `src/inventory/physicalInventory.js`; panel `src/ui/inventoryPanel.js`; style `styles/inventory.css` | `inventoryPanel.test.js`, `physicalInventoryProgress.test.js` |
| Expedition, extract/death/resume | `src/session/expeditionSession.js`, `runResolution.js`, `expeditionPersistence.js`, `resumePosition.js` | `expeditionPersistence.test.js`, `activeRunRestore.test.js`, `resumePosition.test.js` |
| Camp building, recipe transactions | `src/base/baseSystem.js`, `baseCatalog.js`, `basePlacement.js`, `craftingStations.js`, `stationCatalog.js` | `baseCrafting.test.js`, `baseRuntime.test.js` |
| Station operation / crafted output | `src/base/stationMotion.js`, `stationPanel.js`, `craftOutputVisual.js` | `stationMotion.test.js`, `baseCrafting.test.js` |
| Gear, food and taming-tool input | `src/equipment/equipmentSystem.js`, `tamingEquipment.js`, `fieldFood.js` | `equipmentSystem.test.js`, `equipmentLoadout.test.js`, `trailRation.test.js` |
| Harvest, depleted shapes, pickups | `src/resources/resourceSystem.js`, `resourceConfig.js`, `pickupSystem.js` | `resourcePresentation.test.js`, `scaledHarvestReach.test.js`, `pickupCapacity.test.js`, `pickupRobust.test.js` |
| Wildlife AI and spatial movement | `src/creatures/creatureSystem.js`, `createWildCreature.js`, `creatureConfig.js`, `steering.js`, `perception.js`, `socialStartle.js` | `creatureSteering.test.js`, `wildlifeAwareness.test.js`, `socialStartle.test.js` |
| Field taming / secured companion behavior | `src/companions/companionSystem.js`, `fieldTaming.js`, `fieldTamingVisual.js`, `companionCatalog.js`; follower `companionFollowIntent.js`, `companionPhysics.js` | `fieldTaming.test.js`, `fieldPlacement.test.js`, `companionFollowIntent.test.js`, `companionColliderFilters.test.js` |
| Combat, projectile, guardian | `src/combat/playerCombat.js`, `projectileSystem.js`, `combatConfig.js`, `guardianEncounter.js` | `combatPhase3.test.js`, `betaGuardian.test.js` |
| Waypoint return, gate/repair, loot | `src/world/frontierAnchorSystem.js`, `portalGateSystem.js`, `lootSystem.js`; `src/presentation/cacheMechanisms.js`, `observatoryMechanisms.js` | `waypointReturn.test.js`, `lootSolidContract.test.js`, `cacheMechanisms.test.js`, `observatoryMechanisms.test.js` |
| Campaign/skills/objectives | `src/progression/campaignProgress.js`, `skillCatalog.js`, `upgradeCatalog.js`; beta shell wiring in `createBetaGame.js` | `betaProgression.test.js`, `sunlitProgression.test.js`, `betaCampaignReadiness.test.js` |
| HUD, Journal, results and world actions | `src/ui/betaShell.js`, `runInventoryHud.js`, `runResultCard.js`, `worldInteractionAnchor.js`, `contextualInteraction.js`; `styles/beta.css` | `worldInteractionAnchor.test.js`, `runResultCompanions.test.js`, `starterGuidance.test.js` |
| Terrain, boundary, scenery and fade | `src/world/terrainSurfaceModel.js`, `sectionRuntime.js`, `staticWorldBuilder.js`, `staticPropBatches.js`; `src/presentation/naturalBoundary.js`, `playerOcclusion.js` | `terrainRuntime.test.js`, `naturalBoundary.test.js`, `playerOcclusion.test.js`, `staticPropBatches.test.js` |
| GLB cache/instances/animation | `src/assets/modelAssetRuntime.js`; Explorer `src/player/externalPlayerModel.js`; Moss calibration `src/creatures/mosslingMotion.js` | `externalModelRuntime.test.js`, `externalPlayerModel.test.js`, `mosslingMotion.test.js` |
| Author draft, preview, schema/export | `src/author/authorMode.js`, `authorDraft.js`, `authorPreview.js`, `authorTypeRegistry.js`, `landscapeEditor.js`; `src/world/worldValidator.js` | `landscapeAuthoring.test.js`, `meshRecipe.test.js`, `convexPropCollider.test.js` |

Test example: `node --test tests/fieldPlacement.test.js tests/creatureSteering.test.js`. For older phase-named tests, search the module/function within `tests/`; file age/name does not establish obsolete coverage.

## World data and asset source chain

- Runtime imports `src/world/data/world.js`, wrapping generated `world.generated.js`. Canonical editable world is `src/world/data/world.json`; never hand-patch generated output alone.
- Campaign composition starts in `tools/author-beta-world.mjs`, with focused `tools/compose-*.mjs` helpers. Asset descriptors enter through `tools/register-character-assets.mjs`, `register-ecology-assets.mjs`, `register-station-assets.mjs`, `register-discovery-assets.mjs`.
- Change the relevant composer/registration source when changing authored content, then deliberately run `node tools/author-beta-world.mjs` and `npm run world:generate`. Preserve unrelated canonical edits and coordinate the single world writer before regenerating.
- `tools/generate-world.mjs` generates runtime data; it also supports optional `src/world/data/sources/*.json` if that directory exists. `tools/check-world.mjs` and `tools/check-campaign.mjs` validate data. Author exports/drafts are a separate user-edit lifecycle; don't overwrite them to fix shipped content.
- Render factories are `src/world/visualFactory.js`, `libraryMeshKit.js` and the focused `*MeshKit.js` modules. Static descriptor/collider interpretation lives in `staticDescriptor.js`, `colliderDescriptor.js`, `convexCollider.js`; keep Play, Author, bounds and physical hulls aligned.
- **Shipping files:** `assets/models/<asset-id>/model.glb`. **Editable approved sources:** `art/source/<asset-id>/` (builder, Blend, manifests/collider/provenance as applicable). **Reviewed references:** `art/targets/`; original owner style references: `art/style/`.
- **Unadmitted studies/evidence:** `.dream-loop/` is usually ignored and may not exist in a fresh clone. Check local paths before relying on them. A study image, generated target or review score does not mean its GLB is registered/shipping.
- **Recovery exception:** `art/source/tidefin-candidate-v3/` retains the latest unshipped Tidefin and exact reconstruction inputs; its manifest maps historical study paths. `tools/skill-backups/wildkin-asset-forge/` preserves the installed project-specific asset skill. See [RECOVERY.md](RECOVERY.md) before restoring or regenerating.
- Asset workflow: installed `wildkin-asset-forge` skill; repository `docs/LOCAL_ASSET_PIPELINE.md`, `docs/MOTION_WORKFLOW_REVIEW.md`, `docs/DREAM_LOOP_REVIEW.md`. Separate reference author, implementer and independent judge; retain exact hashes. Character still/deformation, continuous motion, native gameplay and owner phone gates are distinct.
- Build/check helpers are `tools/art/build-*.py`, `rig-tidefin.py`, `check-game-glb.py`, `package-game-asset.py`. Structural checker success cannot admit art or motion. Coordinate resources before Blender; no automatic inference startup.

## Running and packaging

| Need | Command / source |
| --- | --- |
| Local game | `npm run dev` → `tools/serve.mjs` |
| Existing portable package | `npm run serve:submission` → `dist/submission`, port8081 |
| Focused JS test | `node --test tests/<actual-file>.test.js` |
| World / campaign checks | `npm run world:check`, `npm run campaign:check` |
| Integrated validation boundary | `npm run verify` → tests, world/campaign, build, validate |
| Portable build / ZIP | `tools/build-submission.mjs`, `validate-submission.mjs`, `zip-submission.mjs`; scripts `build`, `validate`, `zip` |
| Existing native harness entry points | `tools/playtest-beta.mjs`, `playtest-beta-author.mjs`, `test-beta-package.mjs`; choose a bounded relevant scenario, not all harnesses |

`index.html` and `vendor/` are the offline runtime boundary. `dist/submission/` is generated packaging output, not production source. `package.json` is command authority. Historical hackathon/phase docs and the long `BUILD_LOG.md` are lookup archives, not default onboarding or current acceptance evidence.
