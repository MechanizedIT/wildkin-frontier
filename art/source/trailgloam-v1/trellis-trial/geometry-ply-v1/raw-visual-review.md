# Independent Trailgloam raw geometry review

**Decision: USE WITH SPECIFIC DEBT as the retained high-detail Trailgloam master.** This exact raw PLY is a strong result for a one-image TRELLIS experiment and is a clear improvement over the earlier manual R6 neutral candidate as a source for a later derivative.

## Evidence reviewed

I inspected all 21 actual neutral views at 512, 96, and 48 pixels, including top and underside, against the selected `target-v2.png`. `inspection.json` proves a 1,804,432-triangle / 889,679-vertex float32 raw mesh whose source PLY, vertex positions, triangle index order, and identity import transform were preserved exactly for the observation. The teal clay is display-only; no texture or material was recovered or exported.

## Useful retained results

- The broad low saucer, short forward face, two dorsal amber-frond forms, and segmented legs reproduce the source image's creature identity unusually well for this class of input.
- The top, front, side, three-quarter, and underside views show six distinct feet and supporting chains. The feet are shorter, more organic faceted pads than R6's oversized black cuboids; they do not form a robotic rectangular frame at 48/96 pixels.
- The source has a cohesive low, ground-hugging silhouette at all supplied scales. Its leg, cuff, foot, face, and frond forms are useful reusable geometry regions for later controlled material/rig work.

## Specific debt and next boundary

The raw asset is not directly usable yet. It has 21,506 boundary edges and 37,649 nonmanifold edges in the exact imported index diagnostic; component count was intentionally not computed at this size. Those raw facts do not discard the master, but they require a separately reviewed stabilization/remesh derivative before export or rigging.

The clay inspection suppresses the target's material hierarchy. A later derivative needs a deliberate teal shell, darker cuff/underbody, amber frond, pale eye, and subdued foot treatment; it cannot claim that texture was recovered from this PLY. At the current raw bounds the master is also unscaled and has no collider, animation, encounter, persistence, or runtime proof.

The most useful next method is one separately reviewed, model-free postprocess derivative that preserves the pinned lineage and then receives all-angle, game-scale, topology, material, and rig feasibility review. Do not regenerate inference or use raw topology counts as a reason to discard the strong visible form.
