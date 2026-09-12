> Current status: target plus binding role plan admitted; standalone composer under functional review, not integrated. Route water/scenery clearance issues are being repaired. This document records the bounded design; CURRENT_SLICE and source remain implementation authority.

# Shatterfen redesign v1 — planning handoff

## Status and source of truth

This is a **planning-only** proposal for `section_2`, made while Verdant work is still changing the shared world file. It contains no production mutation, generated target, or claim of browser/native proof.

The two September 12 atlas maps were inspected in full. They are valuable as a visible before-state, but must not be treated as the canonical current map: their manifest records source SHA `6b038a…`, while the canonical source observed for this audit was `678d1c…`. The direct ID comparison found a material mismatch: capture labels `chest_parkour_section_2` as **Fen Leap Cache** at `(13.95, 0.15, -10.1)`; the canonical world now has the same stable ID as **Reedbank Cache** at `(17, 0.0897, 4)`. Other inspected anchors matched. The compact evidence extract is [section_2-audit.json](section_2-audit.json).

### Discovered code truth

- Shatterfen is currently an `80 × 80 m` section, from approximately `-40…40` on X/Z. Its present composition is one thin zigzag causeway across two very large pools, three small 0.62–0.70 m height patches, and a compact observatory-bank addition.
- The live terrain owner supports continuous polygon heights and graded route points; rendering, Rapier, support queries, object rebase and Author export share it. It supports bounded elevations up to 24 m. Use that path; do not introduce platforms, water physics, pad courses, or a second collision approach.
- Current gameplay identities include seven renewable resources, two Tidefin actor props in the western shallows, a Thornprowler on the far bank, three chests, the Observatory waypoint, Tideglass Beacon, and the reciprocal return/ruined onward gates. `props` includes gameplay actors, so a scenery-only rewrite would delete content.
- Tidefin's accepted field contract is already explicit: place a woven snare **on a dry bank**, step back, then approach and release it. It has no need for a new quest, blueprint, or gate.
- The Fen Observatory receiver itself is admitted gameplay art. Preserve its grounded paired pylons, one horizontal tilt axis, modest motion, separate waypoint and clear approach; do not replace it with another arch or add glow to compensate for the label.

## Design premise — the broken collecting wetland

Shatterfen should feel like a former impact basin that has collected water, crystal silt and the scattered remains of a survey array. It is not a forest shelf region translated to blue. Its navigation grammar is **low wet creek → dry reedbanks → fractured peat plates → one made-but-ruined lookout**.

The player sees a narrow, debris-marked landing from Verdant. The obvious route follows low dry ground through a creek loop. Side routes lead to a sheltered Tidefin bank and to the observatory plate, whose receiver points toward a broken survey hull on the north-west bank. The reward loop has real reasons to leave the main line: a snare site, a reveal behind reeds, the existing cache and a high but naturally accessible lookout. There is no straight runway, sequence of pads, checkpoint course, repeated arch, or arbitrary chore gate.

### Bounds decision

**Selected footprint: expand to 100 × 100 m (`x/z -50…50`) for this proposal.** The existing 80 m square is a good contract-preserving core, but it does not leave enough room for a destination that reads as a later crash impact rather than another object adjacent to the Beacon. The added 10 m rim is useful only on the west/north-west: it makes room for a real outer-bank loop and a larger wreck lookout. The east and south expansion stays mostly boundary/atmosphere, not more content.

This adds one meaningful, optional destination: an outer wreck shelf with a physical supply cache, a high view back across Tidefin water and a distinct return route to the ruined Emberfall gate. It turns the existing Beacon/far-bank branch into an exploration loop instead of a dead end. The longest direct walk remains bounded: return gate → creek fork is about 30 m; either the observatory or Tidefin bank is another 25–35 m; the outer wreck via the Beacon is about 55–65 m from arrival, and it reconnects to the Emberfall gate rather than forcing a full backtrack. That is expansion with a destination, not empty terrain.

