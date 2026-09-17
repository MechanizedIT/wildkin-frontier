# Native postprocess R1 — execution history

Root launched the independently reviewed runner `6f48df8b24a4b8a42dea4905783cec68ac3a4327933482d5e55afef5b62fd8d5` once. Exact executed bytes are preserved in `executed-runner.py`; public receipts are under `run/`. The terminal parent session was 84884, exit 1.

The two-decoder child reproduced the retained raw PLY byte-for-byte and saved CPU state for postprocessing. Its PLY SHA remains `38b6173aa7a38f8c407f9c2a700016608504e2c949fe513323703afad595cb3f`; the state SHA is `5e7faaacda9cc4bc6999828405365f065995aee73e56292f623d4eab7494b7c1`. Private tensors remain outside public art.

The separate model-free child failed before the first native mesh phase: `module 'flex_gemm.kernels' has no attribute 'triton'`. The terminal error sample records 16.54GiB host RAM and 6.78GiB CUDA memory free. This was an import/bootstrap failure, not an out-of-memory result, mesh-quality rejection, or failed simplification result. No GLB was produced. The original child launcher did not retain child stdout/stderr, so only its structured error and parent traceback are available.

The bounded repair reuses the exact decoded state, applies the installed Windows flex_gemm compatibility patch before o_voxel, and records child logs. It does not regenerate the model, weaken memory limits, or overwrite this attempt. A narrowed Python trace avoids per-line path resolution through unrelated imports. The retry has a separate plan/source review and fresh public output.

The original plan's watchdog wording described a direct HOLD record; the implemented hard-exit watchdog instead leaves the parent to write the terminal HOLD receipt. No watchdog exit occurred in this attempt. The reviewed output root contains review documents, so actual run artifacts use its fresh `run/` subdirectory.

## Successful native export and actual inspection

The first retry parent stopped before spawning because it attempted to recreate the existing private state directory. A one-line conditional directory fix and a mocked parent regression now prove the postprocess-only path preserves existing private bytes and launches no decoder. Attempted and successful runner versions remain separately archived.

Root ran source `d7c6499755c363830f07ee8707f101d73aec5ac7cd3daa0ecf96f7be41605c97` in session25275, terminal exit0. `retry-import-fix/raw-textured-simplified.glb` is 3,889,708 bytes, SHA `e223fdd1e9ca1d5d7299d756a142915d54107af7a10a91103338ee5c531c1933`, with one mesh/primitive, 40,868 exported vertices and 59,376 triangles. The native log records remesh to3,375,296 faces, simplify to59,412, cleanup to59,378, then removal of two degenerate faces during UV processing. The exporter target60,000 is a setting, not a guaranteed final count. Textures are1024 square.

The narrowed trace recorded **zero native phase samples**. Export logs establish that remesh/simplify/UV/bake ran, but do not prove the phase memory gates executed or establish a peak. Entry checks, host watchdog and terminal memory sample were present. Preserve the usable model; diagnose this instrumentation flaw before another GPU postprocess. Do not rerun this asset merely to improve telemetry.

After TRELLIS exited, Blender session46806 completed42 matching textured/neutral views and saved editable inspection source in14.45s. Minimum sampled host free RAM was17.12GiB. Source hash, geometry/transforms, original material slots, indices and smoothing passed preservation checks. One material and1024-square textures are present. The GLB's UV-split1,048 vertex components are not1,048 detached physical solids. A separate position-welded diagnostic has80 components, zero boundary edges and26 nonmanifold edges; source remains unchanged. Independent visual review retains this attractive usable derivative, with fitted scale, topology/skin preparation, six-leg motion and runtime admission still pending.
