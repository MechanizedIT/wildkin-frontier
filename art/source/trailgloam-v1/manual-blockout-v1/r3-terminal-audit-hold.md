# Trailgloam R3 Gate-A terminal audit HOLD

**Status: terminal HOLD for this visit.** The independently rechecked R3 source received its one authorized Blender execution on September 14, 2026. It stopped during the shell-port fail-fast audit, before child construction, mesh conversion, metric output, `.blend` save, or any render. No R3 repair or method change is permitted.

## Actual command and result

The initial shell `blender` PATH launch did not start an executable. The only Blender execution used the installed Blender 4.5.3 executable with the unchanged `build_r3_massing.py`:

```text
C:\Program Files\Blender Foundation\Blender 4.5\blender.exe --background --python art/source/trailgloam-v1/manual-blockout-v1/build_r3_massing.py
```

It terminated at the required one-face shell-boundary assertion for the first left-front leg aperture:

```text
RuntimeError: R3 PRE-RENDER AUDIT FAILED: S0..S5 LF: neighbour cycle is not a one-face shell boundary
```

The call stack localizes the stop to `build_ported_shell()` → `ordered_boundary()` while creating `ports['S_LF']`. This is direct evidence that the stated actual-aperture contract was not met. There is no R3 render suite, `gate-a-r3-metrics.json`, or `trailgloam-gatea-r3-neutral-massing.blend`; pre-existing R1/R2 renders and sources remain historical evidence.

## Consequence

The final counted neutral massing pass cannot establish one connected manifold, six paths, grounded soles, bounds, normals, overlap safety, or the all-angle / 48 / 96 visual read. It does not admit a mesh, GLB, rig, motion, collider, material pass, runtime asset, or species gameplay.
