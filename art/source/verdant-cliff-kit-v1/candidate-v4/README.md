# Verdant cliff kit V4 candidate

Unregistered and unshipped; pending independent exact-export judgment against the unchanged target `art/targets/verdant-cliff-kit-v1/target.png`. The V3 candidate and its rejected attempts are preserved separately.

This revision changes the mass construction: one wide, thick rear buttress ridge with overlapping shorter strata; a three-part joined low toe; and a ledge with a broad sloping support, spreading foot and low joined crown. Intermediate silhouette points create actual diagonal fracture planes. Coplanar export triangles share one plane color. Three terminating olive patches are part of the actual stone faces, with no loose rods or strips.

The family has 1,068 triangles: toe 264, buttress 442, ledge 362. Each model contains one embedded opaque 256×256 palette material, with roughness 1 and metallic 0. The supplied whole-rock convex hulls use 18/25/25 vertices and 96/138/138 indices. They deliberately fill crevices and the shelf underhang; no walk-under or compound-collider claim is made.

The reproducible builder is retained here and at `tools/art/build-verdant-cliff-kit.py`. Editable Blender sources, GLBs, palette PNG, per-model colliders and a source/hash manifest are adjacent. Use fresh output paths because the builder refuses existing directories:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' --background --threads 2 --python tools/art/build-verdant-cliff-kit.py -- --output-dir <fresh-source-directory> --render-dir <fresh-render-directory>
```

Fresh exported GLBs were reimported for `.dream-loop/verdant-cliff-kit-v1/render-v4/`: family front/back three-quarter views at 1280×640 and individual front/back views at 640×640. The scene uses Cycles CPU with two threads/eight samples, neutral key/fill/backfill and the same Standard view transform as V3. The render receipt records exact model and image hashes.

`export-verification.json` checks all sixteen embedded source sRGB swatches, one opaque material, Y-up grounding and complete hull coverage. `runtime-collider-verification.json` uses the actual game's convex descriptor validator. Three `*-check.json` reports pass the read-only prop checker. These checks establish structural validity, not visual admission or native behavior.

Implementer inspected all eight final images. The connected family and plane grouping are visible, but top chamfers remain rather regular and the three flush lichen patches are visibly geometric. The buttress rear is now one thick connected ridge, with an overly broad plain back wall. The ledge support is broader, while its top/front still read as fairly clean planes. Target fitness belongs to the independent review. No runtime registration, world edit, native/phone test or self-PASS was performed.
