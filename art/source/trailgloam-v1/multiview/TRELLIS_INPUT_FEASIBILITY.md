# Trailgloam TRELLIS input feasibility

**Latest direction:** earlier single-perspective all-leg visibility holds below are historical. The owner requests TRELLIS-first organic production. A separate experimental review now approves `art/source/trailgloam-v1/rotation-1-reference/target-v2.png`; see `art/source/trailgloam-v1/trellis-trial/reference-review.md`. Far-side anatomy is declared inference and must be inspected/repaired after generation. The multi-panel construction sheet is still not a valid single-image input.

**Scope:** read-only local-tool investigation on September 14, 2026. No TRELLIS, Blender, or GPU generation ran.

## Finding

Do not submit `trailgloam-orthographic-v1.png` to the installed TRELLIS service. It is a conditionally passed **construction sheet**, not a valid one-subject generator input. The project wrapper `tools/art/test-trellis-local.py` posts one multipart `file` to `/generate_no_preview`. The installed service's `/generate_multi_no_preview` endpoint explicitly loads a list but takes `images[0]` and its source says it uses only the first image. The staged experiment is also explicitly “one-image TRELLIS 512.” Therefore the six-panel sheet would become an ambiguous collage, not aligned multi-view conditioning.

## Safe candidate-input path

There is **no currently approved single-object input** for a Trailgloam TRELLIS job:

- `reference-v1.png` and `reference-v2.png` remain HOLD because they do not prove all six legs.
- `trailgloam-orthographic-v1.png` conditionally passes only as a multi-view construction plan and must not be sent whole.
- No panel has been extracted or edited. There is no reviewed single-object input; the root chose to stop this lane at the construction-reference checkpoint rather than spend additional image rounds on a generator input.

The safest future path is one separately approved clean, single-subject, neutral three-quarter Trailgloam image that visibly preserves the sheet's six-legged anatomy and two opaque socketed fronds. It can use this sheet as construction guidance during its own independent review, then be passed alone to the existing 512 one-file runner. That asset does not yet exist, so the safe recommendation is **defer the one guarded job** rather than use a held beauty image or a collage.

## Current machine/tool budget

- GPU snapshot: RTX 3070 Laptop GPU, 8 GiB total VRAM; 7.20 GiB free; 8% utilization.
- System snapshot: 18.47 GiB free of 31.77 GiB.
- The documented `Small512` guard requires 18 GiB free before model import and a 6 GiB reserve. Present headroom clears that threshold by about 0.47 GiB only; it is adequate for a supervised eligibility check, not a promise of an inference run.
- `trellis-staged.py --prepare-only` reports 16.633 GiB bootstrap requirement and current RAM fit, but that route remains unproven and its docs do not make it a production default.
- The loopback service is absent or still loading (`ready: false`). Do not launch a competing server automatically.

## If root later schedules exactly one job

Use the documented guarded `Small512` service only after checking fresh RAM, VRAM, service/process ownership, and the single reviewed input. Budget one 512-pixel, 12-step, 1K-texture trial in a fresh nonshipping experiment directory; historical 512 timing was 104 seconds for a different asset and is not a guarantee. Preserve the raw master, input hash, parameters, GPU samples, and later multi-angle review. Do not schedule TRELLIS until the missing single-subject input exists and is independently approved.
