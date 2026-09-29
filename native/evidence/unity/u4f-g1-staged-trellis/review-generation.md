# U4F-G1 generation gate

## Pre-run decision

**Decoded raw-geometry ceiling: 2,500,000 faces.** This was selected before the staged attempt from repository history:

- Rootbound geometry-only PLY: 1,029,792 faces.
- Lantern geometry-only PLY: 2,218,798 faces.
- Trailgloam geometry-only PLY: 1,804,432 faces.
- Heartwood staged decode: 7,057,316 faces, safely refused by the ordinary 750,000-face export profile; it did not produce a raw PLY.

The selected cap is 281,202 faces (about 12.7%) above the highest completed raw-PLY result. That is enough headroom over observed 512 geometry masters while retaining a finite, input-specific limit. It changes only the candidate-04 raw-PLY profile. Ordinary full export stays at 750,000, Rootbound at 1,100,000, Lantern at 2,300,000, and Trailgloam at 1,900,000. The face check runs after mesh decode and therefore does not claim to cap decoder peak memory.

The existing installed TRELLIS shape decoder emits vertex positions and triangle indices from shape SLat without texture SLat. The new profile therefore omits the texture-flow child and invokes `decode_shape_slat` directly. Texture sampling, texture decoding, UV/bake, CuMesh, BVH, simplification, `o_voxel`, and GLB export are forbidden for this profile. The process-separated runner, 512 path, seed 1234, 12 steps, single sample, offline mode, and `low_vram=True` remain fixed.

## Pre-run resource gate

The runner's metadata-only plan measured 18.731 GiB free RAM and calculated 16.633 GiB bootstrap headroom. The fresh pre-run host snapshot at 2026-09-29T22:13:23.9608283Z recorded 31.775 GiB total RAM and 18.173 GiB free. The plan fits by 1.540 GiB at that snapshot.

The six metadata stage requirements were background 9.646 GiB, conditioning 10.259 GiB, sparse 15.633 GiB, shape-flow 15.221 GiB, texture-flow 15.221 GiB, and decode 13.300 GiB. Texture-flow is not scheduled by this profile; its calculated requirement remains present in the runner's conservative whole-plan bootstrap check.

The GPU snapshot reported an NVIDIA GeForce RTX 3070 Laptop GPU with 8,192 MiB total, 7,333 MiB free, and 7% utilization. No competing TRELLIS Python process, port-7960 listener, or staged-run mutex owner was present. The mutex probe was immediately released. The single-use generation output directory and durable raw-artifact directory were both absent.

Focused profile/runner self-tests passed 26/26 before this preflight.

## One staged attempt result

The single authorized attempt ran from 2026-09-29T22:13:53Z to 2026-09-29T22:17:36Z. Background, conditioning, sparse, shape-flow, and decode each ran in a fresh child and exited 0. The texture-flow child was structurally omitted by the immutable shape-only profile. Parent polling found no runtime-reserve breach; the stage handoff hashes and exact UTC boundaries are in `metrics/stages.json`. This runner has no per-stage GPU telemetry; only the pre-run GPU snapshot is available.

Observed parent-sampled free RAM minima were 15.876 GiB (background), 16.030 GiB (conditioning), 11.084 GiB (sparse), 10.998 GiB (shape-flow), and 15.108 GiB (decode). Free RAM after child exits was 17.657, 17.688, 18.067, 18.349, and 18.413 GiB respectively. In particular, RAM recovered from 11.084 GiB after sparse to 18.066 GiB before shape-flow; after shape-flow it returned to 18.349 GiB before decode. The lowest observed reading was 10.998 GiB during shape-flow, 4.998 GiB above the unchanged 6 GiB runtime reserve. Stage-specific values are monitored entry gates; runtime enforcement continues to use the reserve and owned-child watchdog.

The shape-only decoder produced 1,594,784 triangles and 796,082 vertices, below the predeclared 2,500,000-face ceiling. The raw binary PLY is 30,285,576 bytes with SHA-256 `4CC76DC0608ED0E3575E25718C3B606561AA7925C4CD5D46350C4576D5958C5D`. No texture sample/decode, UV, bake, CuMesh, BVH, simplification, or GLB export ran. The output and receipts were copied byte-exactly to the durable raw-source directory immediately after success.

**Generation disposition:** PASS for raw geometry production. Independent visual review assigns `U4FG1_RAW_SOURCE_CANDIDATE`: worth one bounded cleanup pass, but the large open underside and 6,356 boundary / 9,864 nonmanifold edges block direct stamp use. The full raw review is in `review-raw-source.md`; topology and exact Blender import are in `metrics/inspection.json`. No Unity work began.
