# Rootbound Wildwood TRELLIS2 low-resolution trial plan

**Status:** read-only installed-pipeline audit and proposed supervised experiment. It does not authorize a GPU run, source change, installation, or resource-guard change.

## Installed facts

The installed TRELLIS2 project is `C:/Users/cwood/Tools/trellis2-stableprojectorz/code`, with its own `venv/Scripts/python.exe` and local model cache. Its user interface exposes resolutions `512`, `1024`, and `1536`; 512 is the lowest supported model resolution. It exposes one to fifty sampling steps, but the reviewed project runner deliberately permits one through twelve only. The runner's lowest real numerical setting is therefore **512 resolution, 1 step per numerical sampler, one image, 30,000 requested export faces, and its fixed 1024 texture export**. The installed UI texture slider begins at 1024, so textureless or lower texture is not an exposed supported runner mode.

`tools/art/trellis-process-staged.py` is the only proposed launch path. Its parent is standard-library-only; it keeps one hidden owned child per background/conditioning/sparse/shape/texture/decode stage, preserves CPU handoffs and RNG state, uses offline environment variables, refuses competing TRELLIS work through the common mutex, and never kills unowned processes. Its default is safe `--prepare-only`; `--run` is explicit. Preserve its 6GiB reserve, 2GiB export-workspace check, bootstrap/stage floors, 32,768-coordinate limit, and 750,000 decoded-face refusal.

## Why the earlier 512 run still failed

The successful process-boundary trial released memory after every child and reached decode, then produced **7,057,316 decoded faces**. That refusal happened before `o_voxel.postprocess.to_glb(... decimation_target=faces ...)`; requested 30k output faces affect post-decode export only. They do not bound the sparse decoded mesh or its peak allocation. `decode_latent(...,512)` calls the shape decoder and `flexible_dual_grid_to_mesh` before export. Lowering sampler steps can reduce inference time and possibly latent complexity, but it cannot guarantee an extraction face cap. Existing limits must not be lowered or bypassed.

## One changed-method trial

Use a reviewed **single opaque coarse prop** input, not a multi-part tree, canopy, creature, reference sheet, or scene: Rootbound's reviewed canopy-free buttress/split-trunk constituent is the only candidate: `art/targets/rootbound-wildwood/constituents/buttress-root/target-v1.png`, SHA-256 `DE811E19412984B3D4ED908837085E942F6DED99C27D927F377D7EEA91184C2C`. It must show one squat connected trunk-and-buttress silhouette, matte plain background, no canopy, leaves, separate rocks, ground clutter, transparency halo, or implied fine bark texture. This changes the likely decoded occupancy complexity while preserving the safeguards; it is not proof the result will fit the face ceiling.

Create fresh private output `.dream-loop/rootbound-buttress-trellis/min512-r1`; retain input bytes/SHA, plan, events, every successful handoff, and any failure receipt there. Copy only useful public receipts and raw masters to `art/source/rootbound-buttress-trellis/min512-r1` after the run; never publish private tensor handoffs. Do not overwrite the 7M-face trial. A pass through numerical decode still requires the decoded count to be at most 750k before export. A raw GLB then remains an unadmitted master, expected to be at most 30k exported triangles; inspect it before any cleanup.

## Exact supervised invocation

After root confirms no other TRELLIS/Blender job, the reviewed input, and current guard headroom:

```powershell
C:/Python310/python.exe tools/art/trellis-process-staged.py --prepare-only --install-root C:/Users/cwood/Tools/trellis2-stableprojectorz/code --input C:/Users/cwood/Documents/mobile-rpg/art/targets/rootbound-wildwood/constituents/buttress-root/target-v1.png --output-dir .dream-loop/rootbound-buttress-trellis/min512-r1 --steps 1 --faces 30000 --seed 1234
C:/Python310/python.exe tools/art/trellis-process-staged.py --run --install-root C:/Users/cwood/Tools/trellis2-stableprojectorz/code --input C:/Users/cwood/Documents/mobile-rpg/art/targets/rootbound-wildwood/constituents/buttress-root/target-v1.png --output-dir .dream-loop/rootbound-buttress-trellis/min512-r1 --steps 1 --faces 30000 --seed 1234
```

The first command must leave the proposed output empty or contain only preparation evidence as the runner requires; use a fresh directory for `--run` if preparation writes files. Root must first verify its current `bootstrap_required_free_gib` and every stage floor from the generated plan, 6GiB reserve throughout, and **8GiB free immediately before `o_voxel` export** (the fixed 6GiB reserve plus 2GiB workspace), no process mutex/API conflict, and serialized GPU ownership. The runner must retain its hidden child launching and offline environment exactly.

## Cleanup boundary

Only if decode/export passes all internal caps: preserve `raw.glb`, events, hashes, and handoffs; inspect raw neutral views; then open a **fresh Blender cleanup derivative** to remove isolated artifacts, establish scale/yaw/grounding, and test low-poly readability. Blender cleanup does not redeem a failed decode or retrospectively bound inference memory. No remesh, forced pre-cap simplification, runtime admission, or asset replacement is authorized by this trial.

## Remaining uncertainty

No installed setting below 512 resolution or 1024 texture is exposed by this runner. Steps=1 is supported but may materially harm shape quality. The decoder's face output depends on generated occupancy and is not controlled by `--faces`; the coarse input is a hypothesis to test once, not a face-budget guarantee.

## Quality-path comparison after owner steering

The 512/1-step/30k configuration is a guarded decoder-complexity diagnostic only. It is not a production-quality recipe. Historical Mossling evidence records a separate successful service path at 512 resolution, 12 steps, 60,000 requested faces, 1K texture: 103.781 seconds and 59,728 exported triangles. Its 1024 cascade took 482.906 seconds and exported 59,017 triangles. Those exported counts do not reveal its pre-export decoded face count, so they cannot establish that it would pass today’s 750,000 decoded-face guard.

The current fresh-process runner is intentionally 512-only and caps requested output at 30,000 faces; it retains 1K texture and permits up to 12 steps. For any quality-oriented new trial, the closest resource-feasible candidate is **512, 12 steps, 30k export request, 1K texture**, with the same single coarse reviewed input and unchanged startup/stage/8GiB export/750k decoded guards. It has no measured completion or decoded-face guarantee. A 1024 cascade is not supported by this runner and must not be improvised by lowering safeguards or bypassing the reviewed child lifecycle.