The gate endpoints can remain inside the larger outline: each sits on a sealed ruin-facing spur, with natural boundary terrain behind/alongside it. Do not move a portal just to make it touch a rectangular edge. No current gameplay object's X/Z position is silently moved by this plan. Existing objects are retained at their audited coordinates; terrain application may only rebase Y/support through the shared landscape transaction. Any later desired X/Z move needs an explicit root-approved table, support check, arrival/return clearance check and fresh atlas.

## Provisional world-coordinate plan

North is `-Z`, east is `+X`. Coordinates/heights below are **proposal**, not discovered fact. Heights are feet/support elevations and are intentionally unlike Verdant's eastward 3/6/8 m shelf ladder.

| Area | Approximate footprint / elevation | Purpose and route |
| --- | --- | --- |
| 1. Return Landing | `x -12…14, z 22…38`, `0–0.5 m` | Preserve `entry_section_2` `(0,0,32)` and `gate_section_2_to_1` `(0,0,36)`. A shallow crescent of firm silt turns southwest, marked by 2–3 small buried survey panels and a single resource pair. It introduces the crash trail without becoming an interactable wreck. |
| 2. Low Creek Loop | `x -15…12, z -4…25`, water at the existing visual low; dry ground `0–1.2 m` | Replace the wide, oval pond reading with an irregular looping creek: narrow at `(-6,18)`, broader around `(-8,6)`, then tapering toward `(-5,-8)`. Two broad, walkable silt crossings and one reed screen make it a loop, not a painted road. Use thin painted route strokes only under firm ground; leave most dry silt unpainted. |
| 3. Tidefin Quietwater / Snare Bank | `x -38…-16, z -2…22`, wet hollow `0 m`; dry bank around `(-30,11)` at `1.1–1.4 m` | Keep `prop_s2_tidefin_a`, `prop_s2_tidefin_b`, `tree_section_2_shallows`, `fiber_section_2_shallows`, and `chest_tidefin_secret`. Build one unmistakable crescent of pale dry peat, open enough to place/read a snare, with reeds only around its rim. Tidefin occupies the water-side shallows; the player works from dry ground. Put the Grotto cache behind a reed-and-bank bend, reachable by ordinary walking, rather than a course. |
| 4. Observatory Plates | `x 12…33, z 1…20`; broken levels `1.2, 2.2, 3.3 m` | Retain `wp_section_2`, receiver, observatory rock, and the accepted bank outcrops. Grow the current 0.7 m islet into three irregular peat/stone plates linked by wide graded slopes and two short ordinary-jump cuts (each about `0.7–1.0 m` rise/landing difference). The receiver and its dedicated dry forecourt remain at about `0.7–1.2 m`, so the current waypoint/return behavior stays legible. The `3.3 m` rear plate is a look-across perch, not a vertical course. `chest_parkour_section_2` remains a renewable **Reedbank Cache** tucked under the east plate at approximately `(17,4)` with a natural approach. |
| 5. Far-bank Wreck Lookout | core approach `x -36…-10, z -31…-12`; new outer shelf `x -49…-36, z -42…-23`; bank `1.5–2.4 m`, lookout crest `4.0–4.8 m` | Preserve `beacon_section_2`, `chest_secret_section_2`, `tree_section_2_far_bank`, `prop_s2_farbank_thorn`, `rock_section_2_gate`, and `gate_section_2_to_3` at their current X/Z coordinates. From the Beacon, a broad graded north-west bank reaches an oblique, partly buried survey-hull fragment at about `(-43,-31)` in the new rim—large enough to read across the wetland but outside Beacon interaction. It is a scenic accumulation of existing survey panels/cargo frame, with no cartridge/bench reward. A ramped peat flank from `(-34,-20)` reaches the 4–4.8 m lookout; the alternate descent curls east via `(-18,-31)` to the ruined gate. The existing secret cache stays in its sheltered low cut near `(-29,-21)`; the high vantage reveals it without becoming a checkpoint reward. |
| 6. Outer Wreck Supply Cache | `(-44, 4.2, -34)` on the lookout's leeward dry shelf | Add exactly one optional chest, proposed ID `chest_shatterfen_wreck_supply`, using existing `asset_chest`, existing `loot_shatterfen_parkour` reward contract and its 86400-second refill behavior. It gives the outer loop a tangible repeat visit without a new item, blueprint, schema or unlock. It is not required for Tidefin, gate repair, extraction or campaign readiness. |

