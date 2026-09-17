# Trial B contour-informed construction method

The RobLe reference and contour guidance is useful here as a **measurement and
review aid**, not as a front-skin reconstruction recipe. The supplied target is
a single three-quarter perspective image, so its front-facing mask can lock the
visible high peak, left/high/right lobe separation, trunk run, branch-band
positions, root spread, and central window. It cannot establish hidden depth,
rear root layout, or topology. Those choices remain explicitly inferred under
the common construction plan.

The initial Blender candidate will therefore use the measured bands in
`target-contour-landmarks.json` as source-facing checkpoints while building a
real opaque object: derive five broad root ribbons from a single closed collar;
loft an offset 8--10-sided trunk loop chain; split/bridge shared rings into the
left, right, and upper structural limbs; and place three closed, deep faceted
canopy hull groups on visible support stubs. Each root, trunk, and limb joins
through connected cross-sections rather than intersecting cylinders or detached
wedges. Canopy hulls have true depth and retain physical gaps between the three
groups.

Curvature is a construction checkpoint, not a later decoration. The source's
visible warm core shifts through the lower collar, continuous trunk, and
fork/leader bands (recorded in the landmark JSON), so Trial B will make a
restrained rightward trunk sweep: collar X=0, mid shaft about X=+0.10 m, fork
about X=+0.22 m, and upper leader about X=+0.28--0.34 m. The 8--10-sided loft
rings follow that path and rotate 8--15 degrees between sections. Five root
ribbons descend through two or three tangent-oriented sections to unequal toes;
their front/back offsets must produce real curves in both source and side views.
Each major limb uses 4--5 tapered elliptical sections whose local axes follow a
shallow curved path and a small elbow from a shared split ring. Straight rods,
vertical cylinders, and flat radial fins fail this check. The arc remains
modest enough to preserve the shared envelope and reference character.

The first live proof remains neutral untextured massing from the declared
source-facing frame, rear, both sides, and a three-quarter frame. Only an
independent reviewer may approve that gate. A side or rear failure changes
volume/cross-section construction rather than being hidden with a front-facing
contour or texture. Palette work, final GLB export, collider proposal, and
game-scale renders stay after that gate.

No reference image was edited or derived. `analyze_target_mask.py` is a
reproducible Pillow-only numerical report generator; it writes no images and
uses the approved target hash recorded in the JSON.
