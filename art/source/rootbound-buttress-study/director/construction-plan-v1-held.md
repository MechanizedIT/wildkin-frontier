# Rootbound buttress-canopy anchor — fresh construction plan

**Status:** builder handoff only. This plan is intentionally independent of the
held `rootbound-buttress-v1` candidates. It defines one new, manual construction
attempt from the approved reference; it does not approve a mesh, collider, GLB,
or runtime placement.

The asset is a compact, rooted Wildwood anchor for the selected Lantern Hollow /
Thornstone circuit. At normal portrait scale it must read first as a planted,
warm buttress base carrying a forked trunk, then as three deliberately separated
canopy masses. It frames an edge and leaves the route readable. It is not a
Heartroot Crown, a bridge, a shelter players enter, a giant world landmark, or a
new tree family.

Read the exact source and binding review in
[`reference-manifest.json`](reference-manifest.json) before construction. The
builder must make a fresh editable source; no geometry, topology, script, scene,
render, or export may be copied from `rootbound-buttress-v1/candidate-v1` through
`candidate-v3`.

## Measured reference reading

The target is a 1214 × 1295 px opaque RGB image, a three-quarter perspective
view on white. The following normalized coordinates are measurements of visible
screen-space landmarks, not recovered orthographic dimensions. They give the
builder a stable source-facing comparison while avoiding false precision about
the unseen side.

| Visible observation | Approx. normalized location / span | Confidence | Construction consequence |
| --- | --- | --- | --- |
| Ground-contact silhouette | `y=0.92–0.95`; x spans `0.18–0.85` | observed | Make five distinct, grounded toe termini; the widest visible root spread is about 0.67 of image width. |
| Rooted lower mass | `y=0.61–0.94`; broadens from a narrow waist near `y=0.65` to the root toes | observed | The trunk does not sit on a flat stump. Its lower 35% must flare continuously into buttress sheets. |
| Central trunk | centerline leans from `x≈0.51` at ground to `x≈0.57` near `y=0.31` | observed | Use a subtle rightward S-lean and rotation through the shaft; do not use a vertical cylinder. |
| Major fork junction | `x≈0.55, y≈0.39–0.48` | observed | Join limbs into a continuous fork collar, with no rod-like branches penetrating a separate trunk. |
| Left major limb | leaves trunk around `y≈0.48`, travels up-left to the canopy around `x≈0.26, y≈0.30` | observed | It is a structural limb, thick at the junction and visibly supporting the left lobe. |
| Right major limb | leaves trunk around `y≈0.52`, travels up-right to `x≈0.77, y≈0.42` | observed | Keep the right limb lower and more horizontal than the top fork so the silhouette stays asymmetric. |
| Top leader/fork | rises through `x≈0.55–0.60`, ending under the high canopy near `y≈0.08–0.22` | observed | Preserve a narrower upward structural direction, not a fourth broad crown pancake. |
| Negative-space window | irregular opening between left limb, central trunk, and right limb, roughly `x=0.38–0.65`, `y=0.39–0.58` | observed | This is a required readable window. Do not fill it with foliage or a solid sheet. |
| Canopy lobes | left `x≈0.04–0.49/y≈0.25–0.54`; high `x≈0.37–0.77/y≈0.02–0.35`; right `x≈0.60–0.97/y≈0.28–0.57` | observed | Construct three separate, uneven volume groups with daylight gaps, rather than leaf cards or one fused blob. |
| Rear root depth, rear branches, canopy underside, exact cross-sections | absent or occluded | inferred only | Make plausible volume and support from every side, but never claim they were copied from the target. |

The source’s visible height-to-width ratio is approximately 1.7:1. A legal
5.6 m model therefore needs a source-facing visible mass around 3.3–4.2 m wide,
while the deliberately deeper unseen root and canopy forms can use the allowed
6.2 × 5.4 m target footprint. The wider footprint is a design envelope, not a
license to make a 7 m flat front silhouette.

## Fixed asset contract

Use Blender coordinates for authoring: **Z up**, **X left/right in the
source-facing front view**, **Y depth**. Export normalization and the runtime
axis conversion are later builder tasks; do not bake a runtime placement into
the source.

- Total measured height: **target 5.6 m**, acceptable 5.0–6.0 m.
- Evaluated X/Y footprint: **target ≤6.2 × 5.4 m**, hard maximum **7.0 m** on
  either lateral dimension. Keep the densest solid lower mass within roughly
  3.0 × 2.6 m.
- One opaque matte material; a warm umber trunk/root family and restrained
  dark, moss, and yellow-green foliage values may be supplied by vertex color or
  palette variation inside that one material. No texture detail is required.
- At most **5,000 triangles**, with a target allocation of 1,250–1,550 for the
  joined root/trunk/fork structure, 1,600–2,000 for the three canopy groups,
  500–750 for internal support-visible branch transitions, and at least 300
  triangles of reserve for corrections. The budget is not a reason to make thin
  roots or flat foliage.
- Make one compact lower-mass collider proposal only after the mesh has passed
  visual review. It may cover the genuinely solid trunk and inner buttress mass;
  it must not cover the crown, outer toe tips, or imply gaps between buttresses
  are walk-through arches. Runtime fit and protected-clearance validation are
  separate gates.

