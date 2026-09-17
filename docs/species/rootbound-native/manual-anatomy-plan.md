# Trailgloam manual anatomy blockout plan

**Status:** proposal only. This is a construction handoff for a later manual Blender
blockout, not a model, reference retry, TRELLIS input, rig, runtime admission, or
permission to restart the held visual visit. An independent plan review and a
`CURRENT_SLICE.md` authorization are required before construction.

## Evidence and decision

| Evidence | Use | Limit |
| --- | --- | --- |
| `art/source/trailgloam-v1/multiview/trailgloam-orthographic-v1.png` | Primary construction reference; SHA-256 `ba0b19c941f58b2468fb9aed3d62a995acedeb431fedd3e5932e5f1668da24a8`; 1536 x 1024 opaque sheet | Conditional construction-reference PASS, not mesh admission. |
| `docs/species/rootbound-native/independent-anatomy-review-v1.md` | Confirms complementary top/side evidence: six roots and three complete chains on each visible side | Front and rear each visibly establish only four feet. |
| `art/source/trailgloam-v1/rotation-1-reference/target-v2.png` | Retains the appealing low teal shell, head direction, ivory eyes, paired amber fronds, and tiny amber seam | HOLD: five traceable legs; never use it as topology evidence. |
| `docs/species/rootbound-native/TRAILGLOAM_CARD.md` | Role, mobile silhouette, two opaque fronds, six grounded legs, and future motion needs | No asset, encounter, ability, or runtime work is authorized. |

**Conclusion:** a manual anatomy blockout is a defensible *future method* because
it can build the six complementary-view chains explicitly and prove them through
neutral mesh views. TRELLIS remains unsuitable: the sheet is a multi-panel
construction reference, while the local service consumes one object image. This
plan does not claim hidden 3D truth from the sheet.

## Coordinate and scale convention

Use metres in Blender Z-up coordinates. Ground is `Z=0`; forward/head is `-Y`; right is `+X`; dorsal is `+Z`. Every table/path below uses this one convention. Blender's normal glTF export converts `(X,Y,Z)` to `(X,Z,-Y)`, making glTF Y-up and this model's forward `+Z`. Do not apply an additional axis rotation in geometry and export it twice. A future runtime admission must verify the exported front and record any required facing-yaw normalization separately; this blockout has no runtime transform contract yet.
The following values are **proposed build dimensions**, fitted to the sheet and
species card rather than recovered measurements:

- full occupied envelope including feet/fronds: `1.45 X × 1.55 Y × 1.70 Z`;
- shell only: `1.16 X × 1.00 Y × 0.62 Z`, centre `(0, 0.04, 0.72)`;
- head: `0.48 X × 0.38 Y × 0.36 Z`, centre `(0, -0.63, 0.38)`;
- target budget: at most **8,000 triangles**, one opaque matte material family
  with palette slots (charcoal, dusky teal, dark joint/hoof, amber, ivory).
  No transparency, normal maps, texture dependence, rig, collider, or animation
  is included in this blockout.

The source shows a low rounded saucer, narrower dark belly, shallow head,
chunky two-segment legs, large planted hoof-like feet, and two tall folded fronds.
It does **not** establish exact shell underside curvature, socket depth, rear
leg spacing, joint mechanics, or the far-side visual overlap. Those are the
explicit inferred choices below.

## Part hierarchy and proposed geometry

1. **Shell and belly.** Make a low-poly ellipsoid from a 12-sided UV sphere or
   four elliptical section loops. Flatten its underside to about `Z=0.43`, widen
   at the midline, and retain a darker separate belly band from `Z=0.38–0.58`.
   Do not use a sphere left at default scale: the source needs a broad,
   laterally weighted saucer with a visible dark underside rim in side view.
2. **Head and face.** Attach a faceted rounded wedge at the forward/lower shell
   centre. Its neck overlaps the shell by about 0.10 m; two small ivory eye
   discs sit high and lateral. Two tiny dark lower mouth/mandible wedges are
   optional only after the neutral massing gate; no antennae are evidenced.
3. **Six legs.** Each is a separate, visibly socketed three-volume chain:
   dark brown-grey shoulder cuff, dusky-teal angled upper/lower limb, then a
   charcoal flattened hoof. Use the attachment and path table below. Mirror
   right/left positions, but preserve the proposed fore/aft stagger instead of
   fan-arranging all three legs from one point.
