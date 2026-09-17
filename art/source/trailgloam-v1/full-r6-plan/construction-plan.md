# Trailgloam full R6 construction plan

**Planning only.** This is one future full candidate, not another R5 probe. It
uses Blender metres, `Z` up, head toward `-Y`, right `+X`; all dimensions are
chosen construction values, not recovered orthographic measurements.

## Source and method

The six-view [orthographic sheet](../multiview/trailgloam-orthographic-v1.png)
(SHA `ba0b19c9…8da24a8`) shows the required low teal saucer, forward head,
six bent grounded legs, paired amber dorsal fronds, and pale eyes. R5’s
[actual review](../method-probe-r5/visual-review.md) passes the closed
cuffed-chain method but holds its tall dark collar and tiny blade. R6 reuses
that proven primitive recipe: each link, cuff, hoof, collar, blade, head, eye,
and shell is a separately closed solid; opaque overlaps are deliberate.

`parameters.json` is the literal builder input. It defines six named chains
`LF/LM/LR/RF/RM/RR`, each with three six-sided taper prisms, three six-sided
cuffs, and a closed hoof wedge. Their fourth point is raised to `.22m` and the
`.58×.52×.48m` hoof encloses the complete final cuff cap while retaining a
sole at `Z=0`. This yields a proposed total `2.34×2.27×1.643m` envelope.

The saucer is a closed 8-sided six-ring loft. The closed six-sided head prism
runs from `(0,-.38,.67)` into `(0,-.74,.48)` and is measured inside the shell
at its root. Two pale ivory closed eye prisms sit on the head. They are small
but separate named solids, not a texture implication.

## Frond repair

Each integrated short collar starts at `(+/- .18,.16,1.04)` and ends at
`(+/- .25,.22,1.22/.23)`, radius `.11m`: a low socket, not the R5 tower. Each
closed folded blade begins inside its own collar and has a broad outer middle:
left centerline `(-.22,.19,1.13)→(-.48,.26,1.38)→(-.64,.21,1.62)`, widths
`.18,.42,.07m`; right mirrors only approximately, ending at `(.60,.20,1.57)`,
widths `.18,.39,.07m`. Thicknesses `.13,.17,.08m` and `.13,.16,.08m` keep both
blades volumetric. These are inferred depth choices fitted to the visible pair,
not hidden-target facts.

## Executable CPU proof

Run `python cpu-feasibility.py` before Blender. It imports the reviewed R5
literal closed-solid routines, builds all planned solids, audits closure,
winding, finite triangles and actual bounds, checks every cuff’s adjoining end
rings, every hoof’s complete final cuff cap ring, head root, collar root and
blade root contacts. It also rasterizes actual planned triangles into an
orthographic 256px z-buffer from front and rotated three-quarter directions;
each blade must expose at least 120 pixels. The current receipt reports 1048/
921 front and 942/531 three-quarter blade pixels, all contacts, closure, and
sole checks passing. The script is reusable by the builder; Blender must still
repeat its real mesh topology and render checks.

## Build and gates

1. Load UTF-8 `parameters.json`; run the CPU proof and pin its hash.
2. Build literal arrays from the same routines. Preserve the six chains,
   closed cuffs and hoof rings; do not replace them with rods, boxes, or a
   fused/open shell.
3. Audit actual Blender arrays/indices, all closures, directed edges, outward
   winding, contact pairs and `Z=0` soles before rendering.
4. Render front, rear, left, right, top, underside and rotated three-quarter
   at 512/96/48. Gate-A must show six grounded feet from underside, three
   substantial chains on each matching side, a readable forward head/eyes, and
   two exposed broad amber folds. A hidden blade, collar stalk, open cuff, or
   numerical-only contact is HOLD.

No GPU, Blender build, export, rig, collider, runtime, or gameplay work is
approved by this plan. The full candidate needs independent plan and source
review first.

## Refactor evidence and current HOLD

`cpu-feasibility.py` now exposes `build_parts(d)`, returning the literal part
list plus leg/frond contact records and shell/head/eyes for the Blender builder.
The pre-refactor script and receipt are preserved in `pre-refactor-v1/`.
The rerun initially recorded identical bounds and frond exposure, but the
later root-anchor inset deliberately regenerates affected first-link/cuff
contacts. It preserves bounds and frond exposure; it does not claim the old
cuff/hoof contact subset remains identical after those altered tangents.

The newly required root-ring check exposes a real unresolved contact: only LM
and RM first-link rings are fully inside the current saucer. LF, LR, RF and RR
have outward half-space margins `+.01261, +.00734, +.01002, +.01023m`.
Both eye base rings pass inside the head (`-.01796m`). The CPU proof therefore
sets `all_contacts=false`. This plan is **HOLD** for source correction; do not
build or silently move the failed legs from this version.

## Root-anchor inset repair v2

The pre-adjustment parameters/proof are preserved in `pre-root-inset-v1/`.
A bounded CPU bisection moved only the first XY anchor of the four failed
chains toward `(0,0)`, testing the actual generated six-vertex root ring against
the saucer halfspaces after the changed first-link tangent also regenerated its
cuffs. No other leg point, hoof, head, collar, frond, or visual-gate dimension
changed. The search required the full root ring to be at least `.003m` inside:

| Leg | Original XY | Inset | Adjusted XY | Root-ring margin |
| --- | --- | ---: | --- | ---: |
| LF | `(-.48,-.37)` | `.01486063m` | `(-.46823023,-.36092747)` | `-.00300000018m` |
| LR | `(-.48,.34)` | `.00952721m` | `(-.47222556,.33449311)` | `-.00300000030m` |
| RF | `(.48,-.37)` | `.01234478m` | `(.47022281,-.36246342)` | `-.00300000013m` |
| RR | `(.48,.34)` | `.01223843m` | `(.47001315,.33292598)` | `-.00300000022m` |

All insets are below the authorized `.08m` cap. The CPU rerun passes complete
contacts and closure; bounds remain `2.34×2.27×1.6429046m`, and actual-triangle
frond exposure is unchanged at front `1048/921` and three-quarter `942/531`
pixels (L/R). The unused `frond_min_visible_area_ratio` field was removed; the
measured 120-pixel gate remains. This is a proportion-preserving planning
repair, not a candidate build. Independent review remains required.