## Fresh form hierarchy and dimensional intent

All depth figures below are **inferences for a buildable object**, deliberately
separate from the measured front view.

1. **Closed lower root mass — five unequal buttress roots.** Start from a
   1.35 × 1.15 m irregular, 9–10-sided trunk base at Z=0. Let it become a
   1.25–1.45 m wide lower collar by Z=0.55. Create five root trajectories,
   each beginning as a broad part of that continuous collar, not as an object
   merely intersecting it:

   - front-left: 2.35 m reach, 0.72 m maximum visible width, 0.26–0.36 m thick;
   - front-center/right: 2.50 m reach, 0.78 m width, 0.30–0.42 m thick; this is
     the largest readable toe;
   - far-left: 2.15 m reach, 0.62 m width, 0.24–0.34 m thick;
   - far-right: 2.05 m reach, 0.60 m width, 0.24–0.34 m thick;
   - rear counter-root: 1.65–1.90 m reach, partly hidden but broad enough to
     stabilize the rear view.

   Each root should rise into the collar to Z=1.15–1.55 m, then slope down in
   two or three broad plane changes to a rounded, faceted toe at ground level.
   Preserve narrow dark seams between adjacent buttress faces only as shallow
   surface valleys; close them at ground and trunk so no arch or tunnel appears.

2. **Twisted trunk shaft.** From the collar, loft an 8–10-sided, hand-offset
   sequence of elliptical loops. At Z=1.35 use about 1.05 × 0.92 m; at Z=2.65
   taper to 0.72 × 0.62 m; at Z=3.25 use 0.58 × 0.52 m. Rotate successive loop
   axes 8–15 degrees and shift their centers a total 0.28–0.40 m toward the
   source-facing right from lower shaft to fork. Flatten a few selected loop
   sides into wide planes rather than triangulating a smooth tube uniformly.
   The shaft should retain enough depth (0.52 m minimum at the fork) to survive
   the side render.

3. **Three joined major structural directions.** Build forks by splitting and
   bridging actual trunk-loop regions, then lofting from those shared necks.
   They may begin as low-resolution curves only for blockout; convert to
   connected mesh cross-sections for final geometry.

   - **Left limb:** neck at Z=2.65–2.90, 0.55 × 0.48 m; travel 1.55–1.85 m
     toward X− and 0.15–0.45 m toward rear while rising to Z=3.75–4.05; taper to
     0.26 × 0.24 m before entering the left canopy. Give it one shallow elbow,
     not a straight diagonal rod.
   - **Right limb:** neck at Z=2.45–2.75, 0.52 × 0.44 m; travel 1.35–1.65 m
     toward X+ and 0.10–0.35 m toward front while rising only to Z=3.45–3.75;
     taper to 0.24 × 0.22 m. This lower limb makes the right lobe read as a
     counterweight rather than a mirrored branch.
   - **Upper leader:** continuation/split from Z=3.05–3.35, 0.45 × 0.40 m;
     rise 1.25–1.55 m toward X+0.25–0.45 and Y−0.10–0.25, tapering to a
     0.20–0.24 m attachment under the high lobe. It may split once near its tip
     into two short supported stubs, but neither may be a dangling spike.

   Keep the source-facing window at least 0.70 m wide and 0.85 m tall when
   projected from the source-facing camera. The branch system must remain
   visibly continuous in the rear and three-quarter renders; add only short,
   subordinate support stubs where a canopy lobe otherwise floats.

4. **Three faceted canopy groups, each made of connected volumes.** Place each
   group above the walking line: lowest underside at Z=3.15 m, except a few
   restrained tips permitted down to Z=2.95 m if they do not occlude the fork
   window. Use 2–4 overlapping, welded or deliberately interlocking irregular
   low-poly hulls per group. Each hull needs real 0.45–0.85 m depth, not a flat
   leaf plate. Start from hand-edited 6–9-sided cross-section rings or low-poly
   icosphere blockouts, then reshape vertices into lumpy, gravity-aware masses
   with a few downward lobes. Delete or cut back faces that close the branch
   windows.

   - **Left lobe:** approximately 2.0 × 1.5 × 1.25 m, center Z=3.80–4.05;
     extends farther X− than the other lobes and terminates in two staggered
     lower lobes. It must visibly originate from the left limb.
   - **High lobe:** approximately 2.25 × 1.65 × 1.55 m, center Z=4.65–4.85;
     tallest, offset slightly X+ and rearward. Its upper contour is the dominant
     peak, but it should not become a flat horizontal platter.
   - **Right lobe:** approximately 1.90 × 1.45 × 1.20 m, center Z=3.75–4.05;
     lower than the high lobe and supported by the right limb. Preserve daylight
     between it and the central trunk/leader from the front three-quarter view.

   Use a dark interior/deep-green underside value, moss midtone, and a few
   yellow-green upward planes. Those values should follow structural planes and
   lobe direction, not become leaf-by-leaf noise.

## Required mesh operations

