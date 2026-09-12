# Emberfall ravine and plateau — bounded level plan

**Current status:** stopped at Chris's request. Root accepted this bounded composition plan and the independent target review passed8.1. An isolated composer is preserved with3/4 focused checks passing; the west-descent full-width grade near the protected foundry merge fails. Canonical region data remains unchanged. Read EMBERFALL_CANDIDATE_HANDOFF.md before resuming. The exact target and gameplay ledger are retained in `art/targets/emberfall-ravine-v1/`. Baseline maps are retained in `art/reviews/emberfall-ravine-v1/baseline/`. The planning narrative below records its original authoring stage, not a pending owner-approval gate.

September 12, 2026. **Planning only, pending root review and an independently reviewed target.** Chris's latest direction explicitly asks for stronger verticality in the next zone—mountains, plateaus or a deep ravine with routes to the top. Root provisionally selects Emberfall/`section_3`. This pass takes priority over the deferred tool-progression plan. Exact geometry/art choices below are delegated producer proposals, not owner acceptance of an unseen scene.

## Chosen design

**Keep the existing 120×120m region. Turn its empty flanks into two unequal climbable landforms around an open forge ravine: a 12m western ridge overlooking the existing foundry, and a 16m eastern plateau with the existing Cinder Shelf Cache on its 12m shoulder.** The low central route remains a readable campaign route and territorial encounter floor. A west ridge route bypasses that court and descends into the foundry; the east ascent and separate northern descent form an optional loot/view loop. No larger rectangle, new mandatory gate, regulator quest, extra creature or new reward is needed.

This differs from Verdant's eastward 3/6/8m shelves and Shatterfen's low water banks. Emberfall's identity becomes **warm mineral cliffs above a broad eroded valley, with industrial remains sheltered below**. The player can look up from the valley, occupy the skyline later, and look back down onto a route and discovery already seen. Depth comes from raising real traversable surrounding ground, not from a new deep-negative-height, stacked-cave or falling-hazard system.

## Baseline actually inspected

Read current source, progression/taming/discovery rules, terrain/physics/camera limits, relevant foundry history and the independent camera audit. Inspected all three actual fresh baseline PNGs: `baseline/maps/section_3.png`, `section_3-planning.png`, `section_3-overview.png`. The manifest capture is 2026-09-12T12:31:07Z, world **`640f9239e3e42555322a3cc3267071ccdeb6d3d41029afc32e24b1719e1d829f`**, generated **`69db106b859df19f4491aadfdb82a22523cfd8a89e6e11444bda1b3d8dfc0bd5`**. North is image-top/world **−Z**, east is +X. The maps show an extensive brown floor with a central zigzag, small central encounters, a loose eastern cache and a concentrated north-west foundry; the outer terrain currently supplies more apparent height than the playable interior.

`role-audit.json` is the exact compact source extract. A read-only 1m surface sample covers 14,641 positions: **0–3.6m ground**, 17.50% above 1m, 0.73% above 3m. These values exclude prop tops and perimeter geometry. Existing foundry assets have separate substantial solid box/mesh tops, so 3.6m is not a claim about every physical surface. Historical foundry proof established several diagnostic top/edge exits, not ordinary ascent onto every roof. Baseline overview: **349 draw calls / 268,664 triangles**. This is capture cost, not a measured phone budget.

A narrow general-scope brain query returned only older project/workflow context; the project card still describes an obsolete portrait/hackathon phase. It supplies no current terrain decision. Current repository evidence and the latest owner instruction govern this plan.

## Protected gameplay ledger

Coordinates below are **X,Z**. Preserve exact identities, X/Z and state/reward contracts. Only supporting Y may change deliberately through the shared terrain/rebase transaction; preserve the foundry pocket's existing support levels as described below. Full positions, yaw, scale, role metadata and existing solid flags are in the audit. There are **66 props**, **3 ordinary resource nodes**, **6 harvestable props**, and **4 live actor props** despite `creatures: []`.

