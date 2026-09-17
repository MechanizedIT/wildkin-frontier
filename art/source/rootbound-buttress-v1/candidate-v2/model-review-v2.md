# Rootbound buttress-canopy anchor v2 — independent model review

**Scope:** neutral-model and game-scale review only. No runtime admission is granted.

**Reference:** `../../reference/target-v1.png`
**Candidate GLB SHA-256:** `e13cf5dfbb37217deceed0ce7cb7978287854bd9aa436fb0a3514fd5e7b32d3e`
**Reviewed evidence:** all `output/renders/{front,rear,left,right,three_quarter,game_48,game_96}.png`, `output/candidate-manifest.json`, `output/collider.json`, and `build_rootbound_buttress_v2.py`.

## Decision: HOLD — 4.1 / 10

V2 corrects two v1 defects: its measured 5.962 m height is within the approved 5–6 m envelope, and its branches connect to the trunk above the lower mass. It still does not read as the approved grounded buttress-canopy anchor. Every neutral view shows a cut, tapered trunk with separate cone-like roots terminating in circular caps, while the foliage remains three disconnected rounded balls. The target reference instead needs a continuous splayed root base, visible unequal branch forks, and three porous irregular canopy lobes. At 48 px and 96 px, v2 reads as a tidy toy tree; it does not create the rooted, sheltering side frame required at the selected Rootbound destination.

The 740-triangle / one-material budget is feasible, but it is not perceptual evidence. The proposed lower-core collider may be reconsidered only after the visible root mass is rebuilt; it cannot make the capped root rods appear continuous.

## Three consequential gaps

1. **Buttresses are still rods, not a rooted base.** The visible roots are separate tapered cones with capped ends. They do not flare into or merge with the trunk's lowest metre, so the grounding reads as bolted-on legs rather than a planted tree.
2. **The trunk/branch hierarchy remains generic and cut off.** The upper trunk terminates in a flat top and the three branches are too regular and beam-like. The reference's asymmetric forks and readable supported junctions are absent, especially from the side views.
3. **Canopy volumes are disconnected balls.** Icosphere lobes preserve neither the faceted foliage mass nor porous branch windows of the reference. The 48/96 frames retain this ball-on-sticks identity and cannot carry a Rootbound-specific edge frame.

## One final consolidated structural repair — changed method required

Do not tune or rescale the current cones and icospheres. Build a low-poly **silhouette-first root-and-crown shell** from explicit faceted mesh rings/bridged faces (or equivalent hand-shaped mesh workflow): one flared lower trunk whose outer faces become three to five broad, flattened ground-contact buttress wedges; three asymmetric branch forks that are extruded continuously from that trunk; and three irregular, slightly overlapping but visibly separate canopy shells with cut-in negative windows around the forks. This must produce a single readable planted silhouette from front, rear, and both sides before leaf-like surface detail is considered. Keep the 5–6 m height, <=7 m footprint, matte single material, and a compact collider limited to the genuinely continuous lower root/trunk core. Re-render all neutral and 48/96 views for the final available review.

## Status

This is a structural HOLD, not a cosmetic one. Under the current three-attempt asset cap, one final repair remains. If that final candidate cannot establish the continuous root/branch/canopy silhouette, retain the reference and source as a useful held checkpoint; do not integrate v2 or create further candidates in this run.
