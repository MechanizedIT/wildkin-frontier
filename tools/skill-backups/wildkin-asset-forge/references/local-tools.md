# Local generation and mesh preparation

Run commands from the repository root. Use fresh descriptive directories under `.dream-loop/workflow-proof/` while iterating. The shipping/source locations are chosen only after review. Do not overwrite raw masters or an existing experiment.

## Current laptop resource gate — September 11, 2026

The full-model service was stopped after startup left only about 1.7 GiB system RAM free. Historical successful generation does not waive current headroom. Default new assets to 512, at most 12 steps, one job and a 1K texture; serialize local GPU work. Do not launch the installed API directly to bypass the project helpers.

`trellis-local.ps1` now defaults to `Small512`: its Python wrapper requires 18 GiB free before importing models and stops its owned process below a 6 GiB reserve. The explicit legacy `-Profile Full` path requires 24 GiB free before launch; this conservative startup gate is not a measured inference-memory guarantee. Check VRAM and supervise any actual trial. Never lower a guard to make a job fit or close user applications for headroom.

`tools/art/trellis-staged.py` is an **unproven alternative**, with independently reviewed installed API signatures and actual stage-module unloading. `--prepare-only` imports no Torch/models. Its current calculated startup requirement is about 16.633 GiB, plus stage checks and the same 6 GiB reserve; it has not run because current RAM is insufficient. Export remeshing is disabled and decoded meshes over 750,000 faces are refused. The original 512 decoder produced roughly 1.94 million faces before simplification, so refusal is plausible; the cap cannot bound the decoder's own peak. Do not call this route reliable until one guarded inference and output review succeeds. Use bounded Blender modeling while generation cannot fit safely.

## Installed tools on Chris's laptop

- TRELLIS.2 optimized Windows v22: `C:/Users/cwood/Tools/trellis2-stableprojectorz/code`; its isolated Python is `venv/Scripts/python.exe`. Cached models are under `code/models`. This is separate from the game and art-processing environments.
- Blender 4.5.3: `C:/Program Files/Blender Foundation/Blender 4.5/blender.exe`.
- Art processing: `C:/Users/cwood/Tools/wildkin-art-python/Scripts/python.exe`, Python 3.10 with PyMeshLab 2025.7.post1.
- Standard-library helpers: `C:/Python310/python.exe`.

Use `powershell -File tools/art/trellis-local.ps1 -Action Status` (or Start/Stop) to manage a recorded local process. Stop refuses an unowned PID.

Check the loopback TRELLIS service at `http://127.0.0.1:7960/ping` and `/status` before starting another process. If absent, use the guarded project launcher above with its installed isolated Python. It creates a hidden owned process and records PID, command and logs. Keep `PYTHONNOUSERSITE=1`, `SETUPTOOLS_USE_DISTUTILS=stdlib`, `HF_HOME` pointing to local models, and Hugging Face/Transformers offline mode with implicit tokens and telemetry disabled. Do not mutate this environment to install Blender tools.

`tools/art/trellis-local.ps1 -Action Status` checks the service; `-Action Start` wraps the launch above and records ownership/logs under `.dream-loop/local-trellis/`. It returns while models load. `-Action Stop` stops only a process launched and recorded by this helper. Do not stop an unowned process or launch a second server during model loading.

Cold startup can take several minutes and stage models in system RAM. Do not confuse that with a hung generation or launch duplicate servers. Serialize GPU jobs. The proved laptop is an RTX 3070 Laptop 8 GB with 32 GB RAM; resource behavior on other machines is unproven.

## Reference to raw master

First retain the actual reference image, generation/edit prompt, source-reference identity, independent reference review and image hash. Check alpha and background bytes. TRELLIS's stock preprocessing uses existing nonopaque alpha, otherwise local RMBG removes the background. It crops using foreground alpha; large halos or baked checkerboards can change the generated geometry. Review resulting silhouette and hidden sides, not just the source image.

```powershell
C:/Python310/python.exe tools/art/test-trellis-local.py --input <reviewed-image.png> --resolution 512 --seed 1234 --faces 60000 --texture-size 1024 --steps 12 --output-dir <new-generation-directory>
```

