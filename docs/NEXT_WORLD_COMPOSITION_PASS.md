# Next world composition pass — September 11, 2026

**Make the new loops lead to recognizable places.** The expanded Emberfall, Windscar and Heartwood plans now differ, but actual overheads show most objects still in the old central square. The new perimeter conceals raw edges but resembles a uniformly banded enclosure. This pass redistributes existing content into eight bounded interventions per region; it does not enlarge the maps again or paint every empty area with props.

Independent planning evidence: current world/asset data, `.dream-loop/overnight-level-review/closure/` gameplay and overhead images, and the producer's reference-pass `.dream-loop/overnight-ruins-target/alien-ruins-board-v1.png` (not owner art acceptance). The board's useful language is cream stone plates around a dark mechanical core, triangular sockets, supported roots and distinct functional silhouettes. Use its petal reliquary, recessed cache chamber and hinged vane instrument as different objects. Do not reproduce the same arch around each destination. Existing `asset_ruin_arch` remains a portal until deliberately replaced; no additional decorative arch is proposed.

**Followup closure:** the corrected Camp link and separated Heartwood fiber were visually verified after UI recovery: `.dream-loop/overnight-level-review/closure-followup/camp-corrected-clearing-link.png` and `section_5-separated-fiber.png`. Two visits with actual local movement/orbit, zero browser exceptions. The link reaches the positive-Z building clearing; the fiber is visible in its own working pocket. Preserve those corrections. Earlier “visual followup pending” notes are now superseded.

## Relocation implementation handoff — not visually admitted

`tools/compose-overnight-habitats.mjs` now exports `composeOvernightHabitats(world)` and the complete source-ID/transform list `OVERNIGHT_HABITAT_MOVES`. **Root should import and call it after `composeLandscapeArt(world)` in the authoring chain.** This subtask did not wire the chain or write world.json/generated data. The function validates all source IDs before mutation, moves only existing objects, ground-snaps through `getSurfaceHeight`, and can be applied repeatedly without change.

- **30 existing transforms:** Emberfall 12, Windscar 8, Heartwood 10; 26 props (including four renewable harvestables) and four existing loot chests. **Zero new roots.** No actor, anchor, platform, hazard, Core, reward, refill, claim or species-gate data changes.
- Implemented candidates: E1/E2/E4/E6, E5 pebbles only, E7 existing chest/seal only; W1/W3/W5/W6/W7 and W4 existing chest/seal only; H1/H2/H3/H4/H6 and H5 existing chest only. Temporary seals sit behind the chest approach: Emberfall **(-26.8,-33.2)** facing northeast; Windscar **(30,-24)** facing east. Their original collision flags remain unchanged.
- **Held:** E3 new cache chamber, E5 new ground strip, W2 perch geometry, all new ruin replacements/activation animation, H7 Core reliquary, E8/W8/H8 boundary art and fade repair. Moving existing chest IDs does not mean their planned new art is complete.
- Small cloned-world proof: `node .dream-loop/overnight-level-review/next/check-composition.mjs`. It checks exact repeatability, all 30 ground heights, no added/removed entries, only allowed transforms changed, missing/duplicate-ID rejection, moved OBBs against current static/resource colliders, anchor/actor-center reserve and route shoulders. Before/after IDs and positions are in `next/composition-check.json` under the evidence directory. Full visual/body/roam, ordinary route, taming and opening-cycle admission remain with the independent producer review after generation.

## Placement rules for this batch

- Coordinates are **local (x,z)** in each region. Ground-snap through the current shared terrain model. Treat these as concrete candidate placements requiring a targeted physical/visual check, not already validated runtime transforms. Keep current region sizes, gates, waypoint/beacon centers, course platforms/hazards and creature ownership.
- Eight interventions per region below include relocations and small grouped arrangements. Prefer moving existing instance IDs. Allow **at most six net new authored roots per region**, including new ruin visual roots; existing moved roots do not count as additions. Do not duplicate resource nodes to make the scenery look richer.
- Keep each main route's authored width plus **0.8m shoulder per side** clear of solid props. Low walkable rubble may interrupt the painted surface, but cannot become an invisible step. Keep **3m from anchor center to any new solid face**; account for the asset's scaled/yawed collider, not only its pivot.
- A harvestable needs a clean silhouette and **two 1.8m-wide working approaches**. Keep it at least **3m outside a wild actor's starting body envelope**, then inspect ordinary roam/notice behavior. Keep 5m-radius quiet pockets around the two bird starts; no sharp rubble, hazards or new hostile actors in them.
- A lightweight route-mask check placed the selected tall/reward destination centers at least **2.6m beyond the painted route edge**; this screened out several too-close initial suggestions. It does not replace scaled collider/visual-envelope checks, particularly the wide crystal and ruin models.
- Newly framed chests keep their **existing IDs, reward tables, refill/claim rules, ability/Guardian conditions and extraction semantics**. Their visual housings must preserve a reachable interaction center. Animated leaves/lids need actual pivots; keep static collision on side supports outside the approach. Do not introduce new resource costs or new puzzles in this composition pass.
- Preserve the open Guardian fighting disk approximately **12m around (4,-28)**. Keep the Emberhorn court's working area around the two starts unobstructed, with two broad lateral dodge exits. No extra threat spawns in this batch.

