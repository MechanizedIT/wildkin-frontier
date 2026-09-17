# One-port BMesh anatomy method — terminal diagnostic HOLD

**Status: terminal HOLD for the one authorized execution.** The reviewed abstract shell/collar probe ran once on Blender 4.5.3 on September 14, 2026. It stopped in its converted-mesh audit before metrics, render, or `.blend` output. No rerun or method adjustment is authorized inside this diagnostic.

## Exact failure

The executed command was:

```text
C:\Program Files\Blender Foundation\Blender 4.5\blender.exe --background --python .dream-loop/anatomy-port-method/build_one_port_probe.py
```

The source passed the BMesh lifetime correction, constructed the abstract shell/collar, converted it to `Mesh`, and then failed at the first edge-incidence audit:

```text
AttributeError: 'MeshEdge' object has no attribute 'link_faces'
```

`link_faces` is a BMesh edge property; the script incorrectly used it after conversion on Blender `MeshEdge` instances. Thus the planned converted-mesh manifold audit did not execute, and the later 256 px render/save instructions were not reached.

## Scope consequence

There is no `one-port-metrics.json`, `one-port-probe.png`, or `one-port-probe.blend` from this execution. This diagnostic does not prove the reusable port method, does not change the closed Trailgloam HOLD, and does not authorize any creature, asset export, runtime, rig, motion, or game change.

## Authorized audit-API correction and final topology result

The parent authorized one routine correction because the first stop was an audit API defect, not a geometry result. The abstract geometry remained unchanged. The corrected audit derives mesh-edge face incidence from `MeshPolygon.edge_keys`, avoiding any BMesh property after conversion.

That one rerun reached the intended incidence gate and produced the substantive result:

```text
RuntimeError: ONE-PORT PROBE FAILED: 36 non-two-face edges
```

It again stopped before metrics, render, or `.blend` output. This is a valid topology failure of the explicit annular construction as currently wound/connected, so the diagnostic is now terminal HOLD. No further correction, rerun, shape revision, creature work, export, runtime change, or Trailgloam reopening is authorized.
