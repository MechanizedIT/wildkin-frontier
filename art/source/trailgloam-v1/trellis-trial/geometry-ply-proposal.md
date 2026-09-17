# Trailgloam exact-input geometry-only PLY profile — proposal

**Status: proposal for independent technical review. No code or GPU work is authorized.** The first service quality trial is retained as a successful staged numerical inference but a terminal full-export hold: its decoded mesh was **1,804,432 faces / 889,679 vertices** at `11.6805 GiB` host free memory. The ordinary full-export 750,000-face cap remains correct and unchanged.

## Narrow changed method

Propose one new immutable `trailgloam-geometry-ply-v1` profile in `tools/art/trellis-process-staged.py`, modeled on the existing fixed-input Rootbound and Lantern PLY exceptions:

| Contract | Proposed value |
| --- | --- |
| Allowed input SHA-256 | `417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff` only |
| Decoded-face ceiling | `1,900,000` faces only for this geometry-only profile |
| Observed trial count | 1,804,432 faces / 889,679 vertices |
| Seed / inference | fresh 512 pipeline, one image, seed 1234, 12 steps, all six existing numerical stages |
| Result | binary `raw-geometry.ply`; no GLB or texture artifact |
| Default full export | unchanged `full-export`, 750,000 decoded-face cap, 30k final request |

The 1.9M ceiling has 95,568 faces above the observed staged decoder count. A fresh staged run can differ despite identical input/seed/steps, so this margin is not a completion guarantee. It is a per-profile artifact ceiling, not a claim about decoder memory, an export budget, or a general Trailgloam/TRELLIS exception. Any input-byte change must fail before model import; mutable `plan.json` fields for mode, cap, output name and allowed hash must be rederived from immutable profile constants before child execution.

## Exact PLY behavior

After ordinary decode and before importing `o_voxel`, a successful child must:

1. validate finite decoder coordinates, absolute coordinate ≤32,768, exact vertex/face counts and integer index range;
2. copy decoder positions to contiguous CPU **float32** without float16 conversion; copy triangle indices to contiguous CPU storage and validate before emitting little-endian `uint32` indices;
3. write binary little-endian PLY records directly: `float x,y,z` vertices and `uchar 3 + uint32 i,j,k` triangular faces;
4. re-read the emitted PLY and record counts, min/max index, finite position validation, byte count, position-payload SHA-256, full-file SHA-256, source index dtype/device/bytes, CPU index dtype and copied byte counts.

It must do **none** of: CuMesh creation, BVH, `o_voxel`, cleanup, simplification, remesh, UV unwrap, texture bake, GLB export, welding, normal repair, or topology repair. It preserves source order and float32 position bytes; PLY is the high-detail untextured master.

At the measured count, the position block is `889,679 × 12 = 10,676,148` bytes. Triangle indices as `uint32` are `1,804,432 × 3 × 4 = 21,653,184` bytes. The direct PLY body is `10,676,148 + (1,804,432 × 13) = 34,133,764` bytes plus a small ASCII header. This is a file-size estimate only. If decoder indices originate as `int64`, their source tensor is `43,306,368` bytes before the explicitly recorded CPU conversion; coexistence with decoder tensors remains a peak-memory risk, not a reason to omit the watchdog.

## Lifecycle and guard preservation

Use a fresh private output only, with **no resume** from service or prior staged handoffs. Run ordinary background, conditioning, sparse, shape-flow, texture-flow and decode children in strict serial order; tensor/RNG handoffs are created only under that new output directory and remain private. Preserve exactly: standard-library parent, offline environment, shared TRELLIS mutex/competing-process refusal, hidden owned Windows children, no unowned process termination, bootstrap and stage floors, 6 GiB parent/child reserve watchdog, coordinate ceiling, and input/output path bounds.

The ordinary `full-export` branch must retain its 750k decoded-face refusal and existing 8 GiB `o_voxel` export floor unchanged. This new branch never invokes `o_voxel`, so it cannot claim to have cleared full-export’s workspace/export guard; it must record that distinction in its receipt.

## Proposed command after source review

Use distinct fresh paths; `--prepare-only` writes only the disposable preflight path and `--run` requires a new empty run path.

```powershell
$input = 'C:/absolute/path/to/trailgloam-target-v2.png'  # SHA-256 must equal 417daef…d2afc2ff
$install = 'C:/Users/cwood/Tools/trellis2-stableprojectorz/code'
$python = 'C:/Python310/python.exe'

& $python tools/art/trellis-process-staged.py --prepare-only --install-root $install --input $input --output-dir C:/Users/cwood/Documents/mobile-rpg/.dream-loop/trailgloam-trellis/geometry-ply-v1-preflight --seed 1234 --steps 12 --faces 30000 --profile trailgloam-geometry-ply-v1
& $python tools/art/trellis-process-staged.py --run --install-root $install --input $input --output-dir C:/Users/cwood/Documents/mobile-rpg/.dream-loop/trailgloam-trellis/geometry-ply-v1-run --seed 1234 --steps 12 --faces 30000 --profile trailgloam-geometry-ply-v1
```

The `--faces` argument remains syntactically bounded but has no geometric effect in this PLY branch; record that it was unused rather than suggesting a 30k derivative exists.

## Review and stop conditions

Before implementation, independent review must inspect the exact constants, immutable-plan validation, pre-`o_voxel` branch ordering, PLY re-read/protocol tests, and the new input hash fixture. The implementation must pass focused no-Torch parent, fresh-output, profile-mutation, exact-input rejection, PLY count/index/dtype/hash, and full-export-isolation tests without models.

A run stops and preserves receipts if the decoded count exceeds 1.9M, any floor/reserve is breached, input changes, PLY validation fails, or an owned child fails. If PLY succeeds, preserve private handoffs and copy only `raw-geometry.ply`, plan/events, preprocessing receipt, PLY receipt and hashes to a public Trailgloam source directory. A separate Blender raw visual/topology review is required before any cleanup, reduction, texturing, rigging, runtime export or admission.
