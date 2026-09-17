# Sunscar Desert rotation 1 — numerical structural and placement plan

**Status: pre-implementation plan.** This receipt selects bounded staging anchors
for independent review. It authorizes no source, asset-registry, terrain,
collision, or scenery edit. Root still owns native camera projection, browser
capture, ordinary input proof, and integration.

## Evidence and method

The selected `destination-cleft` direction is evaluated against the frozen
portrait fixtures in `baseline-captures.json`, not a new pose: arrival
`(-1975,-6), yaw 1.35`; interior `(-1930,28), yaw -3.09`; destination
`(-1934,87), yaw 1.11`. The camera is 412 x 915, 52-degree FOV, portrait
pitch 36 degrees, effective distance 11.591 m. Its look direction is the
negative camera-orbit direction: approximately `(-0.976,-0.219)` at arrival
and `(-0.896,-0.445)` at destination. Earlier route-facing shorthand must not
be used for asset staging.

`planning-rib-probes.mjs` samples the actual current terrain across each
rotated full planform at 0.5 m intervals, compares every surveyed local source
and home footprint to the rotated rectangle, measures route-centerline distance,
and projects all eight box corners with the frozen camera configuration. The
public report is [planning-rib-probes.json](../../../art/reviews/sunscar-desert/rotation-1/planning-rib-probes.json).
It is an approximation until root repeats complete transformed mesh projection
against the delivered asset.

The destination pocket around `x=-1943..-1934, z=80..91` is nearly level:
the selected right edge planform spans only **0.155 m** over 45 current terrain
samples. The arrival candidate spans **0.268 m**. Neither can make the target's
broad, broken sandstone silhouette through terrain shaping alone without a new
bounded terrain recipe. Therefore this plan conditionally reserves the one
reviewed `Sunscar weathered rib` asset role instead of inventing a local ridge.

## Reconciled rib envelope

Use **4.4 m long x 2.1 m deep x 1.6 m high** as the planning envelope. The
previous 1.3–1.9 m depth / 1.8–2.5 m height range was an intentionally broad
pre-target asset-feasibility band. The selected direction reads as a *low,
wide lane-edge rib*, so 2.1 m depth gives the full low-poly bedding mass and
1.6 m height avoids turning it into a standing landmark or losing its cap to
the portrait HUD. This is a target-role inference, not a claim of image-derived
physical truth. The future asset review may reject it if the delivered full mesh
has a materially larger footprint.

The asset must remain an opaque warm ochre/sienna sandstone rib with horizontal
cap break, broken end, and shallow vertical erosion. No teal, glow, arch, cave,
or additional mineral/resource identity is allowed.

## Two bounded staging anchors

The plan allows **two instances total**, both using the same asset at unit
scale. Their yaw `0.46` rad turns the long axis across the pocket rather than
down the route.

| ID / purpose | x, z, yaw | sampled base / support | protected source and route result | approximate frozen-view bounds |
| --- | --- | --- | --- | --- |
| `sunscar-destination-right-rib` — the selected target's right pocket edge, behind the approach to the existing north crystal | `(-1943.0, 80.0, 0.46)` | base = **5.324** (minimum); 45 points, min/max **5.324/5.478**, span **0.155 m**, max sampled slope **0.053** | nearest retained source `f1:r:-39:1:6` is **4.288 m** from the rotated planform; route-centerline distance **9.453 m** | destination: x **246–361**, y **125–266**; interior: x 414–496, y 89–133. The destination top edge touches the HUD boundary in the box approximation, so native full-mesh projection must prove enough visible body before admission. |
| `sunscar-arrival-right-rib` — sparse basin echo, on the outer edge rather than between the arrival crystals | `(-1985.0, -3.2, 0.18)` | base = **5.950** (minimum); 45 points, min/max **5.950/6.218**, span **0.268 m**, max sampled slope **0.101** | no surveyed source/home overlap; route-centerline distance **10.385 m** | arrival: x **-115–35**, y **155–314**. It is partially off the left screen edge by design and must retain a readable broken-end silhouette in native projection. |

The former destination-left and arrival-left probes are rejected: respectively
off-screen and overly uneven/near-source. The two selected anchors are planning
candidates, not admissions. They preserve the existing north crystal
`f1:r:-39:1:4` at `(-1934.07,87.22)`, its nearby fiber/rock sources, both
arrival crystals, the ore, the Emberhorn home and all existing source IDs.

## Structural pass boundary