| Role | Exact retained IDs / coordinates / contract |
| --- | --- |
| Arrival | `entry_section_3` (0,46), facing north; `gate_section_3_to_2` (0,51), active reciprocal Shatterfen return. Keep an open safe spawn/exit apron. |
| Onward gate | `gate_section_3_to_4` (0,−49), ruined reciprocal Windscar route. **Level 4 + 7 stone + 4 iron ore + 2 crystal shards**, unchanged. |
| Waypoint / restart | `wp_section_3` (−17,23); runSpawn (−12,28), facing north. Keep low, visible and outside the charge approach. |
| Extraction | `beacon_section_3` (−30,−22), existing foundry pocket. Keep an unobstructed low approach. |
| Ordinary resources | `tree_section_3_01` (−12,14), `rock_section_3_01` (12,13), `fiber_section_3_01` (12,4); level 3, existing renewable behavior. |
| Five renewable iron props | `prop_s3_ore_a` (10,−10), `prop_s3_shrine_ore` (−22,−12), `prop_s3_gate_ore` (−4.1,−15.1), `prop_s3_route_ore` (4.8,−5.6), `prop_s3_arrival_ore` (5.1,12.5). Each retains the iron asset's 5 chunks / 22s respawn. |
| Renewable crystal prop | `prop_s3_crystal` (−15,−10), 4 chunks / 28s respawn. Scenic mineral accents must not silently create more harvestables. |
| Territorial Emberhorn | `wildkin_emberhorn_1` (−4,12), `wildkin_emberhorn_2` (10,6). Preserve rusher/taming: dodge committed charge, tether in recovery, offer berry lure. No ledge/timing shortcut replaces this contract. |
| Aggressive Cinderjaw | `wildkin_cinder_1` (−10,−6), `wildkin_cinder_2` (10,−12). Preserve both current actor identities/behavior. |
| Cinder Cache | `chest_secret_section_3` (−17,−10); `loot_emberfall_secret`, 3 iron + 78 XP, once-only current claim semantics. Keep its low foundry-side approach. |
| High-ground reward | `chest_parkour_section_3` (28,8), **Cinder Shelf Cache**; `loot_emberfall_parkour`, 2 crystal + 72 XP, 86,400s refill. Rebase to the proposed 12m east shoulder; no checkpoint requirement. |
| Animated forge vault | `chest_emberhorn_secret` (−25,−32), `asset_ember_forge_cache`, solid, radius 1.65; 3 iron + 78 XP, existing once-only Emberhorn/Cragbreaker seal. Retain shutters/tray, OPENING exclusion, saved open/empty state and physical front/side access. |
| Vault backdrop / foundry | `prop_s3_barrier` (−26.8,−33.2) and all `prop_foundry_habitat_*` entries. Their role/transform/support relationships are explicit, not expendable filler. |

Ember blooms, spires, mineral groves and pebble clusters are currently scenic roles; ore/crystal/actors above are not. Preserve every gameplay-bearing prop in any scenery replacement audit. The exact 27 foundry roots comprise shelves 0–6, six shelf support pieces, seven groves, four recess pieces, two landings and ground details. Keep the current admitted animated vault separate from the historically **HOLD 5.8** geological terrace appearance; neither status upgrades the other.

## Landform and space plan

Heights are **proposed supporting ground**, not object centers. Footprints are drafting envelopes to be refined against route clearance; they must not overwrite the protected ground island or actor spaces. Use a small number of irregular polygon heights plus continuous graded routes, avoiding rings of equal terraces.

