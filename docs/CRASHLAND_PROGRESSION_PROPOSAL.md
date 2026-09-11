# Crash-land progression proposal

September 11, 2026 · Independent design recommendation · **Not an implementation spec or accepted balance**

**Subsequent producer/reviewer resolution:** the active implementation plan is `PHYSICAL_INVENTORY_PLAN.md`. It replaces this draft's reload-as-emergency-recovery recommendation with a small saved expedition snapshot and ordinary world rebuild, retains pending bonds/pack and cancels only unfinished paid attempts/projectiles. It also defers pinned slots, bulk matching transfers, manual dropping and generic unique-hardware reissue machinery from the first inventory slice. Treat the original options below as design history where the active plan differs.

The next version should make the expedition a prepared trip from a recognizable crash site: pack for a destination, recover something useful from the wreck trail, bring it home, and turn that discovery into a new capability. Physical inventory and storage should support that loop before we expand the item catalog or build more regions.

This proposal preserves the playable Camp and five-region campaign, ordinary movement/combat/taming, single-player offline operation, and the existing Three.js/Rapier architecture. The accompanying [source audit](../.dream-loop/crashland-design/source-audit.md) distinguishes implemented systems from proposed ones.

## Decision boundary

**Explicit owner direction:** crash-landed player; landing pod from a substantial colony/research ship or station; Camp robot/drone, debris and supplies; scattered crates and transport beacons; deeper exploration toward major wreckage; recovery of supplies, blueprints and parts. The intended feel draws on land-based Subnautica and ARK/Palworld within a top-down RPG, between casual mobile and demanding PC survival. Inventory must become draggable/sortable, limited and upgradeable, with physical base storage replacing infinite bank/menu-only storage.

**Additional explicit direction:** generic area gates become unique natural/wreckage obstacles to clear or repair: fallen alien trees, wreckage in a narrow ravine, rubble at a cave entrance. Camp starts behind improvised emergency barricades. Expansion clears discrete adjoining sections and automatically extends the barricade perimeter as part of the expansion cost. An open farm fence/gate and a simple larger build-radius purchase do not fulfill that direction.

**Provisional recommendations below:** exact vessel and character names, cause of the crash, ending, capacities, costs, technology order, death rules and playtime targets. The owner has not selected ship versus station, approved a new currency, or requested hunger/thirst. No production behavior changes with this document.

## Narrative spine: rebuild contact, then choose to remain

Use a **colony research ship** as the working origin. Its survey team had deployed surface relays before a systems failure scattered landing pods and hull sections across the frontier. The player awakens beside a damaged pod. A small maintenance drone can identify compatible components and maintain the pod, but cannot fetch distant supplies or solve every problem. Give it concise, situational dialogue rather than a permanent tutorial stream.

The initial task is concrete: restore the pod's local receiver and find the ship's emergency channel. A nearby relay supplies the first bearing. Subsequent wreck sections establish that evacuation was partly successful; deeper signals may be survivors rather than an enemy to conquer. Avoid committing to a betrayal, evil AI or colony extinction before the central loop works.

Keep the world's own identity. Intact dark-barked alien trees, ancient stone structures, living seals and Wildkin existed before the crash. Pale manufactured ribs, marked cargo containers and torn bulkheads identify human wreckage. Survey relays adapt the existing transport network; the player repairs their interfaces, not the planet's entire civilization. The Fen receiver can remain an older instrument used by the survey team. Existing art need not all be reclassified as ship debris.

Progress through visibly larger discoveries: loose cargo → torn survey module → industrial hull section → broken communications array → the main research hull lodged at Heartwood. The finale joins the recovered transmitter hardware with the Heartwood Core to send a reliable distress packet and locate surviving pods. This provides a finite achievement and a reason to keep exploring. A rescue cinematic, populated colony and branching narrative are outside the first implementation.

Every major wreck needs three readable features: a silhouette visible on approach, a recognizable entry/exit, and one identifiable useful system inside. An important wreck cannot be represented only by another chest and a text toast. Top-down interiors should use open roofs/cutaway walls and the existing occlusion behavior, without a camera redesign.

