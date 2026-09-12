# Wildkin Frontier code map

Use this lookup after [SESSION_START.md](SESSION_START.md). Paths below were checked against the September11 source tree. “Owner” means the module that owns the behavior/state, not permanent assignment to an agent. Search a function before reading a whole large file.

## Runtime owners and focused proof

| Area / owner | Entry points to inspect | Focused tests under `tests/` |
| --- | --- | --- |
| Boot, composition, single frame/fixed update | `src/boot.js`, `src/main.js`; beta wiring `src/game/createBetaGame.js` | `betaRuntime.test.js`, `interactionPriority.test.js` |
| Player movement and ordinary jump | `src/player/playerController.js`, `src/game/config.js`, `src/movement/`; input edge consumed by main after a movement step | `ordinaryJump.test.js`, `movementBands.test.js`, `airControl.test.js`, `facingFreeze.test.js` |
| Input and orbit camera | `src/input/keyboardInput.js`, `touchMovement.js`, `inputController.js`, `gameCameraOrbit.js`; `src/camera/cameraFollow.js`, `cameraCollision.js`; camera-solid lifecycle in physics/base | `landscapeCameraInput.test.js`, `landscapeInputAdapters.test.js`, `cameraCollision.test.js`, `canopyCollision.test.js`, `baseRuntime.test.js` |
| Browser fullscreen / viewport control | `src/ui/fullscreenControl.js`; visual viewport wiring in `src/main.js`, shell placement in `betaShell.js` | Native multitouch/fullscreen receipt under `.dream-loop/overnight2-phone/` |
| Rapier world, KCC and collision | `src/physics/createPhysicsWorld.js`, `createCharacterPhysics.js`; `src/world/collision.js`, `colliderDescriptor.js`, `convexCollider.js` | `rapierPhase12.test.js`, `collision.test.js`, `convexPropCollider.test.js` |
| Persistent progress and saved quantities | **`src/save/frontierProgress.js`**; owns commits, migration and inventory authority | `physicalInventoryProgress.test.js`, `activeRunRestore.test.js` |
| Pure pack/container rules | `src/inventory/itemCatalog.js`, `slotOperations.js`, `inventoryState.js`; transaction adapter `inventoryActions.js` owns no quantities | `inventorySlots.test.js`, `inventoryState.test.js`, `inventoryActions.test.js` |
| Physical storage reach / UI selection | `src/inventory/physicalInventory.js`; panel `src/ui/inventoryPanel.js`; style `styles/inventory.css` | `inventoryPanel.test.js`, `physicalInventoryProgress.test.js` |
| Expedition, extract/death/resume | `src/session/expeditionSession.js`, `runResolution.js`, `expeditionPersistence.js`, `resumePosition.js` | `expeditionPersistence.test.js`, `activeRunRestore.test.js`, `resumePosition.test.js` |
| Camp building, recipe transactions | `src/base/baseSystem.js`, `baseCatalog.js`, `basePlacement.js`, `craftingStations.js`, `stationCatalog.js` | `baseCrafting.test.js`, `baseRuntime.test.js` |
| Survey cartridge / permanent pack fitting | `src/base/fieldPackConfig.js`; `frontierProgress.fitFieldPack` and all-item spendable counts; `itemCatalog`; `lootSystem` and `worldValidator`; `tools/compose-survey-recovery.mjs` authors the physical discovery | `fieldPackUpgrade.test.js`, `surveyLootContract.test.js`; native receipts `.dream-loop/overnight2-survey/` |
| Defended Camp layout / permanent clearing | `src/base/campLayout.js` owns footprint/perimeter/reservations; `campDefenses.js` owns dynamic GLB/compound colliders; `campClearing.js` saves final-hit clearing before resource effects; `resourceSystem.setRemovedResourceIds` masks cleared nodes; `tools/compose-crashland-camp.mjs` authors scenery | `campLayout.test.js`, `campDefenses.test.js`, `campClearing.test.js`, `campResourceLifecycle.test.js` |
| Station operation / crafted output | `src/base/stationMotion.js`, `stationPanel.js`, `craftOutputVisual.js` | `stationMotion.test.js`, `baseCrafting.test.js` |
| Gear, food and taming-tool input | `src/equipment/equipmentSystem.js`, `tamingEquipment.js`, `fieldFood.js` | `equipmentSystem.test.js`, `equipmentLoadout.test.js`, `trailRation.test.js` |
| Harvest, depleted shapes, pickups | `src/resources/resourceSystem.js`, `resourceConfig.js`, `pickupSystem.js`; pickup never gates next hit, only outstanding-cycle regrowth | `resourcePresentation.test.js`, `scaledHarvestReach.test.js`, `pickupCapacity.test.js`, `pickupRobust.test.js`, `harvestContinuity.test.js` |
| Wildlife AI and spatial movement | `src/creatures/creatureSystem.js`, `createWildCreature.js`, `creatureConfig.js`, `steering.js`, `perception.js`, `socialStartle.js` | `creatureSteering.test.js`, `wildlifeAwareness.test.js`, `socialStartle.test.js` |
| Field taming / secured companion behavior | `src/companions/companionSystem.js`, `fieldTaming.js`, `fieldTamingVisual.js`, `companionCatalog.js`; follower `companionFollowIntent.js`, `companionPhysics.js` | `fieldTaming.test.js`, `fieldPlacement.test.js`, `companionFollowIntent.test.js`, `companionColliderFilters.test.js` |
| Quiet observation / persistent field notes | `src/companions/creatureObservation.js`, `observationCatalog.js`; progress in `src/save/frontierProgress.js`, Journal in `src/ui/betaShell.js`; shared rays `src/creatures/sightRay.js` | `creatureObservation.test.js`, `companionObservationIntegration.test.js`, `observationSight.test.js` |
| Combat, projectile, guardian | `src/combat/playerCombat.js`, `projectileSystem.js`, `combatConfig.js`, `guardianEncounter.js` | `combatPhase3.test.js`, `betaGuardian.test.js` |
| Waypoint return, gate/repair, loot | `src/world/frontierAnchorSystem.js`, `portalGateSystem.js`, `lootSystem.js`; `src/presentation/cacheMechanisms.js`, `observatoryMechanisms.js` | `waypointReturn.test.js`, `lootSolidContract.test.js`, `cacheMechanisms.test.js`, `observatoryMechanisms.test.js` |
| Fallen-root cut, brace and open lane | `src/world/rootfallPassage.js`, `rootfallConfig.js`; `src/presentation/rootfallPresentation.js`; saved markers/gate in frontierProgress; composition `tools/compose-rootfall-passage.mjs` | `rootfallPassage.test.js`, `rootfallComposition.test.js`, `rootfallPresentation.test.js`, `rootfallStateContracts.test.js` |
| Ordinary fatal volumes | `src/world/worldHazardSystem.js`, existing `hazardVisual.js`; replaces active course protection | `worldHazardSystem.test.js`; historic course fixture tests do not imply active gameplay |
| Campaign/skills/objectives | `src/progression/campaignProgress.js`, `skillCatalog.js`, `upgradeCatalog.js`; beta shell wiring in `createBetaGame.js` | `betaProgression.test.js`, `sunlitProgression.test.js`, `betaCampaignReadiness.test.js` |
| HUD, Journal, results and world actions | `src/ui/betaShell.js`, `runInventoryHud.js`, `runResultCard.js`, `worldInteractionAnchor.js`, `contextualInteraction.js`; `styles/beta.css` | `worldInteractionAnchor.test.js`, `runResultCompanions.test.js`, `starterGuidance.test.js` |
| Terrain, polygon shelves, graded routes, boundary and fade | `src/world/terrainSurfaceModel.js`, `sectionRuntime.js`, `staticWorldBuilder.js`, `staticPropBatches.js`; `src/presentation/authoredTerrain.js`, `naturalBoundary.js`, `playerOcclusion.js` | `terrainGrading.test.js`, `verdantUplands.test.js`, `terrainRuntime.test.js`, `landscapeAuthoring.test.js`, `naturalBoundary.test.js`, `playerOcclusion.test.js` |
| GLB cache/instances/animation | `src/assets/modelAssetRuntime.js`; Explorer `src/player/externalPlayerModel.js`; Moss calibration `src/creatures/mosslingMotion.js` | `externalModelRuntime.test.js`, `externalPlayerModel.test.js`, `mosslingMotion.test.js` |
| Author draft, preview, schema/export | `src/author/authorMode.js`, `authorDraft.js`, `authorPreview.js`, `authorTypeRegistry.js`, `landscapeEditor.js`; `src/world/worldValidator.js` | `landscapeAuthoring.test.js`, `meshRecipe.test.js`, `convexPropCollider.test.js` |

