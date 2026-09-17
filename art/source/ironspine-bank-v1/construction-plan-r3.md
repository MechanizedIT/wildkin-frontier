# Ironspine narrow rockbank R3 — final changed-method construction plan

## Status and R2 finding

This is the final permitted shape plan. R1 and R2 are preserved history. R2’s actual side and source-facing renders were inspected alongside the V2 target: its staggered narrow shelves still read as a tall striped retaining wall. R3 therefore replaces the entire repeated stair-profile method with one low, broad, asymmetric boulder-bank hull. It is only a construction contract; no Blender build, GLB, terrain/source/runtime change, or admission is authorized until independent plan review and builder-source review pass.

## New massing method

The literal mesh in `construction-data-r3.json` has thirteen **rounded, full-depth ten-point profiles**, not nine-point stair rings. Their full depth is 0.90–1.00 m through the core. The left terminal grows into a shallow shoulder peaking at local Y 1.05; the right third drops to a blunt 0.50→0.33 m runout. The actual proposed bounds are X 3.600 m, Y 1.430 m from −0.380 to +1.050, and Z 1.000 m. This stays within the old conservative 3.6×2.0×1.0 envelope; the old 2 m height was a planning cap, not an obligation.

No surface pair creates a continuous ledge line. Alternating literal diagonal triangles make broad oblique front, crown, and rear planes. At most two short, merging strata hints are permitted: an oblique front plane across stations 2→5 and an oblique crown plane across stations 3→7. They must dissolve into the boulder body in the untextured side and three-quarter renders. A horizontal retaining-wall stripe, roof wedge, vertical full-height end slab, or repeated upright stair profile fails R3.

## Literal topology and orientation

The frozen input holds 130 literal game-space vertices and 256 literal triangles. All long surfaces and both terminal caps are already triangles. Each terminal cap is formed only from its own ten-point boundary; never call `triangle_fill`, never combine end loops, and never replace stored cap faces with a generic fill. `plan-proof-r3.json` verifies 384 two-use edges, opposite directed traversal at every shared edge, zero zero-area triangles, one component, positive signed volume, and outward cap X normals (left < 0, right > 0).

The reduced peak preserves the established conservative grounding rule. With future origin world Y 8.880348675115647 and local base −0.380, the base remains 0.380 m below sampled minimum terrain and 0.7263519679416898 m below maximum. The revised crest is exposed 1.050 m above minimum and 0.7036480320583103 m above maximum. This remains an input-contact assumption only; root owns actual exported-hull support, route, and native projection proof.

## Blender 4.5.3 implementation contract

Load literal game vertex `g=(x,y,z)` as Blender native Z-up `b=(x,-z,y)` and construct exactly one mesh with `mesh.from_pydata`. Export glTF Y-up so `b` returns as game/Three `e=(b.x,b.z,-b.y)=(x,y,z)`. The numerical plan records a zero-error 130-vertex roundtrip. Do not apply compensating yaw.

Use one opaque Blender node material: `use_nodes=True`, one Principled BSDF, a CORNER-domain `bank_palette` Color Attribute feeding Base Color, Roughness 1, Metallic 0, Alpha 1, Blender 4.5 version-correct opaque export settings, and flat polygon shading. The four frozen iron-grey colors are per-face only; no texture, normal map, reflection, moss, displacement, or extra fracture geometry is allowed.

Before rendering, the builder must retain the input hash and audit actual `mesh.validate`, 256 `calc_loop_triangles`, bounds, directed edges, volume, cap signs, opacity, and game→Blender→export roundtrip. Any winding repair must preserve literal connectivity, name changed indices, and rerun all checks.

## Review gates

| Required read | Construction evidence | Required view | Failure |
|---|---|---|---|
| Low broad continuous boulder | full-depth rounded profiles and oblique triangulated planes | local-X side | tall wall, striped bands, or roof wedge |
| Shallow left shoulder / blunt low right runout | peak station 3 is 1.05; terminal 12 is 0.33 | side plus both ends | symmetric ridge, spear, or vertical end slab |
| Real depth and asymmetric mass | 0.90–1.00 m core depth, varied front/back contour | local-Z end and rear three-quarter | flat cutout or thin sheet |
| Sparse strata hint only | two bounded oblique plane regions | source-facing three-quarter | long parallel ledges or masonry course |
| Closed opaque shell | literal cap groups / directed-edge proof | cap images and topology receipt | hole, inward cap, transparent face, or disconnected mesh |

R3 is the final bank candidate allowance. If the separate builder’s approved source or independent visual review does not retain this boulder read, preserve HOLD; do not begin a fourth bank plan or repair.
