# Sapwood V2 — bounded harvest model candidate

Exact GLB SHA256: `7733a50f5bd4bfc01671bc802e73fcb44a78a0068168c8c4ec269bf7aa30c16b`.

Reference: parent-generated `../../targets/sapwood-v1/reference.png`, SHA256 `301371d951851c1590b47a0bc2f8869dec417b3d2e37224ecba7289ae7e7e668`. Independent level reviewer found the direction usable at approximately8.1/10 before modeling, with production constraints subsequently approved by root: use one common root and five fixed cut sockets; resolve the generated panels' imperfect base correspondence explicitly; flatten, broaden and blunt the teal tips into attached leathery fins rather than crystals. The actual exact-hash model later passed independent review8.1; this document retains its source handoff below.

The model is a manual Blender reconstruction, not a mesh generated from the raster. No paid service or new downloaded source. `sapwood-editable.blend` retains individually named bark, grain faces, fixed sockets, roots, fins and petioles; its 256px palette is packed. Reproducible builder: `tools/art/build-sapwood.py`. The first candidate and its renders remain intact in `../v1/`; V2 changes only base/cut coverage and accidental generic pale caps on the root/petioles.

## Runtime contract

Six rigid mesh batches, one embedded 256px palette, 1,381 triangles, 108,456 bytes. This is slightly below the provisional 1,500–2,500 triangle target; no geometry was added merely to reach the target. Actual buffer bounds: 1.8362m wide × 1.9262m high × .9774m deep, grounded Y=0, glTF Y up and +Z front. The root/stump bounds are 1.0831m × .4652m × .9774m, contained inside the existing 1.16 × .52 × 1.16m low collision envelope.

- `TreeStump` is one permanent common root with five pale cut sockets. It is the exact same mesh and transform at every stage, including complete depletion.
- `tree_chunk_0`…`tree_chunk_4` each contain a complete woody rib, its broad pale longitudinal grain face, all its attached teal fins and short petioles.
- Hide units in order 4, 3, 2, 1, 0. Five hits leave only `TreeStump`; no tall trunk, branch, leaf or second duplicate stump remains.
- Named empties `TreeJoint0`…`TreeJoint4` mark the fixed attachment locations. They are metadata anchors; chunks have identity transforms with geometry authored in shared local space. Root/instance transforms carry placement and scale.
- Joint positions in glTF meters: 0 `[0,.465,-.09]`; 1 `[-.2,.375,-.055]`; 2 `[.2,.35,-.035]`; 3 `[-.255,.29,.165]`; 4 `[.245,.275,.175]`.

Each attached rib covers its fixed cut face by 2mm at the base. The five cut faces are part of the persistent stump and become exposed solely through the matching rib's visibility change. Other root and petiole caps use bark/teal, avoiding unintended pale growths.

Root owns integration: keep built-in tree IDs, five-hit wood yield, eighteen-second regrowth, reach, low collider and occupied-regrowth behavior. Do not append the old generic stump below this permanent stump. Do not select `TreeStump` or arbitrary asset meshes as removable chunks. Clone materials per resource instance before hit-emissive feedback; GLB cached geometry and textures can remain shared. The eight-hit library redwood is a separate contract and has not been overwritten. Decorative canopies, ancient trees and fallen logs remain scenery.

## Proof and limits

Seven actual fresh-GLB 512px renders: full, one-hit, three-hits, one-remaining, depleted, rear, front. All stages only hide semantic chunk nodes; the root is never rebuilt or moved. Cycles CPU, four threads, sixteen samples, one job at a time. `export-check.json` measures actual buffer counts, node transforms, texture dimensions and bounds. `game-check.json` is the existing prop checker result; it passed. No external buffer/image references.

No runtime, canonical world, asset-library or shipping edits. No ordinary native harvest/regrowth or owner physical-phone acceptance is claimed by these staged images. Independent model review remains the next gate.

Independent model review completed: `independent-review.md` records PASS8.1/10 for this exact V2 hash after all seven images. Five complete ribs and shared stump joints stay coherent through depletion; no floating leftovers or pale-cap artifacts; fins read as vegetation. Slightly regular/plank-like ribs are a bounded fidelity limitation. No further model iteration was requested. Native integration and owner phone review remain separate gates.
