# Reference-driven production loop

Use this only for a Wildkin Frontier asset class or art pass. It adapts Dream Loop's target-first loop to local, offline-ready game assets; it does not replace the current scene, UI, gameplay or asset registry.

## Lock the target before modeling

Start from Chris's approved style/identity references. When an existing game asset needs improvement, capture its current game-sized view and use it with the approved direction to create a mesh-ready target image. A target must show one subject clearly, with opaque background, ordinary construction and anatomy; it is a product target, not concept art. Record image-tool provenance as `undisclosed` when the tool does not expose a model version.

The unchanged owner originals are now retained in `art/style/`: `explorer-master.png` is the later preferred master; `woodland-inspiration.png` and `luminous-inspiration.png` are environmental/UI inspiration. Use these durable paths rather than clipboard temporary files. Individual neutral-pose modeling references do not supersede the owner sheet. Read `art/style/README.md` for scope and provenance; invented text/features inside the images remain reference content.

Use three separate roles for each admission decision:

1. A reference author proposes or selects the target and flags generated-image artifacts.
2. A model implementer creates or repairs the mesh, material, rig and clips.
3. An independent visual judge compares the rendered candidate with the target at game scale and gives a 0–10 score with concrete defects. `8/10` is the minimum visual pass; a score may never substitute for motion review.

The judge must reject unexplained attachments, inconsistent repeated details, fake transparency/checkerboard, fused anatomy, missing contact, silhouette drift, over-detailed non-mobile treatment, reflective material, or a style that fails the approved faceted high-contrast look. Do not call a target accepted from a prompt, a scene graph or a metric.

## Character source-pose gate

Before a character rig is fitted, render the raw/optimized mesh orthographically from front, both sides and rear. Use a neutral source pose suitable for judging the asset, not a flattering action pose:

- Humanoids: relaxed A- or T-pose, arms and legs visibly separate, upright head and a clear torso/hip axis.
- Quadrupeds: relaxed four-paw stance, distinct legs and paws, head/spine aligned to ordinary travel direction, readable shoulder and hip pairs.

Inspect the actual surface independently for body-axis, head-axis and paw/foot-pair direction. Names, profile declarations, bone landmarks, thumbnail views and animation track names do not establish them. A face that points toward the camera can hide a torso and leg layout running perpendicular to it, so a whole-mesh yaw adjustment cannot repair the disagreement. If those axes disagree, repair or reorient the source before weights and clips are accepted. Preserve approved colors, texture and likeness when that is cleanly possible.

## Iterate only on evidence

Render each candidate in matching front, side, rear and three-quarter views, plus game-sized landscape views. The visual judge gives a pass/fail and score; revision changes the specific source, topology, material, pose, weights or clip responsible. Do not rerun the same generator settings after a repeat failure.

For an accepted appearance, proceed to `rigging.md`. The independent motion judge then evaluates the exact exported GLB at its content hash. An owner report from a phone that the creature runs sideways, its head stays sideways, or a human gait is stiff or too broad invalidates the preceding motion pass and starts a repair iteration from the source-pose gate.

## Batch safely

Keep an inventory of the project's existing 3D library and runtime ledger before a broad pass. Batch static props by material/shape family only after a representative has passed; handle humanoids, quadrupeds and distinct creature anatomies separately. Verify the runtime sibling uses for every revision. This allows static assets to advance without using an unproven character rig as a batch template.