4. **Dorsal fronds.** Two thick dark sockets emerge separately from the rear
   shell top. Each amber frond is a closed low-poly folded blade, not a flat
   plane, transparent membrane, wing pair, or repeated leaf scatter. Build a
   6–8-vertex tapered prism with an asymmetric outer ridge: thick base,
   broad midbody, pointed tip, about 0.08–0.12 m depth. The sheet supports two
   only; keep a visible gap between sockets.
5. **Lantern seam.** A single small inset amber triangular/short rhomboid seam
   appears on the shell side. It must remain much smaller than either frond and
   must not create a third dorsal read.

## Six-leg construction table

Coordinates list the body socket, knee/elbow control, ankle control, and planted
hoof centre. A builder may adjust only the hidden-side depth/roll needed for
nonintersection, while retaining the named source-facing attachment order,
three chains each side, planted feet, and overall envelope. Widths are full
cross-section widths; depths are full local section depths.

| Chain | Socket → elbow → ankle → hoof centre `(X,Y,Z)` | Upper / lower / hoof width × depth (m) | Source-backed visual requirement |
| --- | --- | --- | --- |
| LF front-left | `(-.47,-.38,.58) → (-.67,-.54,.36) → (-.59,-.76,.14) → (-.66,-.86,.06)` | `.19×.17 / .16×.15 / .31×.25` | Fore chain appears ahead of the side pair and lands wide. |
| LM mid-left | `(-.56,-.02,.57) → (-.79,-.10,.38) → (-.73,-.28,.15) → (-.78,-.38,.06)` | `.20×.18 / .17×.15 / .32×.26` | Middle root is separate in top and side views; do not merge it into the fore cuff. |
| LR rear-left | `(-.46,.36,.55) → (-.68,.49,.37) → (-.57,.67,.14) → (-.61,.78,.06)` | `.19×.17 / .16×.15 / .30×.25` | Rear chain resolves behind the frond sockets and lands rearward. |
| RF front-right | `(.47,-.38,.58) → (.67,-.54,.36) → (.59,-.76,.14) → (.66,-.86,.06)` | `.19×.17 / .16×.15 / .31×.25` | Mirrored fore silhouette must be separately readable from front/underside. |
| RM mid-right | `(.56,-.02,.57) → (.79,-.10,.38) → (.73,-.28,.15) → (.78,-.38,.06)` | `.20×.18 / .17×.15 / .32×.26` | Keep its root distinct from RF/RR in top view. |
| RR rear-right | `(.46,.36,.55) → (.68,.49,.37) → (.57,.67,.14) → (.61,.78,.06)` | `.19×.17 / .16×.15 / .30×.25` | Rear foot must not hide behind RR’s body outline in rear/underside proof. |

Each segment uses a 5- or 6-sided tapered prism/loft along the listed centreline,
ot a smooth cylinder. The cuff is a short independent 6-sided collar centered
on the socket-to-elbow tangent. Create each hoof as a low truncated wedge,
with its broad sole on `Z=0`; do not terminate a tube in a point or float it
above the ground. Use a small overlap/bridge at cuff-to-shell and cuff-to-upper
limb, then union or manually bridge only after the junction probe passes.

## Frond construction proposal

The source establishes separate, thick, folded amber forms at the rear dorsal
shell, but not their rear thickness. Use these inferred starting centrelines:

- left socket centre `(-.23,.22,1.00)`, right socket `(.23,.22,1.00)`;
  each has a dark 0.22 m diameter, 0.10 m high faceted collar;
- left blade centreline `(-.23,.22,1.07) → (-.32,.29,1.32) → (-.38,.26,1.55)`;
  right mirrors X. The outer edge opens only slightly away from centre, keeping
  the paired, upright silhouette rather than a wide wing span;
- section widths/depths at base/mid/tip: `.23×.12`, `.34×.14`, `.08×.08` m.
  Use an inner fold ridge offset 0.04 m toward the centreline. Taper to a point
  through a final small triangular cap.

At least 0.10 m clear shell should remain between socket outer edges. From a
front view both fronds must originate from different sockets; from side and
rear their thickness must be visible as faceted volume.

## Build order and low-cost topology probe