Test example: `node --test tests/fieldPlacement.test.js tests/creatureSteering.test.js`. For older phase-named tests, search the module/function within `tests/`; file age/name does not establish obsolete coverage.

## World data and asset source chain

- Runtime imports `src/world/data/world.js`, wrapping generated `world.generated.js`. Canonical editable world is `src/world/data/world.json`; never hand-patch generated output alone.
- Campaign composition starts in `tools/author-beta-world.mjs`, with focused `tools/compose-*.mjs` helpers. Asset descriptors enter through `tools/register-character-assets.mjs`, `register-ecology-assets.mjs`, `register-station-assets.mjs`, `register-discovery-assets.mjs`.
- Change the relevant composer/registration source when changing authored content. For a region-only pass, apply that composer to a cloned canonical world, assert unrelated regions/shared data stay identical, then write and run `npm run world:generate`. `tools/author-beta-world.mjs` reconstructs the entire campaign; verify it against a temporary output before deliberately replacing unrelated authored content. Coordinate the single world writer. Wait for generator process completion before hashing its output; importing its module does not await its asynchronous main.
- `tools/generate-world.mjs` generates runtime data; it also supports optional `src/world/data/sources/*.json` if that directory exists. `tools/check-world.mjs` and `tools/check-campaign.mjs` validate data. Author exports/drafts are a separate user-edit lifecycle; don't overwrite them to fix shipped content.
- Render factories are `src/world/visualFactory.js`, `libraryMeshKit.js` and the focused `*MeshKit.js` modules. Static descriptor/collider interpretation lives in `staticDescriptor.js`, `colliderDescriptor.js`, `convexCollider.js`; keep Play, Author, bounds and physical hulls aligned.
- **Shipping files:** `assets/models/<asset-id>/model.glb`. **Editable approved sources:** `art/source/<asset-id>/` (builder, Blend, manifests/collider/provenance as applicable). **Reviewed references:** `art/targets/`; original owner style references: `art/style/`.
- **Unadmitted studies/evidence:** `.dream-loop/` is usually ignored and may not exist in a fresh clone. Check local paths before relying on them. A study image, generated target or review score does not mean its GLB is registered/shipping.
- **Recovery exception:** `art/source/tidefin-candidate-v3/` retains the latest unshipped Tidefin and exact reconstruction inputs; its manifest maps historical study paths. `tools/skill-backups/wildkin-asset-forge/` preserves the installed project-specific asset skill. See [RECOVERY.md](RECOVERY.md) before restoring or regenerating.
- Asset workflow: installed `wildkin-asset-forge` skill; repository `docs/LOCAL_ASSET_PIPELINE.md`, `docs/MOTION_WORKFLOW_REVIEW.md`, `docs/DREAM_LOOP_REVIEW.md`. Separate reference author, implementer and independent judge; retain exact hashes. Character still/deformation, continuous motion, native gameplay and owner phone gates are distinct.
- Build/check helpers are `tools/art/build-*.py`, `rig-tidefin.py`, `check-game-glb.py`, `package-game-asset.py`. Structural checker success cannot admit art or motion. Coordinate resources before Blender; no automatic inference startup.

