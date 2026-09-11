# Wildkin Frontier — reference-led alpha redesign

Date: 2026-09-09. Status: historical reference-led plan; previous 0.2 candidate was rejected by the owner for visual/interaction quality. Current scope and accepted September 11 work are in `CURRENT_SLICE.md`, `OVERNIGHT_DESIGN_PLAN.md` and `OVERNIGHT_HANDOFF.md`. This document preserves the original redesign rationale, not current inventory/save rules or the latest art admission status.

## What the owner is asking for

A creature expedition adventure with the approachable gathering readability of Dreamdale and the terrain, build choices and action presentation of Eternal Hero. Original art, not copied characters, UI graphics or level layouts. This pass must materially change the screen and how routes feel; additional feature counts are not a substitute. Local development remains on main. No publishing or paid tools are needed.

## Reference evidence

All four owner recordings were inspected locally through timestamped frame sequences/contact sheets. Source videos remain outside the repository. Extracts are review-only in `dist/qa/references`.

| Recording | Observed moments | Transfer to our game |
| --- | --- | --- |
| Dreamdale 220123 | 0:00–0:20 harvesting/route; 0:24 backpack; 0:28 resource guide; 0:33 equipment; 0:41–1:18 bridges/fields/workshops | Big recognizable object silhouettes; cream inventory with four columns, quantities and detail on selection; broad continuous paths, water as negative space, resources in fields; visible destination within one or two screens |
| Dreamdale 220444 | 0:03–0:12 harvesting burst; 0:18 stone approach; 0:37 backpack; 0:41 guide; 0:47–0:56 equipment details | Resource identity persists from world pickup to HUD to inventory; pickups have an obvious arc/collection payoff; equipment detail is progressive disclosure rather than prose on every card |
| Dreamdale 220721 | 0:04–0:30 dungeon bridges and stairs; 0:39/0:43 enemy line warning; 1:05 level-up | Elevation has visible sides and transitions; small combat pockets linked by readable corridors; attacks show their space; rewards temporarily take visual priority |
| Eternal Hero 221004 | 0:00–0:21 layered woodland, pond, cliffs, paths, settlement; 0:26 gear; 0:36 and 0:47/0:57 mastery; 0:42 preset popover | Grass/flowers/rocks at several scales, tree skyline and orange rock elevation; connected icon nodes, rank/point cues and a selected-node detail; a stronger dark/light contrast than our former cream/teal dashboard |

