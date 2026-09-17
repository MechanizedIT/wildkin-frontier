# Skybreak Tablelands — rotation 1 planning packet

**Status: queued planning only.** This packet selects one representative
ascent/crown/return circuit from the current Skybreak source. A fresh baseline,
2–4 high-quality portrait gameplay targets, and independent target selection
are still required before a structural pass. No implementation is authorized by
this document.

## Current evidence and boundary

Skybreak is the existing north-of-Camp landform in `x[-34,49]`,
`z[-249,-152]`. Its source route is already explicit:

**Current habitat allocation caveat:** this older named landform crosses the newer Heartwood/Skybreak border. `frontierRegionCatalog` centers Heartwood at `(0,0)` and Skybreak at `(0,-450)`, so these near-X-zero poses change their authoritative habitat label around `z=-225`. Arrival/ascent/return correctly display Heartwood; crown displays Skybreak. This visit is an entrance/transition circuit into Skybreak, not proof of the entire allocated habitat. Preserve each actual HUD label; do not force a Skybreak label for target art. Fresh settled captures remove transient arrival toast by waiting, without changing region state or UI content.

| Role | Anchor | Current terrain evidence |
| --- | --- | --- |
| Base | `(4,-153)` | `y 7.29` in the retained terrain measurement. |
| Entry shelf | `(4,-166)` | `y 11.35`; beginning of the supported western ascent. |
| Mid rise | `(-7,-184)` then `(5,-204)` | `y 16.90` then `26.02`; existing broad climb. |
| Crown | `(12,-228)` | `y 34.97`; existing cap route destination. |
| East return | `(29,-213)`, `(36,-188)`, `(32,-156)` | Existing separate buttress descent back to low ground. |

`frontierLandform.js` owns these anchors, the seven route segments, six unequal
route mesas, dominant crown lobes, and the detached north horn. `frontierTerrain.js`
owns the detailed one-metre triangles in chunks `(-1,-5)`, `(0,-5)`, `(-1,-4)`,
and `(0,-4)`, including their coarse-edge matching; it publishes the actual
triangle-supported height and Skybreak cap/shoulder/lowland semantics.

The selected landform remains a **4.9/10 HOLD**. Its useful relief and separate
return survive, but the review found linked-pad silhouettes, repetitive cliff
curtains, sparse vertical habitat, and a weak cap hierarchy. The later
ecology-only pass remains a **6.4/10 HOLD**: berry and fiber pockets do not
separate clearly at ordinary distance, the summit does not place Mossling,
flowers, and crystal in one portrait-readable frame, and the three stone return
beats are weak. These are starting constraints, not claims that an old target
or capture is current.

## Representative player outing to prove after a future pass

The intended ordinary-input circuit is **3–5 minutes**, not a claim about the
older short fixtures. Start from Camp and walk north over the older rocky
terrace to the base anchor. At the west mouth, collect one staged berry source
at `(-20,-166)` while leaving its sibling `(-22.8,-167)` visible. Take the
existing western ramp through entry shelf, mid rise, and crown. On the crown,
approach the existing Mossling home from the gentler east side; when supplies
permit, use the already supported lure/retreat/feed/approach Bond interaction.
Then approach the existing east-cap crystal at `(32,-214)`, harvest it with the
ordinary tool, and descend through the high, mid, and low eastern stone groups
to `(32,-156)`. Walk around the old terrace's west side to Camp and use the
existing return flow. Literal reopen must retain only the interactions actually
made on that outing.

Past fixtures establish pieces, not the whole proposed circuit: a 26.37-second
ascent and 22.17-second east return held health at 5; later ecology evidence
recorded berry harvest, crystal harvest, a cap Bond, a 23.65-second eastern
descent, and a 44.84-second Camp return around the terrace. Several used an
isolated save, prepared lure supplies, or diagnostic camera. A future fresh
ordinary run must measure start-to-Camp time, health, visible blockers,
interaction results, worst streaming hitch, and reload state itself.

## Existing ecology and asset map

