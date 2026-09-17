# Ironspine narrow rockbank V1 — builder construction plan

## Scope and frozen inputs

This is a **construction plan only** for one proposed Ironspine arrival-bank asset. It creates no GLB, physics shape, runtime record, terrain edit, or placement admission. The separate builder may start only after independent plan review passes; root separately owns later hull support, native projection, collision, and resident-lifecycle proof.

The authoritative envelope is **3.600 m local X × 1.000 m local Z × 2.000 m local Y**. It comes from the V2 construction target and placement envelope, not perspective recovery. The full literal mesh is frozen in [construction-data.json](construction-data.json); its numerical closure and bounds are in [plan-proof.json](plan-proof.json). The data file freezes SHA-256 identities for the V2 target, its review and provenance, the placement envelope, and the Ironspine implementation brief.

## What is observed and what is proposed

Observed from the approved reference: one compact, opaque, grounded, elongated iron-grey rock mass; a high left shoulder that falls through three or four broad broken strata toward a lower right end; a narrow end profile; a shallow, uneven crown; and blunt closed ends. The reference explicitly rejects masonry courses, detached blocks, a retaining-wall stair, deep cuts, holes, and vegetation.

The exact hidden depth, back profile, local facet positions, and every ledge break are **proposed geometry**, not recovered 3D facts. The chosen seven X stations use three interrupted shelf bands and continuous transition faces. They make a single naturally irregular bank rather than a stack of objects. The high shoulder is at local X −1.32; the crown declines to local X +1.80.

## Measured construction contract

`construction-data.json` stores 63 literal local vertices and 122 literal triangles. Each of the seven stations has one ordered 9-vertex profile:

`frontFoot → lowerFaceTop → lowerShelfRear → middleFaceTop → middleShelfRear → upperFaceTop → upperShelfRear → backCrest → backFoot`.

The six station spans form all long surfaces. Each end is independently triangulated from its own 9-vertex concave boundary and stored as seven explicit triangles. Do **not** run `triangle_fill`, do not fill both ends together, and do not replace the cap triangles with a hand fan. The stored topology is one closed connected manifold: every edge is used twice, no stored triangle has zero area, and its signed volume is positive (see plan proof).

The local origin is the flat-base reference. To consume the measured support envelope, set the future object origin to world Y **8.880348675115647** and retain local Y −0.380 through +1.620. The 0.380 m buried lower margin exceeds the measured 0.34635196794168976 m terrain span by 0.03364803205831021 m at the highest sampled support. This is a conservative construction contact assumption, not an admission or final collision claim. Root must still test the finished hull against the actual terrain and route.

## Blender recipe (Blender 4.5.3)

The local tool record identifies Blender 4.5.3 and the installed Blender MCP 1.9.1; this plan uses only the stable direct mesh API described by their local guidance. In a fresh builder-owned scene:

1. Load UTF-8 `construction-data.json`. Create exactly one mesh with `mesh.from_pydata(vertices, [], faces)` using the stored vertex order and faces; do not use cubes, boolean unions, geometry nodes, or separated ledge objects.
2. Create exactly one opaque `MeshStandardMaterial`: roughness `1`, metalness `0`, transparency disabled, flat shading enabled. Apply the four frozen iron-grey palette values only as restrained per-face vertex colors after topology proof. Add no textures, normals, reflections, moss, or procedural displacement.
3. Run `mesh.validate(verbose=True)` without destructive topology changes, update, and use `bmesh.ops.recalc_face_normals(..., faces=bm.faces)` only if the signed-volume/winding audit needs correction. Re-export and re-audit the actual mesh. All faces are triangles already: `mesh.calc_loop_triangles()` must report exactly 122.
4. Export glTF with Y-up orientation. Blender local `(X length, Y up, Z depth)` and glTF/Three.js world axes are the same right-handed Y-up convention here: **no axis swap or corrective quarter-turn**. Any later world yaw belongs to the separate placement owner, not this asset plan.

The asset has 122 triangles before any optional non-geometric material work, well under the 1,500-triangle planning ceiling. Do not add fracture decals as geometry merely to spend budget.

## Visible gates for the builder and reviewer

| Defining target feature | Stored construction operation | Required review view | Visible failure |
|---|---|---|---|
| One grounded, narrow elongated mass | seven joined profiles plus individually capped ends | orthographic side and end | looks like separate blocks, floats, or reads as a wide wall |
| High-left shoulder, lower right runout | crest heights 1.62 m at X −1.32 down to 0.65 m at X +1.80 | local-X side and three-quarter | symmetric roof, tall pillar, or uniformly flat top |
| Three broad irregular strata | lower/middle/upper shelf pairs vary in X, height, and rear depth | source-facing three-quarter and rear three-quarter | evenly spaced bench stairs or brick-like courses |
| Natural transition surfaces | literal longitudinal triangles join every profile; no overlap | untextured wireframe and end elevation | detached shelves, deep slots, or a flat cutout |
| Closed rock volume | literal per-end cap triangles, stored face groups | opaque-cap render plus topology audit | cap hole, crossed cap, inward normals, or transparent material |

## Required source-proof before any studio/native work

The builder must retain the exact data-file hash, actual Blender script, and a report containing: Blender version; `mesh.calc_loop_triangles()` count; `mesh.validate` result; bounds from actual vertices; edge-use histogram; positive signed volume; connected-component count; material transparency state; and cap-face source indices. Capture untextured local-X side, local-Z end, rear three-quarter, and source-facing three-quarter massing images. Failure in any numerical item stops before studio rendering. This does not replace independent visual judgment of the massing or root’s later native-hull/projection proof.

## Explicit non-goals

No terrain sculpt, bank placement, collider, scenery record, runtime asset ID, new texture, global material change, or gameplay feature is authorized here. A previous V1 target remains historical HOLD; this plan consumes only V2. A later build may not reinterpret this plan as proof that the chosen arrival pose, route clearance, support contact, or native camera frame has passed.