| Area | Footprint / relief | Purpose |
| --- | --- | --- |
| South ravine mouth | x −20…18, z 28…53; 0–1m | Arrival opens toward two unequal high silhouettes, with visible waypoint spur. Keep near foreground low so default camera sees the route. Two small existing spire groups mark the mouth, outside arrival/return clearance. |
| Forge ravine and territorial floor | generally x −18…18, z 22…−24; 0–1.5m; **24–30m clear floor width**, wider near encounters | Broad lower route through the current actor/resource distribution. Its negative space is framed by real raised land, rather than bordered by a complete tan road. Keep the central encounter envelopes at near-equal height. |
| West ridge | approximately x −55…−25, z 4…42; irregular 8–12m crest | A long diagonally rising shoulder with a broad summit bench around (−39,11). Looking north reveals the foundry and extraction below; descending into the foundry supplies the quieter alternative to the central court. This is one connected ridge, not another shelf ladder. |
| Protected foundry island | roughly x −45…−8, z −44…−7, plus exact `foundry-return` corridor south to (−6,2) | Preserve the current local surface, solid shelf/landing/recess relationships, ore/cache/beacon approaches and vault working space. New high terrain blends down before this footprint. Do not bury the recess or turn its lintel into a second traversable storey. |
| East plateau | approximately x 20…54, z −15…36; shoulder 8–12m, **walkable summit 16m near (43,1)** | The principal climb/loot destination. The existing cache stays at (28,8) on a broad 12m shoulder, seen from the opposite ridge and revealed more clearly on the last climb. Large exposed diagonal faces contrast with the sheltered western industrial pocket. |
| North-east descent tongue | x 26…49, z −34…−7; 12→8→4→1m along a broad continuous contour | A different return route from the east plateau to the north gate approach. No new encounter/reward pocket; it reconnects the optional high loop to campaign progress. |
| North saddle | x −14…18, z −34…−53; existing low gate rise near 0.9m | Retain repair/return readability and two open approaches, from the valley/foundry and eastern descent. No new cave gate or changed requirement. |

The 120m bounds already provide sufficient area; the older 160×130m suggestion is not selected. Keep tall interior masses inside the existing containment region with room for boundary collision/camera margins. Check perimeter crest/skirt visibility from the new summit; do not extend the map or weaken its solid edge to hide a problem.

## Walking routes, ascent and descent

All new high routes use continuous shared-surface grades, generally **4–5m usable width plus 2–3m feather**, with broad corner aprons. Prefer sustained grades ≤0.35 rise/run (19.3°); permit **local grades up to 0.45 (24.2°)** where the reserved footprint supports them and native walking/companion proof passes. The revised draft centerlines below peak at 0.4121 (22.4°), not ≤0.30 everywhere. The existing 45° climb limit is a technical ceiling, not a design target. The 30° slide threshold and 0.20m autostep mean a small accidental seam can be more troublesome than the intended hill. Do not solve routes with ramps hidden behind taller decorative collision boxes.

Route points below are **(X,Z,Y)** draft anchors. They are not prevalidated polylines. Resolve intersecting grade elevations coherently; reserve the entire width, feather and companion/body margin. The exact preserved old foundry surface takes precedence at its tie-ins.

- **Lower campaign route:** retain entry → waypoint-side turn → existing broad encounter court → lower north route → Windscar gate. Keep all six prop resources accessible from this low network; high exploration is optional. Scenery may frame the route but must leave the actual notice/charge/recovery space readable.
- **West ascent / foundry descent:** waypoint-side fork around (−20,27,0.4) → (−30,33,2.5) → (−43,31,7) → (−48,20,11) → (−39,11,12). Descend the broad inner shoulder via **(−32,12,10) → (−25,14,7) → (−22,7,3.9) → (−25,−4,2.2)**. This lengthens the descent south/east of the summit before turning north into the foundry; it replaces the infeasible short 10→6m and final 6m-drop draft. Reserve this shoulder beyond the broad west mass envelope. The final support Y **2.2m** is sampled from the exact baseline shared surface at (−25,−4), an existing `foundry-return` point. Preserve that corridor's old support across its full width/feather, not just its center; grade the new shoulder into it outside the protected corridor. A walk-back remains available. No new chest on this ridge: its reward is the overlook and a quieter access route to existing ore, Cinder Cache, Beacon and forge vault.
- **East ascent:** low fork east of the court around (14,19,0) → (25,29,2) → (40,30,6) → (49,18,11) → (43,1,16). A broad western shoulder then reaches (33,2,13) → existing cache (28,8,12). Do not add a giant staircase or an equal-height ring around the plateau; the ramp winds along one long oblique landform edge.
- **Separate east descent:** from the cache/summit shoulder, (30,−2,13) → (37,−9,12) → (45,−17,8) → (40,−28,4) → (28,−32,1.2) → (12,−29,0.3), then join the existing north approach. Use a broad dry shoulder at each turn, with a clear view of the low route on descent. This supplies a loop instead of forcing a retrace or a drop down the face.