1. Build an untextured shell, belly, head, six separate chains/hooves, socket
   collars, and two closed fronds with flat colour IDs. Keep all pieces separate
   and named (`shell`, `belly`, `head`, `LF_*`…`RR_*`, `frond_L/R`).
2. **Cheap junction probe before whole-asset joining:** make one 0.25 m shell
   patch with two adjacent five-sided cuff loops at the LF/LM spacing. Use
   explicit boundary-loop bridges into separate shell patch loops, then run
   Blender non-manifold and face-normal checks. Render the probe from top,
   side, and underside. It passes only if cuff bases are visibly distinct,
   there are no overlapping internal faces/non-manifold edges, and both limb
   centreline planes can bend without clipping through the shell. If it fails,
   retain separate intersecting massing pieces for Gate A and choose a real
   manifold bridge recipe before detailed construction; do not hide the defect
   beneath a dark material.
3. After the probe, construct all six socket bridges using the same named
   loop/patch pattern; retain slightly inset cuff rings, not one copied full
   shell ring for three children. Add the frond collars as two independent
   loop bridges. Use Blender 4.5’s native mesh edit/bridge and viewport
   inspection; the installed Blender-MCP guidance supports live inspection,
   but it supplies neither anatomy nor locomotion.
4. Run untextured massing gate before eyes, seam, bevels, UVs, rigging, or
   exporter work. Only a reviewed Gate A can authorize the small detail pass.

## Target-to-proof table

| Defining target shape | Construction operation | Required review view | Visible failure |
| --- | --- | --- | --- |
| Low broad saucer with dark lower rim | flattened section-loft shell plus separate belly band | left/right orthographic | round upright beetle, thin sheet, or no underside rim |
| Six independent grounded chains | six named cuff/loft/wedge chains using the table | top, front, rear, underside, both sides | fewer than six traceable socket-to-sole paths, merged roots, or floating feet |
| Three roots per side | fore/mid/rear socket spacing and stagger | each side plus top | fan from one socket or an occluded/missing middle leg |
| Two thick socketed amber fronds | separate collar loops and closed folded prisms | front, rear, side, three-quarter | flat wings, merged base, third frond/seam confusion, or paper-thin edge |
| Low-body/tall-frond mobile read | full silhouette at 96 and 48 px | source-facing three-quarter and game-scale neutral render | fronds disappear, body reads as generic crab, or feet/fronds obscure each other |
| Grounded chunky feet | separate flattened hoof wedges at `Z=0` | underside and side | pointed tube ends, feet above floor, or soles penetrating deeply |

## Gates and non-goals

**Gate A — untextured blockout:** separate neutral front, rear, left, right,
top, underside, and source-facing three-quarter renders. A reviewer verifies
six complete chains, three per side, two fronds/two sockets, grounded feet,
nonintersection, and the saucer/frond silhouette. This is where the sheet’s
front/rear occlusion is resolved by actual geometry.

**Gate B — game-size/export candidate:** after a separate authorization,
inspect the exact model at 48 px and 96 px, all-angle neutral views, triangle
and material counts, opaque mobile-safe material, and proposed collider scale.
A future rig/motion gate must separately prove idle and six-leg walk contact;
this plan gives no rig hierarchy or animation permission.

Do not use the sheet as a TRELLIS collage, reuse held beauty reference topology,
substitute four legs plus hidden duplicates, flatten fronds to alpha cards,
attach all limbs through one shared shell ring, add scenery/roots/mushrooms,
or begin runtime/species work. If any of the six roots or all-angle gates cannot
be achieved within the stated envelope, retain a specific HOLD and report which
view/attachment is unresolved rather than inventing anatomy.

## Guidance actually applied

The project `asset-modeling-director` skill requires evidence/inference
separation, explicit form operations, a pre-asset junction probe, and named
all-angle/game-size failure checks. `wildkin-asset-forge` requires the local
manual route to retain editable source and neutral multi-angle review; its
TRELLIS notes forbid using this multi-panel sheet as a one-file generator input.
Its Blender 4.5 anatomy guidance contributes the requirements to establish
left/right, head-forward, grounded soles, distinct joint planes, and neutral
front/side/rear evidence before any rigging. Those requirements are adapted
here for a six-legged stylized beetle; quadruped/Rigify-specific advice is not
being applied.