## Emberfall — forge court and sheltered foundry return

Player read: the first mineral towers point toward a busy court; the quieter western loop contains a recessed cache and a mineral seam; two offset towers frame the far gate. Existing source families: `asset_ember_spire`, `asset_ember_bloom`, `asset_iron_ore_rock`, `asset_pebble_cluster`, `asset_ruin_path`, `asset_vault_barrier`. Existing harvestable assets retain their gameplay roles.

| # | Exact intervention | Player-visible arrangement and clearance |
| --- | --- | --- |
| E1 | Move `prop_s3_arrival_spire_l` → **(-16,35)**, scale 1.2; `prop_s3_arrival_spire_r` → **(1,42)**, scale 1.0 | Two staggered mineral outcrops beside the long arrival trail, not a symmetrical gateway. Keep the spire bodies outside the route shoulders; turns should reveal the court between them |
| E2 | Move `prop_s3_shrine_spire_l` → **(-23,23)**; move `prop_s3_shrine_bloom_l/r` → **(-9,19)/(16,14)** | Remove the foreground objects that hide Explorer/Emberhorn during the first challenge. The spire becomes a waypoint-side skyline cue; blooms sit on the court's outer margins. Also move `prop_s3_shrine_spire_r` from beside the second Emberhorn to **(20,9)** rather than merely disabling its collider |
| E3 | Move `chest_secret_section_3` → **(-35,-15)**, retain ID; fit a recessed cache chamber centered there, ≤4.2×3.6m, opening **east** | A 5–7m side approach off the foundry return reveals a hollow machine, not another freestanding chest. Keep the east approach open. Beacon remains (-30,-22), away from the housing. Use the board's lower-left shutter/circular tray concept |
| E4 | Move renewable `prop_s3_shrine_ore` → **(-22,-12)** | A useful mineral seam beside the return path, visibly separate from the cache structure and scenery. Leave a flat working crescent facing west toward the trail. Verify the old source location is removed |
| E5 | Move `prop_s3_pebbles` → **(-26,-10)**, scale 1.4; add one low `asset_ruin_path` strip at **(-26,-8)**, following the return trail | Brief weathered gravel/plate interruption within the dirt band. Low relief, no solid curb across movement. This is ground articulation, not a new road to nowhere |
| E6 | Move `prop_s3_gate_spire_l/r` → **(-7,-46)/(8,-48)** | Frame the actual gate at (0,-49), rather than its old position near z=-20. Keep gate approach and both side turns open; vary scales about 1.15/0.95 |
| E7 | Move `chest_emberhorn_secret` → **(-25,-32)** and its `prop_s3_barrier` visual with it; replace the barrier's presentation with a compact split mineral collar | The existing Cragbreaker reward becomes a distinctive den on the return loop. Reserve a 4×4m side pocket; front faces northeast toward the route. Keep ability gating and claim semantics. Collar segments separate on successful opening and expose the chest/tray |
| E8 | Refine only western boundary **x≈-57, z=-30…-10** first | Keep the watertight blocking toe; break the upper face into two offset red mineral shoulders with one dark recessed stratum. Reuse spire silhouette language in large embedded forms, not a row of tiny cones. This stretch should read as a broken foundry escarpment from the beacon/return route |

**Court check before more art:** stand near the first Emberhorn, orbit from the main trail, trigger its warning and dodge once to each side. Explorer, charge direction and recovery must remain visible. Do not place cache machinery or tall bloom crowns inside those exits.

## Windscar — quiet western ledges and a working eastern wind relic