Primary research: [Dreamdale, developer's Google Play listing](https://play.google.com/store/apps/details?id=com.dream.dale) describes gathering, tool/building improvement, storage, quests and exploration. [Eternal Hero, developer's Google Play listing](https://play.google.com/store/apps/details?id=games.rivvy.eternalherorpg&hl=en) describes freely traversed environments, build options, equipment, mounts and companions. Current multiplayer/monetization features of the reference games do not change Wildkin's single-player local scope. The recordings, rather than marketing feature counts, are the visual reference.

## Problems to resolve

1. A colored plane with scattered props is not a designed landscape. Each region needs a visible route, habitat pockets, negative space and a strong destination silhouette.
2. Resource shapes/colors are ambiguous. The same original illustrated icons must appear in backpack, costs, rewards and the small HUD.
3. The shell explains too much at once. It needs a rounded display face, compact labels, large tap targets and selected-item details.
4. Current progression is five material upgrade tracks. Original design left skill-point rules open; owner now explicitly authorizes a real tree. Add persistent branching skills with real effects, retain material upgrades and old saves.
5. The first parkour approach is not verified by actual movement. Both launch access and trajectory need deterministic reachable geometry and input-based proof.
6. Parkour danger must be visible. Dark thorn-crystal beds with warm rims share the actual failure bounds; keep takeoff, landing and reward aprons safe. The owner added this requirement during implementation.
7. The player shadow is parented to the player. It must query actual static ground, remain there in the air and return crisply on landing.

## Art direction: Sunlit Wilds

- Jade/turquoise vegetation, deep pine foliage shadows, ochre paths, apricot rock strata, warm ivory UI, dark ink outlines and amber interaction accents. Later biomes keep the same value structure with local blue marsh, coral ember and violet highland accents.
- Rounded, chunky silhouettes with intentional shape language: explorer scarf/backpack and broad boots, leaf-eared Mossling, fin-tailed Tidefin, plated horned Emberhorn, swept-wing Skydancer. Trees need layered irregular leafy crowns and branching trunks; ore needs a visible mineral seam rather than a colored cube.
- Original generated painted icon atlas, high contrast at 32–64px, no text baked into assets. Locally vendored rounded sans typography. Asset prompts and provenance recorded.
- Bright upper planes and darker side planes make elevation obvious. Grass blades, flowers and stones cluster along edges; keep main routes and combat arenas quiet.
- Motion signals state: gathering impact/reward, selected/unlocked skill, danger and landing. Avoid constant competing pulses.

## Implementation plan and ownership

1. **Shared terrain foundation (parent):** one pure authored surface height/mask function; continuous triangulated terrain with path/shore color transitions and grass detail; the identical mesh creates Rapier collision. Same sampled heights apply to authored props, harvestables, creatures, anchors and routes. Validate finite bounded settings and preserve legacy worlds without a surface definition. Visible terrain, collision and author preview must agree.
2. **World/model production (world worker):** replace the repeated corridor composition with six coherent spaces; build an original reusable stylized environmental kit; author routes, elevations, resource fields, foreground framing and focal landmarks. Camp and Verdant Verge are the first visual gate, followed by five-region consistency. Keep companion ecology, gate economy, secrets and campaign endpoint intact.
3. **Traversal/grounding (runtime worker):** world-space projected player shadow against static support, fixed authored pad direction/launch through the controller, reliable entrances and landings coordinated with world owner. Verify with real walking input and frame evidence at takeoff/apex/landing.
4. **UI (UI worker):** backpack sheet with carried/stored tabs, four-column item grid, selected-item identity/count and concise sourcing cue; icon-first HUD; tree with connected selectable nodes, available-point badge and concise detail panel; compact Workshop costs; reduced welcome, roster and modal prose. Keep blocking/focus/save backup behavior and touch targets.
5. **Skills/assets/integration (parent):** generated atlas and shared icon mapping; three branches with meaningful prerequisites and effects; available points derived from banked level and saved unlocks; additive old-save normalization, export/import and transactional purchases. Integrate all modifier consumers and concise contextual cues.
6. **Visual iteration and proof (whole team, parent closes):** inspect screenshots at 390×844 and a narrow phone, play actual routes, compare against this plan, repair composition or readability failures. Then regression/build/offline/authoring verification, local playable package and honest report.

## Region composition

| Region | Route and elevation | Resource/encounter logic | Focal point |
| --- | --- | --- | --- |
| Frontier Haven | Curving two-unit path in a framed sanctuary lawn; outer berms and pond | Workshop and sanctuary in distinct visible alcoves; no harvest clutter at spawn | Open glowing gate, shelter canopy and workshop silhouette |
| Verdant Verge | Gentle S-curve through entry shelf, Mosslight Hollow, raised Rootfall approach | Safe wood/fiber/berries near entry; Mossling grove off left; stone/iron by rocky flank; short optional launch spur | Root arch, bright waypoint hollow, gate on a ramped ridge |
| Shatterfen | Raised dry paths winding around shallow blue pools | Reeds/berries at wet edges, stone on islets, Tidefin habitat; clear firm route | Observatory/stone arch above the marsh |
| Emberfall | Bent route between stepped rock shelves and ruin pockets | Iron veins near exposed strata; danger in optional side pocket | Broken forge arch with warm crystal accents |
| Windscar | Broad safe spine between elevated shoulders, optional launch crossing | Sparse resources in sheltered pockets, Skydancer perch | Swept stone/wing landmark with visible landing terrace |
| Heartwood | Basin arrival opening into an uncluttered encounter ring | Resource respite before arena; guardian and Core beyond | Giant heartwood forms framing the Core dais |

## Acceptance gates

- First playable phone screen reads as an adventure landscape without reading a paragraph; clear route and destination, recognizable explorer and vegetation. Persistent HUD stays away from central/lower-middle play.
- Seven resource icons are distinct at phone size, used consistently in backpack/costs/rewards. Backpack distinguishes carried and secured amounts; no loss of save or extraction meaning.
- Tree opens from a recognizable icon, shows connected locked/available/unlocked states; selecting a node explains a short concrete benefit; purchase persists and changes the actual stat. No overspend, duplicate purchase or invalid imported chain.
- Starting from normal arrival, the player can walk onto the first launch area and land on its broad destination without teleportation. Failure recovery is recognizable. Shadow stays on floor/platform while avatar rises.
- Heights match visual and physical surfaces across player, creatures, resources, pickups, anchors and gates. No hovering fixtures, seam/checkerboard artifacts, hidden collisions or blocked main route.
- At least one ordinary input route through each redesigned region; actual harvesting and first extraction; relevant saved progression, skill purchase, death/extraction, author export and offline package checks.
- Frame/triangle/draw-call samples and mobile screenshots recorded. Report actual desktop/mobile-viewport proof separately from untested physical-phone feel. Owner acceptance remains unclaimed until owner tests.

This plan is a provisional design implementation under the owner's broad authorization. New findings during visual and physical review should revise it instead of defending a failing implementation.
