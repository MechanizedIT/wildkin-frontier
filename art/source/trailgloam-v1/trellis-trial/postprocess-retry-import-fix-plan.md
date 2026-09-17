# Trailgloam postprocess retry import-fix plan

The first postprocess run decoded and hash-matched the raw master, then failed before native phase entry because `o_voxel.postprocess` imported `flex_gemm` before the Windows compatibility fallback. This retry preserves that state and does not load any model or repeat decode.

Pinned private inputs: state `5e7faaacda9cc4bc6999828405365f065995aee73e56292f623d4eab7494b7c1`, layout `1bf19c62632e26b4cd9df5dc202152c6060ecd8b5f3aa0eb4f6c4d1a91350506`, manifest `6de3fc82955e5759583a4fb889fb95d5d311cdcb6287315728d749841b0ac231`, verification PLY `38b6173aa7a38f8c407f9c2a700016608504e2c949fe513323703afad595cb3f`. The runner verifies every one before launch.

The fresh postprocess child calls `api_spz.core.state_manage._apply_patches()` before importing `o_voxel`; it remains model-free. Parent captures complete child stdout/stderr into the fresh public retry directory.

No GPU run is authorized by this plan. Proposed command after independent source review:
```text
C:\Python310\python.exe tools\art\trellis-trailgloam-postprocess.py --run --retry-postprocess --private-output .dream-loop\trailgloam-trellis\postprocess-r1 --public-output art\source\trailgloam-v1\trellis-trial\postprocess-r1\retry-import-fix
```