### Route graph and height rules

`Return Landing → Low Creek Loop` is the obvious safe progression. The loop has three readable forks:

1. west to the **Quietwater dry bank** and Tidefin Grotto;
2. east/up to the **Observatory Plates** and Reedbank Cache;
3. north-west up the **Far-bank Wreck Lookout** to the optional supply cache, then across/down to the Beacon and ruined Emberfall gate.

The high route should be a broad graded shoulder, not stair-step terraces. The observatory plate transitions are local broken edges, each with a visible landing and a walking alternative nearby. The far-bank ascent has a continuous graded route for companions, support queries and recovery; ordinary Jump is only a useful optional shortcut. Do not place water below an inaccessible shelf or imply swimming.

## Protected identities and implementation boundaries

Keep these IDs, types, rewards and role contracts intact. Rebase their Y values through the existing landscape transaction when their supporting ground moves; do not manually preserve stale Y values.

- Entry/gates: `entry_section_2`, `gate_section_2_to_1`, `gate_section_2_to_3`; retain reciprocal destinations, gate states and Emberfall repair requirements.
- Anchors: `wp_section_2` (with its valid approach and `runSpawn`) and `beacon_section_2` (far-bank extraction).
- Existing chests: `chest_secret_section_2`, `chest_parkour_section_2`, `chest_tidefin_secret`, including their stable loot-table and refill semantics. Preserve their audited X/Z locations in this pass; no chest becomes a course completion. The sole proposed new chest is `chest_shatterfen_wreck_supply` at `(-44, 4.2, -34)` and reuses the existing renewable `loot_shatterfen_parkour` contract.
- Renewables: all seven IDs listed in the evidence extract. Keep one approachable rock near arrival, the two western material types, observatory rock, far-bank tree and north-gate rock. Scenic crystals/reeds do not substitute for harvestables.
- Actors: `prop_s2_tidefin_a`, `prop_s2_tidefin_b`, `prop_s2_farbank_thorn`. Maintain a dry, unobstructed snare approach to at least one Tidefin; do not turn actor props into scenery.
- Admitted landmark/assets: `prop_s2_observatory_arch`, `asset_fen_observatory`, `asset_fen_bank_outcrop_left`, `asset_fen_bank_outcrop_right`, their current collision-hull route, and the existing `prop_fen_bank_*` family unless a placement is incompatible with the redesigned support surface.

Use established `surface.heights`, polygon/graded `surface.routes`, `naturalBoundary`, existing visual-asset instances and the static descriptor/convex-hull path. Check collisions and route access across player, loose/secured companion, resource harvest, waypoint spawn, extraction, portal approach, save/reload and Author rebase/export. No new physics owner, obstacle system, water mechanic, UI path or RAF loop is warranted.

## Content and presentation budget

Reuse the admitted Fen stones, reeds, lilies, crystals, canopy variants, bank outcrops/fronds, receiver and current survey-wreck components. Separate them deliberately:

- **Harvestable:** seven resource IDs retain clear isolation, hit space and collectible silhouette. The observatory rock and both western materials need open approach angles.
- **Living:** Tidefin stays visibly water-adjacent; Thornprowler owns the far-bank approach rather than idling in decorative cover.
- **Scenic:** dense reeds/lilies trace wet edges; stones buttress dry cuts; crystals mark silt pressure seams; only 2–3 separated survey panels lead from arrival to the larger far-bank hull. Scenic pieces are non-interactable and must not mimic the resource silhouettes.

Minimal new authored content: one physical optional chest (`chest_shatterfen_wreck_supply`) using an existing asset/reward/refill contract. The far-bank hull can be composed from existing `asset_survey_panel_debris` and `asset_survey_cargo_frame` as non-interactive scenery, with the receiver remaining the only moving landmark. If that silhouette cannot read at normal pitch, add one small static damaged-hull shell later; it must be art-reviewed and get an explicit collider recipe before admission. Do not add a collectible, blueprint, repair task, enemy species or second taming rule to justify it.

