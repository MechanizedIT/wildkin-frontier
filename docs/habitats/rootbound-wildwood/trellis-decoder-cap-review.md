# Rootbound TRELLIS quality512-r1 decoder-cap review

## Measured result

`quality512-r1` used the selected v2 reference, 512 resolution, 12 steps, 30,000 requested export faces, and 1K texture. It reached decode in 229.763 seconds, then correctly stopped before export at **1,029,792 faces / 514,489 vertices**, above the current 750,000-face refusal. No GLB was produced.

The stage events show host free RAM at 12.362GiB when the decoded count was recorded and 17.964GiB after the failed decode child exited. Every recorded value remained above the 6GiB reserve. This demonstrates a bounded numerical/decode run and post-child recovery. It does **not** measure peak host RAM between event samples, GPU peak allocation, or the RAM/VRAM peak of mesh cleaning, BVH construction, simplification, UV work, and 1K texture baking. The current cap is therefore a conservative raw-geometry policy guard, not a measured memory ceiling.

The historical Mossling API export is not contrary evidence: its successful 512/12/60k and 1024-cascade outputs record only exported faces (about 59k) and no pre-export decoded face count. It used the full loopback API rather than this constrained fresh-process path. It cannot show that a 1.03M decoded mesh is safe to export here.

## Export-path finding

Installed `o_voxel.postprocess.to_glb` first transfers the full vertex/face arrays to CUDA, constructs a `cumesh` and a BVH, then in the non-remesh path simplifies to three times the target, cleans, and simplifies to the final target before UV and texture work. The existing 30k requested target therefore reduces the eventual asset but does not avoid a full-mesh/BVH peak. Raising the decoded-face refusal and calling the same exporter without additional measurement would be an unreviewed resource-risk change.

## Proposed changed experiment — pending root decision and code review

Do **not** bypass or silently raise the current cap. If the owner-directed high-detail-master route is pursued, make one new, versioned **guarded export-feasibility profile** rather than changing the current runner in place:

1. Preserve `quality512-r1` as a decode-cap HOLD. Use the same selected input and seed in a fresh private output; never reuse a failed directory.
2. Set an explicit provisional master ceiling of **1,100,000 decoded faces** for this one fixed root-trunk experiment. This is only 70,208 faces above the observed result; it is not a general default, a decoder-memory claim, or runtime geometry.
3. Retain the existing 6GiB continuous host-RAM reserve, bootstrap/stage floors, 32,768-coordinate limit, 8GiB pre-export floor, one-child-at-a-time process boundary, mutex, offline mode, and 30k final export request. No remesh, cap bypass, process killing, or background-app closure may substitute for these controls.
4. Before the full exporter is allowed, add reviewed instrumentation around its material boundaries: decoded mesh present, CPU offload complete, CUDA mesh/BVH created, first simplification complete, final simplification complete, UV complete, and bake/export complete. Record host free RAM and CUDA free/allocated/reserved values at each boundary. A child watchdog must still stop its owned child on any 6GiB host-reserve breach; record an incomplete result rather than retrying.
5. If the 1.1M ceiling or any reserve/floor fails, preserve the receipts and stop. If export completes, retain the raw master and the instrumentation receipt for independent mesh/visual review; it is still not admitted or a proof that other high-detail inputs are safe.

This is a changed-method feasibility experiment, not authorization to edit the guard or run it. Its remaining unknown is peak memory *inside* opaque CUDA operations; boundary telemetry narrows but cannot eliminate that uncertainty. A separate reviewer must inspect the exact profile/source before execution.

## Geometry-only probe comparison

**Preferred next experiment:** a versioned, nonshipping geometry-only probe is safer than the full `o_voxel` export-feasibility profile. It may allow the same 1,100,000-face provisional ceiling, but after decode it must copy only the exact decoder vertices and triangle indices to CPU and write a binary PLY. It must not construct `cumesh`, build a BVH, simplify, unwrap UVs, bake texture, make a GLB, or call `o_voxel`.

At the observed count, float32 XYZ positions would occupy 6,173,868 bytes and int32 triangle indices 12,357,504 bytes: 18,531,372 bytes (about 17.7MiB) of minimum payload before the PLY header and any conversion buffers. The profile must record actual tensor dtypes, shapes, device transitions, PLY byte count, and SHA rather than assuming those dtypes or claiming this payload bounds RAM. The decoder mesh and the CPU copy can coexist briefly; the existing 6GiB watchdog and every bootstrap/stage floor therefore remain mandatory.

### Geometry-probe acceptance

The probe is a useful master only when all of the following are recorded:

- decoded faces are at or below the explicit 1,100,000 one-off ceiling; otherwise it stops before writing;
- the owned child never crosses the 6GiB host reserve, and exits with documented post-child recovery;
- the PLY header and a separate lightweight re-read exactly match recorded vertex count, face count, index range, and SHA; no simplification, welding, repair, or format conversion occurs before that check;
- input hash, model/source hashes, seed, steps, plan, shape/texture CPU handoffs, and decoder geometry receipt are retained in the fresh private output;
- a separate Blender reviewer imports the PLY only for neutral multi-view and 48/96-pixel inspection, then creates a clearly named editable derivative if the root silhouette is useful.

The PLY is an exact **geometry master**, not a textured raw GLB, game asset, topology admission, or promise that later texture baking will fit. The retained CPU handoffs make a later, separately reviewed texture/export experiment reproducible in inputs, but do not guarantee an identical decoded mesh or safe `o_voxel` peak. Keep the current 750k default unchanged; this probe must live in a new profile and output directory.
