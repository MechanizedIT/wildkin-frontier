# Rootbound buttress - R2 Z-up structural repair plan

**Status:** proposed for independent review. This is a measured vertex-position recipe for the verified raw PLY, not an implementation approval. The earlier held Y-up/remesh proposal remains historical evidence in `construction-plan-draft-v1.md` and `parameters-draft-v1.json`.

## Fixed input and invariants

The only input is `raw-geometry.ply` (SHA-256 `3005ad1a1f3039a946db633b323ace8bc73856e91f38bfef4fc1faaf59ce223c`): 514,489 float32 vertices and 1,029,792 triangle faces, Z-up. Uniform scale is 4.998019228586503; ground translation is +1.9582843403471133 m Z. Measured grounded extent is 5.000 x 4.997 x 3.917 m. The 4.5 m target height is design direction, not a recovered source measurement; this recipe does not stretch Z.

Create a new derivative by changing XY positions only. Preserve every source index and face, vertex and triangle count, raw master, and every Z value. Do not use Boolean, remesh, voxelization, decimation, named vertex groups, or inferred mesh components. Selections use only the literal coordinate fields in `parameters.json`.

## Measured operations

1. **Broaden two camera-near existing root webs.** Five low radial lobes are measured. R2 changes only 260-280 degrees (max radius 2.180 m) and 320-350 degrees (max radius 2.909 m), both measured about collar `(-0.240953, -0.320093)` at Z 1.425-1.575 m. Each has bounded Z, radius, and angular smooth falloffs. Lateral response is `tanh(lateral/0.15m)`, which is continuous and exactly zero on the existing radial ridge. The maximum lateral offsets are 0.14 m at 270 degrees and 0.18 m at 335 degrees. Their exact outer radial limits are the measured maxima, so the 270-degree root is included rather than excluded.
2. **Retain the restrained measured trunk S-bend.** The centerline is interpolated from actual 1.5-3.7 m horizontal-band centroids. Within the frozen 0.42 m XY core, 0.12 m edge, and Z 1.35-3.20 m, apply the literal XY control offsets in `parameters.json`: negative X through the middle then toward positive X at 3.0 m. The upper fork is left unchanged because expanding this selection produced non-positive candidate normal dots. This retains a bounded S-bend without inventing fork stubs or moving ground vertices.

The 20-50, 90-120, and 160-190 degree lobes remain unmodified. R2 therefore improves two existing near-web readings and trunk reading, while retaining five actual low lobes. It does not claim a four-root consolidation; that would need separate topology evidence.

## CPU receipt and implementation gate

Run `analysis.py` against the frozen raw input and literal parameters before Blender. It fails on source hash/count mismatch, non-finite results, altered Z, or malformed triangle/index data. The receipt records selected counts, bounds, displacement, candidate face-normal comparison, degenerate-face counts, and a fixed `(1, -1, .38)` camera projection/depth proxy. The camera proxy fits an orthographic frame to the complete proposed point cloud and reports each selected web's screen bounds plus relative low-surface point depth. It is not a triangle rasterizer, z-buffer, HUD check, or final visibility proof.

Abort before saving if any candidate coordinate is non-finite, Z differs, face index range/count differs, new degenerate triangles appear, or raw-to-candidate normal dot becomes non-positive. Save the immutable raw master and a separate derivative only. Blender comparison and independent perceptual review remain the final geometry/readability gates.