Defer: Tidefin model replacement (the candidate is not owner-accepted), new water traversal/swimming, a second outpost, a new camp service, new portal requirements, **any expansion beyond the selected 100 × 100 m footprint**, and any larger crashland narrative/economy work.

## Implementation and review order

1. Capture a fresh clean/planning atlas **after** the shared world stabilizes; verify source SHA plus the protected IDs above. The new map, not the stale capture, is the image-author input.
2. Generate the top-down target from that fresh map and obtain an independent target review **before any production composition**. Then compare its plan against the 58-degree overview and traversable-height intent. A top-down image alone does not prove Jump landings, Tidefin snare readability or companion traversal.
3. Only after target admission, compose terrain/water/graded routes and rebase all protected objects atomically. Confirm no steep lip or hidden collider blocks the dry bank, receiver, cache, Beacon or gate.
4. Place/reposition existing scenery and detached wreck parts only after paths are physically readable. Keep resource/actor objects explicit during any prop replacement audit.
5. Focused closure: one native route from return gate through creek to dry Tidefin snare bank, one from loop to Observatory/waypoint/renewable cache, and one to wreck lookout → Beacon → ruined gate; then reload supported positions and check Author rebase/export. Aggregate verification is the parent integration step.

## IMAGE TARGET BRIEF — for a separate image author

Use the **fresh current Section 2 clean/planning overhead map as the input**; do not use the dated atlas as canonical. Produce a realistic in-engine, **top-down / 58-degree oblique overview** of the redesigned Shatterfen, landscape 16:9. North is image-top / `-Z`; east is image-right / `+X`. Show the selected 100 × 100 m footprint and recognizable existing anchors, with no UI labels except optional tiny waypoint/beacon markers for a planning variant.

Show a teal-blue alien wetland in a **100 × 100 m** frame, with the existing 80 m core still recognizable. A narrow, irregular low creek curls from the south return landing through the center, rather than two huge clean oval ponds or a straight tan zigzag. At west, show a reed-ringed Quietwater hollow with a pale, open crescent of dry peat for Tidefin’s snare. At east, show three asymmetrical dark peat-and-stone plates rising from roughly 1.2 m to 3.3 m around the existing small Fen Observatory receiver on a clear dry forecourt; it has paired side pylons and one gently tilted bowl, not an arch and not a glowing sci-fi tower. Use the new north-west rim for a 4–4.8 m broken bank with an oblique, partly buried survey-hull fragment, one small supply chest on the leeward shelf, and a clear lookout over the creek; it visually progresses from 2–3 small scattered panels near the south arrival to this larger wreck. The far-bank Beacon, secret low cut and ruined north gate remain visible as separate destinations.

Terrain should be faceted stylized game geometry with broad slope transitions, split peat shelves, silt cuts, stones and cyan crystal seams. Use reeds/lilies densely only at water edges, leaving dry paths, resource approach space and creature silhouettes clear. Include two Tidefin shapes water-adjacent in the western shallows and one far-bank Thornprowler; keep renewable tree/rock/fiber silhouettes distinct from scenic reeds/crystals. The mood is cool blue-green basin light with muted stone and ceramic wreckage, not a forest canopy scene, obstacle course, symmetrical garden, or a field of repeating arches.

## Binding V3 image-role clarification — September12

Root excludes the ambiguous central green upright mark near image(810,320) in targetV3 from implementation. Leave ordinary supporting ground/reeds there; do not reproduce its creature-like silhouette or create an actor, resource, interaction or landmark from it. Creature authority is exactly the two existing Tidefin actor IDs and the existing far-bank Thornprowler, as listed in the protected-role audit. The target is visual guidance; audited numeric X/Z anchors, stable IDs and gameplay roles override incidental generated marks. No extra wildlife is part of this slice. This is a provisional production interpretation, not owner acceptance. Preserve the original8.1/image-only HOLD review; independent confirmation now PASSes the image plus this explicit role contract (art/targets/shatterfen-redesign-v3/role-resolution-review.md).