## Inventory that creates decisions without chores

Recommend **fixed slots and stacks**, not weight, grid shapes or encumbrance slowing. Players can count free slots at a glance; the existing movement feel remains stable. One item type occupies a slot regardless of shape. No backpacks inside backpacks.

| Container/equipment | Provisional capacity | Rule |
|---|---:|---|
| Starting backpack | 16 slots | All carried resources, food, medicine, tame supplies, ammunition, spare gear and recovered parts use it. |
| Field-pack upgrade | 20 slots | Permanent fitted expansion, unlocked in Verdant; no extra container to equip. |
| Survey-pack upgrade | 24 slots | Later Shatterfen technology; stop here until the actual economy needs more. |
| Pod locker | 24 slots | Fixed, physical Camp interaction; always available and cannot be demolished. |
| Wooden storage crate | 24 slots | Placeable, named container; costs 6 wood + 2 fiber. |
| Reinforced locker | 36 slots | Upgrade a crate in place for 4 alloy + 4 fiber; preserves its ID and contents. |
| Suit tool / weapon mount | Omni tool + one later weapon | Omni is permanent rescue equipment. One mounted weapon is separate from the pack; spare weapons occupy slots. |

Stack limits: raw materials 20; refined parts 10; rations/medkits 5; each taming supply 3; bolts 20; tools, blueprint cartridges and unique hardware 1. These are starting tuning values. Capacity pressure should come from preparation and valuable finds, not five varieties of otherwise interchangeable pebbles.

The five existing quick slots are **shortcuts, not extra storage**. An assigned item reads the quantity actually in the backpack; it cannot use supplies left at Camp. Sorting or merging stacks must not break a shortcut. Empty assignments remain visible with a clear count and craft-location hint. Selecting never consumes; existing edge-triggered Use and held tool attack remain distinct. Construction is an action mode using carried/local materials, not a fictitious infinite stack of building tools.

A typical 16-slot loadout reserves one ration stack, one medkit stack, one lure stack, one snare stack and perhaps bolts. Six resource types plus a cartridge occupy another seven slots, leaving four for extra ore, bulky parts or optional loot. Bringing every species' gear and extra ammunition trades away return capacity. The suit tool guarantees a player can rebuild even after losing the backpack.

### Physical storage and crafting access

Opening a locker displays **Backpack ↔ named locker**. Transfer, sort and stack merge operate only on those containers. Station crafting can use the backpack plus **one player-selected storage container within 4 metres of the station**, with the source named beside the costs. Default is backpack only; source selection is remembered by structure ID and revalidated at craft time. No invisible Camp-wide bank, distant container access or search across all placed structures.

The pod's emergency work surface follows the same rule and starts beside its locker. A new crate counts against the existing construction limit. A nonempty container cannot be dismantled; show its remaining occupied slots. Moving it is either an explicit later relocation transaction or requires emptying first. World reward chests and player storage have separate rules even if they reuse a model.

### Camp expansion is a place, not a radius

Start with a small pod apron protected by sloped salvage panels, braced crash debris and a deliberate human-sized entrance. It has room for the fixed pod facilities, one crate and one Salvage bench. The protection is spatial/story context; this does not authorize raids, perimeter decay or a defense-maintenance chore.

Preview adjacent areas in the world: first a debris-filled **work yard**, later a **storage terrace**, then an optional **Wildkin shelter clearing**. Each has a visible obstruction/task and a bounded material bill. The work yard can provisionally require salvaging its loose debris plus 6 wood, 4 stone and 2 fiber. One completion transaction unlocks its polygon, removes the obsolete internal barrier, and extends grounded barricades around the combined perimeter. The preview includes the new entrance and full barricade cost; do not charge a second hidden fence-building fee. Existing placed items never disappear under new walls, and an occupied future wall footprint prevents completion with a clear location cue.

