# Trailgloam R5 actual-solid method probe

**Status:** actual CPU proof and one guarded Blender render complete. Ten parts / 264 triangles, nine actual images and editable scene; this is one `+X` representative chain and one frond attachment, not a full Trailgloam candidate. No rig, export, collider, encounter or gameplay admission.

## Exact source and run

The conditional target is [the six-view sheet](../multiview/trailgloam-orthographic-v1.png), SHA-256 `ba0b19c941f58b2468fb9aed3d62a995acedeb431fedd3e5932e5f1668da24a8`.

Run from the repository root:

```powershell
python art/source/trailgloam-v1/method-probe-r5/build_probe.py
```

The script reads UTF-8 `parameters.json`, writes the literal indexed solids to `literal-mesh-arrays.json`, and writes `cpu-proof.json`. It exits nonzero while preserving those receipts if closure, generated-host convexity, ground contact, or any measured containment check fails. The reviewed initial source/arrays/proof are retained unchanged in `pre-review-v1/`.

## Actual construction and measured result

The host is an 8-sided closed convex hull built from the six supplied Z/rX/rY ring samples. The probe creates three capped six-sided link lofts from coxa `(0.42,0,0.60)` through knee, ankle and foot root; a closed hoof wedge; three closed six-sided cuffs; one closed collar; and one closed folded diamond-section blade. There is no shell port, Boolean, weld, voxel/remesh, open tube, uncapped blade, proxy capsule, or proxy box.

All ten generated parts have zero boundary and non-manifold edges, zero degenerate faces, finite coordinates, and positive outward-centroid face tests. The generated host passes its own all-vertex face-halfspace convexity test. Every coxa root-ring vertex is inside that actual host (maximum outward plane distance `-0.0909197594 m`); the collar base ring is also inside (`-0.0091519518 m`). Cuff 0/1 each contain both generated adjoining link end rings using the corrected adjacent-tangent bisectors (links 0+1 and 1+2). Cuff 2 contains the final link end ring, and all six vertices of its lower cap ring are inside the actual hoof (`-0.0060277414 m` worst outward plane distance). The blade root diamond is inside the actual collar. The hoof minimum Z is exactly `0`.

The full probe bounds are `[-0.68,-0.79,0]` to `[1.19,0.79,1.7581858828]`, extent `1.87 × 1.58 × 1.7581858828 m` in X/Y/Z. This is a probe envelope only, not the six-leg creature envelope.

## Declared routine adjustments before freeze

The root-supplied values were test values, not recovered dimensions. The first actual generation failed: the proposed collar base at `(0.22,0.23,1.08)` crossed the host by `0.0111604733 m`, and a radius-`0.19 m` final cuff dipped below Z=0. The frozen probe therefore uses collar base `(0.20,0.20,1.08)`, matching blade root center `(0.23,0.25,1.22)`, cuff radius `0.18 m`, and only the final cuff has a `+0.04 m` Z center lift. The corrected complete cuff ring then extended `0.0139722586 m` beyond the initial hoof Y-minimum, so the closed hoof Y-minimum widened from `-0.20` to `-0.22 m`; its full cap-ring containment now passes. The measured contact checks above supersede the rejected nominal values.

## Executed renderer

`render_probe.py` is a parity-only Blender 4.5 renderer. Before creating Blender objects it requires the independently reviewed literal-array SHA `4ec79f19e7561464db39283ceaafe2d793db324646d13ef444adebc69e897e33` and CPU-proof SHA `dc66272ad1b4b1c6072bcc4524e2b63a19d79751e1da2573a4deb86bafdd2ef0`, then verifies each part's literal bounds against that frozen proof. It refuses nonabsolute or nonfresh paths, requires 8 GiB free RAM before importing geometry, and stops its owned renderer below a 6 GiB reserve. It independently checks the indexed part inventory, Blender loop triangle order, and exact Blender XYZ readback against float32-rounded literal coordinates. The named containment contacts remain CPU-array checks; the Blender receipt labels its scope as XYZ/index parity rather than a Blender contact remeasurement. On a later root heavy-job release, it writes only a new output directory with side, three-quarter, and underside neutral PNGs at 512/96/48 plus a Blend and receipt. It never constructs, alters, welds, remeshes, or exports the geometry.

```powershell
& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' --background --factory-startup --python-exit-code 1 --python art/source/trailgloam-v1/method-probe-r5/render_probe.py -- --execute --source-dir C:/Users/cwood/Documents/mobile-rpg/art/source/trailgloam-v1/method-probe-r5 --output-dir C:/Users/cwood/Documents/mobile-rpg/art/source/trailgloam-v1/method-probe-r5/render-r5
```

## Limits for review

The CPU tests prove only generated topology/contact feasibility for this partial assembly. They do not prove the required three visible legs per side, six grounded chains, head silhouette, two-frond cadence, rendered cuff coverage, or gameplay readability. Independent source review must decide whether this method can proceed to a separately planned full neutral build. Blender all-angle and 48/96px evidence remain the later visual gate.

## Actual observation

The independently source-reviewed renderer exited 0 in 1.453 seconds (minimum sampled free RAM 19.348 GiB), preserving exact float32 XYZ and index order after import. CPU contacts and Blender import parity are separately labeled. [Execution receipt](execution-receipt.json) · [Actual gallery](review.html) · [Independent visual review](visual-review.md).

The actual images show a thick articulated leg with covered joins, but a dark collar obscures most of the intended amber frond. The contact proof does not establish visible blade exposure. Retain the local attachment method and this failure evidence; a full creature needs a revised, independently reviewed frond/collar relationship before construction. No second probe geometry run occurred.
