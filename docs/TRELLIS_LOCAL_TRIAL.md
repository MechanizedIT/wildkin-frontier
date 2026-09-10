# Local TRELLIS.2 Mossling trial

Date: September 10, 2026. Owner request: install and test TRELLIS.2 locally, following the decision to retain the Mossling reference and change the modeling approach.

## Installation

- Distribution: [IgorAherne/TRELLIS.2-stableprojectorz](https://github.com/IgorAherne/TRELLIS.2-stableprojectorz), release `trellis2-stableprojectorz_v22` under the upstream `latest` tag.
- Release ZIP SHA-256 verified: `62be7caefaf12e396763dfec4b5e688fdd83c9450920090dfdb8082bd43811be`.
- Local root: `C:/Users/cwood/Tools/trellis2-stableprojectorz`.
- Separate Python 3.11 environment: `code/venv`; game dependencies remain independent.
- Hardware: RTX 3070 Laptop GPU, 8 GiB VRAM, approximately 32 GiB system RAM.
- PyTorch `2.8.0+cu128` detects CUDA and successfully executes a GPU calculation.
- Setup completed and its CUDA/Flash Attention/nvdiffrast/o_voxel/Pillow checks pass. Installed footprint is approximately 31.81 GiB including the portable release and cached weights. No image was sent to a paid generation API.

Raw release metadata and installation logs are in `.dream-loop/trellis-test/`. The headless installer wrapper only disables pip's interactive progress rendering; it retains the upstream installation steps and verification. Native Windows directory listings can show stale lengths for an actively written download; inspect the open file handle before concluding that a transfer has stalled.

## Test contract

Input: `.dream-loop/all3d-targets/mossling-image3d-input.png`, the existing transparent Mossling target. Preserve this target rather than changing the style to excuse generation defects.

Both runs used local FastAPI bound to `127.0.0.1:7960`, seed 1234, 12 inference steps, a 60,000-face export target, 1024 texture and GLB output. The fork stages model components between CPU and GPU. The 1024 follow-up uses the more demanding `1024_cascade` pipeline. Generation ran with `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1`; all required models loaded from the cache. The local API was stopped after testing to release its staged model memory.

`tools/art/test-trellis-local.py` performs the local request and saves the raw GLB, request/response details, timing, input hash, and sampled GPU use. Every run requires a fresh output directory to retain failure evidence and prevent accidental replacement.

`tools/art/inspect-generated-glb.py` imports the raw GLB into Blender, inventories its geometry/materials/textures/rigging, and renders front, three-quarter and rear views using copied matte materials. Its review scene preserves color textures and disconnects reflective channels. The raw generated file is not changed.

## Generated results

| Generation resolution | Generation + GLB export | Raw triangles | Raw vertices | GLB size | Highest sampled total GPU memory |
| --- | ---: | ---: | ---: | ---: | ---: |
| 512 | 103.781 seconds | 59,728 | 51,218 | 4.53 MiB | 3,988 MiB |
| 1024 cascade | 482.906 seconds | 59,017 | 51,417 | 4.66 MiB | 5,407 MiB |

Times exclude first-time installation and initial pipeline loading. GPU readings are device-wide samples every five seconds, not an exact allocator peak. Both runs completed successfully on the RTX 3070 Laptop GPU. The live pipeline also used substantial system RAM: approximately 16 GiB resident was observed during loading.

Each raw GLB has one mesh and one material with a 1024×1024 base-color texture and a second 1024×1024 material-control texture. Generation resolution and texture resolution are separate settings. Neither output contains an armature or animation.

Both raw files, request/response records, GPU samples and Blender reviews remain under `.dream-loop/trellis-test/mossling-{512,1024}-seed1234/`. The useful comparison camera is yaw 90; the first generic camera set obscured the paired eyes. Independent review found modest improvements to eye/flower/leaf detail at 1024, with major proportions broadly retained. Chris subsequently said the generated results look good; preserve that owner-liked direction rather than treating a mechanical reference score as a requirement to redesign it. The provisional working choice is the 1024 source as the detailed master.

Raw imported vertex-connectivity counts are inflated by GLB UV/normal seams. The inspector separately reports topology after position welding on a disposable copy. For 512 this changes 3,025 apparent vertex components to 20 physical-position components, while still exposing boundary/non-manifold cases requiring later care. These diagnostics are not proof of animation readiness.

## Mobile derivation

Chris's follow-up asks whether roughly 59k triangles is high for mobile/web and whether Blender reduction or retopology should follow. Approximately 10k and 20k are provisional comparison targets, not universal device budgets. The current game has up to four authored Wildkin in one active section and may also show one companion. Android's guidance similarly ties appropriate triangle counts to the device, scene population and screen coverage, and recommends preserving silhouette while removing unnecessary geometry: [geometry guidance](https://developer.android.com/games/optimize/geometry).

`tools/art/derive-mobile-glb.py` creates separate copies, records source hashes and actual geometry/material/texture data, and validates export by re-import. The high-resolution originals remain intact. Initial 512 reductions preserved the silhouette at 128-pixel comparison size, but closer checks caught texture distortion from welding UV-seam vertices before carrying the old UV mapping through QEM decimation. A no-weld control improved the texture but separated geometric seam borders. Those controls are retained as diagnostics rather than approved runtime assets.

The next experiment used welded QEM geometry reduction, a fresh low-mesh UV layout, and a base-color-only bake from the untouched 1024 high source. Both exported and re-imported successfully with one 1024×1024 color texture, metallic/specular/coat zero and roughness 0.9. However, direct visual inspection by the parent and modeling agent found damaged eyes, dark flower centers and lost leaf detail. More triangles did not resolve these texture-projection defects. Neither baked derivative is an approved game asset.

| 1024-source derivative | Actual exported triangles | Exported vertices | GLB size | Visual verdict |
| --- | ---: | ---: | ---: | --- |
| 10k, fresh UV + bake | 9,987 | 15,483 | 1,206,800 bytes (1.15 MiB) | Silhouette retained; eye/flower/leaf texture damage — rejected |
| 20k, fresh UV + bake | 19,994 | 26,302 | 1,485,760 bytes (1.42 MiB) | Similar silhouette; texture damage remains — rejected |

The raw 1024 GLB remains the recommended master. This trial establishes successful local image-to-3D generation, not a finished automatic optimization pipeline. Inspect the comparison at `.dream-loop/trellis-test/comparison.md`; original files, rejected controls, editable Blender scenes and exact manifests are retained in the trial folders. `tools/art/derive-mobile-baked-glb.py` records the experimental bake route, and the derivation helpers clearly identify their diagnostic status. A subsequent asset-production step should use texture-aware reduction or controlled retopology and texture transfer, with close-up and game-size visual checks before accepting a runtime mesh.

For animation, reduction is only the first step: build/test the rig and add deliberate topology around bending shoulders, hips and neck when deformation requires it. No in-game phone performance, rigging or animation claim is made by this static asset trial.

## Tooling follow-up research

Chris asked whether a Blender MCP, plugin or skill could improve this workflow. Official project documentation checked September 10, 2026:

- [PyMeshLab textured decimation](https://pymeshlab.readthedocs.io/en/latest/filter_list.html#meshing-decimation-quadric-edge-collapse-with-texture) explicitly optimizes textured meshes while preserving UV parametrization and exposes texture-coordinate weighting. This is the provisional first candidate for the specific failed reduction step; it is not installed or tested on Mossling yet.
- [Blender MCP](https://github.com/ahujasid/blender-mcp) provides scene inspection, object/material operations and Python execution in Blender. It can support the edit/inspect loop, but connecting an MCP does not itself introduce a different simplification algorithm.
- [Blender Agent Studio](https://github.com/ifBars/blender-agent-studio) provides Codex-oriented modeling, animation, rendering and validation skills plus a local MCP. Its current README reports Blender 5.2 LTS testing, whereas this machine has Blender 4.5.3. Its own Astra comparison results are mixed, so workflow adoption is not evidence of better Mossling output.
- [BlenderRetopology-Skill](https://github.com/MushroomFleet/BlenderRetopology-Skill) describes manual feature-region and joint-loop construction through Blender MCP. It is Claude-oriented guidance, not an automatic retopology model; Codex adaptation and practical validation remain untested.
- [Quad Remesher](https://exoside.com/quadremesher/quadremesher-buy/) is a paid Blender auto-retopology option: the checked single-software commercial subscription is $15.99 per three months excluding tax. No purchase or trial activation occurred. Quad topology still requires texture transfer and deformation checks.

Local tooling inspection found that TRELLIS's own CuMesh/O-Voxel export path can simplify and bake from the original generation attribute volume, but this trial retained the GLB rather than that live generation state. Re-export from that state is a possible future route; it is not available from this saved GLB alone. No new plugin or mesh library was installed during this follow-up research.

## Reuse

The portable distribution includes `run-browser/run-gradio.bat` for its browser UI and `run-stableprojectorz/run-stableprojectorz.bat` for its local API. The direct API route was tested; the browser UI was not part of this trial. To reproduce the verified API launch from PowerShell:

```powershell
$trellisCode = 'C:/Users/cwood/Tools/trellis2-stableprojectorz/code'
$env:HF_HOME = "$trellisCode/models"
$env:HF_HUB_OFFLINE = '1'
$env:TRANSFORMERS_OFFLINE = '1'
Set-Location $trellisCode
& "$trellisCode/venv/Scripts/python.exe" api_spz/main_api.py --host 127.0.0.1 --port 7960
```

From a second terminal in the game repository, run `C:/Python310/python.exe tools/art/test-trellis-local.py --resolution 1024 --output-dir .dream-loop/trellis-test/new-run`. Each run needs a new output directory.

## Project verification

During setup, `npm test` and `npm run verify` pass with 636 tests. The validated submission directory is 25,001.7 KB, and `npm run zip` produces 7,448.3 KB. Trial/inspection/derivation helpers compile successfully. The raw and final experimental GLBs import successfully in Blender; successful import and reduced file size do not establish acceptable visual quality. No generated mesh was integrated into the game, and no new runtime dependency was introduced.
