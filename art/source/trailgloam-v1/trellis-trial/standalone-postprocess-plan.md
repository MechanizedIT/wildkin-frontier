# Trailgloam TRELLIS postprocess — standalone proposed contract (v2)

**Status: planning only; independent re-review required.** This is one separately reviewed continuation of the retained Trailgloam geometry run. It does not authorize a GPU job, another image inference, arbitrary checkpoint resume, a change to the ordinary full-export profile, or a rewrite of the raw master. standalone-postprocess-plan-v1.md preserves the held v1 text (SHA-256 a4e9e163d0b77c07d299563bbbd469507ef4eb882e679393af54105f6292a7f2).

## Immutable lineage

The archived executed runner is geometry-ply-v1/executed-runner.py, SHA-256 62a0a119267a8c17a48daf51f5894302adce856851d1c89883a700a02d07fbfa. Its retained parent record is fixed before Torch imports:

| Item | Pinned value |
| --- | --- |
| reviewed image | target-v2.png, SHA 417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff |
| profile/mode | fresh-process-per-stage-512-trailgloam-geometry-ply-v1 / trailgloam-geometry-ply-v1 |
| decoded cap / actual | 1,900,000 faces / 889,679 vertices and 1,804,432 faces |
| retained raw PLY | SHA 38b6173aa7a38f8c407f9c2a700016608504e2c949fe513323703afad595cb3f; 34,134,163 bytes; binary little-endian float32 XYZ |
| conditioning / sparse | conditioning.pt 1bfa3d17343e6e93d2829f4ade676fc84a47ef7656f803917f879617fd145b42; coords.pt afce98b7f9bab905279454e78af49d0a39996a61de853089e86c1a49cadc57b4 |
| shape / texture | shape.pt e67fd766272970221f23501be5ab98c5882d58e9246697620958c7361347b1c8; texture.pt b1a207b828433c68ae97cef3615fec56eff92dc7228f3e3b5fdfeec070d13fbc |

The matching rng-after-sparse.pt and rng-after-shape.pt hashes remain lineage evidence. The parent verifies all event-plan path, byte and digest bindings. A changed input, digest, profile, mode, count or path is a terminal HOLD: there is no partial resume, replacement inference, or retry.

## Two fresh serial children

The new profile is trailgloam-postprocess-v1, distinct from the PLY-only and ordinary full-export profiles. It keeps their offline environment, mutex, hidden-child launch, process scan and host-memory rules. Ordinary full export keeps its 750,000-face refusal unchanged.

### 1. Decode-to-master/state child

A fresh child loads only the exact owned shape and texture handoffs using torch.load(..., map_location='cpu', weights_only=True), applies the existing strict dictionary checks, then loads only the two 512 decoders. It keeps the normal decoder host-entry floor of **13.2999138664 GiB** (including the six-GiB reserve) and the 1.9M decoded-face cap.

It must reproduce 889,679 / 1,804,432, write a new float32 binary PLY, and compare its full bytes and SHA to the retained raw master. A mismatch ends before postprocess and never overwrites the master.

After that equality gate it writes a private, run-owned CPU state:

    ignored run directory/
      postprocess-state.pt
      postprocess-layout.json
      postprocess-state-manifest.json

### Exact state and layout contract

The child obtains the types from the installed decode path: MeshWithVoxel coerces geometry to float32/int32 (trellis2/representations/mesh/base.py); the pipeline emits coords = v.coords[:, 1:].contiguous() and attrs = v.feats.half() (trellis2/pipelines/trellis2_image_to_3d.py). The state file is a weights_only=True tensor dictionary with **exactly** these six CPU, contiguous tensors:

| key | required dtype / rank / shape | relation |
| --- | --- | --- |
| vertices | float32, rank 2, [889679, 3] | finite; byte count 889679*3*4; direct decoded-mesh copy |
| faces | int32, rank 2, [1804432, 3] | all values 0 <= i < 889679; exact decoder indices, not PLY writer's temporary int64 copy |
| attrs | float16, rank 2, [L, 6], L>0 | finite decoder texture features; L == coords.shape[0] |
| coords | int32, rank 2, [L, 3] | sparse XYZ voxel coordinates, contiguous; same L as attrs |
| voxel_size | float32, rank 1, [1] | finite positive scalar encoding; becomes to_glb voxel_size |
| origin | float32, rank 1, [3] | finite [-.5, -.5, -.5]; lineage/audit only because this service call uses the fixed matching AABB |

Every tensor is detached, contiguous and CPU-resident; it is rechecked after load before any CUDA operation. The state has no object, list, string, tensor subclass, device tensor, optional key or extra key. voxel_shape is not needed by to_glb; its absence is deliberate and recorded in the manifest rather than retaining an opaque torch.Size object.