1. **Blockout:** draw the front-view silhouette first from editable, broad
   low-resolution root ribbons, trunk loops, limbs, and three canopy hulls.
   Primitive spheres/cylinders can establish volume only at this stage.
2. **Root-to-trunk continuity:** duplicate/derive the lower trunk loop edges
   into each root's upper cross-section, bridge successive flattened loops down
   the root, and merge the resulting strips into the closed collar. Alternate
   root ridge directions and toe rotations so they are visibly unequal. Avoid
   Boolean-cut gaps and avoid five detached wedge meshes touching a stump.
3. **Trunk and forks:** loft the offset loop chain; split shared faces at each
   fork and bridge the new branch rings into the shaft. Hand-adjust junction
   vertices to create a flared collar and a visible compression plane on the
   inside of each fork. Use planar edge routing that follows growth direction.
4. **Canopy:** create the three groups as low-density, closed irregular hulls
   with intentional concavities. Join only nearby hulls within the same lobe;
   retain clear physical gaps between the three lobe groups. Seat each hull over
   a visible branch stub by at least 0.18 m of overlap, then merge or visibly
   collar the connection—never leave a canopy floating in the side render.
5. **Faceting:** final planes should come from sparse, purposeful loop/ridge
   placement and flat/split normals where appropriate. Do not fake the
   reference's faceting with random decimation, noise displacement, or a bark
   texture.

## Gates the builder must show before detail or export

### Gate A: untextured massing

Before palette work, provide neutral front, rear, left, right, and three-quarter
renders of the actual fresh mesh. The source-facing three-quarter must show all
five root toes, the trunk's rightward lean, the left/right/upper structural
directions, three separate canopy groups, and the central negative-space window.
The rear and side views must show substantial depth, real fork attachments, and
a closed root base. A flat front cutout, a radial starburst, or canopy volumes
that become discs from the side fails this gate.

### Gate B: exported-game-scale proof

Only after Gate A may the builder assign the one opaque matte material and
export. Record evaluated mesh bounds, exact triangle count, material count,
origin/orientation, and ground-contact points. Render the exact exported asset
at neutral front/rear/left/right/three-quarter/ground-contact views and at 48 px
and 96 px. Separately place it in the normal frozen Destination portrait camera
without changing terrain, collision, or route. At 48 px the base must still
read wider than the trunk, and the canopy must remain three clustered masses
rather than a featureless green ball.

An independent reviewer, not this plan author or builder, judges both gates.
Passing either gate does not admit the asset to the registry or runtime.

## Target-specific failures and their repairs

| Do not ship this shortcut | Why it fails this target | Required repair |
| --- | --- | --- |
| A tapered cylinder planted into five separate triangular wedges | It recreates a stump/starburst and loses the reference's continuous lower mass. | Derive buttress strips from the trunk collar and bridge their loops into one closed base. |
| Straight rods intersecting a trunk | Major limbs look attached by collision rather than growth and fail side/rear support. | Split shared trunk faces and loft tapered, bent branch rings from flared fork collars. |
| Three icospheres, spheres, or flat leaf cards near branch tips | It reads as generic foliage, collapses in silhouette, and can fill the important branch window. | Shape connected, deep faceted hulls with lower lobes, gaps, and visible supporting stubs. |
| A single opaque green canopy shell | It erases the three-lobe hierarchy and makes a tunnel-like dark ceiling. | Keep left, high, and right canopy masses structurally separate with daylight gaps. |
| Razor-thin root fins or intentional voids between roots | They fail ground-contact honesty and invite a false walk-under route. | Give each root 0.24 m or greater useful thickness and close the lower collar. |
| Random bark noise, leaf veins, alpha cards, glow, or a second material | It is outside the matte, low-poly, mobile-ready contract and masks weak form. | Use sparse geometric planes and palette variation inside one opaque material. |

## Community-skill adaptation and handoff boundaries

The forthcoming builder may use the current community modeling guidance as a
process aid only. Its useful contribution here is staged function/form/runtime
gating: define the static prop envelope, construct a real volume, prove neutral
views before export, and inspect the production camera separately. The
project's `wildkin-asset-forge` guidance supplies the controlling asset loop:
fresh editable source, all-side and game-scale evidence, separate builder and
reviewer, offline GLB only after a passed model review.

This plan overrides generic room/prop defaults where they conflict: do not make
a room shell, Boolean openings, a floor plan, lighting rig, paid Meshy request,
external service call, shader/wind system, LOD family, or runtime integration.
Do not use a generic tree generator as final geometry. There is no approval to
use TRELLIS or to recycle old held candidate geometry. The two planned community
skill trials are sequential fresh constructions; this exact plan is their common
target and remains unchanged unless the owner deliberately issues a new target.

## Builder completion packet

Return only fresh candidate evidence: editable source path, GLB path, mesh and
material counts, evaluated bounds, origin/orientation, fresh neutral and
game-scale renders, collider proposal, and a short variance note identifying
which inferred rear/depth choices were made. The reviewer should reject a
candidate that claims source fidelity for inferred hidden geometry, fills the
visible window, exceeds the envelope/budget, or offers old candidate evidence.