Keep the first task on foot with the starter Omni and place its resource sources outside the blocked yard. Clearing is a purposeful local job, not harvesting every scenic object. Preserve a walkable exit during the whole transition. Later sectors can require a cutter or reinforced braces, but they must not contain the only station space needed to make their own clearing tool. The existing three-tier Camp concept can supply the saved progression boundary; discrete sector shapes/perimeters replace the present expanding square.

### Capacity-safe crafting

Crafting previews the **final** inventory after ingredient consumption and output placement. A recipe that frees a slot may succeed in a full pack. Otherwise it spends nothing and explains the missing space. Keep current short station cycles and atomic production: cost and output commit together at start; the machine's animation presents that committed result. Do not add a second reward on animation completion. Output goes to the shown backpack, not secretly into a linked locker. The output-on-tray visual is presentation, not an additional collectible copy.

### Dragging, sorting and accessible alternatives

At 844×390, show two compact four-column grids side by side with at least 48 CSS-pixel cells, persistent container names/capacity, and a selected-item detail/action strip. Larger containers scroll within their own grid. Portrait uses one container at a time with an explicit transfer destination. Test actual labels and hands, not just cell bounds.

Mouse: drag to swap/merge/transfer; click then destination is equivalent; Shift-click transfers a stack. Touch: tap item then destination, with a visible Transfer button for the common action; deliberate long-press begins drag so normal swiping can scroll. Cancelled/outside drops return the item. Never discard by dragging outside the panel. Keyboard: arrows move focus, Enter selects/places, Escape cancels before closing; labeled Transfer/Split buttons expose all operations without a pointer. Dragging is an additional convenience, never the only route.

Provide Merge stacks, Sort and Transfer matching materials. Sorting preserves pinned preparation slots. Split opens a small quantity control with One/Half/All and +/−. A manual Drop action confirms valuable/unique items and creates a recoverable world bundle. Use names and counts, not rarity color alone. The inventory pauses this single-player game through the existing blocker, clears held input, and closes without an attack or camera jump.

## One causal transaction chain

1. **Acquire:** pickups ask the inventory owner how many fit before disappearing. A full pack leaves the item available and gives one restrained “Pack full” cue. Physical chest contents persist after partial looting; XP/claim flags cannot repeat when taking another stack. Preserve uncollected resource entitlement when the existing bounded pickup pool expires—merge into a source-local pending bundle rather than silently erase capacity-rejected rewards or spawn unlimited meshes.
2. **Prepare:** move real supplies out of Camp storage; quick slots count that backpack only. Departure retains the pack instead of clearing it. Show the selected destination and missing pinned recipe ingredients; do not require a packing checklist modal.
3. **Explore:** harvesting adds stacks; food/taming/ammunition consume those stacks. Repairs consume carried parts. Prepared and newly found items share one owner; a run log may record provenance for results without owning another inventory.
4. **Extract:** the beacon returns the player **with the same pack**, secures XP, pending bonds and mission progress once, and uploads carried blueprint data through the pod link. It does not turn items into bank numbers. Full Camp storage cannot prevent extraction. The result puts a new companion, blueprint or major part above incidental material totals.
5. **Unload and improve:** walk to the pod locker or placed crate. Transfer actual stacks, craft from shown local sources, fit an upgrade, choose the next bearing. “Returned with” and “Stored” are distinct words and events.

Blueprint cartridges occupy one field slot until a successful return uploads and consumes them. Learned recipes become permanent digital knowledge with no physical stack or repeated point cost. A player can inspect a found cartridge to understand its value before returning. Main-path discoveries are guaranteed authored rewards, never a random fragment lottery. Optional duplicate caches provide useful materials instead.

Mission hardware remains physical until installed. Every mandatory unique part has a recovery/reissue rule tied to its source and persistent installation flag; it cannot disappear permanently through death, partial looting, an old save or a full pack. Reissue only when it has actually been lost: a copy still in a backpack, locker or recovery bundle prevents another source grant. Never require the capability being unlocked to reach its only blueprint or ingredient.

## A small technology tree with distinct workshops

