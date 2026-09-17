# Native phase-trace audit

The successful retry produced `raw-textured-simplified.glb` with 40,868 vertices and 59,376 triangles. Its event has only the completion CUDA sample; phase samples are absent. This is a proof gap, not evidence that the native phases were safe.

## Read-only bytecode finding

The pinned source copy at `C:/Users/cwood/Tools/trellis2-stableprojectorz/code/o-voxel/o_voxel/postprocess.py` and the actually imported venv wheel source at `.../venv/Lib/site-packages/o_voxel/postprocess.py` have the same SHA-256: `8ece9f739090beb71f1b818ea09b79547c1c9370fccf37ac354bed854e28377d`.

The trusted cpython-311 `.pyc` for the actual imported wheel records `to_glb.__code__.co_filename` as:

```text
C:\Users\cwood\Tools\trellis2-stableprojectorz\code\venv\Lib\site-packages\o_voxel/postprocess.py
```

The runner compared against the sibling editable path under `code/o-voxel/o_voxel/postprocess.py`. Equal source bytes did not make their filename strings equal, so its global tracer never returned the local line tracer.

## Future bounded fix

Keep the source hash pin, then import `o_voxel` and derive `target_code = o_voxel.postprocess.to_glb.__code__`. Have the global tracer return the local line tracer only when `event == 'call' and frame.f_code is target_code`. This identity test avoids filename normalization ambiguity and unrelated-frame tracing. Record the actual `co_filename` and source SHA in the receipt. It requires a fresh reviewed exporter run to supply phase proof; do not retrofit phase samples into this completed retry.

No source, model, GPU, or rerun action was taken for this audit.