| Room / purpose | Current fixed content | Current owner and protection |
| --- | --- | --- |
| West lowland supply mouth | Two `asset_berry_bush` sources at `(-20,-166)` and `(-22.8,-167)`; `asset_verge_canopy_spread`, `asset_fen_reed`, `asset_mushroom_ring` framing at about `(-26,-169)`. | `frontierEcology` keeps source indices 100/101; `frontierScenery` preserves forage and footprint clearance. |
| East lowland supply mouth | One fiber source `(42,-166)` with existing spread canopy, reed, and mushroom grouping near `(42,-170)`. | Existing finite staged resource identity and support rules remain fixed. |
| Crown life / encounter | Three `asset_cloudflower` props around `(13.5,-231.5)`; Mossling home `(9.5,-231.5)`. | `frontierWildlife` owns the same-ID cap Mossling and its 2.4m roam, 2.2m flee, 2.8m leash; its full 3.1m disk receives half-metre support checks. Cloudflowers remain non-colliding and at least 3.1m from that home. |
| East cap reward | `asset_crystal`, fixed staged index100 at `(32,-214)`, scale1.8. | Existing finite resource ID and cap-support requirement remain fixed. |
| East descent cue | `asset_trail_stones` at high `(32/34/36,-218)`, mid `(41,-187)/(41,-185)/(43,-185)`, and low `(24/22/24,-166)`. | Existing merged low-prop batch, no new collision core, forage clearance, and current residency budgets. |

The only asset conclusion now is that this is an **existing-kit planning pass**.
No current evidence establishes that a missing asset is required. Target
selection must compare the actual kit at portrait scale before proposing a
separate reviewed asset task.

## Fresh baseline and target brief

Use the default world/lighting and normal portrait HUD. Capture these fixed
poses before target generation, then reuse them for selection and any later
review:

1. **Arrival / purpose:** player at `(4,-153)`, facing north toward the entry
   shelf. Show whether the first rise, west mouth, and a safe open lane read.
2. **Ascent / exposure:** player near `(-7,-184)`, facing northeast toward
   `(5,-204)`. Show the route edge, adjacent lowland, and the next vertical
   destination without a diagnostic camera.
3. **Crown / reward:** player near `(12,-228)`, facing east-southeast across the
   existing Mossling home toward the crystal side. Show whether animal, flowers,
   route exit, and reward can form one readable normal-camera composition.
4. **Return / orientation:** player near `(36,-188)`, facing south along the
   eastern buttress descent. Show whether the high/mid/low stone beats and the
   safe route are distinguishable.

Also capture one actual overhead/inspector coverage view of the full stated
bounds and one fresh ordinary circuit recording. A target author then produces
two to four portrait directions using these exact poses, player scale, the HUD,
and the admitted asset map. The directions should test: (a) cap-island and
vertical hierarchy, (b) lowland-pocket identity, (c) one summit composition,
and (d) return rhythm. An independent visual director must select a feasible
direction and check route clearance, support, resident cost, and these camera
poses before any implementation brief is made.

## Guardrails for a later structural pass

- Preserve all stated anchors, the western ascent, separate eastern descent,
  detailed-mesh/coarse-edge contract, and old terrace behavior.
- Preserve finite source IDs, depleted-state/reload behavior, Mossling identity
  and full movement disk, cloudflower soft-clearance exception, existing caps,
  and no added runtime/network/dependency/frame-loop system.
- Maintain supported terrain/footprint rules for every changed ecology or
  scenery placement. Do not place cap ecology on shoulders or turn low props
  into colliders.
- Keep Camp, neighboring habitats, global resident/draw budgets, portrait HUD,
  camera, lighting, and the physical-phone performance question outside this
  plan's authority.

The later review scorecard should prioritize: distinct mesa/crown silhouette;
broken geological planes rather than repeated curtains; readable west/east
ecological contrast; a summit group visible in the crown pose; descent cues;
and ordinary route, interaction, reload, streaming, residency, and mobile
readability proof. A fresh target and independent selection remain the next
required work, so this packet does not consume Skybreak's structural pass.
