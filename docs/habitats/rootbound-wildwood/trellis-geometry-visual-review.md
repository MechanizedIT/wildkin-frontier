# Independent visual review — Rootbound buttress raw geometry

**Verdict: GO for bounded Blender cleanup; not admitted as a runtime asset.**

The raw geometry is recognizably the selected buttress-root component. It has a grounded flared base, several broad root directions, a tapered leaning trunk, and two readable fork stubs. The three-quarter view is the strongest match: the near roots carry weight outward from a continuous trunk instead of appearing as separate spikes. The opposite views retain enough root mass to support a component rather than a single camera-only silhouette.

## Evidence and limits

The neutral inspection records the exact source PLY SHA-256 `3005ad1a1f3039a946db633b323ace8bc73856e91f38bfef4fc1faaf59ce223c`, 514,489 vertices, 1,029,792 triangles, exact source count/index/position verification, and a minimum sampled host free memory of 16.799 GiB. This is raw geometry only.

The white matte render is sufficient to judge the major silhouette, grounding, fork, and broad root directions, including at 96 and 48 pixels where it reads as a squat forked root anchor. It obscures fine depth relationships, root-to-trunk seam quality, and the real low-poly plane cadence. A warmer, angled neutral key/fill setup can improve inspection without changing geometry.

## Score

**Raw geometric fit: 7.2 / 10.**

It is a useful high-detail starting point, but it does not yet match the selected reference's disciplined four-buttress rhythm. Some root tips are ragged and overly similar in width; the trunk is more upright and the fork less deliberately bent. At small scale, the raw silhouette is useful but lacks the reference's clean, separated near-root read.

## Bounded cleanup brief

1. Preserve the raw asset as an immutable source receipt and set a physically plausible component scale/ground plane before any derivative work.
2. Produce one derivative that reduces the dense raw surface to a deliberately faceted, mobile-suitable trunk/root mesh; do not use texture or runtime integration as a substitute for silhouette cleanup.
3. Establish four primary buttress directions with one dominant near root, two offset side roots, and a restrained rear support; merge or remove minor spike-like tips that confuse that cadence.
4. Shape the main trunk into a clear shallow bend that resolves into two asymmetric fork stubs, retaining continuous root-to-trunk junctions.
5. Re-render neutral front, three-quarter, side, rear, 96, and 48 views for independent derivative review. Check grounding, mesh connectivity, nonfloating roots, and triangle cost there; no runtime admission follows automatically.

The parent reporting exception after PLY output does not undermine this inspection because the PLY and its receipt were independently verified. It should be repaired and covered before another run, but no regeneration is justified for this already verified raw artifact.

## Cleanup R1 plan and executable review

**Verdict: HOLD for the default invocation; GO for the same bounded R1 only when executed with `--preview-decimate`.**

The executable has appropriate narrow boundaries: it pins and rehashes the immutable raw PLY, requires a fresh output root, checks Blender 4.5 and an 8 GiB start floor, runs a 6 GiB watchdog, imports one mesh, records topology/normals/bounds, preserves the raw source, uses Workbench renders, and writes no GLB, runtime artifact, texture, UV, remesh, voxel, Boolean, or TRELLIS output. Uniform scaling to a 5 m horizontal spread and truthful reporting of the resulting 3.917 m height are sound. The render set is suitable for comparison, and the warm clay workbench treatment addresses the white-render limitation without claiming a runtime material.

The default execution, however, creates a derivative with a copied mesh and flat shading only. It preserves all 1,029,792 source triangles, so it is not the planned controlled 0.15-collapse derivative and will provide little geometric comparison against an already faceted raw PLY. The plan's claimed first cleanup evidence therefore requires the existing explicit `--preview-decimate` option. That option remains bounded and review-only: it applies one deterministic collapse modifier to the derivative copy, retains triangles, records its exact resulting count, and leaves the raw source untouched.

Run the approved R1 once with that flag, then stop for independent review of the paired raw/derivative 512, 96, and 48 renders and metrics. Do not add manual sculpting, tip deletion, or root removal during this comparison.

### Final pre-run correction check

**GO for the reviewed invocation `--execute --preview-decimate`.** The final executable SHA-256 is `84455cce4cbef103e52bbbc24b4b58f11b793a5b0ed07e67c0650c797c15a48e`; the corresponding plan SHA-256 is `aa19c9352481a959b8693eadc315ce1ebb3a9f8d5d77ae75127540754077618e`.

The final script no longer calls `mesh.validate()`: normal inspection is read-only. It imports with explicit `Y` forward / `Z` up, unit scale, no vertex merge, and no imported attributes. Preview and derivative copies explicitly clear their hidden state before modifier application; the view layer updates before world-bound measurements; and the raw/preview RNA data references are saved before their objects are removed from the final editable derivative file. These corrections preserve the approved method and resolve the identified silent-mutation and lifecycle risks.

## Cleanup R1 actual result

**Result: HOLD for art and runtime admission; retain as a verified raw-master derivative.**

The controlled reduction completed without a visible detached-part regression. The raw mesh—not the derivative—was audited as one connected, triangle-only 1,029,792-face component with no invalid normals. The metrics record the derivative as grounded and 5.00005 × 4.99748 × 3.91743 m at 154,468 triangles. No debris removal, sculpt, material authoring, or export occurred. The cleanup metrics declare `cleanup-r1.blend` derivative-only plus the inspection studio; the immutable raw master remains the pinned external PLY.

The paired renders show that the 0.15 collapse retains the broad overall envelope, trunk fork, and root directions without an obvious new break. It is therefore useful evidence that the raw master can be reduced without immediately losing its base silhouette. The warm matte makes this conclusion much clearer than the original white inspection.

It still misses the selected target's identity. The reference has four broad, weight-bearing buttresses and a clean bent fork; this derivative reads as many narrow, wavy, similarly weighted root struts around a generic stump. The long lateral root and the near root cluster do not form the reference's disciplined foreground cadence, and the fork is still weakly asymmetric. At 96 and 48 pixels it remains a recognizable tree-root anchor, but not a distinctive Rootbound hero component.

The subsequent read-only saved-blend check establishes one face-bearing connected mesh component (76,192 referenced vertices) and 98 unreferenced loose vertices, for 76,290 vertices and 154,468 faces total. It does not certify manifoldness, winding, or self-intersection. The loose vertices need cleanup before any future export; the render comparison is sufficient only to retain the derivative as a held visual checkpoint.

**Derivative visual fit: 6.4 / 10.** Retain the raw PLY and this derivative as evidence and a potential input to a later, separately reviewed structural cleanup. Do not treat 154,468 triangles as mobile-ready or derive a runtime collider, material, or placement from it. A future focused repair must change the structural reading—consolidate the roots into four primary buttresses and shape the trunk/fork—rather than merely repeat reduction or lighting.
