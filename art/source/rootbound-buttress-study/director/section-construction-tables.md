# Rootbound buttress anchor — section construction tables

This is the readable index for [`section-construction.json`](section-construction.json) v3-amended, the binding fresh-build proposal for Trial B's first shape gate. These values are inferred from one three-quarter target image, not recovered 3D truth. Positions are Blender-meter `[X,Y,Z]`; every section dimension is a **full** diameter. Trunk axes are `[X width,Y depth]`; branch/root axes are `[U width,V thickness]` in the continuous local tangent frame specified by the JSON. The held v1 and v2 tables remain beside this file for history.

## Trunk and branch paths

| Path | Point centers | Full section axes | Segment lengths m | Derived bends ° | Total m | Visible check |
| --- | --- | --- | --- | --- | ---: | --- |
| Trunk | T0 `[-.06,0,.45]`; T1 `[0,.02,1.20]`; T2 `[.12,.03,1.90]`; T3 `[.25,.02,2.50]`; T4 `[.22,.02,2.88]` | `[1.45,1.25]→[1.10,.98]→[.80,.70]→[.66,.58]→[.58,.52]` | `.753,.710,.614,.381` | `5.2,3.0,16.8` | 2.458 | T0→T3 sweeps right; T3→T4 begins return. |
| Left | L0 `[.22,.02,2.88]`; L1 `[-.18,.05,3.05]`; L2 `[-.68,.12,3.23]`; L3 `[-1.08,.08,3.55]`; L4 `[-1.28,.01,3.78]` | `[.58,.52]→[.48,.43]→[.39,.35]→[.31,.28]→[.26,.24]` | `.436,.536,.514,.313` | `4.8,22.3,13.3` | 1.798 | Shallow departure, then L2 upward elbow. |
| Right | R0 `[.25,.02,2.50]`; R1 `[.55,-.05,2.80]`; R2 `[1.05,-.15,3.00]`; R3 `[1.40,-.12,3.28]`; R4 `[1.56,-.05,3.55]` | `[.66,.58]→[.53,.46]→[.40,.35]→[.30,.27]→[.24,.22]` | `.430,.548,.449,.322` | `22.9,22.1,22.2` | 1.749 | Lower lateral departure, then R2 upward elbow. |
| Leader | U0 `[.22,.02,2.88]`; U1 `[.36,-.05,3.28]`; U2 `[.38,-.14,3.65]`; U3 `[.28,-.20,4.05]`; U4 `[.18,-.18,4.25]` | `[.58,.52]→[.47,.41]→[.36,.32]→[.28,.25]→[.23,.21]` | `.430,.381,.417,.224` | `16.4,17.6,18.3` | 1.452 | U2→U4 returns left under high lobe. |

T3/T4 and R0/L0/U0 are **skeleton controls**, not surface boundary loops. The first shape pass uses partial-arc exterior saddle transitions: at T3, carry the right path through R0/R1 controls until it reaches the existing full R1 ring after the trunk continuation and right surface have separated; at T4, carry left and leader paths through L0/L1 and U0/U1 controls until they reach their existing full L1/U1 rings after separation. Do not manufacture another mandatory neck table. The builder selects the actual safe transition boundaries and records their centers, tangent/U/V frames, full axes, vertex counts, connectivity audit, and nonintersection evidence for the next review.

For roots, retopologize only the lower collar sidewall to a 15-vertex attachment loop. Allocate two-edge root bands in azimuth order `front-left [0,1]`, `front-center/right [3,4]`, `rear-right [6,7]`, `rear-center [9,10]`, `rear-left [12,13]`; leave one-edge valley gaps `[2,5,8,11,14]`. Each root transition follows its existing point-0→point-1 direction. Close valley gaps with exterior collar/ground faces.

Every junction must be one connected exterior surface with shared vertices/faces. A duplicated parent ring, overlapping loop, internal cap, Boolean intersection, or non-manifold edge fails the first shape gate. The global envelope, skeleton points, later taper, and visible-curve requirements remain unchanged.

## Five buttress-root paths

| Root | Point centers | Full `[U,V]` axes | Segment lengths m | Derived bends ° | Total m | All-angle proof |
| --- | --- | --- | --- | --- | ---: | --- |
| Front-left | FL0 `[-.35,.28,1.20]`; FL1 `[-.85,.55,.90]`; FL2 `[-1.55,.75,.42]`; FL3 `[-2.15,.85,.08]` | `[.72,.42]→[.67,.34]→[.58,.29]→[.46,.24]` | `.643,.872,.697` | `12.0,6.9` | 2.211 | Broad outward/down left toe. |
| Front-center/right | FR0 `[.35,.30,1.28]`; FR1 `[.78,.55,.92]`; FR2 `[1.55,.65,.46]`; FR3 `[2.20,.45,.08]` | `[.78,.46]→[.72,.38]→[.61,.32]→[.50,.27]` | `.614,.902,.779` | `19.7,21.2` | 2.296 | Largest visible toe; final forward/outward turn. |
| Rear-left | RL0 `[-.48,-.35,1.15]`; RL1 `[-.95,-.72,.75]`; RL2 `[-1.55,-1.20,.30]`; RL3 `[-1.85,-1.35,.06]` | `[.62,.39]→[.57,.33]→[.49,.27]→[.40,.24]` | `.720,.890,.412` | `3.4,11.4` | 2.022 | Grounded rear/left counter-root. |
| Rear-right | RR0 `[.48,-.32,1.05]`; RR1 `[.90,-.68,.72]`; RR2 `[1.40,-1.20,.30]`; RR3 `[1.75,-1.35,.06]` | `[.60,.38]→[.54,.32]→[.46,.27]→[.39,.24]` | `.644,.835,.450` | `4.8,19.7` | 1.929 | Rounded rear/right counter-root. |
| Rear-center | RC0 `[0,-.52,1.05]`; RC1 `[.10,-1,.72]`; RC2 `[-.05,-1.45,.30]`; RC3 `[-.20,-1.75,.06]` | `[.58,.37]→[.53,.31]→[.45,.27]→[.38,.24]` | `.591,.634,.412` | `24.9,8.7` | 1.637 | Fifth grounded root, rear only if needed. |

Treat root point-0 as a skeleton anchor rather than a duplicate collar loop. Follow the closed-root-collar recipe above. No valley may become a tunnel or a gap between detached root wedges.

## First-shape gate

Inspect source-facing, rear, left, right, and three-quarter massing before canopy detail. Reject the shape if any limb is merely the chord between its first and last points, the U2→U4 return disappears, roots form a radial fin fan, or the rotating views cannot establish five grounded closed buttresses. Keep the evaluated mesh under the approved 5–6 m height, 6.2 × 5.4 m target footprint, 7 m hard lateral limit, 5,000 triangles, and one opaque material.
