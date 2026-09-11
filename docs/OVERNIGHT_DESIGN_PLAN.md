# Prototype design plan — September 11

Producer choices below are provisional implementations of Chris's explicit overnight scope. Read `OVERNIGHT_MANDATE.md` for all owner instructions and machine-stability limits. Review the actual game after each batch and revise this plan.

## Current wrap-up status

Physical inventory v3 is integrated: 16-slot backpack, 24-slot pod/crate containers, nearby selected craft source, drag/sort/split and accessible tap/keyboard operations. Old quantity counters migrate into physical storage with withdraw-only overflow; packed supplies alone drive equipment counts. Extraction preserves packed items and secures XP/bonds; a small saved expedition snapshot supports reload. Death provisionally keeps the backpack while losing carried XP/pending bonds. Exact capacity/balance remains unaccepted by Chris.

Actual integrated inventory panel review passes 8.2; normal pod approach label discovery required a separate ancestry/occlusion follow-up. Root records its latest native closure. Creature-side callouts and companion-first result payoff have already passed their bounded reviews. Tall/spread canopy and earned Mossling/Tidefin journeys are accepted only within their recorded browser evidence; the new Tidefin V3 animation study is not shipping.

Latest aggregate: 810 tests, world/campaign checks, build and ZIP pass at 42.53 MB unpacked / 20.25 MB ZIP. Final current-package native closure remains separate; no owner acceptance, physical-phone performance or full new-inventory campaign claim follows from aggregate tests.

Next planned scope is the crashland proposal: larger wreck discoveries, parts/blueprints, distinct clearing/repair obstacles, defended adjoining Camp sectors and backpack upgrades. None is completed merely by the inventory cutover. The chronological updates below are retained as historical development evidence, including their old counts, rejected candidates and once-pending work.

## The connected loop

Explore distinct alien habitats → identify useful growths/deposits → gather and craft suitable field gear → earn a species' trust or overcome its behavior → decide whether to extract → expand and arrange your camp → prepare for a different habitat. Building and taming should give gathering a purpose, while extraction keeps each expedition consequential.

## Camp and crafting foundation

- The Camp remains a safe authored section. A player-owned clearing inside it starts modestly and can expand outward through three resource-backed tiers. Placement is free within the unlocked area, with optional simple snapping and rotation; pieces are not fixed slots.
- First useful construction set: foundation, wall, doorway, low fence, lantern, field workbench and creature rest bed. Use the existing stable asset library where suitable. The workbench enables advanced field recipes; a placed rest bed supplies a visible companion home/idle destination in a later refinement.
- Place preview is clear, grounded and marked valid/blocked using both color and an icon. Confirm spends once. Cancel costs nothing. Existing gates, services, entry points, player and structures cannot be obstructed by an overlapping placement. Foundations may support walls/doorways; avoid full structural stress simulation.
- Removal returns the piece's materials for this pre-alpha so experimentation is forgiving. Do not allow overlapping/duplicate placement or orphaned colliders. Keep a bounded structure count and persist player placements separately from the immutable authored world.
- Initial field crafting: berry lure, woven snare, calming chime and reinforced tether. Recipes use existing recovered resources; material quantity and unlock costs stay in a small explicit catalog. Keep medkit crafting compatible. Items actually consumed by an in-world attempt must be debited by the save/inventory owner, not the UI.
- Desktop and mobile share placement actions: choose piece, position preview on terrain, rotate, confirm/cancel. Keep orbit/movement ownership clear while placing. The pack's Workshop/Build pages are the entry point; do not crowd the combat HUD with permanent construction buttons.

## Species-specific taming first pass

| Species | Learn by seeing | In-world approach | Risk and feedback |
| --- | --- | --- | --- |
| Mossling | Approaches fallen sweet growths, startles at rushing | Place a berry lure, step back and remain calm while it eats; approach to bond after trust builds | Rushing or attacking startles it. Visible attention/food/approach, no timing panel |
| Tidefin | Investigates motion/scent along marsh paths | Set a baited woven snare and guide its curious approach; release calmly once safely held | Trap is placed in actual space and can miss; player must approach within a short calm window |
| Emberhorn | Warns and commits to a readable charge | Dodge its committed charge, use a reinforced tether during recovery, then offer food | Real attack danger and recovery window. Do not require indiscriminate HP damage or a detached UI minigame |
| Skydancer | Pauses on airy perches and watches movement | Use a calming chime from a suitable quiet distance, follow its short perch sequence without crowding | Movement/traversal and patience; clear call/perch indicators. It relocates if rushed |

These are starting design assignments, not finished claims. Each needs discoverable journal guidance, visible creature response, bounded attempt state, cancellation/section reset, and existing pending-bond/extraction/death semantics. Avoid implementing four separate minigame frameworks. Shared interaction/trap primitives support distinct small species state paths. Aggressive enemies and the Guardian stay combat encounters unless separately designed as tameable.

