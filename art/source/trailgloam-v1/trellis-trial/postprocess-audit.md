# TRELLIS postprocess audit — service semantics and staged mismatch

**Scope: read-only source audit while the live run remains owned elsewhere.** No helper, guard, process, GPU job, or installed source was changed.

## What the installed service actually does

Current installed `api_spz/routes/generation.py` SHA-256 `76268ab97d59b3bb318477aea03cf5e162cdd5fb5b05a526273da6a92c64f98b` calls `pipeline.run(... return_before_decode=True)`, then `pipeline.decode_and_cleanup`. It CPU-offloads `mesh.attrs` and `mesh.coords`, but leaves geometry available for postprocess. Its export path then:

1. pre-simplifies only if extracted faces exceed `2,000,000`;
2. stores `vertices`, `faces`, attrs, coords, layout and voxel size in local variables, deletes the mesh wrapper, and empties CUDA cache;
3. calls `o_voxel.postprocess.to_glb` with `attr_layout=_layout`, `remesh=True`, `remesh_band=1`, `remesh_project=0`, requested decimation and texture size.

The installed source comment says the wrapper deletion prevents `mesh.attrs` / `mesh.coords` retaining roughly 256 MB of GPU references through postprocess. The Trailgloam staged result of 1,804,432 faces is below that service’s 2M pre-simplification threshold, so the current service code would enter `to_glb` without that preliminary simplification and then construct CuMesh/BVH/remesh/UV/bake work.

`o-voxel/o_voxel/postprocess.py` SHA-256 `8ece9f739090beb71f1b818ea09b79547c1c9370fccf37ac354bed854e28377d` defines:

```python
to_glb(vertices, faces, attr_volume, coords, attr_layout, aabb,
       voxel_size=None, grid_size=None, decimation_target=1000000,
       texture_size=2048, remesh=False, remesh_band=1, remesh_project=.9, ...)
```

It creates `cumesh.CuMesh`, builds a `cumesh.cuBVH` before either branch, and then either simplifies/cleans or remeshes/simplifies/cleans. The remesh path offloads original vertices/faces to CPU, later restores them to CUDA and builds another BVH for texture baking. Texture channels are read through `attr_layout`, not `layout`.

## Staged-helper discrepancy

The staged full-export branch currently calls `to_glb(..., layout=mesh.layout, ..., remesh=False)`. The installed signature requires **`attr_layout`**, so `layout` is an invalid keyword. The staged call also deliberately selects the non-remesh path, unlike the current service’s `remesh=True, band=1, project=0` path. Its ordinary 750k decode refusal occurs before this call, so the held Trailgloam result did not exercise or disprove either postprocess behavior. The incorrect keyword is a real future full-export defect, not evidence that the 750k refusal should be raised.

Historical Mossling records verify a service request at 512/12 steps/60k/1K completed and produced a textured GLB. They record request/output metadata and GPU samples, but do not pin the exact installed generation/postprocess source snapshot. This audit establishes **current** installed service semantics; it does not prove the historical Mossling build used identical source code.

## Safe future changed-method contract

Do not raise the ordinary staged 750k cap or call its current full-export branch. Preserve the high-detail master and make a separate reviewed profile with two owned fresh children:

1. **Decode/master child:** normal fresh numerical stages decode once, applies its fixed exact-input PLY ceiling, writes the validated high-detail binary PLY, and writes a strictly schema-checked, run-owned CPU mesh-state handoff. The state must contain only required tensor data (vertices, faces, attrs, coords, voxel size) plus a strict JSON layout encoding and hashes/counts; it is not a user-supplied resume mechanism.
2. **Postprocess child:** begins after the decode child exits, with TRELLIS models absent. It reopens only that same-run state after hash/schema validation, reconstructs the service-equivalent local variables, deletes the mesh wrapper before postprocess, and calls the installed function with `attr_layout=...`, `remesh=True`, `remesh_band=1`, `remesh_project=0`, the reviewed texture size and decimation target. It produces a separately named textured simplified GLB derivative while leaving the PLY untouched.

This method separates decoder-model residency from CuMesh/BVH/remesh/UV/bake residency. It does not eliminate postprocess peak risk: the future postprocess child must retain the 6 GiB owned reserve watchdog and require at least 8 GiB free immediately before CuMesh/BVH work. It must record host free RAM and CUDA free/allocated/reserved at pre-load, state-load, mesh-wrapper detach, CuMesh/BVH creation, remesh, simplification, UV, bake and GLB completion; any reserve breach or error preserves evidence and ends the attempt without retry.

The state/derivative profile requires its own source review and exact-input contract. It must keep offline environment, common mutex, one owned child, hidden Windows launch, no unowned process termination, source/coordinate floors, and private handoffs. The raw PLY is the high-detail master; the GLB is a separately inspectable textured simplified derivative. Neither becomes a runtime asset without independent geometry, visual, scale, topology, performance, and species-admission review.

## Practical conclusion

TRELLIS does simplify, but only inside an expensive postprocess path that still begins by allocating CuMesh and BVH. The service’s successful Mossling GLB shows that this route can work for one historical input; it does not bound Trailgloam’s 1.8M extracted mesh. The useful next implementation is a separately reviewed decode-to-PLY plus fresh-process service-equivalent postprocess derivative, with the `attr_layout` correction confined to that new path. The active full-export guard remains intact.
