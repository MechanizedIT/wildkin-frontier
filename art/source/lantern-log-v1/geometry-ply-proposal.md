# Lantern Log — proposed raw TRELLIS geometry follow-through

**Historical proposal, now implemented and executed as [R5](geometry-ply-r5/run-receipt.json).** The original proposal below records the pre-run decision; see the [actual review](geometry-ply-r5/visual-review.md) for the resulting raw-model HOLD. R3 and R4 remain useful manual evidence, but both miss the reference's broad organic wood mass. Stop repeating five-section/rim adjustments. A changed method can use the already reviewed V2 image with a new, separately reviewed geometry-only output profile.

## Evidence and bounded change

The V2 512/12-step/seed1234 full-export attempt decoded 2,218,798 faces and 1,077,634 vertices with 14.2509GiB free RAM before the ordinary 750k export refusal. It exported nothing. The observed headroom is historical, not a guarantee for another run.

The existing tree-specific `geometry-ply-v1` path in `tools/art/trellis-process-staged.py` copies exact decoded CPU positions/indices through `trellis_geometry_ply.py`, bypassing o_voxel, CuMesh, BVH, UVs, texture baking, simplification and GLB export. That exception is pinned to the buttress image and capped at 1.1M faces. It must not be reused for Lantern or have its guard silently raised.

A proposed new `lantern-geometry-ply-v1` profile would pin **only** `art/targets/rootbound-wildwood/constituents/lantern-log/reference-v2.png`, SHA `85bd175a6b102cf183b50ff5ca45a1afd6847a6920a28b0039bd8e1e98d6b2ac`, with a dedicated maximum **2,300,000 decoded faces**. Preserve the ordinary full-export 750k limit, the existing tree profile's input and 1.1M limit, all 6GiB reserve/offline/model-config/child-process/mutex guards, fresh-directory refusal and exact-format validation. Record the new profile and input binding in both plan validation and the decode receipt. No general user-supplied cap or arbitrary-image exception.

This is a different output contract, not a promise that the ordinary exporter can safely handle more faces. It writes geometry only. A new cap needs independent resource/source review before execution; refusal above it remains terminal.

## Resource estimate and retained state

At the observed counts, float32 XYZ requires 12,931,608 bytes and PLY triangle records require 28,844,374 bytes, plus a small header: approximately 39.84MiB on disk. CPU conversion/validation uses additional position, int32/int64 index and file buffers; conservatively budget at least .25GiB beyond the already decoded mesh, and let the unchanged live reserve watchdog refuse if necessary. A serialized Blender import/render is a separate later job, with its own fresh resource check. No global-intersection/manifold or texture claim follows from a PLY.

The failed V2 directory retains private tensors but no raw mesh. The current runner has no supported resume/start-at-decode mode, and `--run` requires a fresh output directory. Use one fresh six-stage run after the new profile passes review and tests; do not reinterpret old handoffs as an authorized resume path. Keep raw tensors private and preserve prior failed receipts.

## Required focused proof

Tests must show: unchanged full-export/tree contracts; exact Lantern image pin; malformed or tampered plan refusal; profile-specific cap boundaries; no route into the full exporter for either geometry-only profile; exact binary PLY round-trip/finite-position/index checks. Inspect the final source independently before granting the exclusive GPU slot. Record terminal child/parent state and actual output counts/hash. If a PLY is produced, preserve it untouched, inspect actual neutral views in Blender, then decide whether normalization or a separate reduced derivative is useful. A generated reference or valid file is not model admission.

This would be the next changed-method constituent attempt after two full-export refusals and two manual candidates. It does not authorize another unchanged manual repair or a runtime asset replacement.