Player read: a tall needle announces the climb, two low stone aprons make the bird habitat recognizable, then an optional eastern loop leads to a hinged-vane wind instrument near extraction. Existing families: `asset_wind_arch` (despite its name, this is the **needle**, not the ruin arch), `asset_cloudflower`, `asset_ruin_path`, `asset_pebble_cluster`, `asset_crystal`, `asset_iron_gear` as a mechanical modeling reference.

| # | Exact intervention | Player-visible arrangement and clearance |
| --- | --- | --- |
| W1 | Move `prop_s4_arrival_needle_l` → **(-18,31)**, scale 1.2 | One off-axis landmark beside the ascent, readable before the western loop. Do not form a second parallel row of needles |
| W2 | Make flush stone aprons centered at existing bird starts **(-38,14)** and **(-30,6)** | Reuse low `asset_ruin_path` forms, approximately 2.4m across, embedded so the center remains at terrain support height. Shallow outside rims suggest perches without adding a step beneath the actor. Retain ≥5m of uncluttered quiet approach around each. **Current taming chooses transient points:** these aprons are habitat framing, not a claim that attempts now target authored perches |
| W3 | Move `prop_s4_cloud_a/b` → **(-43,10)/(-25,4)**, scale ≤1.2 | Sparse wind-shaped vegetation at the outside of the quiet pockets. Keep the two birds' sightlines and rear sneak approaches legible; no decorative crystal cluster inside their body or travel envelope |
| W4 | Move `chest_skydancer_secret` and matching barrier presentation → **(32,-24)** | A ≤5×3.5m hinged-vane ruin, board lower-right silhouette, faces east toward the trail. Beacon at (38,-30) stays separate and usable. Existing wind-seal/Skydancer reward powers the opening; no new instrument minigame. A short idle vane motion may signal wind, but completed activation has a visibly different full sequence |
| W5 | Move renewable `prop_s4_route_crystal` → **(25,-9)** | Give the eastern loop a visible useful deposit before its relic. Keep a ≥2m working apron and separate it from the relic's purple mechanism: harvestable crystal has the resource motif/feedback, machine vanes do not |
| W6 | Move `prop_s4_needle_b` → **(44,-22)**, scale 1.1 | A single tall backdrop for the eastern destination. The former western position (-45,-2) becomes free for W7. Keep the needle out of the beacon and relic approaches |
| W7 | Move `chest_secret_section_4` → **(-44,-2)**, retain normal chest rules | A small discovery just beyond the western loop's low turn, approachable from north/east. Use a working hinged lid; place it openly on a low stone shelf. It should not advertise the same interaction as the larger vane ruin |
| W8 | Refine western boundary **x≈-57, z=2…26** | Wind-carved diagonal slabs and two broad low ledges, with one higher rear needle-shaped shoulder. Preserve solid blocking and continuous scenery. Break the uniform horizontal bands seen behind the birds; avoid putting a sheer face directly against a usable perch |

**Taming motion constraint:** any future fixed-perch targeting must deliberately connect terrain support, creature movement and the existing transient attempt state. For this pass, keep dynamic chime destination markers readable on the clear shelf. Do not decorate arbitrary pads and report the taming system as integrated with them.

## Heartwood — outer sanctuary, clear combat bowl, unmistakable Core

Player read: roots guide arrival to a quiet waypoint; a left-hand loop offers a lesser cache and extraction, while the inner opening reveals the Guardian. Beyond the fight, a petal reliquary clearly contains the Core. Existing families: `asset_heartwood_tree`, `asset_fallen_log` used sparingly as root structure, `asset_crystal`, `asset_trail_stones`, `asset_vault_barrier`, and the new rootbound ruin target.

