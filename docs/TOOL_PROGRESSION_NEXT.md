# Queued Survey cutter progression plan - after Emberfall/camera

## Decision

**Queued smallest complete slice:** the existing fully claimed Survey chest permanently makes the Survey cutter recipe available. At the existing Salvage bench, the player can repeatably assemble a physical Survey cutter, assign it in Backpack, and use it to harvest existing Iron Ore Rocks and Aether Crystals.

This is a queued plan, not shipped content or accepted balance. It stops before alloys, wreck scrap, ranged weapons, ammunition, armor, durability, a generic blueprint ledger, or a new workstation.

The player journey is clear: find the existing Forest Edge Survey module and fully empty its one-time chest; its existing Field-pack cartridge remains a physical reward, while the successful chest claim itself permanently establishes the recovered Survey plan. Back at a Salvage bench, the player can fit the optional 16-to-20 pack upgrade and assemble a physical cutter from basic materials. Omni-tool and Survey cutter occupy separate quick slots. Omni remains basic gathering and melee; cutter selection makes ore/crystal eligible. Those existing materials then lead to the shipped Matter fabricator, Resonance bench, and reinforced tether costs.

The hotbar becomes a capability switch rather than a second inventory. The Survey/Salvage discovery stays useful for new and old saves without a consumable one-off blueprint.

## Why the existing claim is the right authority

The exact chest ID is chest_survey_cartridge. frontierProgress.claimLootRewards() adds a non-refilling chest to claimedLootChestIds only after its last remainder has successfully committed. While the pack is full or a remainder exists, it stays available and is not marked claimed. lootRemainders preserves the unaccepted physical cartridge, survives reload, and cannot repeat accepted rewards. filterStale() retains the ID while the canonical chest exists; save load/import normalizes and preserves it.

Therefore recipe availability can be a pure derived query against claimedLootChestIds for chest_survey_cartridge, or a small named read-only hasClaimedLootChest(id) owner method. It creates no new stored flag, migration, blueprint ledger, or special old-save rewrite. Existing saves that already fully claimed the Survey chest immediately have the recipe. Existing saves with an unclaimed/full-pack remainder do not, which is correct because they can finish the same chest to earn it.

Do **not** add a second blueprint reward to the chest. It would leave old claimed saves without a blueprint. Do **not** make a renewable blueprint cache: the existing permanent one-time claim is already reliable and is the smaller recovery rule. Cutter crafting is repeatable after the claim, so a future lost, discarded, or inaccessible/stored cutter can be replaced with ordinary materials while every produced cutter remains a real Backpack item.

## Shipped facts

| Fact | Owner / evidence |
|---|---|
| The only shipped tool is permanent omni_tool; it gathers and drives player melee. build_tool is permanent construction. | src/equipment/equipmentCatalog.js (EQUIPMENT_CATALOG, getEquipmentCount); src/equipment/equipmentSystem.js (routeInput) |
| Five saved quick slots hold equipment IDs only; availability derives from Backpack counts for physical supplies. | src/save/frontierProgress.js (assignQuickSlot, getState); src/inventory/physicalInventory.js (action); docs/PHYSICAL_INVENTORY_PLAN.md |
| Survey chest only awards field_pack_cartridge. It is recoverable during full-pack, failed-save, and reload cases; claim state records only a completed one-time claim. | src/world/lootSystem.js (open); src/save/frontierProgress.js (getLootChestAvailability, claimLootRewards); tests/surveyLootContract.test.js |
| Salvage bench costs wood 6, stone 3, fiber 2; Matter fabricator costs wood 6, iron ore 6, crystal shard 2. | src/base/baseCatalog.js (BASE_PIECES) |
| Station craft is one atomic Backpack-plus-selected-nearby-storage transaction; animation is presentation only. | src/save/frontierProgress.js (prepareExchange, craftFieldSupply); src/base/craftingStations.js |
| Existing recipes only make rations/tame supplies; Fabricator/Resonance outputs already consume iron/crystal. | src/base/baseCatalog.js (FIELD_RECIPES); src/base/stationCatalog.js |
| Iron Ore Rock and Aether Crystal are renewable visual-asset harvestables with no current tool gate. | world asset_iron_ore_rock / asset_crystal; src/resources/resourceConfig.js (createVisualAssetResourceType) |
| One field-tool swing combines resource and melee hits today. | src/main.js (equipment.routeInput, fieldTool.update, handleUnifiedImpact); src/tools/fieldTool.js |

