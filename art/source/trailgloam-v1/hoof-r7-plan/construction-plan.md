# Trailgloam R7 hoof-only repair plan

**Status:** planning input for independent review. This is a focused replacement of
six R6 hoof meshes only. The retained R6 master, all leg links and cuffs, body,
head, eyes, fronds, part transforms, and R6 parameters remain the source of
truth.

## Evidence and goal

The [R6 visual review](../full-r6/visual-review.md) retains the low teal
saucer, articulated legs, forward head, pale eyes, and amber fronds, but calls
the six near-black cuboid hooves the dominant visual debt. The actual
[front](../full-r6/candidate-r6/front-512.png), [side](../full-r6/candidate-r6/left-512.png),
[underside](../full-r6/candidate-r6/underside-512.png), and
[three-quarter](../full-r6/candidate-r6/three-quarter-512.png) views show why:
the old `.58 × .52 × .48m` boxes form a dark frame wider than the terminal
leg geometry. The repair aims for smaller-looking, tapered, six-faceted pads.
It does not attempt literal target recovery, new claws, or a different animal.

## Frozen inputs

`parameters.json` pins R6 `parameters.json` SHA
`cc4e081fda9efca9792d3e336133e1413360c57b1ac8acfe263a64de35d3b3e0` and the
R6 renderer SHA `489e6c71dbed5eff6accb503e297e39c82beee1e2a661393d9a0d538ff327453`.
The pure CPU handoff is `cpu-feasibility.py::build_replacement_hooves(parameters)`.
It imports the retained R6 literal construction only to read each named
terminal `*_cuff2` end ring; it returns six new literal closed pads plus their
source host rings. It makes no Blender data and does not mutate the R6 source.

## Replacement geometry

For each `LF`, `LM`, `LR`, `RF`, `RM`, and `RR`:

1. Read the six actual vertices of that matching R6 terminal cuff's `end`
   ring and its actual cuff axis. These are the only upper-foot source points;
   no world-aligned foot box is supplied.
2. Expand each cap vertex radially in its local XY direction by `.032m`.
   Copy that expanded ring `.012m` in both directions along the actual cuff
   axis. These two rings make a short, closed six-sided socket around every
   source cap vertex.
3. From the lower socket, transition to a six-sided waist at `Z=.075m`, then
   a six-sided sole at `Z=0`. Both use the matching measured radial directions,
   are offset only `.035m` along the final leg's outward XY tangent, and taper
   to `.88` and `.76` of the expanded socket's mean radial size.
4. Bridge matching edges ring-to-ring and triangulate the top and sole caps
   separately. Run the shared outward orientation pass on every triangle.

Each pad has 24 vertices and 44 triangles. The CPU result puts all six pads in
`x [-1.07745, 1.07745]`, `y [-1.10498, 1.03498]`, `z [0, .37040]`; this reduces
the visible foot footprint and height from the old `.58 × .52 × .48m` cuboid
per foot while keeping a broad, grounded faceted base. The current aggregate
replacement envelope is `2.15489 × 2.13997 × .37040m`; it is smaller than R6's
full `2.34 × 2.27 × 1.64290m` envelope and cannot enlarge the creature.

The pad material is deliberately lighter charcoal-teal: linear
`(.095,.19,.20,1)` for the body of the pad and `(.14,.29,.29,1)` for selected
outer facets. It remains darker than the teal body while avoiding the opaque
black silhouette frame seen in R6.

## Measured contact and topology proof

The source cap ring is *inside the pad's closed local socket*, with six source
vertices, `.032m` radial clearance and `.012m` clearance on either side along
the actual cuff axis. This is measured per named leg in
`cpu-feasibility.json`; it is more relevant than treating the entire tapered
pad as a convex host. Every sole ring has both minimum and maximum `Z=0`.

The executable proof reports all six pads closed and outward with zero
boundary edges, zero nonmanifold edges, zero degenerate faces, finite vertices,
and positive per-pad outward centroid-dot checks. These checks are planning
proof only. The builder must repeat actual Blender topology, directed-edge,
normal, cuff-socket, sole-plane, and exact-R6-component-parity checks before
renders.

## Build order and review gates

1. Load the pinned R6 source and compare every retained non-hoof object's
   vertex coordinates, polygon indices, material assignment, and transform
   against R6 before and after replacement.
2. Call `build_replacement_hooves` directly. Do not retype or simplify its
   returned vertices into cubes, cylinders, claws, or fused legs.
3. Materialize only the six `*_hoof_r7` meshes; delete/replace only the six
   old hoof objects in a derived R7 scene.
4. Audit actual triangles, six full cuff cap ring/socket contacts, and all
   `Z=0` sole vertices before the same seven neutral R6 review views at
   512/96/48.

The repair passes visual review only when the six pads remain grounded and
legible from underside while no longer framing the body with oversized black
blocks at 48 and 96 pixels. HOLD if a socket opens, a sole lifts, or the small
views still read as block feet. No runtime, collider, rig, animation, bake, or
admission work follows from this plan.