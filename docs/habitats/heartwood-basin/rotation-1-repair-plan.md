# Heartwood Basin rotation 1 — focused R2 repair plan

**Status:** proposed repair only. It follows independent R1 HOLD 3.1 and requires plan review before source work. It uses no new asset, gameplay ID, cap, camera, light, or route rule. The broadleaf candidate remains separate and uncredited pending admission.

## Corrected camera fact

At all three frozen yaw-`0` poses, the camera is on `+Z` and looks toward `-Z`. A prop can only frame the room if it is in front of the player at a lower Z. R1's log at `(-18,-75.5)` is behind the destination player `(-12.794783,-83.233994)` and will be removed from that staging role. The repair uses close, forward side edges rather than overhead coordinates or distant canopy counts.

## Destination: one real two-edge room

The player/resource lane is preserved between the destination player and the existing berries. The proposal keeps all solid trunks outside source route/resource/home protections; only the already admitted low-prop log and low forms stage the near room.

| Role | Proposed coordinate / pose | Projection intent | Safety condition |
| --- | --- | --- | --- |
| Left foreground log | `(-16.0,-90.0)`, scale `.80`, yaw `.18` | 6.8 m forward and 3.2 m left of destination. Point probes show this is inside the narrow forward frame; the full 2.84 m transformed box still needs root projection. | Full log radius `1.22 m` support passes in the source scan; nearest berry/source clearance is 4.1 m. Re-run actual curated admission and full resource approach check. |
| Left cluster | `(-16.4,-91.8)` reed, `(-15.6,-92.8)` lily, each existing low family at `.72–.88` | Keeps low mass adjacent to the log but forward of the player instead of behind the camera. | Full current low clearance/admission, no solid collider. |
| Right counter-edge | `(-10.5,-91.0)` trail stones `.68`, `(-9.5,-92.5)` reed `.78`, `(-10.0,-88.5)` lily `.74` | 5.3–9.3 m forward and 2.3–3.3 m right: the revised lily avoids the HUD-hidden deep anchor while retaining the low opposing edge. | Source scan passes 0.9 m support at the stone/reed and full scaled lily support at the revised anchor. Trail stone is the only possible compact solid and must clear the route/resource/home disks. |

No new canopy enters this room during R2. The subsequent asset loop may replace one named decorative canopy only after its separate admission.

## Arrival and interior: sequence rather than scatter

All listed pieces are existing low families or already-admitted decorative canopies. Exact final coordinates remain conditional on the same current support/admission predicates and root's projection receipt.

| Pose | Left edge | Right edge | Center intentionally left open |
| --- | --- | --- | --- |
| Arrival `(-3.446514,-46.265858)` | A small planted threshold cluster around `(-6.4,-54.0)` and `(-6.0,-56.0)`, just beyond the Camp apron. | A lower reed/lily pair around `(-.4,-54.0)` and `(.2,-56.0)`. | `x[-5,3]`, immediately forward through `z[-58,-47]`. |
| Interior `(-1.1732645,-74.975792)` | A close uneven low cluster near `(-4.5,-84.5)` and `(-4.0,-81.5)`. | A separated stone/reed pair near `(1.8,-81.0)` and `(1.4,-84.0)`. | The central *solid* lane is `x[-4,3]`, `z[-87,-76]`: only nonblocking reeds/lilies may visually overlap its edge after source clearance. No trunk or trail-stone acceptance is allowed there. |

The R1 bank profile is not expanded blindly. R2 first samples the bank mesh at each fixed pose and retains only contours that visibly occupy an edge; its maxima remain subject to the existing source/home masks. No terrain-cover multiplier or full-field scatter is part of this repair.

## Required feasibility receipt before source freeze

1. Root supplies/records transformed full-asset projection for the revised narrow anchors above. Point-probe evidence is necessary but insufficient: a candidate must put visible box/silhouette mass between the HUD top and controls, outside the player and berry silhouette.
2. For every proposed low/canopy/log, run existing full-footprint mesh support, route, resource interaction approach, wildlife full-home/leash, Camp, and collider checks. The log and trail-stone must use their actual transformed radii.
3. Preserve 28 curated records, 7 canopies, 21 lows, the 44-near/52-total/18-canopy selection caps, one ground-cover draw, and the 640 cluster ceiling. R2 may relocate/retype existing decorative records only; it cannot add an asset family or increase a cap.
4. Re-capture only the frozen arrival, interior, destination, and diagnostic overhead frames. Independent review judges visible room edges and linked sequence, not the placement plan.

The revised `(-4,-81.5)` interior lily and `(-10,-88.5)` destination lily each pass their full scaled `0.6882 m` support checks in the source sampler. Their nearest protected-source distances are 10.21 m and 6.02 m respectively; full admission remains required before source work.

## Stop conditions

If transformed projection or current source clearances reject the two-edge destination as a coherent room, preserve the source and report HOLD. Do not move a gameplay resource, wildlife home, fixed Camp object, or accepted solid trunk to force the composition.
