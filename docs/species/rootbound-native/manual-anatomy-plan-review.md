# Trailgloam manual anatomy plan — independent technical review

**Decision: HOLD pending one coordinate-convention correction.** The plan otherwise provides a credible editable, neutral-massing route: it separates reference evidence from proposed dimensions, names all six socket-to-sole chains, uses closed two-socket fronds, requires a junction probe, and keeps mesh, runtime, rig, and admission out of scope.

## Blocking contradiction

The coordinate paragraph says ground is `Y=0` and head-forward is `-Y`, but every listed point, shell/frond height, hoof-ground rule, and explicit sole test use **Z** as vertical: feet sit at `Z=.06` and soles at `Z=0`; fronds rise to `Z=1.55`; the proposed `1.70 Z` envelope also relies on Z-up. A builder following the stated `Y=0` ground would rotate the creature's height into its forward axis and invalidate the planned renders, collider, and glTF export.

Freeze the manual construction convention as **Blender Z-up: ground plane `Z=0`; head-forward `-Y`; right `+X`; dorsal/up `+Z`**. State the explicit Blender Z-up → exported glTF Y-up conversion and require that neutral proof renders and bounds are labelled in Blender space before export. The proposed `1.70 m` tip envelope is a build target, not a recovered source measurement; keep the 1.55 m frond-tip centreline and observed complementary-sheet leg spacing as review constraints rather than claiming image-derived physical scale.

After that textual correction, the plan is **GO for its Gate-A blockout only**, subject to the stated `CURRENT_SLICE.md` authorization. It does not admit a model or waive the six-chain, two-socket, underside, 48/96-pixel, material, collider, or later motion gates.

## Recheck — corrected convention

**GO for Gate-A neutral massing only.** The canonical plan now consistently uses Blender `Z=0` ground, `-Y` head-forward, `+X` right, and `+Z` dorsal. Its stated Blender-to-glTF map `(X,Y,Z) → (X,Z,-Y)` is consistent with Y-up glTF and maps the model's forward direction to glTF `+Z`. The explicit no-double-conversion and future exported-front/yaw check close the plan-level transform risk. No runtime-facing transform, model admission, or export approval follows from this review.