## Regional composition

| Region | Spatial identity | Ecology / reward emphasis |
| --- | --- | --- |
| Verdant Verge | Arrival grove, forked ridge landmark, two loops around a root hollow | Alien fan/colony vegetation, sapwood and fiber patches, cautious Mossling feeding glades |
| Shatterfen | Dry causeways weave through separated basins; waypoint on observatory island | Layered wetland growths, Tidefin approaches, crystals and bait/trap opportunities |
| Emberfall | Broken forge court between two shelves; territorial arena and sheltered return route | Mineral-armored growths, ore, Emberhorn charge lanes with clear dodge room |
| Windscar | Asymmetric exposed spine and switchbacks with visible eyrie destinations | Wind-shaped sail flora, distinct perch silhouettes and Skydancer movement challenge |
| Heartwood Vault | Outer root ring, central Guardian bowl, separate exit route | Ancient living/mineral architecture, rare resources, clear arena and Core extraction |

Begin with 80×80 Verdant/Shatterfen and validate density/collision, then author later regions individually. Do not multiply decoration in proportion to area or conceal the route behind solid canopies. Major landmarks should be visible from arrival and optional loops should return to a recognizable route.

## Art production coverage

| Class | Required coverage | Production approach |
| --- | --- | --- |
| Player | Explorer, held tool, locomotion/combat/traversal | Preserve liked v2 surface/Mixamo poses; evaluate slower cadence in actual play |
| Bondable creatures | Mossling, Tidefin, Emberhorn, Skydancer | Neutral anatomy targets, local mesh generation when safe, fitted rigs, complete motion and translated travel judging |
| Hostile creatures | Thornprowler, Cinderjaw, Heartwood Guardian | Same style fidelity; distinct body/silhouette and clear attacks; fit rig per anatomy |
| Habitat flora | Three canopies, redwood/heartwood equivalents, marsh/mushroom/reed/lily/fern/flower/grass | Alien growth rules, believable support, no collectible motifs on decorative habitat; batch low-cost matte models |
| Harvestables | Sapwood, stone, fiber, berry, iron, crystal, wildflower, remnants and physical drops | Unique resource-bearing forms; consistent proximity feedback and visible depletion; never identical to static scenery |
| Camp / construction | Existing pod/workshop/sanctuary, crate/chest/bench/furnace/table/chair, floors/walls/doorways/fences, new freely placed set | Target-driven Blender components or local generation; shared one-atlas surfaces; grounded usable collision |
| Ruins / landmarks | Waygates, beacons, arches, spires, seals, paths, fallen growths, arena markers | Strong regional silhouettes and readable route framing; avoid interchangeable stone-box monuments |
| Tools / field gear | Axe/pickaxe/sword, lure, snare, tether, chime | Simple recognizable purpose and held/placed states; task-specific animations/feedback |
| Runtime / effects | Platforms/obstacles/ladders/pads, thorns, resource highlights, combat/ability/taming effects | Preserve gameplay envelopes and one-loop ownership; restrained bounded visual effects |

Existing 58 library assets plus runtime-only families remain the coverage list. A target board or touched file does not count as a finished asset. Every admitted external revision needs independent image/model judgment; character motion gets its own gate. Unreviewed/rejected candidates stay outside shipping assets.

## Source-informed principles

