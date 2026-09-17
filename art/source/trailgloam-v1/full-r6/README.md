# Trailgloam full R6 Blender renderer

**Status:** one actual guarded Blender candidate completed, exit 0. 50 parts / 1024 triangles, 21 real views and one editable scene. No rig, export or runtime changes. [Illustrated review](review.html) · [Execution facts](execution-receipt.json).

`render_full_r6.py` deliberately imports the planner-owned `../full-r6-plan/cpu-feasibility.py`; it does not copy ring, prism, wedge, cuff, hoof, collar, blade, head, eye, or shell coordinates. Before objects exist it pins the current reviewed input hashes:

- `parameters.json`: `cc4e081fda9efca9792d3e336133e1413360c57b1ac8acfe263a64de35d3b3e0`
- `cpu-feasibility.py`: `667d72d660a8c70b78b8e8f7c7ee6d92e7271563cb8b02c313b6a124421d9d28`
- `cpu-feasibility.json`: `7aba9a40ee0356ea0a9e76e70bdc215cb90340543a6887476deb6dd61f9e13e5`
- R5 shared closed-solid routine `../method-probe-r5/build_probe.py`: `18ffc6c31220607742affc03edfad86bd11e36018ca86b5ad4ce51bfd3ab4d01`

The planner exposes a side-effect-free `build_parts(parameters)` in `cpu-feasibility.py`; it returns the literal parts and the computed leg/frond contact records. The separately pinned `cpu-feasibility.json` binds to the same parameters and reports grounded-foot, shell-root, cuff, hoof, head/eye, collar, and blade contacts passing. This makes the CPU routine the only geometry constructor. The routine contains the reviewed 0.0095–0.0149m first-root-cap insets; the complete bounds and frond-exposure receipt remain unchanged.

On a later release, run from the repository root with a new absent absolute output directory:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' --background --factory-startup --python-exit-code 1 --python art/source/trailgloam-v1/full-r6/render_full_r6.py -- --execute --plan-dir C:/Users/cwood/Documents/mobile-rpg/art/source/trailgloam-v1/full-r6-plan --output-dir C:/Users/cwood/Documents/mobile-rpg/art/source/trailgloam-v1/full-r6/candidate-r6
```

The renderer requires 8 GiB free RAM before importing, monitors its own work against a 6 GiB reserve, and preserves a reserve-breach receipt. It imports every literal part as an independent Blender mesh, verifies float32 XYZ readback, exact index-loop order, loop-triangle count, and actual Blender-triangle winding; it also verifies six imported hoof soles at `Z=0`. It then writes front/rear/left/right/top/underside/three-quarter neutral Workbench renders at 512/96/48 plus one editable Blend and receipt. Materials are teal body, charcoal joints/hooves/collars, amber fronds, and ivory eyes. It does not rig, export, create a collider, touch runtime source, or alter planner geometry.

The Blender receipt will prove literal import parity and show the seven unframed directions. CPU contact results remain identified as CPU evidence unless a separately reviewed Blender contact audit is added; no render framing is used to conceal a visible construction defect.

## Independent result

**Retain with specific debt:** the complete neutral master is useful. Six oversized near-black cuboid hooves dominate the silhouettes; a later hoof-only shape/material repair is recommended while preserving accepted body/head/fronds and grounded limb attachments. Motion and runtime remain unproven. [Independent review](visual-review.md).