Use “Known / Recover blueprint / Requires station / Missing materials / Ready” in the existing craft view. Known recipes cost materials once per output, not engram points plus XP plus blueprint plus another currency. Existing XP remains combat/perk progression; phase out redundant level locks on story gates when their physical repair objective is authored. Grandfather already repaired gates and purchased upgrades.

The following costs are design starting points, not edits to current recipes. Existing lure, snare, ration and companion behavior should survive the storage change unchanged; rebalance medicine separately if its present base healing is weaker than the new role suggests.

| Tier and station | What it teaches and produces | Unlock |
|---|---|---|
| 0 · Pod emergency surface | Foundation, wall, crate, berry lure and woven snare. Minimal recovery kit; current Camp menu becomes an inspectable local surface. | Available from the start. Ration remains a reason to build Salvage. |
| 1 · Salvage bench | Trail ration; pack expansion; dismantled wreck scrap → alloy; repair coupler; scrap spear. Manual assembly and recovery. | Pod knows the bench recipe; recover the first survey cartridge for its advanced recipes. |
| 2 · Matter fabricator | Ore → alloy, cutter-head retrofit, bolt caster/ammunition, reinforced tether, reinforced locker, advanced pack. Precision industrial manufacture. | Shatterfen's survey module supplies its complete blueprint. Can build it from regional scrap before owning a cutter. |
| 2 · Resonance bench | Existing calming chime; resonant lens; improved medicine and later suit ward. Ecology/research interface, not another generic crafting bench. | Fen calibration record; uses ordinary reachable crystal. |
| 3 · Station upgrades, no fourth factory | Fit the recovered Emberfall regulator to Matter; fit a Windscar lens to Resonance. Unlock transmitter components and final receiver tuning. | Deterministic wreck hardware, visibly installed in the existing machines. No fuel/wiring simulation. |

Three station families are enough. No separate furnace, ammunition factory, armor factory, repair bench and kitchen in this first campaign. Refining and assembly use short explicit batches, no unattended queues or background idle production.

### Concrete item set and useful choices

Retain wood, stone, fiber, berries, iron ore, crystal shard and wildflower. Add only **wreck scrap** as a renewable salvage input and **alloy** as a common refined intermediate initially. Scrap represents recognizable damaged metal, not a duplicate of every ore. Required scrap remains obtainable from marked renewable loose debris after one-time containers are emptied.

| Item | Provisional recipe / source | Purpose |
|---|---|---|
| Field-pack expansion | 6 fiber + 2 wood, Salvage; Verdant blueprint | +4 slots, fitted permanently. |
| Survey-pack expansion | 8 fiber + 4 alloy, Matter; Shatterfen blueprint | +4 further slots; cannot downgrade into overflow. |
| Alloy ×1 | 2 wreck scrap at Salvage **or** 2 iron ore at Matter | Two sources keep early industrial work independent of advanced mining. |
| Repair coupler | 2 alloy + 2 fiber, Salvage | A one-slot prepared part for damaged machinery. Natural obstacles use their own understandable tools/materials instead. |
| Scrap spear | 2 wood + 2 alloy, Salvage | Slower, longer melee reach than Omni; no new combat system in the inventory slice. |
| Cutter head | 4 alloy + 1 crystal, Matter | Fits Omni; opens marked damaged bulkhead seams and optional dense nodes. Baseline trees/ore stay harvestable. |
| Bolt caster | 4 alloy + 3 wood + 2 fiber, Matter | Deliberate short-range ranged alternative; later bounded combat slice with visible aim/telegraph. |
| Bolts ×10 | 1 alloy + 1 wood, Matter | Limited ammunition gives the pack a preparation tradeoff. No ammunition types initially. |
| Resonant lens | 2 crystal + 2 alloy, Resonance | Tunes a specific receiver/ship interface; not a random crafting tax on every recipe. |
| Regulator, antenna section, flight recorder | Guaranteed marked wreck systems | Unique installed story parts; no farming duplicates. |