The helper records inputs, settings, timing, GPU samples and raw GLB hash. It calls loopback only. 1024 describes generation resolution, not polygon count or texture dimensions. The original Mossling 1024 run took 483 seconds and exported 59,017 triangles with 1024² maps; 512 took 104 seconds. These are measurements for those runs, not guarantees. A simple prop may start at 512; use 1024 when character face/leaf details visibly benefit. Generated meshes have no useful skeleton or animation until separately rigged.

Inspect raw output in Blender. Use **absolute input/output paths** for Blender commands; a relative path may fail while Blender still exits zero, so verify outputs:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' --background --python tools/art/inspect-generated-glb.py -- --input <raw.glb> --output-dir <new-review-directory> --resolution 512 --front-yaw-degrees <observed-front-yaw>
```

This writes actual views, geometry/material inventory and an editable inspection scene. Determine the front from the mesh; Mossling's original source needed yaw 90. Inspect front, rear and three-quarter before selecting it. Use matching `--frame-bounds` for fair source/derivative comparisons; use `--shading-mode unlit-base-color` to isolate texture artifacts when necessary.

## Texture-preserving reduction

```powershell
C:/Users/cwood/Tools/wildkin-art-python/Scripts/python.exe tools/art/optimize-textured-glb.py --input <raw.glb> --output-dir <new-reduction-directory> --name <explorer-or-crate> --targets 10000 20000 --merge-position-seams
```

The working Mossling route extracts the original packed base-color PNG, converts through OBJ with per-corner UVs, merges coincident positions while retaining those UV seams, then uses PyMeshLab's **texture-aware** quadric decimator. This is different from the failed ordinary-decimation route. Verify the manifest's actual settings and final reimport counts. GLB vertex counts can increase at UV/normal seams; pre-export MeshLab vertex counts are not runtime counts.

`--merge-position-seams` is explicitly required for the Mossling-proved route; validate it for each new asset rather than treating it as a universal default. Use `--name explorer` or `--name crate` so output files and matte material labels identify the asset.

## Static-prop normalization

For an unrigged, single-base-color static prop only, normalize a fresh derivative to a stated in-game height and yaw. The helper grounds the vertical minimum at Y=0 after glTF export, retains the exact packed Base Color PNG, and writes hashes/bounds/counts to its manifest.

```powershell
C:/Users/cwood/Tools/wildkin-art-python/Scripts/python.exe tools/art/normalize-static-glb.py --input <optimized-single-color-prop.glb> --output-dir <new-normalization-directory> --name crate --height <world-height> --yaw-degrees <yaw>
```

Do not run this normalizer on rigged humanoids; the rigging workflow owns character orientation and root placement.

Do not invent fresh UVs or rebake by default: those trials damaged Mossling's eyes and flowers. Exact original texture bytes survived the successful reduction, but unchanged PNG bytes still do not prove correct UV mapping. Compare actual matched renders, including small game-scale views. Reject black patches, displaced eyes, missing flowers, holes or seam gaps. Consider manual retopology and a carefully validated bake when the mesh cannot deform well; decimation does not produce deformation-friendly joint loops automatically.

Provisional budgets: player/hero creature at most 20k triangles, usually one 1K base-color texture and one material; repeated small creatures should target 10k where appearance survives. Static prop admission caps at 5k triangles; start lower for common props. These are current performance budgets, not targets. Chris retired the old hackathon 35 MB package limit; there is no fixed package-size gate. Track texture/file size, loading time and repeated-instance rendering cost, and revise class budgets using visual and device evidence. No normal/reflection maps are required for the chosen style.

Use the scripts' `--help` for exact current optional arguments. Their implemented output names and reports are authoritative over older trial notes.

## Simple hard-surface fallback

If texture-aware reduction collapses beams or opens corners, reconstruct the simple prop in Blender from the reviewed image. The independent crate replay demonstrated this route after 2.5k–5k automatic copies failed. `tools/art/build-frontier-crate.py` writes an editable component-based source and a one-atlas GLB to a fresh directory; normalize with the same helper and review the new hash. The refined crate has 1,552 triangles and one 256px palette texture. Keep the rejected TRELLIS raw master and reduction report as provenance; do not label reconstruction as a successful automatic reduction.
