# Independent source review — GO

**GO for one fresh, serialized postprocess run** of tool SHA-256 `6f48df8b24a4b8a42dea4905783cec68ac3a4327933482d5e55afef5b62fd8d5`, pinned to plan SHA-256 `9fa8f42aee808a81216c5ae0b7fd324e5744ca1c56f59bc08b1976ce66532f5d`.

The parent now validates all pinned lineage artifacts, input/master/archive state, plan and installed `o_voxel` source before either child starts. It has a typed 64-bit Windows mutex, a read-only competing-process scan, absolute artifact paths across the child working-directory change, full offline child environment, and a six-GiB host watchdog.

The decode child instantiates only the reviewed shape and texture decoders; it does not load the full pipeline model set. It reconstructs and byte-compares the pinned raw master before the model-free postprocess child. That child traces the hash-pinned installed `postprocess.py` at verified CuMesh, BVH, remesh, simplification, UV, raster, bake-BVH and return boundaries; every boundary records a host/VRAM gate. The terminal GLB inventory now sums all mesh primitives rather than silently reporting only the first.

Independent checks passed: `py_compile`, four unit tests, the eight-rejection tiny production-schema fixture, and fresh-output `--prepare-only` in the intended venv. The matching source-test receipt now records this final SHA. The run remains a derivative experiment only: a successful GLB is not topology, texture, scale, rig, collision, runtime, or species admission.

## Retry import-fix re-review — GO

**GO for one postprocess-only retry** using tool SHA-256 `efea69cf79b19fec8e84dabd5b3ab6f7298a898d63480fc979e96f1314290e17` and retry-plan SHA-256 `d29f6190d81043db13bf88e0d9272ab6db1c247f43fdcbbb20231263d164bffd`.

The first run completed the decode equality gate and stopped before native work because flex-gemm compatibility was not installed before `o_voxel` import. This retry pins and rechecks the exact state, layout, manifest, verification PLY, and retry-plan bytes; it skips decode, calls `_apply_patches()` before `o_voxel`, keeps the model-free/resource-guarded path, and writes fresh child stdout/stderr. `_apply_patches()` only configures flex-gemm; it does not load a TRELLIS model.

The trace now returns a local line tracer only for the hash-pinned installed postprocess source frame, preserving phase gates without tracing unrelated imports. Independent final checks passed: compile, five unit tests, eight tiny schema rejections, and exact-state retry `--prepare-only`. This is a corrective continuation, not new inference or a decode retry.

## Future trace binding repair — GO

Reviewed future-only tool SHA-256 `3196e0d8a6b279bcc84406a2e6fc24b10ce78885bd6b6259dee96cf62469cd04`. It binds tracing to the actual imported `o_voxel.postprocess` module path and SHA, then uses `to_glb.__code__` identity rather than a guessed filename. The receipt records the imported path, hash and first line. The local tracer retains only the reviewed installed-hook lines. If no hook is observed, the GLB is preserved but the child emits `HOLD_PHASE_TRACE` and fails clearly; it cannot silently represent missing samples as successful telemetry.

The focused fake-code identity test confirms target-code selection rejects a sibling function; compile, six self-tests and the existing eight CPU rejection fixtures pass. This corrects future evidence collection only and does not justify re-exporting the retained derivative.

## Historical HOLD — superseded

Reviewed the current draft of `tools/art/trellis-trailgloam-postprocess.py` (SHA-256 `7f05fafc6fb06c27abc5d3812997162c314d92d9ac7aa3dcff7961a0e528530c`) against the frozen standalone postprocess plan (`9fa8f42a…32f5d`). `py_compile` and the draft's three small self-tests pass, but this is **HOLD — do not launch**.

The draft correctly avoids `Trellis2ImageTo3DPipeline.from_pretrained()` and constructs only the two decoder models; it also uses absolute repository constants for the master and archive. The remaining defects are bounded but material:

- `CreateMutexW` has no `c_void_p` return/argument declarations, so its handle can be truncated on 64-bit Windows. It must use an explicitly typed kernel32 binding.
- The plan requires the shared mutex **and** a competing TRELLIS-process scan; the draft has only the mutex.
- CPU rejection fixtures allocate production-sized vertex and face tensors, so they are not the promised tiny CPU fixtures. Parameterize the schema checker or add a small-spec fixture path.
- The unsafe-payload test catches broad `Exception`, including its own deliberate `AssertionError`; it can pass when unsafe loading is accepted. Make acceptance an explicit failing `else` path.
- The postprocess child samples only entry, pre-CuMesh and completion. It does not implement the stated phase-boundary host/VRAM checks for remesh, simplification, UV and bake. The implementation must add meaningful boundaries/gates or narrow the plan honestly before execution.
- The postprocess receipt records GLB bytes/hash but not the promised actual output vertex and triangle counts.

Earlier concern about a full `from_pretrained` pipeline and relative master paths is resolved in this draft. A revised source hash, focused negative tests, and review are required before the one serial GPU run.
