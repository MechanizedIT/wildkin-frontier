# Trailgloam raw PLY inspection

This folder contains a **non-mutating inspection recipe** for the upcoming
Trailgloam geometry-only TRELLIS master. It is not a model build, cleanup,
normalization, texture pass, GLB export, runtime admission, or GPU grant.

## Inputs and guard

The expected generation result is approximately **889,679 vertices** and
**1,804,000 triangles**. Those values are planning estimates only; execution
pins the exact raw PLY to its own generation receipt instead of pretending an
approximate pre-run count is a hash. The inspector requires:

- an absolute existing raw `.ply` and its absolute generation receipt;
- receipt `sha256`, `vertex_count`, `face_count`, and `scalar: float32` to
  agree with the raw bytes and binary PLY schema;
- a new absolute output directory;
- at least 8 GiB free host RAM before import and a 6 GiB live watchdog.

It rejects a float64 PLY rather than importing it through Blender float32 and
claiming unchanged precision. It does not run while the TRELLIS parent or any
child owns the GPU.

## What it verifies

`inspect_raw_ply.py` imports with identity transform, unit scale and
`merge_verts=False`. It reads raw float32 XYZ and triangle records directly
from the PLY after the header, then checks Blender's imported vertex buffer and
loop index order byte-for-byte against them. It never welds, normalizes,
recalculates normals, reduces, remeshes, bakes, or exports the source.

The receipt records component count plus boundary, two-use, and nonmanifold
edge counts from the unchanged triangle indices. These are **diagnostic facts**
for later review; a raw boundary or nonmanifold result is not an automatic
retention veto and does not authorize cleanup.

## Planned output

After independent source review and a serial root GPU grant, run Blender 4.5
in background mode using absolute paths:

```powershell
$raw = 'C:\absolute\trailgloam\raw-geometry.ply'
$receipt = 'C:\absolute\trailgloam\geometry-ply-receipt.json'
$out = 'C:\absolute\fresh-trailgloam-raw-inspection'
& 'C:\Program Files\Blender Foundation\Blender 4.5\blender.exe' --background --factory-startup --python-exit-code 1 `
  --python C:\Users\cwood\Documents\mobile-rpg\art\source\trailgloam-v1\trellis-trial\raw-inspection\inspect_raw_ply.py -- `
  --input $raw --receipt $receipt --output-dir $out
```

The script produces a display-only teal-clay editable `.blend`, `inspection.json`,
and 21 files: front/rear/left/right/top/underside/three-quarter at 512, 96,
and 48 pixels. The studio floor is hidden only for the underside frame so it
cannot occlude the source. No visual score, model admission, or gameplay claim
is implied by these outputs.
## Fixed Trailgloam provenance

The inspection accepts only generation receipts with profile
`fresh-process-per-stage-512-trailgloam-geometry-ply-v1`, mode
`trailgloam-geometry-ply-v1`, face limit `1,900,000`, and verified input SHA
`417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff`.
A structurally valid unrelated PLY is refused. The receipt must also agree on
its decoded and serialized vertex/face counts.

`synthetic_ply_contract_test.py` is a CPU-only four-vertex binary PLY
round-trip/schema test. It does not exercise Blender import or authorize any
raw-model run. The full Blender import remains serialized behind root approval.

For a large raw master, vectorized edge counts are recorded. Exact connected
components are intentionally `not_computed` above 250,000 faces rather than
running a multi-million-face Python union-find loop. That bounded omission is
recorded in the inspection receipt, not silently represented as a complete
component result.
