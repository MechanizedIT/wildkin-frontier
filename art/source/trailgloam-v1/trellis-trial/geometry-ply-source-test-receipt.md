# Trailgloam geometry-only profile — source/test receipt

**Scope:** focused helper implementation after independent proposal GO. No model, CUDA/Torch numerical stage, TRELLIS child, Blender process, or GPU run occurred.

## Change

[`tools/art/trellis-process-staged.py`](../../../../tools/art/trellis-process-staged.py) now defines one additional immutable `trailgloam-geometry-ply-v1` contract:

- exact input SHA-256 `417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff`;
- decoded-face ceiling `1,900,000`; output `raw-geometry.ply`;
- the existing geometry-only branch writes/re-reads direct binary float32/float64 XYZ plus uint32 triangle PLY before `o_voxel` can be imported.

No common profile is loosened. `full-export` retains `750,000`, Rootbound PLY `1,100,000`, Lantern PLY `2,300,000`; the 8 GiB `o_voxel` condition remains only on full export. The profile contract rederives mode, cap, output name and input hash from constants before every child import. The existing no-CuMesh/BVH/UV/bake/simplification branch and all parent/mutex/offline/floor/reserve behavior are shared unchanged.

The proposal wording was also corrected: the 1,804,432-face result was the **staged** quality trial, not the service attempt.

## Focused proof

Commands run from the repository root:

```powershell
python -m py_compile tools/art/trellis-process-staged.py
C:/Python310/python.exe tools/art/trellis-process-staged.py --self-test
C:/Python310/python.exe tools/art/trellis-process-staged.py --help
```

`--self-test` passed **20 tests**. The new tests prove exact Trailgloam input acceptance, changed-input refusal, post-plan input tampering refusal, cap/mode/output mutation refusal before import, exact 1,900,000 boundary acceptance and 1,900,001 refusal. Existing tests continue to cover no-Torch parent protocol, fresh-output behavior, PLY round-trip/count/index/float precision/hash validation, full-export isolation, Rootbound and Lantern caps, and pre-`o_voxel` branch ordering.

## Source hashes

- `tools/art/trellis-process-staged.py`: recorded below after the test run.
- `geometry-ply-proposal.md`: corrected staged-provenance version recorded below after the test run.

This is source/test readiness only. Independent source review remains required before one fresh serialized PLY run.

## Exact hashes

- `tools\art\trellis-process-staged.py`: `62a0a119267a8c17a48daf51f5894302adce856851d1c89883a700a02d07fbfa`
- `art\source\trailgloam-v1\trellis-trial\geometry-ply-proposal.md`: `a6e8c56db7dd27d3ed89f77402073487caab82b33fdad5ed59e3691b5c386f9c`