Lures compete with rations for berries by design, but renewable berries and fiber must remain accessible before any capture. Keep current food healing-only; no hunger, thirst, spoilage, routine tool breakage or running penalty. Do not add upgrades whose only benefit is undoing a newly introduced nuisance.

## Regional purpose and progression

| Existing region | Wreckage, reveal and meaningful return | Capability and companion loop |
|---|---|---|
| Frontier Haven · Camp | Pod, drone, opened emergency crate and visible locker. Receiver identifies the first survey spill. | Learn physical storage and prepare one trip. The drone explains one next destination, not all locked recipes. |
| Verdant Verge | Cargo fragments lead to a torn survey module near an existing safe route. Recover field-pack/coupler cartridge and a fragment of the evacuation log. | Gather renewable basics, discover Lookout extraction, build Salvage/first crate and gain carrying room. Mossling's current Bloom heals and opens the living seal; optional cache reduces material costs rather than holding the only required blueprint. |
| Shatterfen | A half-buried research compartment and the Fen receiver triangulate the industrial hull. Find Matter plans, survey-pack plans and calibration record. | Dry-bank Tidefin taming teaches preparation plus retreat; its existing ward and tidal seal reward a protected optional route. No forced swimming or new aquatic movement requirement. |
| Emberfall Ruins | Substantial fractured industrial hull is the principal landmark, with an accessible equipment bay and visible regulator. The record shows the ship tried to isolate a damaged research load. | Cutter/weapon preparation and existing Emberhorn challenge. Cragbreaker opens the mineral vault for a generous alternate supply cache. Main regulator has an ordinary combat/route solution, so tether equipment cannot be locked behind Emberhorn itself. |
| Windscar Cliffs | Broken communications mast and antenna debris identify the main hull's final position. Recover antenna section and flight recorder. | Chime/Skydancer path and existing Skybound support optional traversal shortcuts. Keep the normal authored route to all mandatory parts. No glider/flight system required. |
| Heartwood Vault | Main research hull intersects an older living vault; the ship's interface has disturbed its Guardian. Secure the Core, then return and finish the distress transmitter. | A prepared mixed loadout, mastered avoidance and useful companion choice. Keep Core return risk and finite conclusion. Avoid requiring all four companions; the current two-companion finale condition can remain a provisional broad-exploration requirement. |

Companions should change how a prepared run feels before they multiply output. Retain current Bloom, Tidal Ward, Cragbreaker and Skybound, their seals, one active follower and pending-bond extraction. Do not immediately add mounts, workers, breeding, hungry dependents or companion cargo that bypasses pack limits. Each species' supply is craftable before meeting it; no required part sits behind that same species' exclusive seal. Optional seal rewards provide an alternative to gathering or a desirable secondary upgrade.

Replace generic gate visuals and resource tolls with **different physical problems**, not four differently named panels. These provisional assignments use tools learned in the region before the blocked exit:

| Transition | Visible problem and action | Prepared requirement and alternate route |
|---|---|---|
| Verdant → Shatterfen | A fallen alien trunk blocks a drainage cut. Cut marked stressed sections, then stabilize the usable bank. | Starter Omni; 4 wood + 2 fiber for bracing. Other reachable trees supply the wood. No advanced station, pet or XP threshold. |
| Shatterfen → Emberfall | A torn survey hull jams a narrow ravine. Slice its damaged brackets and move the loosened section. | Cutter head learned from the accessible survey wreck; one repair coupler for the exposed support. No heavy-object physics simulation is necessary. |
| Emberfall → Windscar | Unstable mineral rubble seals a cave mouth. Clear its fracture points and secure the remaining overhead slab. | A Matter-made impact-head retrofit, provisionally 4 alloy + 2 crystal, with its blueprint in the accessible industrial bay; Emberhorn's Cragbreaker is an optional equivalent clearing capability. Both still need a 3 wood + 2 stone structural brace. |
| Windscar → Heartwood | The remaining service span across a fissure is torn loose. Restore its anchors and walkway. | 6 wood + 2 alloy, using recovered engineering data. Skydancer can reach an optional cache, but never bypass mandatory progression accidentally or become the only way to obtain bridge materials. |

