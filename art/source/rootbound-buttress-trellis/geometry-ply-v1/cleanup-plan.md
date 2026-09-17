# Rootbound buttress — geometry PLY cleanup plan R1

**Status: executable preparation only; do not run until independent plan review authorizes it.** The raw PLY is an immutable high-detail master. This plan makes one new, review-only Blender derivative; it does not export a runtime asset, edit source PLY bytes, create a GLB, add materials/textures, merge a composite scene, or integrate gameplay.

## Fixed input and scale

| Item | Verified value |
|---|---|
| Raw PLY | `.dream-loop/rootbound-buttress-trellis/geometry-ply-v1-run/raw-geometry.ply` |
| Raw SHA-256 | `3005ad1a1f3039a946db633b323ace8bc73856e91f38bfef4fc1faaf59ce223c` |
| Exact raw topology | 514,489 vertices; 1,029,792 triangles; float32 positions; indices 0–514,488 |
| Raw bounds, Z-up | X 1.0003963113; Y 0.9998927712; Z 0.7837910056 |
| Applied uniform scale | `4.9980192286` = 5m ÷ max(X,Y); no axis stretching |
| Resulting envelope | X 5.000m; Y 4.997m; **Z 3.917m**, not the reference’s intended 4.5m |

The target’s 4.5m height and 5m spread are an intended design envelope, not recovered raw geometry. The derivative uses the uniform 5m spread scale and reports the actual 3.917m height. It must not stretch Z to satisfy the reference headline.

## Evidence and bounded intent

The selected source target asks for a connected warm umber buttress-root/split trunk with four readable root directions, an S-bend, and two asymmetric fork stubs. Independent raw review scored geometric fit 7.2: the mass, flared grounded base, trunk and fork are useful; the four-buttress cadence, ragged tips, shallow bend and fork asymmetry need inspection.

R1 normalizes exact geometry, audits topology and produces neutral comparison renders. Its default derivative preserves the full raw detail, silhouette basis and Z-up grounding. It does **not** manually delete roots, merge objects, sculpt a bend, reshape a fork, fabricate texture detail, or force the desired four-root rhythm from ambiguous reference pixels. An optional controlled preview reduction is available only with `--preview-decimate`; it is not part of the initial execution or a runtime claim. Any visible structural defect after side-by-side neutral comparison receives a separately reviewed focused repair.

## Executable operations

1. Verify Blender 4.5, 8GiB free RAM before import, a 6GiB watchdog during execution, raw PLY SHA, and a new empty output directory.
2. Import the PLY once with Blender 4.5 `forward_axis='Y'`, `up_axis='Z'`, `global_scale=1`, `merge_verts=False`, and `import_attributes=False`. Audit exact raw counts before any repair, then read bounds, triangle-only topology, zero-area/normal flags, connected components, and raw min-Z. This uses mesh arrays/union-find only—**no million-face bmesh edit and no `mesh.validate()` repair**.
3. Create a scaled raw preview copy and one derivative mesh copy. Move both to ground using `-rawMinZ × uniformScale`; the original imported raw object stays hidden and unmodified.
4. Create the default high-detail derivative as an editable scaled mesh copy with flat shading, preserving every source triangle for inspection. If a subsequent reviewer explicitly asks for a faceted preview, `--preview-decimate` applies one deterministic Collapse Decimate modifier at ratio `0.15` with triangulation retained (expected roughly 154k triangles before exact metric). That optional preview is never a runtime budget claim. No texture, UV, bake, remesh, voxel, Boolean, or manual root cut is used.
5. Record possible tiny loose debris but do not delete it in R1. A later isolated action may remove a component only if it is not the primary component **and** has at most 64 triangles **and** its maximum raw-axis extent is at most 1% of the 5m spread (0.05m after scale). Connected ragged root tips fail this rule and stay untouched.
6. Render a readable neutral warm-key/cool-fill workbench comparison of raw preview and derivative: front, three-quarter, side, rear at 512px, plus exact 96px and 48px reductions for every view. The scene uses a dark blue-grey background and matte clay rootwood, avoiding the prior blown-white inspection. This material is an inspection aid, not a recovered texture or runtime material.
7. Save new blend, metrics, executed-script copy, and render files under the unique output root. Stop for independent derivative review.

## Geometry and visual gates

| Gate | Measured by script | Fail/hold condition |
|---|---|---|
| Immutable source | SHA before import; source file is never opened for writing | SHA mismatch or mutation attempt |
| Grounding | scaled raw/derivative minimum world Z | `abs(minZ) > 0.001m` |
| Uniform scale | raw and scaled X/Y/Z bounds | X spread differs from 5m by >0.002m or nonuniform object scale |
| Topology | polygon count, triangle-only audit, zero-area count, component table | non-triangles, zero-area faces, or no primary component |
| Normals | recomputed polygon normal lengths; flat derivative normals | non-finite/zero normal count >0 is HOLD |
| Facet derivative | flat shading; optional preview records exact post-modifier count | smooth shading, or an unrecorded decimate operation |
| Root/fork readability | raw/derivative four-view 512/96/48 comparison | four primary directions, bend/fork, or grounding remain unclear; defer focused reshape rather than improvising |

## Resource and output contract

The script never launches TRELLIS. Blender Workbench may use graphics hardware, so this work remains serialized in the shared heavy-job slot; geometry audits use CPU mesh data. Start guard: 8GiB host RAM; watchdog floor: 6GiB. It creates `art/source/rootbound-buttress-trellis/geometry-ply-v1/cleanup-r1/` only when that directory is empty, then writes:

- `cleanup-r1.blend` — editable derivative and studio only; raw and raw-preview meshes are removed after audit/renders so the pinned external PLY remains the immutable raw source;
- `cleanup-metrics.json` — input SHA, component/normal/bounds/debris audit, exact derivative count, render list;
- `executed-clean-rootbound-buttress.py` — byte copy of the executed script;
- `renders/{raw,derivative}/{front,threequarter,side,rear}-{512,96,48}.png`.

On a raw topology/normal/grounding HOLD, `cleanup-hold.json` preserves the completed diagnostics in the new output directory and the script exits nonzero. Routine Blender/API corrections that do not change geometry are recorded as corrections, not new geometry iterations. No PLY/GLB source replacement, runtime registry edit, collision, material authoring, or gameplay artifact is produced. Materials are deferred until geometry passes neutral comparison.

## Planned invocation after review

```powershell
& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' --background --factory-startup --python-exit-code 1 --python tools/art/clean-rootbound-buttress.py -- --execute --preview-decimate
```

This is one cleanup candidate. Independent review has approved the controlled `--preview-decimate` comparison for this execution; it remains a review derivative, not runtime admission. Do not run it before the shared heavy-job slot is released and the stated no-sculpt/no-root-removal boundary remains in force.
