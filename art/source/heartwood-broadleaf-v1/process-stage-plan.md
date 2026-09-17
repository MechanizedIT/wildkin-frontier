# Heartwood broadleaf — fresh-process TRELLIS staging plan

**Status: readiness candidate only.** This is a response to the retained-RAM
observation in `staged-trial-1`, where clearing sparse-stage modules left only
12.08 GiB free and shape flow correctly refused its 15.22 GiB floor. It does
not lower a floor, admit a mesh, or authorize a background run.

`tools/art/trellis-process-staged.py` uses the same local 512-pixel,
one-image, 12-step numerical route and cached models as the staged experiment.
Its standard-library parent imports no Torch. With explicit `--run`, it owns the
same named mutex as the existing staged helper, refuses an occupied local API or competing TRELLIS Python job,
then starts a hidden child for each of background removal, conditioning, sparse
sampling, shape flow, texture flow, and decode/export. The parent waits for a
real exit before the next child and checks the original conservative per-stage
free-RAM floor. A child also watchdogs the unchanged 6 GiB reserve. The parent
can terminate only the exact child process it launched; it never kills an
unowned service or Python process.

Every handoff stays under a newly created empty output directory. They are
fixed-name CPU tensor dictionaries loaded with `weights_only=True`; no input
argument can point at a pickle or a prior run's archive. The sparse, shape, and
texture stages preserve CPU and CUDA RNG byte states across the process
boundary, after model construction, so model loading does not change the
intended sampler noise stream. On a refusal or child failure, existing raw
input, preprocessed image, successful handoffs, hashes, and `events.json` are
preserved for inspection. No handoff is overwritten.

The decoder retains the 750,000-face refusal and no-remesh export route. After
decode and CPU detachment, its child repeats the existing explicit 8 GiB
export-workspace floor before invoking `o_voxel`. The
requested raw target is at most 30,000 triangles; a successful `raw.glb` still
requires separate reduction, inspection, and asset admission.

## Readiness proof

On September 14, the parent completed metadata-only preparation with no Torch
import: 18.98 GiB free against the unchanged 16.6326 GiB bootstrap estimate.
`py_compile` and the helper's protocol tests passed. This is only a
current preparation observation, not GPU, decoder, or generation proof.

## Import-order repair receipt

The first supervised process trial proved the process-boundary repair through
sparse and shape flow: after shape-child exit, free RAM returned to 18.85 GiB.
It then stopped before texture inference because texture's fresh interpreter
tried to import `trellis2.modules.sparse.SparseTensor` before its install-root
bootstrap. No raw mesh was produced, and the trial directory is preserved.

The helper now runs that bootstrap before every stage-specific import, including
texture and decode reconstruction. `--import-smoke` starts the same isolated
TRELLIS Python executable with the same install-root working directory and
offline environment, but imports only `SparseTensor`; it loads no model and
does no CUDA inference. On September 14 it passed with
`trellis2.modules.sparse.basic` as the resolved module. The protocol suite now
has four tests, and self-test returns a nonzero process exit when any test
fails.

## Supervised root invocation

Run only after independent technical review, an up-to-date sole-GPU check, and
a fresh RAM/VRAM check. Choose an output directory that does not already exist:

```powershell
C:/Python310/python.exe tools/art/trellis-process-staged.py --run `
  --install-root C:/Users/cwood/Tools/trellis2-stableprojectorz/code `
  --output-dir .dream-loop/workflow-proof/heartwood-broadleaf-process-stage-1 `
  --input art/source/heartwood-broadleaf-v1/reference/target-v1.png `
  --seed 142601 --steps 12 --faces 30000
```

Do not run a second attempt if a guard refuses or the owned child exits. Preserve
the output, inspect `plan.json` and `events.json`, and have the technical
reviewer decide whether the process boundary actually restored enough RAM.

Remaining risks: the metadata floors cannot predict Torch import, CUDA, sparse
backend, decoder, or export peaks; the face cap happens after decoder work; and
the installed API may keep a stage-specific hidden dependency not exposed by
the known interfaces. Those cases should fail closed and retain evidence.