The broader CRASHLAND_PROGRESSION_PROPOSAL is explicitly provisional. Its cutter heads, alloys, bolts, and digital cartridges are not runtime facts. SURVEY_RECOVERY_SLICE explicitly deferred a general blueprint ledger.

## Exact queued impact

| ID / asset | Change | Source/cost | Purpose |
|---|---|---|---|
| field_pack_cartridge | Existing, unchanged | Existing Survey reward | Optional physical 16-to-20 pack fit. |
| chest_survey_cartridge claim | Existing saved identity, new derived recipe condition | A fully completed existing one-time chest claim | Permanent Survey plan availability; no new saved field or item. |
| survey_cutter | New physical tool, stack limit 1 | Repeatable Salvage bench recipe after Survey claim: wood 4 + stone 2 + fiber 3 -> cutter 1 | Hotbar-selectable powered harvester; no charges/durability. |
| omni_tool | Existing, unchanged | Permanent | Trees/rocks/fiber and sole player melee. |
| asset_iron_ore_rock -> iron_ore | Existing node/drop; add cutter requirement | Survey cutter selected | First industrial material, enables existing fabricator/tether chain. |
| asset_crystal -> crystal_shard | Existing node/drop; add cutter requirement | Survey cutter selected | Enables existing fabricator/resonance/chime chain. |
| Fabricator / Resonance and recipes | Existing, unchanged | Existing costs | Immediate use for newly unlocked materials. |

Cutter assembly has only basic materials. Requiring iron, crystal, alloy, or a fabricator would self-gate a new save. Repeat crafting intentionally permits another physical cutter; it never grants a hidden equipped copy, and the existing unique quick-slot ID reference still prevents duplicate cutter entries in a loadout.

Do not add material/alloy in this slice. It needs a consumer, world art, pickup presentation, economy review, and recovery proof.

## Minimal data flow

### Physical ownership/save

- Add survey_cutter to EQUIPMENT_CATALOG as a non-permanent kind:tool. Mark existing Omni/build actions permanent explicitly, instead of treating every tool as permanent.
- Let createItemCatalog include non-permanent equipment and getPackEquipment derive its carried count. getEquipmentCount returns actual Backpack count for cutter and constant 1 for permanent actions. This extends the existing catalog/count rule; do not add ownedTools or another inventory.
- Add one FIELD_RECIPES entry and one STATION_RECIPE_IDS.workbench entry. craftFieldSupply already checks station/cost/output space and commits or rolls back one exchange.
- Gate only this recipe with existing chest_survey_cartridge membership in claimedLootChestIds. The condition is derived during the existing craft request; it is not copied into the save and does not consume/remove the claim.
- The station panel shows "Recover the Survey plan at Forest Edge" until incomplete, then exposes ordinary repeatable costs. A claimed old save is already ready; a partial chest shows the current physical cartridge recovery path.
- Retain exact existing default loadout. Old saves retain inventories/loadouts/materials. A fully claimed Survey chest additionally derives recipe availability; this prevents newly gated ore/crystal from stranding progression.
- Do not alter loot_survey_cartridge or add a second chest item. Existing chest/remainder behavior remains the source of discovery proof.

### Tool routing/harvest gate

Keep equipmentSystem, resourceSystem, and one fieldTool; do not invent a combat/tool framework.

1. equipmentSystem.routeInput returns selected tool ID plus combat permission. Omni is harvest+combat; Survey cutter is harvest-only.
2. createBetaGame passes equipped profile to fieldTool. Reuse current handheld hierarchy with a restrained cyan powered core/trail; a new GLB is later art work.
3. main.js passes toolId through every target path: auto eligibility, manual impact target, and halo visibility. Cutter sets combatAllowed false and an empty combat target source. With Auto Harvest off, input starts a manual harvest swing, never a combat profile just to reach a resource.
4. Add optional requiredToolId to visual-asset harvestable settings copied by createVisualAssetResourceType. Set only on existing asset_iron_ore_rock and asset_crystal. Basic nodes accept omni_tool; these accept survey_cutter.
5. resourceSystem applies one compatibility predicate in getEligibleNodes, getManualTargets, getHaloTargets, and manual/auto helpers. A beforeHarvestHit-only check leaves bad halos, auto starts, and manual lists.
6. worldValidator validates requiredToolId against equipment IDs. Update canonical world and generated world through composition/generation; preserve resource placement IDs and X/Z.