- The [official ARK field guide](https://dlassets-ssl.xboxlive.com/public/content/70e3ab21-a3ba-4946-82e9-df7b5a72e363/GameManual/d542006f-06d4-425f-8399-cd2cc845c202/de-CH/index.html) connects harvesting, crafting stations, chosen building locations and different taming approaches. Apply that causal chain at a smaller casual scale, rather than copying its full survival burden.
- [Pocketpair's Palworld overview](https://www.pocketpair.jp/en/games-en/palworld-en/) connects capture, creature capabilities and base use. Here, each species should matter after taming through its ability, habitat identity and eventual camp role; multiplayer/automation scale is outside this immediate foundation.
- Jane Ng's [Making the World of Firewatch](https://media.gdcvault.com/gdc2016/Presentations/Ng_Jane_MakingTheWorld.pdf) supports landmark-led composition with discoveries between major destinations. Use this to structure visible routes and loops.
- [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) supports adequate target area and spacing. Our frequent touch controls remain larger than its minimum; fit hierarchy without shrinking important actions into tiny icons.

## Immediate review backlog

1. Fresh-save starter gather→extract→lure/Foundation loop now passes without grants/teleports; Sapwood clarifies wood and shared resource depletion/reset. Continue first-time species-taming and second-expedition pacing review rather than repeating that completed fixture.
2. Foundry habitat V4 is5.8/10 HOLD despite sound traversal; replace the geometric staircase approach before another target-match attempt. Bright ore faces now read better. Extend successful composition to other sparse regions with independent reviews.
3. Mossling V3 repairs the head/neck and moderate loaded poses while preserving the liked surface. Five clips and calibrated wild/follower motion have bounded native proof; continuous-motion and phone judgment remain open. Ember Forge Vault passes8.0; fourteen ordinary field-chest uses now have reviewed moving lids/catches and native state proof. Follow with other region-specific discoveries, not duplicated chests/arches.
4. Trail ration now closes Salvage craft → assign → eat → persist, with exact balance and the reused berry/lure appearance provisional. Normal Camp return already heals the player, so player sleep was not added. Wildkin bed behavior, powered tools and one clear ranged option remain open. Existing building, three physical crafting stations and five-slot equipment are playable; do not advertise pending tools through icons.
5. Revisit encounter/social danger and taming discoverability. One nearby Mossling now briefly looks and flees when its partner is startled/struck; sneaking behind the pair keeps them calm, without alarm chaining. Four distinct physical attempts, loose physics followers and directional stealth have bounded native proof; aggressive pack danger, variable populations and first-time campaign pacing remain open.
6. Keep reviewing actual mobile controls, active/inactive region costs and world boundaries. Current boundary art/fade seams and broader all-asset quality remain open; no whole-game polish claim.

## Rendering distance and loading — current decision

**12:15 review update:** Tall/spread model and native gates pass 8.0. Earned Tidefin extraction/reload and independent packaged canopy/guidance proof pass. Aggregate 760 tests; 42.44 MB unpacked / 20.22 MB ZIP. Close this batch, then repair the release-callout silhouette overlap and promote secured-companion payoff. New owner crashland/physical-inventory/unique-obstacle/defended-section direction drives the next design plan in CRASHLAND_PROGRESSION_PROPOSAL.md. Tidefin neutral model V1 is HOLD 5.2; V2 is a separate bounded anatomical/palette revision. No whole-world, continuous-motion or phone acceptance.

**11:00 review update:** The bounded Fen observatory bank has passed actual art 8.0 with small joined slate masses, readable folded plants and broken gravel margins. Native hull/Author, footing, harvesting and independent fade are proved, including exact packaged online/offline loads. The shared visibility owner now includes player-built walls through explicit creation/removal callbacks. Result cards pass compact-scroll review 8.2. This batch passes759 tests and build/ZIP at43.01/20.14MB. Next highest-use art is the tall canopy (18placements), preserving its current null-collider contract; reference8.5 passes, modelV1shortrosettes held6.7 and revision is under review. Tidefin has an admitted neutral reference8.3, but local generation remains stopped below safe memory guards. Follow with an earned second-species taming route after the packaged checkpoint, without repeatedly replaying the already proved Mossling journey. Larger regional design, remaining asset families and phone acceptance stay open.

**09:31 review update:** The nineteen-use standard canopy now passes model 8.2/native 8.0 after V3 corrected folded leaves, fork spacing and bark colors. The distinct Fen receiver passes model 8.1/native 8.0 with supported moving parts and clear waypoint access; its focused Author view is proved. The compact Journal passes 8.5, result/prompt typography contrast passes 8.5, and an earned Mossling lure → feed → Bond → extraction → reload journey succeeds without grants or teleports. Shared steering probes, creature approach validation, sensor filters and first-return suppression were corrected. Full earned routes for other species and continuous motion/phone acceptance remain open.

Broad Shatterfen composition remains HOLD 4.8 after the earlier three placement corrections. A new actual-view target focuses the observatory approach on uneven gravel, two substantial closed slate outcrops and sparse alien foliage, preserving the waypoint and resources. Independent target review precedes implementation. Verdant's four rejected geology studies remain outside production; do not repeat ring-height/wedge tweaks. A read-only Rapier experiment found stale query broad phases when replacing actor simulation steps with transform propagation; no unsafe physics batching is admitted. Current package closure precedes the next bounded terrain implementation.

Keep active-region rendering, physics and simulation as the coarse boundary. Three already frustum-culls meshes. Current five-region assets are locally cached at bootstrap, so runtime network fetching is unnecessary; local section prewarming can be considered when more GLBs make startup memory measurable. This is not a claim that all regions are unloaded from RAM.

First implementation: combine compatible static palette materials into vertex-colored batches; concentrate a 1024 px sun shadow in a 36 m square that follows the explorer; introduce a clear-near / biome-fog-far range at 30–56 m with the existing 60 m camera far plane. Actual captures must retain nearby contrast and landmark readability. Fog is visual depth treatment, not a geometry optimization. Keep collision and persistent state independent of visual visibility.

If denser content warrants another step, group decorative geometry into spatial batches and keep distant shadows/detail bounded. Do not merge an entire huge region into one uncullable mesh or disable nearby gameplay because a camera turns away. Author must retain complete editable objects. Reference: [Three Object3D frustum culling and castShadow](https://threejs.org/docs/pages/Object3D.html). Exact draw distances and art choices remain provisional.
