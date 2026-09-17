# Trailgloam standalone postprocess source-test receipt

- Frozen plan SHA-256 bound by source: `9fa8f42aee808a81216c5ae0b7fd324e5744ca1c56f59bc08b1976ce66532f5d`
- Tool SHA-256: `6f48df8b24a4b8a42dea4905783cec68ac3a4327933482d5e55afef5b62fd8d5`
- Installed native postprocess SHA-256: `8ece9f739090beb71f1b818ea09b79547c1c9370fccf37ac354bed854e28377d`
- No GPU job was started.

Passed commands: `py_compile`; `--self-test` (4, including a two-primitive GLB JSON inventory which sums positions and index triangles); venv `--cpu-schema-test` (8 rejections; largest fixture 3 vertices); and `--prepare-only --private-output .dream-loop\trailgloam-trellis\postprocess-r1 --public-output art\source\trailgloam-v1\trellis-trial\postprocess-r1\run`.

The run output is a new `postprocess-r1/run` child directory, leaving the reviewer evidence beside it intact. Completion inventory sums every mesh primitive rather than silently reporting only the first.

The exporter trace is pinned to the installed SHA and hooks CuMesh, BVH, remesh, simplification, UV, rasterization, bake BVH, and return. Each hook records a CUDA/host sample and applies the one-GiB next-phase CUDA guard; trace restoration is in `finally`. Native failures record `HOLD_POSTPROCESS_ERROR`.

Root command after source GO and GPU release:
```text
C:\Python310\python.exe tools\art\trellis-trailgloam-postprocess.py --run --private-output .dream-loop\trailgloam-trellis\postprocess-r1 --public-output art\source\trailgloam-v1\trellis-trial\postprocess-r1\run
```
