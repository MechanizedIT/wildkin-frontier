# Ironspine narrow rockbank R2 — focused changed-shape construction plan

## Scope and change from R1

This is the single focused R2 **shape-plan** following R1’s independent visual HOLD. It is not a Blender build, model export, collider, placement, terrain edit, or runtime admission. R1 plan/data/proof and its candidate evidence remain historical. This R2 file and [construction-data-r2.json](construction-data-r2.json) require independent plan review and separate builder-script review before the counted R2 Blender execution.

R1 failed because seven nearly identical full-width stair profiles produced three long straight horizontal bands, vertical cut ends, and a roof-like crown. R2 changes the construction method: it uses thirteen materially different station profiles, each stored literally, with staggered near-zero shelf widths that stop each ledge at a different X station. The span meshes are alternating diagonals, not repeated parallel quads. Both terminal profiles taper in width and height before their individual end caps. This is one connected rock hull, never stacked blocks or overlapping ledges.

## Evidence and bounded role

The V2 target remains the visual source and the R1 review is a frozen R2 input. Their hashes, the original placement envelope, habitat brief, and R1 metrics are frozen in the data file. The target visibly calls for a compact grounded grey bank with a high left shoulder, a lower right runout, three or four broad irregular strata, narrow depth, blunt ends, and opaque low-poly facets. Exact hidden depth and individual fracture placement remain proposed geometry.

The complete required game-space envelope is unchanged: **X −1.800…+1.800 (3.600 m), Y −0.380…+1.620 (2.000 m), Z −0.500…+0.500 (1.000 m)**. The later placement owner alone may evaluate the bank against the actual support plane. At origin world Y `8.880348675115647`, its base is deliberately 0.380 m below the sampled minimum terrain and 0.7263519679416898 m below sampled maximum terrain; crest exposure is 1.620…1.2736480320583102 m across that span. This is only a conservative burial assumption, never support, collision, or native-view proof.

## Literal R2 geometry

The data file contains 117 literal canonical game-space vertices and 230 literal triangles. It has thirteen X stations ordered from left terminal `−1.80` to right terminal `+1.80`; each uses the fixed nine-point contour:

`frontFoot → lowerFaceTop → lowerShelfRear → middleFaceTop → middleShelfRear → upperFaceTop → upperShelfRear → backCrest → backFoot`.

All longitudinal spans are stored as triangles. A span alternates its diagonal according to `(stationIndex + profileEdgeIndex) % 2`; this rule has already been resolved to literal faces and exists only to explain the asymmetric facet rhythm. Do not regenerate it differently.

The five required visible interruptions are encoded as short shelf widths rather than coincident vertices:

| Fragment | Active stations | Transition | Intended read |
|---|---:|---|---|
| Low left | 1–2 | collapses at 3 | short broken foot shelf under left shoulder |
| Low right | 6–7 | collapses at 8 | separated lower right fragment |
| Middle left | 1–5 | collapses at 6 | dominant but interrupted centre shelf |
| Middle right | 8–10 | collapses at 11 | lower independent runout, not a continuation |
| Upper shoulder | 1–4 | collapses at 5 | high-left cap fading diagonally into the centre |

Shelf collapse is achieved by 0.005–0.04 m local depth widths rather than equal points, so no triangle is degenerate. Station front/back depth and crest height vary substantially: the body expands from the left terminal, reaches the 1.62 m shoulder at X −1.38, and narrows/lowers to the 0.47 m right terminal. That forms blunt tapered ends instead of tall vertical slabs.

Each cap is a literal ear-clipped triangulation of only its own nine-vertex concave boundary. Never call `triangle_fill`; never fill both boundary loops together; never replace the stored cap faces with a fan.

## Blender 4.5.3 construction and material contract

1. Read `construction-data-r2.json` as UTF-8. For every canonical game vertex `g=(x,y,z)`, create native Blender Z-up vertex `b=(x,-z,y)`. Construct exactly one mesh using `mesh.from_pydata(blenderVertices, [], faces)` with the literal face order.
2. Create exactly one Blender node material: `use_nodes=True`; one Principled BSDF linked to Material Output; a Color Attribute node named `bank_palette` linked to Principled Base Color. The data’s `facePaletteIndices` assigns one of the four frozen iron-grey colors to every loop of a polygon. Set Roughness `1`, Metallic `0`, Alpha `1`, and Blender 4.5’s version-correct opaque material/export settings. Enable flat polygon shading. There is no `MeshStandardMaterial` call in Blender, no texture, and no normal/reflection map.
3. Execute `mesh.validate(verbose=True)` without destructive topology edits. Construct from the stored faces only; do not invoke cap fill. Before rendering, audit actual directed edges and cap normals. Recalculate normals only if that audit fails, record changed face indices, and rerun every audit. All R2 faces are triangles; `mesh.calc_loop_triangles()` must equal 230.
4. Export glTF with Y-up conversion. The required numeric roundtrip is `g=(x,y,z) → b=(x,-z,y) → exported=(b.x,b.z,-b.y)=(x,y,z)`. The plan proof is exact for all 117 stored values; the builder must repeat it from the exported GLB without a compensating yaw.

## Required proof gates

| Target shape / safety claim | Actual builder operation | Named inspection | Fail condition |
|---|---|---|---|
| Eroded long bank, not retaining wall | thirteen varied profiles and alternating literal span triangles | untextured side and source-facing three-quarter | three continuous straight shelf lines or a roof-wedge silhouette |
| Interrupted strata | five distinct short shelf fragments in the stored station ranges | source-facing and rear three-quarter | any left/right fragment merges into an even full-length stair |
| Blunt irregular ends | tapered terminal profiles at stations 0 and 12 | local-Z end plus both three-quarters | vertical cut slab, tall terminal pillar, or a pointed spear end |
| One closed, outward shell | stored triangles and individually triangulated end caps | pre-render topology receipt and opaque cap renders | a non-reversed directed edge, inward cap normal, hole, or disconnected component |
| Correct game axes | game→Blender→glTF mapping | literal-array and exported-GLB roundtrip | X/Z swap, Z-up export, or an unreviewed corrective rotation |

The pre-render receipt must report actual mesh bounds, 230 `calc_loop_triangles`, one connected component, every undirected edge used twice, every shared edge oppositely directed, zero-area count zero, positive signed volume, cap X-normal signs (left `<0`, right `>0`), material opacity, and the exact input hash. Only then may the builder make untextured side/end/rear/source-three-quarter massing renders. An independent judge evaluates those renders before material detail or native projection.

## Non-goals

R2 does not authorize runtime placement, source recipes, collision, terrain changes, textures, extra fracture geometry, a material pass, or native projection. It spends the second asset shape candidate only when the separate builder executes this exact reviewed input.
