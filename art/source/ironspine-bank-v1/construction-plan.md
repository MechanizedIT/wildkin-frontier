# Ironspine narrow rockbank V2 — builder construction plan

## Scope, history, and frozen inputs

This is a **construction plan only** for one proposed Ironspine arrival-bank asset. It creates no GLB, physics shape, runtime record, terrain edit, or placement admission. Independent plan review must pass V2 before a separate builder starts; root separately owns later hull support, native projection, collision, and resident-lifecycle proof.

V1 is retained unchanged as `construction-plan-v1-held.md`, `construction-data-v1-held.json`, and `plan-proof-v1-held.json`. V2 changes only the Blender/glTF coordinate contract, material API, and burial explanation. Its 63 literal vertices and 122 literal triangle faces are byte-for-byte geometry-identical to V1; `plan-proof.json` records that equality.

The authoritative envelope is **3.600 m game-local X length × 1.000 m game-local Z depth × 2.000 m game-local Y height**. It comes from the V2 construction target and placement envelope, not perspective recovery. The full literal mesh is frozen in [construction-data.json](construction-data.json); its numerical closure, coordinate roundtrip, and bounds are in [plan-proof.json](plan-proof.json). The data file freezes SHA-256 identities for the V2 target, its review and provenance, the placement envelope, and the Ironspine implementation brief.

## What is observed and what is proposed

Observed from the approved reference: one compact, opaque, grounded, elongated iron-grey rock mass; a high left shoulder that falls through three or four broad broken strata toward a lower right end; a narrow end profile; a shallow, uneven crown; and blunt closed ends. The reference explicitly rejects masonry courses, detached blocks, a retaining-wall stair, deep cuts, holes, and vegetation.

The exact hidden depth, back profile, local facet positions, and every ledge break are **proposed geometry**, not recovered 3D facts. The chosen seven X stations use three interrupted shelf bands and continuous transition faces. They make a single naturally irregular bank rather than a stack of objects. The high shoulder is at game-local X −1.32; the crown declines to game-local X +1.80.

## Measured construction contract

`construction-data.json` stores 63 literal canonical **game-space** vertices and 122 literal triangles. Each of the seven stations has one ordered 9-vertex profile:

`frontFoot → lowerFaceTop → lowerShelfRear → middleFaceTop → middleShelfRear → upperFaceTop → upperShelfRear → backCrest → backFoot`.

The six station spans form all long surfaces. Each end is independently triangulated from its own 9-vertex concave boundary and stored as seven explicit triangles. Do **not** run `triangle_fill`, do not fill both ends together, and do not replace the cap triangles with a hand fan. The stored topology is one closed connected manifold: every edge is used twice, no stored triangle has zero area, and its signed volume is positive (see plan proof).

For the measured placement-envelope base, use world object-origin Y **8.880348675115647** and retain canonical local Y `−0.380…+1.620`. This puts the mesh base 0.380 m below the minimum sampled terrain and 0.7263519679416898 m below the maximum sampled terrain. The crest remains 1.620 m above the minimum terrain and 1.2736480320583102 m above the maximum. This intentional burial accommodates the sampled 0.34635196794168976 m span; it does **not** claim full 2 m visible height or prove finished-hull contact. Root must still test the actual exported hull against terrain and route.

## Blender 4.5.3 recipe and axis contract

The local guidance records Blender 4.5.3 and Blender MCP 1.9.1. This plan uses only Blender’s direct mesh and node-material API; it does not use a Three.js constructor in Blender.

1. Read UTF-8 `construction-data.json`. Every stored canonical game vertex `g=(x,y,z)` becomes the Blender native Z-up vertex `b=(x,-z,y)`. Create one mesh with `mesh.from_pydata(blenderVertices, [], faces)` using the stored face index order. Do not use cubes, boolean unions, geometry nodes, or separated ledge objects.
2. Create exactly one Blender `Material` with `use_nodes=True`: one **Principled BSDF** connects to Material Output. Add a Color Attribute node for the CORNER-domain byte-color attribute `bank_palette` and connect its Color output to Principled Base Color. Set Roughness `1`, Metallic `0`, Alpha `1`, opaque blend mode, and flat polygon shading. Assign the stored `facePaletteIndices` color to all three loops of each polygon. Use no textures, normal maps, reflections, moss, or procedural displacement.
3. Run `mesh.validate(verbose=True)` without destructive topology changes, update, and recalculate outside normals only if the actual winding audit requires it. Do not invoke automatic cap fill. Every face is already triangular: `mesh.calc_loop_triangles()` must report 122.
4. Export glTF with Y-up conversion enabled. The stated conversion is `e=(b.x,b.z,-b.y)`, so `g=(x,y,z) → b=(x,-z,y) → e=(x,y,z)`. `plan-proof.json` verifies all 63 literal vertices round-trip with maximum coordinate error `0`. The later builder/export audit must repeat this from the actual exported GLB; no arbitrary corrective rotation is permitted.

The asset has 122 triangles before any optional non-geometric material work, well below the 1,500-triangle planning ceiling. Do not add fracture decals as geometry merely to spend budget.

## Visible gates for builder and reviewer

| Defining target feature | Stored construction operation | Required review view | Visible failure |
|---|---|---|---|
| One grounded, narrow elongated mass | seven joined profiles plus individually capped ends | orthographic side and end | looks like separate blocks, floats, or reads as a wide wall |
| High-left shoulder, lower right runout | crest heights 1.62 m at X −1.32 down to 0.65 m at X +1.80 | game-local X side and three-quarter | symmetric roof, tall pillar, or uniformly flat top |
| Three broad irregular strata | lower/middle/upper shelf pairs vary in X, height, and rear depth | source-facing three-quarter and rear three-quarter | evenly spaced bench stairs or brick-like courses |
| Natural transition surfaces | literal longitudinal triangles join every profile; no overlap | untextured wireframe and end elevation | detached shelves, deep slots, or a flat cutout |
| Closed rock volume | literal per-end cap triangles, stored face groups | opaque-cap render plus topology audit | cap hole, crossed cap, inward normals, or transparent material |
| Correct game orientation | literal game→Blender→glTF roundtrip mapping | bounds/orientation export audit | X/Z swapped, bank tipped Z-up, or unreviewed compensating yaw |

## Required source-proof before any studio/native work

The builder must retain the exact data-file hash, actual Blender script, and a report containing: Blender version; `mesh.calc_loop_triangles()` count; `mesh.validate` result; bounds from actual vertices in both Blender and exported game axes; zero-error 63-vertex conversion check; edge-use histogram; positive signed volume; connected-component count; Principled/Color Attribute/opaque material state; and cap-face source indices. Capture untextured game-local X side, game-local Z end, rear three-quarter, and source-facing three-quarter massing images. Failure in any numerical item stops before studio rendering. This does not replace independent visual judgment of the massing or root’s later native-hull/projection proof.

## Explicit non-goals

No terrain sculpt, bank placement, collider, scenery record, runtime asset ID, new texture, global material change, or gameplay feature is authorized here. A previous V1 target remains historical HOLD; this plan consumes only V2. A later build may not reinterpret this plan as proof that the chosen arrival pose, route clearance, support contact, or native camera frame has passed.