| # | Exact intervention | Player-visible arrangement and clearance |
| --- | --- | --- |
| H1 | Move `prop_s5_arrival_tree_l/r` → **(-17,48)/(7,46)**, scale 1.0/1.1 | A staggered opening at the new arrival stretch, with a broad central view down the path. No mirrored forest aisle. Keep their large crowns off the camera-to-player lane |
| H2 | Move `prop_s5_waypoint_tree_l` → **(-31,25)**; renewable `prop_s5_waypoint_crystal_l` → **(-31,16)** | Frame the actual waypoint (-24,22), not its old central position. Tree anchors the upper side, useful crystal the lower side. Keep the run spawn (-19,27) and 3m anchor reserve clear |
| H3 | Move `prop_s5_heartwood_c` → **(-45,-9)** and `prop_s5_waypoint_root_l` → **(-45,-13)** | Remove the giant trunk that Cinderjaw still presses into while roaming near (-16,-5). Reuse it as the outer loop's root buttress. Root/log lies lengthwise beside the trail, not across it; inspect its full visual reach |
| H4 | Move renewable `prop_s5_route_crystal_l` → **(-34,-18)** | A valuable exposed formation before the outer beacon, with two open approaches and no new aggressive spawn. Preserve the fixed Heartwood fiber at (17,9) |
| H5 | Move `chest_secret_section_5` → **(-45,-30)**; add a compact root-covered cache housing, ≤4×3.5m, facing northeast | An optional discovery beyond the beacon (-40,-24), visibly different from the Core. Keep normal reward/claim rules; housing petals or cover open when the chest opens. Do not add a new companion gate silently |
| H6 | Move `prop_s5_arena_tree_l/r` → **(-10,-16)/(24,-23)** | Two unequal outer bowl markers. Both stay outside the 12m combat disk centered (4,-28); retain an unobstructed inner floor and exits. Move the old central tree clutter, do not copy it into the new ring |
| H7 | Frame existing `chest_heartwood_core` at **(0,-49)** with a ≤5×5m petal reliquary | Use board upper-left stone petals/root collar, facing **+Z** toward the approach. Open approaches from northeast and northwest must reach the actual center. Flush supported floor; static side supports sit outside a 1.8m interaction lane. Keep Guardian gating, carried-Core loss/recovery and extraction unchanged |
| H8 | Refine north boundary **z≈-67, x=-18…18** | Two large root-supported shoulders and a recessed central back face behind the Core. Continue scenery above/behind the rim. Keep the lower physical blocker continuous; the recess is visual depth, not a newly traversable tunnel or inaccessible glowing reward |

## Motion that explains function

Use the existing single update loop and authoritative interaction state. Keep movable parts separate in the admitted model/recipe; never infer “open” from proximity alone.

| Object | Required visible cycle | Readability target |
| --- | --- | --- |
| Ordinary relocated chests | Lid rotates about rear hinge, pauses open, remains visibly claimed/depleted | The opening is readable at ordinary camera distance without a text toast; empty/claimed form remains distinct |
| Emberfall cache/den | Mineral cover separates or slides upward; inset tray turns/presents reward; moving pieces stop in a supported open state | About 0.8–1.4 seconds for the main motion, subject to actual visual review. Do not scatter debris into the player's feet |
| Windscar vane relic | Three vanes move with slight phase differences; activation sweeps through a clear larger alignment, then reveals the reward socket | Keep idle motion small and quiet. Powered/open state must be unmistakably different; no constant spinning gear with no apparent purpose |
| Heartwood Core reliquary | After the existing Guardian condition, petals unlock and separate; central tray rises slightly to present the existing chest/Core interaction | Preserve visibility of the approach and interaction prompt throughout. Pending/claimed/recovered states must restore correctly after travel or reload |

These are concrete motion targets, not assertions that those animated models already exist. New ruin visuals should only replace the current shell after an independent ordinary-camera opening-cycle check. Existing broken/rebuilt gate and resource rules must not acquire new costs through presentation work.

## Boundary art and completion limits

Prototype E8 first. Preserve the current continuous collision shell and scenic skirt; any geometry change must retain render/collider agreement. Shape **a few large supported masses**, with varied heights, strata thickness, root/mineral buttresses and asymmetric setbacks. Do not smooth every face into a rounded hill or replace it with repeated props. Once one stretch reads naturally from the path and from a near-edge orbit, apply regional language to W8/H8. Keep at least half the outer reserve unprogrammed for future discoveries; it may be scenic but should not look like a currently reachable reward corridor.

Fix the known adjacent-segment fade discontinuity before placing rewards near a boundary: Emberfall east edge around **(56.96,8.40), yaw≈3.36**, retained in `closure/section_3-edge-orbit2.png`. The Explorer must stay legible through the entire drag, not just at four selected headings. Do not spend the whole batch rebuilding the boundary system for cosmetic variation.

**Small acceptance pass:** walk arrival→new landmark→one relocated resource→ruin→beacon in each revised region; inspect one real opening/activation cycle; orbit at the two Windscar quiet pockets and Core approach; check moved old locations are empty and each reused chest/resource ID exists once. Confirm harvesting/depletion and existing ability/Guardian access still work. Recheck one near-edge orbit after each boundary art stretch. No full campaign/test/device matrix is requested by this plan. No code or world data was changed while preparing it.