Show the obstruction and next useful action from the approach; show exact missing tools/materials only when inspected. Once cleared, it stays physically open and reads as a passage. The current section transfer can occur at that passage without retaining a freestanding sci-fi toll gate. Existing internal edge IDs may map to the new obstacle completion state so old saves remain connected; visual identity and player-facing language change. Preserve backtracking, region destinations and free discovered waypoint/extraction use. No repeated clearing on each trip, inflated hit-count grind or mandatory companion dependency cycle.

## Economy, pacing and failure

Aim for a useful choice within the first 5 minutes, first loaded return within 8–12, and crate/pack improvement within 20–30. These are new test targets, not measured human times. Evaluate the first two regions as a 45–60-minute arc before setting a total campaign length; the earlier 60–90-minute whole-game estimate was provisional and should not dictate this richer loop.

Every trip should have one primary objective, a material opportunity and an optional risk. Signal the target item and its purpose before departure. A player should need no more than one ordinary supply trip to retry an early failed tame. Avoid exhausting every wood node just to open the next route. Early station/storage investment should fit approximately two successful basic loops; the first yard expansion is the next optional investment, not a fee needed to fit those starter facilities. Then unlock activities instead of only larger numbers. Balance against renewable yields, not milestone gifts; gifts remain helpful and cannot be the only source of mandatory ingredients.

**Proposed failure rule:** installed upgrades, learned blueprints, stored items, Omni and the mounted weapon survive. Backpack contents form one marked recovery bundle on safe ground near the failure; run XP and unsecured bonds are lost as today. Kill-volume deaths use the last validated safe ground. No real-time decay timer. A second death does not overwrite the existing bundle: its new backpack cargo is lost, with that rule stated before departure while a recovery remains. An empty-pack death changes nothing. Offer an explicit Abandon recovery action; never silently delete the old bundle. Unique mission items lost this way become recoverable again at their authored source, and spent food/taming supplies stay spent.

For the first inventory slice, use the same **emergency-recovery outcome on a literal field reload or interrupted session**, announced at Camp. Persist carried stacks and the last safe recovery anchor with inventory transactions and the existing loop's periodic safe-position checkpoint. On reload, convert an unresolved run once into its recovery outcome. Normal Pack/pause resumes in place. This is deliberately less work than serializing all animals, projectiles and taming stages; it avoids the current silent cargo loss and does not turn force-quit into free extraction. A later exact in-field resume can be considered separately. State this behavior before the first departure and in Settings.

## First vertical slice and migration

**Build Camp ↔ Verdant plus its first blocked exit, not the full technology tree.** The first slice is complete only when a player physically packs, fills a backpack, chooses what to keep, extracts, unloads, learns one blueprint, expands storage/capacity, clears an adjoining Camp yard with an extended barricade, and opens a recognizably obstructed route. Shatterfen may remain its current playable region beyond that exit.

1. Introduce a small item/stack definition and pure transfer/merge/split/craft-capacity helpers. Put persistent backpack and container records under the existing save authority. `pickupSystem` becomes a pickup presentation/collection adapter; `expeditionSession` keeps run metadata. Do not leave the old bank as a second spendable owner.
2. Add the pod locker, one storage-crate piece and backpack UI with drag plus full tap/keyboard alternatives. Update pickup, partial chest loot, equipment counts/use, repairs and construction to commit through that owner. Preserve existing recipe access during this step so later regions remain playable.
3. Change departure/extraction/death/reload atomically as specified. Results distinguish returned items from deposits. Objective completion uses actual acquisition/extraction receipts, not “bank total > 0.” Milestone material rewards use capacity-aware delivery at the pod, never disappear in a full pack.
4. Author one readable Verdant survey wreck and one guaranteed field-pack cartridge. Add the 20-slot fitted upgrade, first crate, initial pod barricade and one adjoining yard-clear/extend transaction. Replace only Verdant's outbound generic gate with the fallen-trunk obstruction and permanent opening. Test a failed tame/retry without gifts, walk the newly protected yard and pass the cleared trunk normally. This is the first player review; do not hide an unfinished inventory conversion behind new art.
5. Only after that loop works, introduce Shatterfen's station blueprints and alloy, then cutter/ranged combat, then remaining wreck progression. Each new item must have a destination, source and an actual use. Existing advanced stations/regions remain accessible for old saves until their replacement path is ready.

