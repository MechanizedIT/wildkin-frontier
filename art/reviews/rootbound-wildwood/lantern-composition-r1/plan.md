# Lantern Grove composition R1 — one assembled three-cluster room

## Proposed change

Assemble one Lantern Grove room from the retained manual Lantern R4 colony and four already admitted decorative records. The room has **nine deliberate instances**: the five current Rootbound records remain unchanged, and four additive rear-colony records supply density, material variation, and depth. No terrain, gameplay, collision, harvesting, source identity, or persistence change is proposed.

This is a practical assembly preview: one strong existing foreground cluster, one existing thorn counter-edge, and one new rear fungal colony. It directly addresses the sparse integrated portrait without a new inference/model run.

## Three clusters and clear apron

| cluster | instances | portrait role |
| --- | --- | --- |
| foreground deadwood/fungi | existing `lantern-log`, `lantern-ring-a`, `lantern-ring-b` | the lower-left to mid-frame broken-log cue; projected current bounds include x 49–329, y 277–390 |
| thorn counter-edge | existing `thorn-a`, `thorn-b` | taller, irregular right-side contrast; their vertical forms span the upper/mid frame without any new solid obstacle |
| rear colony | one R4 six-cap log colony, one small mushroom ring, one lily, one pebble cluster | a low, visibly grouped bank silhouette at x 273–394, y 165–245, turning the empty rear floor into a distinct Lantern destination |

The unchanged player destination is `(-449, 675)`. The rear colony’s closest selected centre is over 11 m away; its 2.464 × .758 m R4 ground rectangle is outside a conservative 8 m-diameter central apron. All added records are non-colliding `low` decor. The existing stones remain the only solid elements in this immediate composition.

## Exact additive records

| stable id | asset | x,z | scale / yaw | full support span | portrait box |
| --- | --- | --- | --- | ---: | --- |
| `f1:s:rootbound-wildwood:lantern-colony-r4` | proposed admitted `asset_lantern_log_manual_r4` | -440, 688 | 1.35 / .55 | .0663 m | x295.26–393.98, y165.41–224.61 |
| `f1:s:rootbound-wildwood:lantern-colony-lily` | `asset_fen_lily` | -441, 688 | 1.05 / .20 | .1069 m | x337.01–401.64, y205.51–236.98 |
| `f1:s:rootbound-wildwood:lantern-colony-ring` | `asset_mushroom_ring` | -441, 687 | .82 / .20 | .1532 m | x322.70–367.97, y202.01–239.54 |
| `f1:s:rootbound-wildwood:lantern-colony-pebbles` | `asset_pebble_cluster` | -438, 688 | 1.05 / .20 | .0218 m | x272.70–304.58, y178.05–201.20 |

Each base is the current terrain minimum over its transformed visual ground rectangle, with no terrain deformation. The full measured placement data, all five unchanged records, camera, and current support samples are in [room-placement-probe.json](room-placement-probe.json); rerun [room-placement-probe.mjs](room-placement-probe.mjs) from the repository root. The pose is the integrated destination camera: 52° vertical FOV, 412×915, camera `(-455.992761,17.604375,668.752076)`, target `(-449,10.791310,675)`.

The planned count is **9** (5 retained + 4 additive), within the requested 8–12. The new rear group remains visually separate from the existing log/rings rather than stacking duplicates at the same centre.

## Asset fit and admission mapping

`asset_fen_lily` (644 triangles, 1.267×.200×1.036 m), `asset_mushroom_ring` (1,760 triangles, 1×.682×1 m), and `asset_pebble_cluster` (192 triangles, .648×.340×.563 m) are already registered, non-colliding visual assets. Their small use here is material variation around one substantial colony, rather than scattered filler.

The retained R4 candidate is the consequential anchor: 16 components / 1,390 triangles, with a log plus six violet caps and moss. At proposed scale it is 2.464 m long × .758 m deep × 1.114 m high. It must be baked/admitted as `asset_lantern_log_manual_r4` through the existing local visual-asset path before the one new record is selectable. The source Blender scene and frozen bounds are [candidate-audit.json](../../../source/lantern-log-v1/manual-r4/candidate-r4/candidate-audit.json); the relevant retained render is [R4 principal three-quarter](../../../source/lantern-log-v1/manual-r4/candidate-r4/renders/r4-principal-threequarter-512.png).

The R4 Blender mapping is explicitly `[X,Y,Z] → game [X,Z,-Y]`. Its local source has no runtime collider; admission must retain that property. This is not a new TRELLIS task: R4 already exists and has usable mushroom/log parts. Its held thin-plank body remains a native-preview risk, so the capture must judge the assembled composition instead of assuming admission means visual approval.

`asset_rootfall_center` is rejected for this pass. It appears useful in a screen projection, but the prior full transformed-hull study found 1.61–3.05 m terrain spans in the bounded candidate area. An embedded root placement would need a dedicated root-contact/support plan and would enlarge this composition visit. See [projection-support-probe.json](projection-support-probe.json).

## Preservation and required proof before source work

The current five Rootbound records retain their stable keys, asset IDs, positions, scales, yaws, and persistence/source fingerprints:

- `lantern-log` — `asset_fallen_log`, `(-444,678)`, `.95`, `.45`;
- `lantern-ring-a` — `asset_mushroom_ring`, `(-442,678)`, `.9`, `.2`;
- `lantern-ring-b` — `asset_mushroom_ring`, `(-444,681)`, `.85`, `-.4`;
- `thorn-a`, `thorn-b` — their current solid `asset_fen_stone` entries.

The additive four must be default-world-only exactly like Rootbound curated scenery. Confirm before native capture that alternate/disabled Rootbound variants select no added records, current forage/wildlife source fingerprints and home footprints remain unchanged, the final R4 bounds/terrain base match this receipt, and only the four named additions appear once. No global cap, route, or save schema changes are permitted.

## Review criterion

Pass only if the normal integrated portrait reads as one clear opening bounded by a deliberately layered fungal/deadwood room: visible foreground log/rings, thornstone counter-edge, and rear violet colony. Hold it if the R4 anchor reads as a detached thin rail, is HUD-hidden, or muddles the central apron. A later broad deadwood hero asset would be a separate target-led asset loop, not an excuse to add more small props now.

Reference: [current integrated portrait](../terrain-facets-r3/integration/integrated-portrait.png) and [Lantern Grove target direction](../../../targets/rootbound-wildwood/concepts/dossier-v2/lantern-grove-v1.png).


