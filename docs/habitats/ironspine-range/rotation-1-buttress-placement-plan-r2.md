# Ironspine Range rotation 1 — revised arrival buttress plan (R2)

**Status: one native-preview candidate; no two-sided placement is supported.** This
replaces the rejected R1 screen assumptions without modifying that historical
plan. It uses the actual root-recorded arrival camera, complete buttress GLB
vertices, the locked full lattice route, and the same full-hull support and
protection rules.

## One viable flank

| Transform | Full-hull base Y | Support span | Route margin | Actual mesh screen bounds | Result |
| --- | ---: | ---: | ---: | --- | --- |
| `asset_verdant_cliff_buttress` at `(-2077,-3157)`, yaw `0`, scale `.65` | 9.0255 | 0.1672m | 1.9959m | x 31.59–165.15, y 233.15–400.44; 1,160/1,160 vertices in x10–402, y165–640 | eligible for root native preview |

The alternate yaw `π` at the same location also passes numerically, but this
plan selects yaw `0` because it has the larger route margin. It is a single,
medium 2.49m-high visual flank. It does not claim to complete the target’s
continuous two-sided grey gully.

## Why the former pair is rejected

Root’s actual native projection already rejects the R1 west and east
hypotheses: west projects x581–699 wholly beyond the 412px viewport; east
projects x-20–66, largely beneath the upper-left HUD. The R2 diagnostic
reconstructs that result using the actual camera position
`(-2083.2911,17.0230,-3168.7809)`, supplied direction, 52° FOV and 412×915
portrait viewport, then projects all 1,160 actual GLB position vertices rather
than a ground-direction proxy.

A bounded 2,728-row search tested X[-2094,-2064], Z[-3161,-3140], four true
Three.js yaws, and the complete convex-hull contract. It produced 45
screen-safe candidates, all on the left flank. The apparent right-side options
that would frame x245–399 are unsafe: their full hulls are only 0.014–0.320m
from the full lattice route boundary, below the unchanged 1.2m shoulder. No
right flank is proposed.

## Preserved constraints and next proof

The selected row samples all transformed hull vertices, three samples per hull
edge, and origin: 77 terrain samples. Its 0.1672m span passes the unchanged
free-standing `<= .32m` rule, so it is not an embedded/floating exception.
It has zero conflicts with every sampled source’s footprint plus 1.2m approach,
all home disks plus 1.2m, and current solid scenery; it is tested against all
74 route segments.

[buttress-support-probes-r2.json](../../../art/reviews/ironspine-range/rotation-1/buttress-support-probes-r2.json)
holds the reproducible full-mesh projection and support evidence. Root should
native-render only the selected one-flank candidate at the frozen arrival pose.
If it reads as an isolated tan prop rather than the target’s grounded gully
edge, record a target/library HOLD. Do not add a second buttress, move a route,
weaken a source/home/corridor mask, or create a generic scenery path to force
the missing opposing wall.
