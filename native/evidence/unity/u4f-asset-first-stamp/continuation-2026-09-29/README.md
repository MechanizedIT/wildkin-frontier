# U4F continuation — owner-approved reference, guarded generation HOLD

## Disposition

**`U4F_SOURCE_GENERATOR_HOLD`** is the earliest honest result for this continuation. Chris approved candidate-04 from `u4f-rock-002` as the representative first source reference. The guarded Small512 server loaded, but the unchanged 6 GiB reserve guard stopped its owned process at 5.31 GiB free during attempt 1, after sparse-structure sampling and before shape generation completed. The request ended with a connection reset. No GLB, mesh audit, cleanup product, Unity import, stamp, or downstream implementation exists from this attempt.

An independent read-only reviewer confirmed the guard event and disposition. Attempt 2 was not started: the written policy allows it after a structurally bad raw result or a good-but-under-resolved result with additional headroom. This run produced no raw result, and a different seed would not address the evidenced memory failure. Lowering the reserve or closing applications is not authorized.

## Approved source

- Image: `art/source/u4f-rock-002/reference/candidate-04.png`
- SHA-256: `6B0D4606568158DE586F488BB0CAFE7B17E04C26B6C47F5528CEE6209043B0BC`
- Provenance: built-in Codex image_gen, 2026-09-29, model version undisclosed, 1536 × 1024 opaque RGB PNG.
- Candidate-04 is the first pipeline representative. Candidates 01–06 remain retained for future variation; this choice does not reject the others.

## Guarded attempt

The pre-launch reading was 21.21 GiB free system RAM and 7,390 MiB free VRAM on the NVIDIA GeForce RTX 3070 Laptop GPU. The guarded helper launched one Small512 server (PID 4152) at 2026-09-29 21:27:02Z. It loaded from local cached weights, became operational, and had no generation running before the request. Immediately before generation, RAM was 8.67 GiB free and VRAM was 7,355 MiB free. The API route reports task state `FAILED` by default while idle; its `ping` reported operational and `busy=false`.

Attempt 1 used the exact approved image, resolution 512, seed 1234, 12 sampling steps, one job, 60,000-face conservative export target, and 1024 texture. Sparse-structure sampling completed all 12 steps in 14.53 seconds. At the transition to Shape SLat, the existing launcher logged: `[RAM GUARD] Stopping owned TRELLIS process: only 5.31 GiB free.` The local client then received `ConnectionResetError [WinError 10054]`. It did not write its normal `trial.json`; the attempt directory contains zero files and no `raw.glb`.

At the first observed sample near client exit, RAM was 7.61 GiB free and the GPU reported 4,368 MiB free at 100% utilization. By 2026-09-29 21:33:47.7257524Z, the owned PID and port-7960 listener were absent, RAM had recovered to 22.42 GiB, and the GPU reported 7,372 MiB free at 5% utilization. No service restart or second generation was attempted.

Machine-readable measurements are in [`continuation-receipt.json`](continuation-receipt.json). The original first U4F resource HOLD remains preserved in the parent directory's `receipt.json`, `trellis-status.json`, and original README section; it concerned the now-rejected `u4f-rock-001` reference set and is historical.

## Independent review

See [`review-generation-gate.md`](review-generation-gate.md). The reviewer confirms the memory/guarded-runtime blocker and notes this evidence does not prove that another authorized provider or future safe profile could not work.

## Downstream gates

Not started: raw-source visual review, cleanup, pristine/stamp-source derivatives, Unity import and Edit-Mode stamp lab, SDF/BVH implementation, 0.25/0.125/optional 0.0625 m comparison, fidelity review, first damage, source-free reconstruction, tests, and Windows Player. These are not failures; the source-generation gate stopped the slice first. A Player build is not required after this earlier HOLD.

Unrelated local work remains preserved and unstaged: the U3 burst-readiness JSON, two HDRP settings assets, `Builds/`, `authoring/`, and portable browser evidence.