Straight-segment arithmetic on these exact anchors gives maximum rise/run: west ascent **0.3421 / 18.9°**, revised west descent **0.4121 / 22.4°**, east ascent including cache shoulder **0.3333 / 18.4°**, east descent including cache connection **0.3536 / 19.5°**. These are feasible drafting grades, not runtime support proof: smoothing, route crossings, lateral feather and nearby high terrain can create steeper actual surfaces. Check the entire usable width and turns against the 0.45 local limit; lengthen or lower transitions if needed. Keep companion lanes inside supported route width. No current or proposed centerline is admitted merely by this arithmetic.

Companions must be able to walk the whole selected ascent and descent, settle beside the cache and return after a player shortcut. Keep route transitions away from the 10m actor leash envelopes. The west ridge and east plateau should be visible alternatives, not ways of accidentally leaving an active tame attempt by crossing a sudden height boundary.

At current 3.9m/s run and 2.145m/s walk, roughly 100–140m of ascent is ~26–36s running or 47–65s walking before pauses. These are distance estimates, not native timing. Use an intermediate view/turn every 20–30m, rather than adding repeated rewards. Preserve the 5–10-minute expedition intent; an optional high loop should not delay every campaign traverse.

## Useful ordinary jumps

Add **at most two optional shortcuts**, one on each ascent, only after walking routes work. Candidate locations: west shoulder around (−43,22), east shoulder around (46,16). Each cuts a bend of roughly 8–14m, using a 1.2–1.8m horizontal break or ≤0.7m rise and a ≥3×3m visible landing. Keep adjacent walk-around and a recoverable lower catch slope/bench about 1.5–2.5m below; no lethal void, mandatory gap or unreturnable landing.

Current jump impulse 5.8m/s and gravity 12m/s² imply ~1.40m ideal apex and ~0.97s same-height flight. Those mathematical maxima do not establish real landing access with capsule collision, takeoff speed and air control. Design comfortably below them and use native Space/touch Jump. No pads, course starts, checkpoints, special completion rewards, ladders or new mantle system.

## Encounter and camera constraints

Keep a near-flat shared combat floor around the two existing Emberhorn and Cinderjaw pairs. Emberhorn must retain a recognizable warning view, a ≥12×14m working court and two ≥3m lateral exits around its committed charge. Keep ore, bloom silhouettes and tall spires outside charge stopping/recovery space. Both archetypes currently roam 4.5m, notice at 7m and leash around 10m; a spawn point alone is not sufficient clearance. Harvester and combat vertical tolerances are narrow, so avoid placing targets on visually negligible but mechanically significant ledges.

The current baseline camera is **32° fixed pitch**, 52° FOV, 6.55m base horizontal orbit, focus +0.9m, far plane 60m. Landscape applies .85× zoom, with user bounds .72–1.3; maximum landscape horizontal offset is about 7.24m. `cameraFollow` currently does not resolve terrain collisions. Root is implementing the separately audited owner-requested bounded pitch orbit and smooth inward camera collision, with foliage fade retained. This plan may benefit from it, but cannot treat that pending implementation as proof of canyon readability.

Maintain broad canyon floor and shoulder space even with retraction: a camera permanently pressed close to the player would defeat the view. Keep 6–8m open aprons at route turns/overlooks; use broken wall faces and recessed toe slopes instead of tall narrow parallel walls. A new cliff should not sit directly behind the default-view player at arrival or the waypoint. From a route bend, show the next 15–25m of walkable ground and the next height change. At summit, frame nearby valley/foundry within roughly 30–50m; do not promise a whole 120m map panorama through the existing 60m far plane/fog.

