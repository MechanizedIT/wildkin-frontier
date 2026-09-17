# Sunscar weathered rib V1 — construction plan

**Status: proposed builder input.** An independent technical plan review must
PASS the frozen `geometry-plan.json` before any Blender construction. This plan
makes one static opaque prop; it does not admit an export, collider, registry
entry, or placement.

## Reference and scale

The sole reference is `reference/weathered-rib-target-v1.png` (SHA-256
`157070274fef13f6449840c9acfdce4ec660d50e84d1244e74a3b7c3dd2a5529`). It
visibly shows one grounded sandstone body: a high asymmetric left shoulder,
a long descending cap, shallow stratified ledges/gullies, and blunt ends. It
does not reveal hidden depth or topology; those are declared inferences.

Use Blender axes X long, Y depth, Z up. The declared full envelope is **4.4 m
X × 2.1 m Y × 1.6 m Z**. This reconciles the old broad feasibility band with
the selected low-rib role: 2.1 m depth gives actual body volume, while 1.6 m
height keeps the cap below a landmark read and the portrait HUD. It is a
projection-aware design choice, not a measurement from perspective pixels.
Blender’s normal GLB export converts Z-up to glTF Y-up; audit exported bounds
rather than manually swizzling source vertices.

## Connected construction recipe

Build a single closed 8-vertex-per-ring loft from the seven stations in
`geometry-plan.json`. Every ring has the same ordered perimeter: front-bottom,
front-low, front-upper, front-crown, rear-crown, rear-upper, rear-low,
rear-bottom. Scale the normalized loop coordinates by each station’s declared
depth and height, bridge like-indexed vertices, cap both end rings, and keep all
bottom vertices on Z=0. This supplies one continuous, grounded volume before
any weathering.

The high shoulder is station 1 (`X=-1.72`, 1.60m) and must visibly exceed the
right end (station 6, 0.84m). The cap then steps/descends across stations 2–6;
a single level box or tube fails. Create the upper cap and front bedding ledge
by **insetting and shallowly extruding existing loft faces**, then triangulate
those faces into deliberate low-poly planes. Create gullies by moving/splitting
existing side vertices inward. Do not stack detached slabs, overlap rock boxes,
boolean a cave, or hide an unconnected low-poly cloud under one material.

One opaque warm ochre/sienna sandstone material is allowed. Use flat-shaded
facets and small value variation from geometry-facing bands, not additional
materials, glow, crystals, vegetation, UV texture work, or moss.

## Build and review gates

1. **Cheap method probe:** in an isolated unsaved test mesh, execute one
8-sided two-station loft and one inset/extruded band. Confirm every edge has
two faces, both end caps close, and the band shares vertices with its host.
This tests the chosen construction operation; it is not an asset candidate.
2. **Massing:** build the declared seven-station shell, then render source
three-quarter, front, rear, left, and right untextured views. Confirm actual
bounds remain within 4.4 × 2.1 × 1.6 m and triangle count stays below 450
before optional facet splits.
3. **Faceting:** apply only the connected cap/ledge/gully operations in the
machine input. Re-audit one connected component, manifold closure, grounded
base, one material, ≤700 triangles, and exported GLB bounds.
4. **Independent review:** at source three-quarter, the left shoulder must be
higher and the long cap must descend continuously to a blunt right end. In side
views, body depth must remain substantial rather than a front-facing cutout.
A reviewer, not the builder, decides this gate.

| Defining shape | Required operation | Review view | Visible failure |
| --- | --- | --- | --- |
| high left shoulder | station-1 1.60m ring in connected loft | source three-quarter + left | equal-height box or isolated peak |
| long sloping cap | seven-station descending crown path + connected inset cap | source three-quarter + side | level top or short central pile |
| stratified read | connected front-band inset/extrusion | source three-quarter | detached slabs or texture-only stripes |
| erosion planes | inward vertex moves/split planar side faces | front + right | smooth tube or uniform noise |
| blunt ends and grounding | capped end rings; all bottom ring points Z=0 | rear + ground-level side | open end, floating edge, arch/cave gap |

The prior contour-informed guidance contributes the requirement for real
closed volume, source-facing and all-angle gates, and explicit connected
surfaces. Blender 4.5 guidance contributes the tiny isolated method probe and
actual scene/export audit. The current project contract overrides any unrelated
rigging, shader, wind, LOD, TRELLIS, or runtime work.
