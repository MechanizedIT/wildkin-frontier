# Ironspine Range rotation 1 — existing kit feasibility

**Status: read-only audit.** This is not an Ironspine placement, admission, or
source authorization. It compares the selected arrival-gully direction with the
currently registered shipping library so native preview can test the few forms
that have a plausible structural role.

## Target requirement

The selected direction needs a grounded, continuous-looking stratified
sidewall at the arrival gully. The central walking lane and the lower iron
approach must remain clear. The brief already limits trail stones, Fen stones,
rings, and verge vegetation to edge texture; their presence cannot substitute
for the gully wall.

## Shipping candidates worth native rendering

| Asset | Actual render bounds (m, X × Y × Z) | Triangles | Current status | Target fit | First orientation trials |
| --- | ---: | ---: | --- | --- | --- |
| `asset_verdant_cliff_buttress` | 3.068 × 3.828 × 2.020 | 458 | Registered opaque V3 export, convex hull | The sole consequential existing vertical mass. Its broken stack can test a near edge, but its muted Verdant palette and discontinuous profile do not prove an iron-grey continuous wall. | yaw 0 for its detailed local +Z face; yaw +π/2 to run its 3.07m local-X span along a gully edge. |
| `asset_verdant_cliff_ledge` | 3.280 × 2.465 × 2.070 | 384 | Registered opaque V3 export, convex hull | Secondary shelf only; useful to test an upper cap beside a buttress, not as the wall. Its apparent opening is collision-closed. | yaw +π/2 along the bank; yaw 0 as a face/rejection control. |
| `asset_verdant_cliff_toe` | 3.110 × 1.375 × 1.779 | 268 | Registered opaque V3 export, convex hull | Low attachment foot only. It can hide a base seam and cannot fill the sidewall gap. | yaw +π/2 along the opposite low edge. |

The three files are the **only** accepted members of this family:
`assets/models/verdant-cliff-{buttress,ledge,toe}-v1/model.glb`. Their hashes,
hull envelopes, material statement, and provisional orientations are recorded
in [kit-feasibility.json](kit-feasibility.json). The accepted V3 source receipt
states each has one opaque embedded rock-palette material and conservative
convex-hull collision. Existing Rocky Terrace and Skybreak recipes prove only
the family’s bounded fixed-landform lifecycle; they do not grant Ironspine a
generic streamed-scenery path.

## Rejected library shortcuts

`asset_fen_bank_outcrop_left` (1.435m) and
`asset_fen_bank_outcrop_right` (1.60m) are shipping, collision-valid Shatterfen
forms. Their short, wet-bank roles and materials make them poor substitutes for
the target wall. The held Sunscar rib and Rootbound buttress work are also
excluded: neither is an admitted Ironspine asset. Historical Verdant V1/V2/V4
candidate directories are excluded in favor of the registered owner-accepted
V3 runtime copies.

## Required next proof

Root should native-render exactly these trials at the fixed arrival camera:
buttress (yaw 0 and +π/2), ledge (+π/2), and toe (+π/2), each only at anchors
that first pass full transformed-hull support, source/home protection,
route-clearance, and camera projection. A result that blocks the central lane,
needs a generic scenery renderer, or reads only as isolated tan props is a
library-gap HOLD. This audit asks for no new asset and makes no placement claim.
