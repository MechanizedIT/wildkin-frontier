# Lantern log quality512 R1 — terminal HOLD receipt

## Result

One approved full-export TRELLIS attempt ran with the unchanged fresh-process profile: 512, 12 steps, seed 1234, requested 30,000 export faces, 1K texture, offline staged children, 6GiB reserve, and 750,000 decoded-face refusal.

Background started 20:02:40Z and completed; conditioning, sparse, shape-flow, and texture-flow completed with child exit code 0. Decode began 20:05:46Z. At 20:06:12Z the decoder reported **6,755,672 faces / 2,052,588 vertices**; the unchanged 750,000-face guard refused export. Decode child exited 1 at 20:06:14Z, and the parent process exited afterward.

No raw GLB, texture export, Blender inspection, normalization, runtime admission, or retry exists.

## Prelaunch note

`--prepare-only` passed with 16.92GiB free versus 16.63GiB bootstrap requirement. The first `--run` invocation reused that populated directory and was refused before any GPU child launched. The sole actual attempt used the fresh `quality512-r1-run` directory and is the evidence copied here.

Public files include the exact plan, stage events, and preprocessed reference only. Tensor handoffs (`.pt`) remain private and are intentionally not published.
