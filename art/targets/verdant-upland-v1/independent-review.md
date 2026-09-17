# Verdant upland V1 — independent art and level review

**Verdict: HOLD — 5/10.** This is a much stronger answer to the baseline's flat, sparse field: it proposes a readable western water habitat, a prominent eastern landform, more useful framing, and a denser sense of place. It is not admissible as the first-slice planning target yet. The painted launch/course apparatus and stepped waterfall are direct conflicts with the authorized traversal and water contracts. The image also does not establish a continuous, player-clear 0/3/6/8m route.

This is a review of target fitness only. It makes no claim about native playability, collision, performance, terrain implementation, or physical-phone behavior.

## Evidence inspected

- Candidate: `target.png`, 1563x1006, SHA-256 `6f2118af7ccda24dc9dfcf919a307a226c307445058559793818c8f1f9a14a8f`.
- Actual pre-redesign overhead baseline: `.dream-loop/visual-atlas/2026-09-12/maps/section_1.png`, SHA-256 `4f5cceeb54a84a5d0a708230fc4ddd34ed86318c10cd47c001245079dd5f8123`.
- Atlas manifest and `docs/REGION_REDESIGN_REVIEW.md`, including the 140x90m frame, fixed Survey/entry/Rootfall coordinates, single-water-plane limit, 3/6/8m intended upland, and ordinary-jump decision.

The baseline confirms the problem being addressed: large low, lightly organized fields and route paint, with little occupiable relief. The target improves silhouette, edge clustering and the amount of visually motivated exploration. Those are useful ingredients to retain.

## Score

| Area | Score | Judgment |
|---|---:|---|
| Composition | 2/3 | The west habitat, central low route and eastern mass read as three different places. The eastern contour route is visually compressed and the return is not clearly separate enough to verify as the specified loop. Fixed anchor placement also drifts materially. |
| Lighting | 2/3 | Rock-face shadows describe the larger eastern form well. Bright water, white foam and saturated flower highlights compete with route and resource reading. |
| Materials / asset style | 1/3 | Large cliffs and some canopies have broadly faceted matte intent, but the glossy cyan pool, cascade treatment, many tiny flowers, repeated decorative plants and generic course furniture depart from the restrained, substantial existing asset language. |
| Detail | 0/1 | Density is higher than baseline, but it is mostly undifferentiated decoration. Harvestable wood/fiber/ore groups and quiet observation clearings cannot be confidently separated from scenic clutter at player scale. |
| **Total** | **5/10** | **HOLD** |

## Blocking findings

1. **The middle eastern shelf visibly contains retired course language.** The orange-rimmed round launch disc, dark square/intermediate platform and boxed destination at roughly 68% width / 35–40% height read as a jump-pad/checkpoint set. They contradict the ordinary-jump replacement and cannot be interpreted as an optional natural gap. Remove that cluster entirely; it must not become a production prop placement.

2. **The west creek reads as elevated, cascading water.** The bright white falls and successive pools imply vertical water drops. The current shared water representation is one low plane, so reproducing this image honestly would require unsupported elevated water geometry. Keep the sheltered west water identity, but redraw it as one continuous low creek/pool with rocks, rooted banks and a calm shallow outlet; remove foam falls and tier-to-tier water changes.

3. **The target does not prove a traversable height chain.** It depicts several attractive shelves, but the alleged ramps tighten beside near-vertical cliff faces and their arrival/exit grades are unreadable. From this single overhead view there is no clear-height evidence that a 2.5–4m wide path continuously reaches the 3m shoulder, 6m shelf and 8m overlook, then returns by a distinct descent. Do not derive terrain/collision directly from the image. First make a small terrain blockout plus side/elevation profile showing ground, each stated shelf height, ramp widths/grades, rest shelves, capsule clearance and the two optional jump lips/visible recovery landings. Then compare the locked native-pitch positions specified in the region brief.

4. **Fixed anchors have meaningful visual drift.** Independent visual estimates put the Survey cabin around 54–55% width / 76% height, the southern arrival marker around 50% / 92–93%, and the north beacon around 50% / 4–5%. The guides are Survey 55%/72%, entry 50%/87%, Rootfall gate 50%/9%. These vertical offsets are about 4–6% of the frame—several metres in the 90m composition—not harmless pixel rounding. Restore the low, flat, unobscured Survey apron and bring the gate/beacon back to their guide bands. Numeric world coordinates remain authoritative.

5. **The Rootfall throat is compositionally ambiguous.** The candidate contains a horizontal dark-root obstruction near north centre, but the nearby plateau/path network does not make its non-bypass flanks legible. Preserve one closed fallen trunk across the low throat and use continuous rooted/rocky flank landforms on both sides. Its immediate support must remain low; do not use the eastern upland as an apparent route around the gate. Geometry and the later blocked/repaired native proof decide this finally.

## Focused correction brief

Keep the broad east cliff mass, wooded west hollow, quiet open working pockets and view back to Survey. For one corrected planning image/blockout:

- Delete the launch disc, platform/box sequence, checkpoint-like lights and any ladder/fence that reads as a course. Put a single small shelf cache beyond a natural eroded lip, with a broad lower recovery ledge; otherwise communicate the loop through walking contours.
- Replace the waterfall chain with one low-level creek/pool. Keep an approachable west Mossling/berry hollow and one calm safety clearing.
- Set Survey at the stated guide with a visibly empty west entrance and open roof/apron. Move the arrival and northern beacon back to their guide bands; do not alter the actual source anchors to match the erroneous picture.
- Make the east ascent and descent distinguishable at a glance: show one broad approach from the Survey fork to the 3m shoulder, a separate contour descent that rejoins the low route near the stated northern return, and clear broad terrace tops. Reserve narrow breaks solely for the two optional ordinary jumps after measured reach exists.
- Reduce decorative flower/plant scatter. Use the admitted chunky faceted canopy/rock vocabulary in edge groves, and reserve 2–3 visibly accessible resource groupings with clean approach sides and open observation space. Avoid new water, flora, platform or course asset families.

After these targeted corrections, reassess from the clean overhead, anchor overlay, elevation profile and locked native-pitch views. A revised image alone still cannot certify collision, resource interaction, mobile cost or gameplay connectivity.
