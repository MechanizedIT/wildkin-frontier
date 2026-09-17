# Retry import-fix source receipt

- Retry-plan SHA-256 pinned by source: `d29f6190d81043db13bf88e0d9272ab6db1c247f43fdcbbb20231263d164bffd`
- Tool SHA-256: `efea69cf79b19fec8e84dabd5b3ab6f7298a898d63480fc979e96f1314290e17`

Passed CPU-only checks: `py_compile`; five self-tests, including a negative changed retry-pin fixture and aggregate GLB inventory; eight tiny production-validator schema rejections; and exact-state `--prepare-only --retry-postprocess`. The global trace now returns a line tracer only on a `call` to the precomputed, hash-pinned installed postprocess filename. No GPU run occurred.
