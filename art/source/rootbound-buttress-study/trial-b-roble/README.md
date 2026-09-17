# Trial B — RobLe-guided Rootbound buttress study (final HOLD)

**Decision:** Final Gate A HOLD, score **1.0/10**. This is a bounded failed
manual-modeling study, not a candidate GLB, palette admission, collider,
runtime asset, or placement change. No GLB was produced and no game files were
modified.

The study used the approved target
`../../rootbound-buttress-v1/reference/target-v1.png` and preserved its SHA-256
`0e8dc741e4124e7af3feb5b46f911cfb7a56cde01bd08a9aa6669bf470af6ab6`.
Its final frozen construction contract was
`../director/section-construction.json`, schema `v3-amended`, SHA-256
`41f76876de3a1cc426d962b862eca26383ab5f41bd21bf494660013dc654aa2e`.

## Three-pass record

1. **Initial massing** — [script](scripts/03_initial_neutral_massing.py),
   [editable source](output/trial-b-roble-massing.blend), and neutral
   [five-view evidence](output/renders/). It transcribed the original frozen
   path points and showed the leader return/limb elbows, but used separate
   capped lofts. The independent review held it because the roots read as a
   radial fan, branch overlaps read assembled rather than grown, and each
   canopy group was only one simple hull.
2. **Pass 2 connected-massing attempt** —
   [script](pass-2/build_pass2_connected_massing.py),
   [editable source](pass-2/output/trial-b-roble-pass2-massing.blend), and
   [review](pass-2/output/independent-massing-review.md). It used the revised
   junction plan and explicit saddle/collar volumes, but its Boolean result
   lost the lower trunk connection: the actual mesh had two disconnected
   closed shells. The old [manifold audit](pass-2/output/manifold-audit.json)
   is explicitly marked invalid because it hardcoded an object count as
   `woodComponents`; the graph-based
   [component audit](pass-2/output/component-audit.json) is authoritative.
3. **Final pass 3** —
   [script](pass-3/build_pass3_welded_massing.py),
   [editable source](pass-3/output/trial-b-roble-pass3-massing.blend),
   [all-angle renders](pass-3/output/renders/), and
   [final audit](pass-3/output/final-mesh-audit.json). It replaced CSG with an
   implicit welded-surface attempt and added grounded web samples. It still
   failed: the actual graph audit reports **46 connected components**, despite
   0 boundary and 0 non-manifold edges. Detached fragments are visible at the
   branch and ground zones. It is therefore not an export candidate.

No fourth pass is authorized in this visit, despite the broader continuous
development direction. Preserve every artifact above as failure evidence.

## What the RobLe guidance contributed

The `reference-to-3d`, `reference-analysis-validator`, `contour-to-mesh`, and
`blender-modeling` guidance was adapted to this volumetric, opaque static tree
rather than applied as a logo/2.5D workflow. The retained preflight files
measure the target silhouette, canopy bands, warm trunk/branch bands, root
spread, and uncertainty from its single perspective view:

- [target-contour-landmarks.json](preflight/target-contour-landmarks.json)
- [contour-informed-method.md](preflight/contour-informed-method.md)
- [analyze_target_mask.py](preflight/analyze_target_mask.py)

The useful process result was real: source-facing contour landmarks and a
separate all-angle gate exposed that numerical centerlines alone cannot prove
growth, closed buttresses, or an attached canopy. The method did not produce a
valid tree. The perspective target never supplied orthographic depth truth, so
rear volume, root depth, and junction topology remained declared inferences.

## Failure analysis and next rotation

The plan review improved section specificity across versions: it added measured
centerline/bend/taper tables, source-visible leader return, limb elbows, and
root trajectories. The first topology version prescribed overlapping full neck
loops at T3/T4; that was correctly flagged before execution. The amended plan
allowed partial-arc/saddle transitions to the separated child rings instead.

Pass 2 then used an inadequate CSG implementation. Its `tangent_frame()` also
recomputed horizontal frames rather than carrying a sign-continuous transported
frame; the T4 direction return could flip the local basis. Pass 3 avoided CSG,
but its implicit surface approach left many detached converted fragments.

Any future **Rotation Rootbound** must change method before attempting another
candidate: first prove the geometry operation with a small standalone probe
that reports one graph component, zero boundary/non-manifold edges, stable
parallel-transport frame signs, outward normals, and no detached conversion
fragments. Only then apply it to the frozen tree paths. Do not infer acceptance
from a `.blend`, a triangle count, an object count, or a source-facing view.

## Reproducibility

Every Blender MCP invocation used this exact owner prompt:

> Lets go ahead and take some time to make the prosed agent that analyzes the target image and makes a plan, maybe test out both of those skills you gound as well. Do a test run on the tree from scratch.

The saved source blocks were executed through Blender MCP as owned files. Their
final SHA-256 values are:

- `scripts/03_initial_neutral_massing.py` —
  `8c587c1459d55e28384f4adb04eedf01b7f872f150605cc71707b520feb0297b`
- `pass-2/build_pass2_connected_massing.py` —
  `88107c3ba3b2cd71fb51cb490a615f1a1e9b5a3459dc8ae5e4448f604feeb008`
- `pass-3/build_pass3_welded_massing.py` —
  `66516f628e22ecde611955e9cc6caa138e3a1bc18fab32d5d5da4b27f7a56c43`

The initial source used the earlier section-table revision; pass 2 first
attempted a direct load while its shared JSON was malformed, but that call made
no Blender mutation and consumed no production pass. Passes 2 and 3 used the
frozen amended input above. The retained files distinguish those events rather
than claiming a successful reproducible construction.