**Prealpha saves:** migrate v2 rather than reset. Preserve XP, purchased upgrades, learned/earned campaign flags, companions/selection, gate/waypoint/seal claims, building IDs/transforms and settings. Map previously purchased Camp tiers to their corresponding cleared sectors. Where existing valid buildings extend beyond the proposed starter apron, grandfather sufficient cleared area and fit the perimeter around occupied footprints rather than enclosing/deleting them; disclose that legacy allowance. Already repaired edges begin physically cleared. Convert medkits/field supplies and all banked quantities into legal stacks without truncating counts. Fill the pod locker deterministically; excess goes into a clearly labeled physical **Legacy supplies** recovery locker, withdraw-only, with a finite saved remainder that cannot accept new deposits. It is a migration exception, not a new infinite bank. Use bounded paged rendering and split into legal stacks on withdrawal; remove it when empty. Unknown legacy item IDs remain preserved in the migration report/backup instead of being discarded.

Migrate existing quick-slot item references; missing carried supplies show zero until withdrawn. Preserve every formerly available recipe needed by an owned station or purchased capability, but do not award unimplemented new technologies. Extend both local normalization and the versioned export/import wrapper: currently import rejects a different `gameVersion`, so changing only the loaded-state normalizer is insufficient. Create a local recovery copy of the original save before the atomic upgrade; keep that backup out of normal mutable state. A failed write leaves the previous save and visible game state intact. Expose a plain migration receipt: preserved quantities, locker location and changed field-reload rule.

Focused closure: quantity conservation under transfers/partial pickups/full outputs; no duplicate loot or extraction rewards; stack/use/quick-slot agreement; container removal and save rollback; v2 import with more than a locker can hold; death/reload recovery once; blocked/open passage collision and reload; sector task/material/perimeter atomicity with occupied-footprint rejection; native mouse drag, tap transfer and keyboard at 844×390 plus portrait fallback. One genuinely played fresh Verdant loop and one loaded offline replay should establish value. Reserve the full existing aggregate for the integrated boundary; no new test framework or broad device matrix.

## Research used, and what we are choosing ourselves

- Unknown Worlds described staging technology through wreck discoveries to introduce base elements gradually and create ongoing accomplishment. This is a historical 2015 Subnautica development example, not a claim about today's exact recipe. Adopt destination-led discovery, not repeated fragment grinding or stripping old unlocks. [Developer article](https://unknownworlds.com/en/news/where-did-my-water-filtration-machine-go)
- ARK's developer/publisher store description connects gathering, shelter, technology and creature utility; it also explicitly describes inventory weight slowing movement. Borrow the prepared expedition and useful companion relationship. Our slot model and preserved movement are deliberate departures from that heavier survival burden. [Official store description](https://store.steampowered.com/app/346110/ARK_Survival_Evolved/)
- Pocketpair's official technology list distinguishes workbench, medicine, weapon and Pal-gear families and lists successive pouch technologies. That supports clear station purposes and capacity upgrades as recognizable concepts; it does not establish the right number of stations, costs or unlock pacing for Wildkin. [Official technology reference](https://docs.palworldgame.com/settings-and-operation/technologyids/)
- Mojang explains that bundles relieve the clutter caused by several partial stacks and allow choosing a stack to remove. Treat partial-stack clutter and direct access as usability concerns. Start with merge/sort and generous basic stacks; nested containers would add unnecessary interaction complexity here. [Official bundle article](https://www.minecraft.net/en-us/article/bundles-are-making-a-comeback)

The next consequential product review is the first physical packing/return loop. Story names, advanced weapon recipes and final rescue presentation can remain provisional while that determines whether the new direction is enjoyable.
