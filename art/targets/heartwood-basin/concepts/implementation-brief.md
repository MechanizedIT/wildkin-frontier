# Heartwood Basin rotation 1 — selected implementation brief

**Status:** director-selected and root-approved under `docs/CURRENT_SLICE.md`; structural R1 is now frozen for actual capture. The separately reviewed broadleaf asset remains pending production/admission. The perceptual reference is `selected.png`, byte-identical to `forage-destination-direction.png` (`SHA-256 7e40493b1f6742437bff995b2846a2bf0259335a48c0bf3c1773200e84862444`).

## Matched evidence and circuit status

Judge the destination at `(-12.794783,-83.233994)`, arrival at `(-3.446514,-46.265858)`, and interior at `(-1.1732645,-74.975792)`; all use yaw `0`, the frozen 412×915 portrait HUD, pitch `0.6283185307`, and normal gameplay lighting. The ordinary baseline reached all seven legs in **208.01 m / 134.675 s**, with two Camp-exit detours and no console errors. Its berry attempt was out of usable range, so the reported 17 berries remained unchanged and no gathering success is claimed. The 3–5 minute intent remains a later proof: add only the existing north-berry branch at `(-3,-119.5)` and `(6.9,-119.9)` around Emberhorn's existing home `(0,-111)`.

## Bounded composition contract

The visit envelope is `x[-20,12], z[-125,10]`. New terrain/scenery composition is restricted to these three room zones:

| Room | Bound | Player-facing result |
| --- | --- | --- |
| Apron | `x[-12,8], z[-58,-38]` | An unequal, planted departure edge while Camp's approach stays open. |
| Threshold | `x[-10,8], z[-88,-66]` | A shallow left/right rhythm with an obvious playable center. |
| Berry room | `x[-20,2], z[-96,-73]` | The selected left log/root edge, low right counter-edge, and a clear resource/return lane. |

The north-berry strip `x[-8,10], z[-125,-104]` is route-only until its physical proof; it receives no new composition in this pass. Exclude Camp and its approach, every authored resource footprint and usable interaction approach, the full existing Emberhorn home/leash/support area, existing wildlife homes, and every current collider/trunk footprint. The implementation must use the current support and clearance checks; it cannot relax a protection, move an identity, or turn the clear center into decorative collision.

## Five bounded changes

1. **Shape the rooms, not the whole basin.** Within the three room zones, form shallow 0.5–1.5 m articulated banks at the side edges, feathering back to existing terrain. Keep a provisional 5–6 m clear central travel/interact lane; actual clearance derives from the source route, resource, and home-footprint checks.
2. **Make the destination a two-edge room.** Place one existing `asset_fallen_log` candidate on the low left edge and use a modest 2–3-piece right counter-edge of admitted trail stones/reed/lily/fern forms. Keep the existing berry silhouette and its approach open. The log is already available; no missing-log claim is permitted.
3. **Replace the thin strip with connected edge clusters.** Use 2–3 deliberately separated low clusters per room, concentrated at banks and tree bases, with visible gaps between them. Provisional total: 12–18 added or repositioned low forms across all three rooms, inside current selection/collider caps and with no global cap increase.
4. **Add the one evidenced broadleaf role through its separate asset loop.** The completed kit review finds that the Heartwood tree's pink-ball/straight-trunk silhouette and the Redwood's thin tiered cone cannot make the selected room's broad green opaque crown. Open one scoped 4.5–5.5 m broadleaf tree: a warm curved trunk, connected fork, 3–4 m canopy depth, and roughly 3.5–5 m canopy width. It is an asset-loop candidate, not admitted scenery. If independently admitted, it replaces a few existing decorative canopy placements inside these rooms; it does not raise canopy caps, global trees, or selection counts.
5. **Carry the selected rhythm through the circuit.** Apron → threshold → berry room must repeat unequal side masses and open center, with a bounded cover-scale/rhythm comparison that avoids uniform enlarged dots. Preserve current resident totals, forage/wildlife identities, collision behavior, save data, lighting, camera, HUD, and the scenery/terrain owner split.

## Existing-kit inventory

The authored asset catalog already contains the roles below; spans are local unscaled mesh AABBs from `world.generated.js`, not clearance radii or placement approval.

| Asset | Current role | Parts | Local span (x × y × z, m) | Intended check |
| --- | --- | ---: | --- | --- |
| `asset_heartwood_tree` / Heartwood Ancient | prop | 39 | transformed visual 4.278 × 6.337 × 2.682 | Inspected kit: pink ball mass and straight trunk; insufficient for the selected opaque broadleaf crown. |
| `asset_redwood_tree` / Redwood Tree | harvestable | 93 | transformed visual 4.000 × 6.507 × 4.094 | Inspected kit: thin tiered/conical mass; retain only where its existing role fits, not as the target canopy. |
| `asset_fallen_log` / Mossy Fallen Log | prop | 27 | reviewed kit 2.84 × 1.14 × 2.32 | Adequate primary candidate for the destination's low left edge. |
| `asset_fern` / Frontier Fern | harvestable | 57 | transformed visual 0.844 × 0.624 × 0.931 | Small anchor-local low mass only; do not use it as the missing broad form. |

Root's reviewed kit captures support the missing-role finding only for the broadleaf crown. That one asset follows the separately bounded target/reference → editable mesh → independent-review path. No other asset creation follows from this brief.

## Deferred

Literal broadleaf forest walls, a whole-habitat foliage overhaul, additional plant families, cinematic haze/depth, cliffs/caves/water, a new berry interaction, and any camera, HUD, lighting, save, ecology, or wildlife-rule change are deferred. The implementation brief does not authorize a new game system or wider habitat pass.

## Evidence required after an approved pass

Capture the three fixed portrait poses, an overhead diagnostic, actual asset/admission evidence, source/home parity, protected route/resource clearances, a successful ordinary interaction from usable range, and the extended branch only if it is claimed as part of the 3–5 minute circuit. An independent reviewer judges the resulting frames; this brief does not self-approve them.
