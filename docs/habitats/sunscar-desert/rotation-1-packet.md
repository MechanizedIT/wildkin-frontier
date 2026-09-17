# Sunscar Desert — rotation 1 packet

**Status: planning only.** This packet selects a local mineral outing near the
Sunscar centre `(-1850,50)`. It does not authorize source edits, target-image
generation, terrain reshaping, new assets, browser work, or an earned walk from
Camp. Root must first capture the listed current portrait baselines and an
ordinary local route; an independent director then selects a target before any
implementation brief.

## Habitat contract

**Fantasy.** A dry exposed basin where pale mineral fans sit below broken,
heat-worn ribs: the player chooses how long to remain visible between pockets.

**Player purpose.** Gather an existing crystal or iron source, decide whether to
skirt the existing Emberhorn saddle, and return through a second mineral/fiber
pocket. The existing Omni-tool, finite source/depletion, health, and ordinary
creature behavior own the interactions; there is no new survival, heat, mount,
or mining system.

**Macro identity.** A shallow diagonal rib-and-basin field, not a flat orange
plane or a new mountain range. `frontierRegion.js` already gives Sunscar
alternating dry ribs/basins; this visit must make one local sequence readable in
portrait through terrain mass, shadow/recess, and mineral-pocket contrast.

**Meso rooms.**

1. **Crystal fan arrival** — open low basin around `(-1975,-6)`, with existing
   crystals at `(-1973.8,-5.0)` and `(-1976.3,-7.5)`. It begins exposed and
   gives the player an immediate low-risk gather decision.
2. **Iron rib / Emberhorn saddle** — the existing iron ore at
   `(-1931.2,-15.2)` leads to the existing Emberhorn home
   `(-1930.5,27.8)`. This is the higher, narrowest room: retain a broad clear
   lane and show the safer west skirt versus the richer central ore/encounter
   approach without changing the creature or ore identity.
3. **North crystal pocket / east return rib** — the existing crystal at
   `(-1934.1,87.2)` is the destination below the saddle; the nearby
   `(-1889,64)` mineral/fiber pocket supplies a distinct return cue. It should
   read as a sheltered mineral cleft, then reopen toward the arrival fan.

**Micro ecology.** Mineral/iron sources remain clustered in their current
pockets. Dry `asset_trail_stones` and restrained `asset_fen_stone` dressing may
later mark rib feet only where actual support and full camera projection admit
them. Sparse dry groundcover remains sparse in the basin centre; it gathers at
ribs and pocket edges rather than becoming uniform grass. Emberhorn keeps its
complete current movement/support disk. No generated decoration may replace
source identity, overlap its full footprint, or make an encounter a hidden
ambush.

## Candidate local circuit — needs ordinary-input proof

The route is deliberately local, not a false claim that Camp-to-Sunscar is a
single ordinary outing. Its current sampler-only loop measures **308.48 m**:
crystal fan → iron rib → Emberhorn saddle → north crystal pocket → east return
rib → crystal fan. At 2.145 m/s it is 143.81 seconds before interaction. One to
three ordinary mining attempts plus a cautious Emberhorn decision add a
provisional 45–105 seconds, making this a **188.8–248.8 second / 3–5 minute
hypothesis**, not a completed duration claim.

| Fixed capture role | Position / provisional yaw | Current height / slope | Forward direction | Why it is a room witness |
| --- | --- | ---: | --- | --- |
| arrival | `(-1975,-6)`, `1.35` | 6.089 m / .080 | `(+.976,-.219)` | Crystal fan and first rib direction. |
| interior | `(-1930,28)`, `-3.09` | 14.914 m / .052 | `(-.052,+.999)` | Emberhorn saddle, northward pocket reveal. |
| destination | `(-1934,87)`, `1.11` | 5.363 m / .043 | `(+.896,-.445)` | Destination crystal and east return direction. |

Yaw uses the prior normal-camera convention where yaw `0` faces world `-Z`.
These are provisional capture inputs, not verified visible anchors. Root must
record the actual effective camera position/look direction, HUD-safe world
frame, terrain mesh height, collision clearance, loaded-neighborhood state,
and ordinary route outcome. Later target staging must project full geometry
through those captured cameras before any defining form is frozen.

The read-only numerical evidence is
`art/reviews/sunscar-desert/rotation-1/numerical-survey.json` and
`route-survey.json`; the latter includes the exact route points and sampled
slopes. It found full Sunscar ownership over the local 400 × 400 m survey,
current heights 5.141–19.007 m, 562 ordinary forage nodes (408 rock / 154
fiber), 474 scenery records, and the stated existing Emberhorn. No regional
bloom is assumed in this local window.

## Protected contracts and limits

- Preserve the existing IDs, positions, source state/depletion, transformed
  support, and approach space for the twin arrival crystals, iron ore,
  destination crystal, all intervening forage/fiber, and the Emberhorn home
  with its current roam `4.5 m` / leash `10 m` behavior.
- `frontierRegion.js` owns Sunscar’s weighted height/color grammar;
  `frontierTerrain.js` owns actual mesh/query height; `frontierEcology.js`,
  `frontierScenery.js`, and `frontierWildlife.js` consume the terrain field.
  Do not introduce recursive terrain-to-life sampling.
- Preserve normal camera/HUD/lighting, finite world identity, save authority,
  the existing residency/streaming caps, Camp/north-route reserves, all other
  habitat fields, and the current global canopy/low/collider budgets.
- Target work must audit the full current asset library before declaring an
  eroded-outcrop or mineral-formation gap. The existing crystal, iron ore,
  trail-stone, and Fen-stone roles are facts; their portrait suitability is not
  yet established.

## Target-author brief and next planning gate

Use root's fresh actual normal-HUD captures at the three listed poses plus one
overhead/inspector view. Produce 2–4 portrait directions that retain player
scale and central negative space:

- **A — mineral fan into rib:** twin crystals sit off the direct run, a broken
  rib is a readable near/medium edge, and the lane remains open under controls.
- **B — saddle decision:** shallow rib faces and a visible safe skirt make the
  Emberhorn/ore choice legible without enclosing the player or inventing a
  hazard mechanic.
- **C — pocket and return:** a low crystal cleft has one forward silhouette and
  an east-facing return cue, with dense edge ecology only at shelter/stone.

An independent director must select a feasible direction after checking actual
camera matrices, mesh/hull bounds, source/home footprints, lane clearance,
resident cost, and the route evidence. The selected target becomes five bounded
implementation priorities. Do not self-admit an image, use a cinematic camera,
or place a visual landmark merely because it is named “left” or “back” on an
overhead map.

## Non-goals

No long-distance Camp route claim, fast-travel network, heat/water/stamina
system, new species, combat overhaul, cave, dune physics, global density-cap
increase, lighting/camera change, or neighboring-habitat pass is part of this
visit.