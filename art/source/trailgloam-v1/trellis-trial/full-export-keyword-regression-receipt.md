# Trailgloam PLY — full-export keyword regression receipt

**Scope:** reporting-only correctness repair after the exact Trailgloam PLY run succeeded. No TRELLIS or Blender process was started by this work.

## Repair

The staged full-export call now passes `attr_layout=mesh.layout` to installed `o_voxel.postprocess.to_glb`. The installed current signature has `attr_layout` and no `layout` parameter; the former `layout=` keyword would have failed only after a decoded mesh passed the ordinary 750k cap. The successful Trailgloam PLY path did not invoke this branch.

No profile, cap, mutex, RAM floor/reserve, input restriction, child lifecycle, offline environment, output path, coordinate limit, PLY branch, export target, texture setting, or `remesh=False` behavior changed. This does not implement the separately proposed fresh-process postprocess derivative.

## Non-GPU regression proof

The helper now parses `C:/Users/cwood/Tools/trellis2-stableprojectorz/code/o-voxel/o_voxel/postprocess.py` with Python `ast`; it does not import `o_voxel`, Torch, CUDA, models, or the pipeline. The test asserts the installed `to_glb` signature accepts every staged call keyword, includes `attr_layout`, excludes `layout`, and that the staged call still explicitly has `remesh=False`.

Commands:

```powershell
python -m py_compile tools/art/trellis-process-staged.py
C:/Python310/python.exe tools/art/trellis-process-staged.py --self-test
```

Both pass. The protocol suite now reports **21 tests**, including the installed-signature regression plus all earlier PLY/profile/mutation/face-boundary tests.