1. Keep terrain height/profile and the existing 308.48 m local route untouched.
The ribs are visual pocket boundaries; they may not flatten, redirect, or
narrow the central route.
2. Preserve source, home, persistence, resource approach, and regional ecology
owners. Before source work, root must repeat the full transformed mesh
planform/support test and compare all local resource/home identities before and
after.
3. If the asset admission needs physical collision, it requires a separately
reviewed bounded lifecycle compatible with the external-model/convex-hull
precedent. It cannot use a canopy or generic low-scenery workaround. If native
projection shows either anchor HUD-hidden, behind-camera, or visually too weak,
reject that placement instead of moving protected content or broadening terrain.
4. Small existing trail-stone/pebble dressing remains optional and must be
separately full-mesh-projected, source-clear, and capped. It cannot compensate
for a failed rib silhouette.

The planned work is one structural pass only after independent review of this
plan and the asset's separate admission evidence. A capture/judging repair is
reserved; no hidden variant or uncounted terrain blockout is included here.

## R2 correction — transform, full footprint, and west-skirt route

This amendment supersedes only the candidate measurements above; the original
`planning-rib-probes.json` remains preserved as rejected evidence. The R2 probe
uses the renderer-compatible horizontal transform `x = u*cos(yaw) +
v*sin(yaw); z = -u*sin(yaw) + v*cos(yaw)`, count-based 0.5m sampling that
includes all four 4.4 x 2.1m planform extrema (60 samples), and the actual
west-skirt hypothesis:

`[-1970,-2] → [-1954,-5] → [-1933,-13] → [-1944,5] → [-1944,28] →
[-1944,47] → [-1937,84] → [-1928,88] → [-1892,64] → [-1912,48] →
[-1940,0] → [-1970,-2]`.

Source clearance is no longer a point heuristic: distance is from the rotated
rib body to the source’s actual visual collision box when present (crystal), or
to a documented conservative resource-type footprint (rock/fiber), with an
explicit **1.2m approach buffer**. Route clearance is conservative rib bounding
radius to route centerline, retaining an explicit **1.2m shoulder**. All local
homes are checked against `max(10m, roamRadius, leashRadius) + 1.2m`.

The corrected small-grid evidence is
[planning-rib-probes-r2.json](../../../art/reviews/sunscar-desert/rotation-1/planning-rib-probes-r2.json).
Of 448 bounded rows, 41 pass all analytical checks. The old arrival candidate is
rejected: it was largely off-screen under the corrected transform.

| Candidate | x, z, yaw | support / route | source/home clearance | frozen-pose box result |
| --- | --- | --- | --- | --- |
| `sunscar-destination-rib-r2` | `(-1942, 83, 0.25)` | 60 samples, 5.290–5.321m, **0.031m** span; route edge **2.289m** beyond centreline (≥1.2m) | nearest fiber `f1:r:-39:1:6`: **1.383m** body-to-footprint (≥1.2m); north crystal body distance **5.390m**; no local home | destination 7/8 corners central: x 89–313, y 155–321. |
| `sunscar-arrival-rib-r2` | `(-1986, -7, 0.25)` | 60 samples, 6.324–6.592m, **0.268m** span; route edge **14.325m** | nearest local rock body distance **5.757m**, arrival crystal **6.081m**; no local home | arrival 6/8 corners central: x 59–231, y 111–261. It is no longer 90% off-screen, but its cap is near the HUD boundary and requires root’s native full-mesh check. |

These remain staging candidates only. If the actual imported mesh, native
projection, full support, or ordinary route rejects either row, it is rejected
without moving a source, home, or route or widening terrain.

## R2a — actual baseline and east-skirt return amendment

The original R2 numerical evidence is preserved. Root's ordinary local baseline
completed all 12 route legs in **324.20 m / 203.033 s**, with one detour,
health **3**, exact reload, **+3 fiber and +4 stone**, and no mineral-gather
claim. The start ore was outside usable gather range (`eligible: []`); source
proximity alone is not a gathering-success assertion.

The return diagonal from `(-1912,48)` to `(-1940,0)` passed too near the home
area and likely caused damage. The revised factual route inserts
`(-1916,28)` and `(-1916,10)` before `(-1940,0)`. R2a recomputes route buffers
only with that changed centerline; support, source, home, camera, and asset
poses are unchanged. The bounded grid count is correctly **472**, not 448.
See [planning-rib-probes-r2a.json](../../../art/reviews/sunscar-desert/rotation-1/planning-rib-probes-r2a.json).

This amendment does not claim a healthy no-damage route or asset admission.
Full delivered-mesh native projection/support and the revised ordinary route
remain required before any implementation.