## Running and packaging

For repeatable whole-area maps and generated-model galleries, use `tools/review/capture-visual-atlas.mjs` / `visual-atlas.html`; `export-visual-book.py` and `package-visual-atlas.py` package the review. See VISUAL_ATLAS.md for exact snapshot, source hashes, coordinate projection, limitations and private owner delivery. These are development tools, not a runtime minimap.

Verdant's terrain/route/grove composition is `tools/compose-verdant-uplands.mjs`; its accepted V3 rock registration and deliberate18-piece scenic placement are `tools/compose-verdant-cliffs.mjs`, called after terrain grounding. The original reference, owner decision and exact V3 exports are under `art/source/verdant-cliff-kit-v1/`. Keep Rootfall's broad support-edge grade smooth at the West Hollow junction; the bidirectional regression is in `tests/verdantUplands.test.js`. Shared convex/Author/runtime transforms remain covered by `tests/convexPropCollider.test.js`.

Movement sound presentation belongs to `src/audio/movementAudio.js`: it reads authoritative fixed-step player transitions and requests Jump/Land/Dodge cues from the existing `src/audio/gameAudio.js` audio owner. `main.js` only wires update/reset at movement, modal and placement boundaries. Focused proof: `tests/movementAudio.test.js`; native event/mute/reset recording: `.dream-loop/overnight2-movement-audio/`. The adapter does not own physics, add a frame loop or create another AudioContext.

