# R3 source gate

Historical pre-execution note. The approved script subsequently ran and failed
its cap winding/coverage gate before studio rendering. The final status is in
`r3-execution-closure.md` and `final-review.md`; no R3 export was admitted.

Prepared only. `build_massing_r3.py` has **not** been executed. It verifies the final SHA-256, reads UTF-8 `ring.coordinatesXYZ` directly, builds the two separate concave cap ngons, and triangulates only those faces with `bmesh.ops.triangulate`.

The structural gate persists explicit BVH pair classes. Only triangles sharing a complete mesh edge are waived; all one-shared-vertex and non-adjacent candidates receive the narrow phase and their tested and confirmed lists remain in `metrics.json`.

After root and independent source approval, `--execute` first creates transparent 96px cap renders. It loads each saved PNG, measures alpha coverage in the central 60% frame, writes the opaque-pixel and coverage evidence to `metrics.json`, and aborts before studio rendering unless each cap meets both declared thresholds. Studio/all-angle rendering starts only after that gate passes.

Root and the independent reviewer must inspect/approve the executable source before authorising the final candidate run with `--execute`.
