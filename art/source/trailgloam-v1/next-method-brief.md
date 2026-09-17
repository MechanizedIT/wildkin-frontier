# Trailgloam next-method brief

**Decision:** take Trailgloam forward only through a small, independently reviewed **actual-solid attachment probe**. Do not rebuild Mossling and do not begin a Trailgloam candidate or runtime lane yet.

## Evidence

- Conditional construction reference: [six-view sheet](multiview/trailgloam-orthographic-v1.png), SHA-256 `ba0b19c941f58b2468fb9aed3d62a995acedeb431fedd3e5932e5f1668da24a8`.
- Held render evidence: [R2 left](manual-blockout-v1/renders/gate-a-r2/left.png) and [three-quarter](manual-blockout-v1/renders/gate-a-r2/three_quarter.png). They show the failed read: thin rod legs, a flat polygonal shell, and vertical generic prongs instead of broad folded fronds.
- The R3 shell-port route stopped before mesh creation at its aperture routine: [terminal HOLD](manual-blockout-v1/r3-terminal-audit-hold.md).
- The R4 review retains closed segmented parts with dark cuffs as the useful direction but holds its proxy-only assertions: [independent review](segmented-r4-plan/independent-review.md). Its `2.14 × 2.08 × 1.8025 m` envelope is explicitly a planning proxy, not a model result.
- Mossling is already shipping V3 and has no diagnosed Rootbound visual defect that warrants a rebuild: [Mossling dossier](../../../docs/habitats/rootbound-wildwood/constituents/mossling.md). Its retained gameplay view is Verdant Verge evidence, not a Rootbound production cue.

## Changed construction method

Use a generated **assembly of genuinely closed low-poly solids**, never a perforated host shell or a single fused shell/leg mesh:

1. Make one faceted saucer shell section with no leg ports. Its lower rim remains a continuous visible dark belly band.
2. Make a single representative left chain from three explicitly capped six-sided frustum/prism links, a closed hoof wedge, and three separate closed six-sided cuff solids. Each link has literal cap faces and ring vertices; no open tube, arbitrary face deletion, Boolean, voxel remesh, or hidden overlap substituted for attachment.
3. Drive the coxa root into the actual shell volume. Place each cuff around the real generated end rings so it covers a measured overlap; do not infer contact from capsules, boxes, center points, or names.
4. Make one dark closed frond collar and one separate closed folded amber blade. The blade is a thick, capped folded prism with its base inside the collar. This tests the target's wide amber shingle read without treating a thin vertical prism as a frond.

This differs materially from the rejected R3 port/weld attempt and from R4's proxy plan: it creates the planned indexed solids once and measures their own caps, boundaries, contacts, and projected silhouette before any full six-leg build.

## Smallest independent feasibility proof

An independent builder may make one non-candidate `method-probe` containing only the shell patch, one complete left chain, and one collar/blade pair. It must preserve the six-view target as the reference and use the literal geometry recipe above. It is not a renamed full model pass and may not be presented as a Trailgloam candidate.

The probe must retain its executable script, `.blend`, mesh arrays, and a CPU/Blender audit that demonstrates:

- every probe solid has zero boundary edges and a finite, outward-normal triangle set;
- the hoof's generated minimum Z is exactly 0 after its local placement;
- every coxa root-ring vertex lies inside the actual generated shell or intersects its triangles, with a measured overlap interval; every cuff contains real adjacent link-ring geometry; and the blade base penetrates its collar;
- measured whole-probe bounds, link/cuff radii, and a left-side/three-quarter raster or render show a thick planted chain with the cuff visibly covering the joints;
- the folded blade has visible width and thickness, rather than a rod silhouette.

The reviewer decides whether this proves a usable recipe. A PASS authorizes a separately planned full initial build that mirrors the established left chain to six named legs, recomputes the complete envelope from actual solids, and proves all six planted hooves plus both fronds in all-angle neutral renders. A HOLD preserves the probe and does not spend a full Trailgloam candidate pass.

## Fixed identity constraints

Keep the low charcoal/dusky-teal saucer, restrained forward head, exactly six grounded articulated legs, dark hoofs/cuffs, two and only two thick amber folded fronds in separate dark sockets, small ivory eyes, and one restrained amber seam. No rig, motion, gameplay, catalog, home, encounter, collider, export, or runtime work belongs to this feasibility gate.