postprocess-layout.json is UTF-8 canonical JSON with exactly:

    {
      "schema": "trailgloam-pbr-layout-v1",
      "channels": 6,
      "slices": {
        "base_color": [0, 3],
        "metallic": [3, 4],
        "roughness": [4, 5],
        "alpha": [5, 6]
      }
    }

The child rejects a different key set/order, schema, channel count, noninteger bounds, empty/reversed ranges, overlap, gap, or any slice outside [0,6). Only after validation may it reconstruct the four Python slice(start, stop) objects required by to_glb. This matches the installed pipeline PBR layout at trellis2/pipelines/trellis2_image_to_3d.py:88-92; to_glb reads these slices from attr_layout, not layout.

The manifest is strict JSON with only schema/version, lineage values, six tensor name/dtype/shape/nbytes records, state/layout SHA-256 values, raw-Ply SHA/counts/bytes, and installed source hashes. The postprocess child recomputes all of these facts before CUDA allocation.

### 2. Model-free postprocess child

This child starts only after decoder exit and ownership/process/RAM gates are checked again. It imports no TRELLIS pipeline, decoder, flow, conditioning, rembg or DINO weights. It loads state only with weights_only=True, performs the preceding schema/hash/count/PLY checks on CPU, reconstructs service-equivalent local variables, and releases the temporary wrapper before CuMesh/BVH work.

**RTX 3070 Laptop 8-GiB GPU gate.** This one-child route may enter CuMesh only when:

- host free RAM is at least **8 GiB**, retaining the existing **6 GiB** host reserve;
- CUDA reports a total in [7.5, 8.5] GiB, free VRAM of at least **6.0 GiB**, memory_allocated <= 0.25 GiB, and memory_reserved <= 0.25 GiB;
- the project mutex and process scan show this is the sole owned GPU process.

These figures are entry/stop safeguards, not a claim that they bound the native postprocess peak; the current measured preflight of 7.07 GiB free satisfies the entry floor. It samples host/CUDA at child start, state validation, wrapper release, CuMesh/BVH construction, remesh, simplification, UV, bake and GLB completion. The watchdog samples at least at every phase boundary and stops before the next allocation phase if host free drops below 6 GiB or CUDA free drops below **1.0 GiB**. It writes HOLD_GPU_GUARD with phase and samples, preserves raw PLY/state receipts, performs no retry, and leaves the master untouched. An allocation exception follows the same terminal HOLD path.

The only postprocess call is the installed service-equivalent path:

    glb = o_voxel.postprocess.to_glb(
        vertices=vertices, faces=faces, attr_volume=attrs, coords=coords,
        attr_layout=layout, aabb=[[-.5, -.5, -.5], [.5, .5, .5]],
        voxel_size=voxel_size, decimation_target=60_000, texture_size=1024,
        remesh=True, remesh_band=1, remesh_project=0, verbose=True,
    )

The retained 1,804,432 faces stay below the installed service 2,000,000 pre-simplification threshold; no preliminary simplification is added. Here 60,000 is the installed exporter decimation_target (the installed doc describes it as a vertex simplification target), not a promise of 60,000 faces. The receipt must report the actual output vertex and triangle counts. CuMesh/BVH, remesh, UV/bake and simplification make a separate textured derivative, never modify the retained PLY, and do not claim a shape repair.

## Required CPU rejection fixtures before any GPU authorization

The proposed implementation needs a CPU-only test command that writes tiny tensor/JSON fixtures and asserts terminal rejection before its CUDA gate:

1. valid minimal state/layout meeting every typed relation;
2. vertices changed to float64;
3. rank-3 faces;
4. one missing required tensor and one unexpected tensor key;
5. attrs/coords cardinality mismatch and an out-of-range face index;
6. malformed layout: wrong channels, overlap, and unknown slice key;
7. state-byte or manifest-hash mismatch;
8. raw PLY vertex/face count mismatch against manifest; and
9. non-tensor object payload rejected by weights_only=True.

Each fixture asserts no CUDA import/allocation and no GLB/PLY mutation. These are exact rejection checks, not decoder or model tests.

## Outputs and review boundary

A fresh public directory receives only receipts and derivative:

    art/source/trailgloam-v1/trellis-trial/postprocess-r1/
      run-plan.json, events.json, decode-state-receipt.json,
      postprocess-receipt.json, raw-textured-simplified.glb

Private tensors remain under the ignored run directory. After both children exit, the GLB still requires independent geometry, texture, all-angle, 48/96px, scale, performance and species-admission review. It is not a runtime, collider, animation, encounter or save artifact.

