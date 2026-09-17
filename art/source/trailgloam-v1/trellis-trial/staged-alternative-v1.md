# Trailgloam TRELLIS trial — recovered guarded recipe

**Status: planning only.** No GPU process was started. The prepared R7 hoof renderer remains unexecuted. This is the smallest faithful route to a new, high-detail Trailgloam master once root supplies an independently reviewed input.

## Verified reference recipe: Mossling

The successful local Mossling API run is recorded in [`art/source/mossling-v1/generation.json`](../../mossling-v1/generation.json) and [`docs/TRELLIS_LOCAL_TRIAL.md`](../../../docs/TRELLIS_LOCAL_TRIAL.md):

- one transparent single-object input, seed `1234`;
- 512 pipeline, 12 inference steps, guidance `7.5`, texture guidance `1.0`;
- 60,000 requested export faces, 1024 texture, textured GLB;
- completed in `103.781s`, producing `59,728` exported triangles / `51,218` vertices.

A separate 1024-cascade run with the same 12-step/1K/60k service settings completed in `482.906s`, producing `59,017` exported triangles. Its raw master remains the owner-liked detailed Mossling direction. These are older API-path results, not proof that the current fresh-process decode cap would accept their unrecorded pre-export decoded meshes.

## Current supported guarded workflow

Use only [`tools/art/trellis-process-staged.py`](../../../tools/art/trellis-process-staged.py), which is currently 512-only, one image, 1K texture, seedable, and supports 1–12 sampler steps. Its quality setting closest to Mossling is:

- seed `1234`; `--steps 12`; `--faces 30000`; `--profile full-export`;
- installed 512 shape/texture samplers retain their recorded guidance: sparse/shape guidance `7.5`; texture guidance `1.0`; latent normalization and decode behavior remain in the installed pipeline;
- one hidden owned child per background, conditioning, sparse, shape-flow, texture-flow, and decode stage; tensor-only handoffs and RNG state are private and only from the new run directory.

The 30k request is the current runner’s full-export limit and applies after decoding. It is **not** a decoded-mesh or inference-memory cap.

Current non-negotiable conditions: parent has no Torch import; offline model environment; common TRELLIS mutex and competing-job refusal; fresh empty run directory; 6 GiB live reserve; current bootstrap floor `16.6326 GiB`; stage floors background `9.6463`, conditioning `10.2585`, sparse `15.6326`, shape `15.2211`, texture `15.2214`, decode `13.2999 GiB`; coordinate ceiling `32768`; decoded-face refusal `750,000`; and `8 GiB` free before full GLB export (6 GiB reserve plus 2 GiB workspace). No guard may be lowered.

## Required Trailgloam input

Do **not** use `multiview/trailgloam-orthographic-v1.png`: its six-panel sheet is an approved construction reference, but the installed one-image route conditions on only one image. `reference-v1.png` and `reference-v2.png` remain held and were not approved as generation inputs. No Trailgloam TRELLIS inference has run.

Root must choose one separately reviewed, single-subject image: opaque neutral three-quarter view, whole creature inside frame, plain background, six visibly distinct thick grounded legs, low teal saucer body, forward head/eyes, and two socketed amber fronds. No contact sheet, HUD, text, environment, transparency halo, extra creature, or thin detached ornament. The actual bytes and SHA-256 must be preserved beside the run receipt. A clean source image improves conditioning; it cannot guarantee a 750k-or-lower decode.

## Exact supervised commands

Use a disposable **preflight** directory because `--run` rejects a nonempty output directory, then a distinct fresh run directory. Root must first confirm serialized GPU ownership and current RAM/VRAM/process state; do not launch a service or kill a process.

```powershell
$input = 'C:/absolute/path/to/reviewed-trailgloam-single-subject.png'
$install = 'C:/Users/cwood/Tools/trellis2-stableprojectorz/code'
$python = 'C:/Python310/python.exe'
$preflight = 'C:/Users/cwood/Documents/mobile-rpg/.dream-loop/trailgloam-trellis/quality512-r1-preflight'
$run = 'C:/Users/cwood/Documents/mobile-rpg/.dream-loop/trailgloam-trellis/quality512-r1-run'

& $python tools/art/trellis-process-staged.py --prepare-only --install-root $install --input $input --output-dir $preflight --seed 1234 --steps 12 --faces 30000 --profile full-export
& $python tools/art/trellis-process-staged.py --run --install-root $install --input $input --output-dir $run --seed 1234 --steps 12 --faces 30000 --profile full-export
```

The second command is the only generation command and must use a new empty `$run`. On pass, retain the private `.pt` handoffs in `$run`; copy only input hash, plan, events, public preprocessed image/receipt and `raw.glb` into `art/source/trailgloam-v1/trellis-trial/quality512-r1/` for review. On any guard/decode failure, preserve its private plan/events and stop. Do not retry automatically, reuse external handoffs, export geometry-only, run Blender cleanup, or admit the asset before independent raw review.

