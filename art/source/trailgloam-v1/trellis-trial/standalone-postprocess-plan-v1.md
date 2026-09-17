# Trailgloam TRELLIS postprocess — standalone proposed contract

**Status: planning only.** This proposes a separately reviewed implementation
for one *owned continuation* of the retained Trailgloam geometry run. It does
not authorize a GPU job, a new inference input, an arbitrary resume, a change
to the ordinary full-export profile, or a rewrite of the raw master.

## Exact retained lineage

The source authority is the archived executed runner
[`geometry-ply-v1/executed-runner.py`](geometry-ply-v1/executed-runner.py),
SHA-256 `62a0a119267a8c17a48daf51f5894302adce856851d1c89883a700a02d07fbfa`.
The current shared runner has since changed (current read-only SHA
`1ebc8804977103229253243a0ee28047e87b68e72ee87b4ee7356abd007e0f8b`); it
must not silently stand in for the archived execution. A new, dedicated
postprocess runner needs its own independent source review and must encode the
following immutable parent record before it imports Torch:

| Item | Pinned value |
| --- | --- |
| reviewed image | `target-v2.png`, SHA `417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff` |
| profile/mode | `fresh-process-per-stage-512-trailgloam-geometry-ply-v1` / `trailgloam-geometry-ply-v1` |
| decoded cap | 1,900,000 faces |
| actual decoded mesh | 889,679 vertices; 1,804,432 faces |
| retained raw PLY | SHA `38b6173aa7a38f8c407f9c2a700016608504e2c949fe513323703afad595cb3f`; 34,134,163 bytes; float32 XYZ |
| conditioning handoff | `conditioning.pt`: SHA `1bfa3d17343e6e93d2829f4ade676fc84a47ef7656f803917f879617fd145b42`, 8,431,501 bytes |
| sparse handoff | `coords.pt`: SHA `afce98b7f9bab905279454e78af49d0a39996a61de853089e86c1a49cadc57b4`, 45,218 bytes |
| shape handoff | `shape.pt`: SHA `e67fd766272970221f23501be5ab98c5882d58e9246697620958c7361347b1c8`, 395,029 bytes |
| texture handoff | `texture.pt`: SHA `b1a207b828433c68ae97cef3615fec56eff92dc7228f3e3b5fdfeec070d13fbc`, 395,045 bytes |

The matching `rng-after-sparse.pt` and `rng-after-shape.pt` event hashes are
also reverified as lineage evidence, although decode consumes the exact shape
and texture tensor dictionaries. The parent verifies all listed bytes and
hashes against the retained `geometry-ply-v1/events.json` and plan before it
starts a child. A changed path, digest, count, input, mode, or profile is a
terminal HOLD. This is a narrow, run-owned continuation, not a general resume
interface for user-supplied checkpoints.

## Two fresh, serial children

The proposed profile is `trailgloam-postprocess-v1`; it is distinct from both
the existing Trailgloam PLY-only profile and ordinary `full-export`.

### 1. Decode-to-master/state child

The first hidden child owns the same offline environment, mutex, process scan,
seed/steps provenance, and fixed Trailgloam input lineage. It loads the exact
owned tensor dictionaries with `torch.load(..., map_location='cpu',
weights_only=True)`, then applies the existing strict dictionary validation:
only expected tensor keys, ranks, shapes, finite values, allowed dtypes, and
matching shape/coords cardinality are accepted. It restores no arbitrary Python
objects and loads no alternate input or model state.

The child loads only the two 512 decoders needed to decode the revalidated shape
and texture state. It retains the normal decode entry floor (`13.2999138664`
GiB including the six-GiB reserve) and the fixed 1.9M decoded-face cap. It
must reproduce the pinned `889,679 / 1,804,432` count, write/revalidate a
float32 binary PLY, and compare its exact raw-Ply SHA/bytes with the retained
master above. A mismatch preserves terminal evidence and stops before any
postprocess work; the existing PLY is never overwritten.

After the PLY check, the child detaches the decoded mesh into a private,
run-owned CPU mesh-state handoff:

```text
postprocess-state.pt: vertices, faces, attrs, coords, voxel_size
postprocess-layout.json: strict JSON attr-layout encoding and source hashes
postprocess-state-manifest.json: tensor names/shapes/dtypes/byte counts,
  PLY SHA/counts, parent plan/events hashes, input/profile/mode, and state SHA
```

Only the listed tensor payload is serialized. `vertices` retain the decoder
float32 XYZ, `faces` retain the exact integer triangle rows, and `attrs`/
`coords` retain the texture volumes needed by the installed postprocessor. The
layout is encoded and revalidated separately rather than deserializing a
pickled layout object. The high-detail PLY remains the preserved master.

### 2. Model-free postprocess child

Only after the decode child exits and RAM/process ownership is rechecked does a
new child start. It must not construct a TRELLIS pipeline or load decoder,
flow, conditioning, rembg, or DINO weights. It reads the state with
`weights_only=True`, validates every manifest hash/schema/count before CUDA
allocation, reconstructs the service-equivalent local variables, then detaches
the temporary mesh wrapper before postprocess.

Immediately before `CuMesh`/BVH work it requires at least **8 GiB host free**
(the retained 6 GiB reserve plus 2 GiB workspace) and samples CUDA device name,
`mem_get_info()` free/total, `memory_allocated()`, and `memory_reserved()`.
The six-GiB watchdog continues through CuMesh/BVH creation, remesh,
simplification, UV, bake, and GLB write. It records the same host/CUDA samples
at state load, wrapper detach, CuMesh/BVH, remesh, simplification, UV, bake,
and completion. A guard breach or exception leaves the raw PLY and state
receipts intact and ends this sole attempt without retry.

The only modeled library call is the current installed service-equivalent path:

```python
glb = o_voxel.postprocess.to_glb(
    vertices=vertices, faces=faces, attr_volume=attrs, coords=coords,
    attr_layout=layout, aabb=[[-.5, -.5, -.5], [.5, .5, .5]],
    voxel_size=voxel_size, decimation_target=30_000, texture_size=1024,
    remesh=True, remesh_band=1, remesh_project=0, verbose=True,
)
```

`attr_layout` is required by the installed function. The prior staged
`layout=...` call is not reused. The 1,804,432-face raw mesh is below the
installed service’s 2,000,000-face pre-simplification threshold, so no
pre-simplification is inserted before this call. The library's remesh,
CuMesh/BVH, UV/bake, and simplification create a **new textured GLB derivative**;
they do not edit the saved PLY or imply a shape correction.

## Outputs and review boundary

The derivative goes to a fresh public candidate directory alongside receipts,
not over `geometry-ply-v1/`:

```text
art/source/trailgloam-v1/trellis-trial/postprocess-r1/
  run-plan.json, events.json, decode-state-receipt.json,
  postprocess-receipt.json, raw-textured-simplified.glb
```

Private tensor state stays under the same ignored run directory and is never
published. After both children have exited, the GLB requires independent raw
geometry, texture, all-angle, 48/96px, scale, and species-admission review.
It is not a runtime, collider, animation, encounter, or save artifact.

The ordinary full-export route retains its 750,000-face refusal and all of its
existing guards unchanged. This proposal is a one-purpose simplification route
for the verified Trailgloam raw master, not a cap increase or a general export
framework.