Pickup spawning, depletion/respawn, collider lifecycle, pack-full recovery, and damage ownership remain unchanged. handleUnifiedImpact still calls resourceSystem.applyHit, but cutter receives no creature hits.

## Proposed file owners

| Files | Responsibility |
|---|---|
| src/equipment/equipmentCatalog.js; src/equipment/equipmentSystem.js | Catalog, physical/permanent count, selected-tool intent. |
| src/inventory/itemCatalog.js; src/inventory/inventoryState.js | Catalog recognition and carried-tool derived count. |
| src/base/baseCatalog.js; src/base/stationCatalog.js; src/base/craftOutputVisual.js; src/base/craftingStations.js | One repeatable bench recipe, claim-derived availability, panel/tray. |
| src/save/frontierProgress.js; src/inventory/physicalInventory.js | Existing transaction/loadout owner and named derived claim read if wanted; no new persisted field. |
| src/resources/resourceConfig.js; src/resources/resourceSystem.js; src/tools/fieldTool.js; src/game/createBetaGame.js; src/main.js | Tool requirement across input, targets, visual, harvest, no-melee route. |
| src/world/worldValidator.js; src/world/data/world.json; generated world | Two existing asset requirement fields only. Existing Survey loot table/chest stays unchanged. |
| src/ui/inventoryPanel.js / station panel only if necessary | Name/icon/missing-Survey-plan affordance; no Backpack redesign. |

No new station, weapon/projectile system, armor/clothing owner, resource family, campaign state, generic blueprint framework, source migration, or new chest/recovery rule belongs here.

## Focused proof

1. **Claim-derived old-save compatibility:** fixture imports a pre-slice save with claimedLootChestIds containing chest_survey_cartridge and no cutter; recipe is available and can craft from basic materials. An otherwise identical unclaimed/partial-remainder save is blocked until existing chest completes. Confirm no additional save field/write occurs merely by checking availability.
2. **Existing chest behavior:** retain surveyLootContract full-pack, reload, remainder, and failed-save proof for the cartridge. Confirm no second reward is needed and no chest claim becomes true while a remainder remains.
3. **Repeatable craft:** at a placed Salvage bench, prove missing Survey claim/material/station/output-space rejections spend nothing; successful craft consumes only ordinary materials; a later craft after another material payment gives another physical cutter; failed persistence restores cost/output; selected storage is accepted only in reach.
4. **Catalog/loadout/save:** cutter cannot assign before craft; it assigns from pack, survives sort/transfer/reload, becomes unavailable when stored, and cannot create a second quick-slot reference. Old save stays valid.
5. **Route/harvest:** before cutter, ore/crystal give no target, halo, impact, or drop. After craft/select, both deplete, produce existing pickup, respect full-pack recovery, respawn, and retain safe colliders. Omni restores basic resources.
6. **Combat/input siblings:** cutter-selected keyboard/touch tap/hold cannot damage creatures or start orange combat. Auto-off manual harvesting works. Omni manual/held combat and unified harvest behavior remain intact. Modal/hotkey/Backpack/reset/load cancel held input as now.
7. **World/Author:** validation/export recognizes optional requirement; no placement IDs/transforms move. Fresh route proves chest claim -> bench -> cutter -> ore/crystal -> fabricator with no self-gate.

Likely focused suites: surveyLootContract, equipmentLoadout, equipmentSystem, baseCrafting, fieldPackUpgrade, harvestContinuity, pickupCapacity, scaledHarvestReach, relevant phase31/current field-tool tests, and a focused Survey/world fixture.

## Risks and boundaries

- **Claim semantics:** gate on completed claimedLootChestIds membership, never chest proximity, a transient interaction, or cartridge possession. A partial/full-pack chest must remain unfinished.
- **Old saves:** do not claim old saves are unchanged: a fully claimed Survey save gains derived cutter availability so it can cross the new ore gate; its serialized structure stays unchanged.
- **Repeatability:** the current game has no tool loss/durability, but repeat craft is the smallest future-safe replacement rule. Every result is still a physical stack; no hidden reissue item exists.
- **Input leak:** unified swings collect combat and resource targets. Cutter needs explicit harvest-only/manual-Auto-off routing.
- **Historical proof:** native evidence harvested iron with Omni. It no longer proves gated ore; refresh after crafting/selecting cutter.
- **Next slice:** ranged bolt caster/ammunition/player projectiles remain separate. Current projectileSystem is creature-combat infrastructure, not authority to reuse it.