Native review must orbit through both sides of a ravine turn and inspect min/default/max pitch, collision retraction/recovery and zoom at 844×390 and a short landscape height. Verify Explorer/companion/charge telegraph visibility, no terrain cross-section or opaque cliff enclosing the camera, and no change to movement yaw ownership. The camera audit owns its engineering scope; this plan adds no camera code.

## Art and mobile budget

Build the **major masses from shared terrain first**, with 6–10 purposeful polygon heights and bounded graded routes; do not hide a flat field under hundreds of rocks. Keep upper plateaus broad enough to walk and read, with irregular outlines and one or two substantial face breaks. Leave dry routes mostly natural ash/ochre ground, with short worn strips at forks and ruin thresholds. No new surface/biome-paint owner.

Reuse existing warm Ember spires, mineral groves, pebbles, ruin pieces and current foundry vocabulary as restrained face/toe accents. Reposition genuinely scenic central blooms/spires away from actor/harvest sweeps into **three groups**: ravine mouth, western foundry shoulder, eastern plateau toe. Do not scale small spires into the entire mountain or repeat the rejected staircase form across both sides. Keep visible ore faces distinct from scenic minerals. No new animated object, model generation, palette recolor of shared assets or paid service is assumed. Preserve the animated forge vault's reviewed appearance.

Use current material channels to separate warm dark rock faces, lighter dusty traversable tops and small orange/cyan mineral accents; geometry and value grouping should establish depth before saturation/detail. Preserve the existing foundry materials initially rather than reopening its historical art loop simultaneously.

Provisional cap: reuse/move current scenic roots first; allow **no more than 16 additional scenic roots** only where a native view proves a large-face/turn needs definition. Target ≤~430 atlas calls and ≤~340k visible atlas triangles for this first terrain pass relative to 349 / 268,664 baseline, with deliberate physics triangle counts and no new runtime dependency. These are bounded authoring budgets, not phone acceptance. Record measured deltas rather than claiming terrain is free or expanding an optimization system to meet an arbitrary picture.

## Next gate and implementation order

1. Root reviews this plan and exact baseline. Then a separate author makes one in-engine top-down/oblique target using this baseline and approved Explorer style, with a matching height/route diagram if needed. Clearly show the low valley, western 12m ridge, eastern 16m summit/12m cache shoulder, both walking returns and protected foundry pocket. A target may not move gameplay anchors, add a cave under traversable terrain, invent extra beasts/rewards or assume more camera range.
2. Independent target judge checks whether substantial usable depth, ascent/descent and major masses are actually visible, plus protected-role clarity. Numeric plan overrides incidental generated silhouettes. No target image generation or production mutation was performed by this planner.
3. Implement shared terrain and supported route graph first, preserving the existing low foundry island. Rebase affected protected Y, homes, runSpawn and physics/support/export consistently. Preserve all IDs/XZ and audit the three ordinary plus six prop resource roles and four actor props before scenery changes.
4. Prove one representative lower-ravine → summit → cache → descent loop at normal camera pitch and with a companion before dressing the whole region. Check return/waypoint spawns, harvest/pickup, notice/charge/tether recovery, forge vault approach/Cragbreaker/open/collect/reload and onward repair access. The vault's established clip/state and rewards do not need redesign.
5. Only after walking access, add the two optional jump shortcuts and restrained scenery. Compare fresh top-down/overview and native low/high views, with exact world hashes and costs. Respect the current best-of-three-or-four selection rule; retain honest visual debt rather than starting another unbounded art loop. Physical support, role preservation and save correctness still require closure.

No canonical world, generated source, production code, browser state, model or reward catalog was changed for this plan. Only this plan and its role audit are owned here; the independent camera audit belongs to its other author.