Gravel path colour follows optional `surface.palette.gravel` through `authoredTerrain.js` → `gravelRoutePaint.js`; absent values retain the existing gray palette. The Author landscape palette exposes it when gravel routes exist, and ordinary palette validation/export applies. `shatterfenBank.test.js` checks exact default pixels and unchanged coverage under a new tint. The ordinary `palette.path` field does not colour gravel routes.

Optional `surface.palette.shore` controls the existing ground shoreline mask in `authoredTerrain.js`; it is separate from the thin water-edge `waterFoam` geometry. Author exposes it for regions with water. `terrainShorePalette.test.js` checks legacy default pixels, unchanged dry ground/physics mesh and landscape edit/export retention.

Shatterfen's100×100m terrain, dry approaches, scenery and optional wreck cache come from `tools/compose-shatterfen-uplands.mjs`, composed after existing bank/asset registrations. `tools/compose-shatterfen-bank.mjs` owns admitted bank assets plus the reusable `applyFenBankSurfaceAndGrounding` transaction for local paint and full-foot support after terrain changes. `shatterfenUplands.test.js` and `shatterfenBank.test.js` cover protected roles, route/water/collider clearance and bank grounding. Numeric scope: `SHATTERFEN_REDESIGN_SLICE.md`; candidate/native admission status: `CURRENT_SLICE.md`.

For the tested bpy-dev derivative registered as `blender_lab` and official portable5.2.1, see `docs/BLENDER_MCP_COMPARISON.md`. `tools/art/check-bpy-dev-mcp.py` proves saved-file/API/source-copy operations; `start-blender-lab.ps1` + `blender-lab-workbench.py` launch an isolated loopback19877 review, and `check-blender-lab-live.py` records real viewport/object/rig evidence. Existing4.5/ahujasid production work remains available; loading a new MCP catalog may require a connection refresh.

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

- Dense woodland/solid trunks: tools/register-ecology-assets.mjs, tools/compose-verdant-uplands.mjs; tests/canopyCollision.test.js. Descriptors continue through colliderDescriptor and existing static-world/physics owners.

Backpack quick-slot assignment is rendered by `src/ui/inventoryPanel.js` and routed through `src/inventory/physicalInventory.js` to existing `frontierProgress.assignQuickSlot`. References stay item IDs, never stack indices or another container. `equipmentSystem` owns runtime input; the blocking frame loop cancels held use while the panel is open. `betaShell` routes Journal Gear to the physical panel. `tests/equipmentLoadout.test.js` covers full-pack assignment, sorting and quantity/save ownership; native layout/gesture receipts are in `.dream-loop/physical-hotbar-v1/`.

September12 stopped candidate: `tools/compose-emberfall-ravine.mjs` is deliberately unwired; `tests/emberfallRavine.candidate.mjs` is an opt-in failing study outside the normal suite. See EMBERFALL_CANDIDATE_HANDOFF.md before integration.
