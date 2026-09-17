**Execution update:** the service stopped during startup at its unchanged6GiB reserve; a separately reviewed staged full-export attempt then held at1,804,432decoded triangles. The latest approved method is the exact-input geometry-only profile in geometry-ply-proposal.md and geometry-ply-source-review.md. Earlier service commands below are history, not instructions to start another service.

# Trailgloam TRELLIS quality trial — active service recipe

**Status: independently reviewed target-v2 GO; prepared only.** Root owns the running local Small512 service (PID `38692`, launched 2026-09-14 17:57:51) and the sole GPU. This document authorizes no command by itself. The prior fresh-process staged proposal is preserved unchanged as [`staged-alternative-v1.md`](staged-alternative-v1.md).

## Selected working route

Use the existing local service client that produced the successful Mossling master, [`tools/art/test-trellis-local.py`](../../../../tools/art/test-trellis-local.py), against root’s owned loopback service on port `7960`:

- pipeline resolution `512`; seed `1234`; 12 steps;
- guidance `7.5`, texture guidance `1.0`, texture rescale `3.0` (fixed in the client);
- 60,000 requested output faces; 1024 texture; textured GLB;
- one reviewed `target-v2` single-subject image, in one new empty private output directory.

This is the closest verified Mossling route: the prior 512/12/60k/1K run completed in `103.781s` and exported `59,728` triangles. It is a quality-master route, not a runtime budget or visual-admission claim.

## Service guard contract and distinction

The running service must have been started through [`tools/art/trellis-small-profile.py`](../../../../tools/art/trellis-small-profile.py): 512-only model set, offline cache settings, 18 GiB free RAM required before service import, and an owned-process 6 GiB reserve watchdog. It excludes the 1024 flow checkpoints and refuses non-512 requests.

This route is deliberately **not** the staged decoder-capped workflow. It has no per-stage process exits, stage floors, or the staged runner’s 750,000 decoded-face pre-export refusal. The `--faces 60000` request is sent to the service as `mesh_simplify=60`; it controls the requested final mesh simplification, not inference occupancy or a pre-export decode count. Do not misreport a service success as satisfying the staged guard, and do not weaken either workflow’s safeguards.

## Input and generation command

Before the one run, root records the selected target’s exact absolute path and SHA-256 in the generated `trial.json`, verifies PID `38692` still owns the loopback service, confirms it is the only GPU job, and checks the fresh 18 GiB startup condition had cleared when the service launched. The selected image must remain one clean complete Trailgloam subject; never submit the old multi-panel sheet.

```powershell
$input = 'C:/absolute/path/to/independently-reviewed-trailgloam-target-v2.png'
$output = 'C:/Users/cwood/Documents/mobile-rpg/.dream-loop/trailgloam-trellis/quality512-r1-run'

C:/Python310/python.exe tools/art/test-trellis-local.py `
  --input $input --output-dir $output --port 7960 `
  --resolution 512 --seed 1234 --steps 12 --faces 60000 --texture-size 1024
```

`$output` must not exist. The client retains `raw.glb`, `trial.json`, input SHA, HTTP status, timing, and 5-second GPU samples. On failure preserve those files and stop; do not retry or invoke the staged pipeline automatically.

## Later raw-GLB inspection plan — do not run concurrently

A successful raw GLB is an unadmitted detailed master. Keep the TRELLIS service serially isolated from Blender: root first lets its owned service exit/stop and records released GPU/RAM state, then assigns one Blender inspection. Do not launch Blender while PID `38692` or a replacement service owns the GPU.

For the inspection lane, use the existing non-mutating GLB inspector in a fresh directory. It imports but never writes `raw.glb`; it creates a copied matte review material that retains texture nodes, then produces an inventory, editable inspection scene, and front/three-quarter/rear images at 768px.

```powershell
$raw = 'C:/Users/cwood/Documents/mobile-rpg/.dream-loop/trailgloam-trellis/quality512-r1-run/raw.glb'
$review = 'C:/Users/cwood/Documents/mobile-rpg/art/source/trailgloam-v1/trellis-trial/quality512-r1/raw-review-matte'

& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' --background --factory-startup --python-exit-code 1 `
  --python C:/Users/cwood/Documents/mobile-rpg/tools/art/inspect-generated-glb.py -- `
  --input $raw --output-dir $review --resolution 768 --front-yaw-degrees 0 --shading-mode matte
```

Expected inspection outputs: `inspection.json` (object/mesh/triangle/bounds/material/texture/armature/topology inventory), `inspection.blend`, and `front.png`, `three-quarter.png`, `rear.png`. The inspector’s position-welded topology is diagnostic only; raw UVs/materials/GLB stay unchanged. If independent review cannot distinguish texture/UV quality from studio lighting, a separately authorized second serial inspection may use `--shading-mode unlit-base-color` in another fresh directory.

Independent raw visual review must evaluate connected six-leg anatomy, grounded contacts, frond/head readability, texture integrity, neutral all-angle silhouette, and 48/96px follow-up renders before any cleanup, reduction, rigging, export, or runtime admission. The generation and inspection receipts are evidence of a master candidate, not gameplay evidence.
