# Rootbound buttress study — independent section-plan review

**Scope:** numerical/construction-plan gate only. This is not a model, export, collider, runtime, or visual-admission decision.

**Reviewed inputs:** `section-construction.json`, `section-construction-tables.md`, `curvature-review-addendum.md`, and the approved source/reference contract.

## Decision: HOLD — one attachment-construction clarification is required

The numerical skeleton is internally sound. Independent recomputation of every Euclidean segment length, intersegment bend, and total path length matches the JSON at its stated rounding: trunk `2.458 m`; left `1.798 m` with `4.8°/22.3°/13.3°`; right `1.749 m`; leader `1.452 m`; and five roots `2.211/2.296/2.022/1.929/1.637 m`. Section dimensions are positive and consistently taper along each path. The declared root thicknesses reach the required `0.24 m` minimum, and the proposed skeleton plus section radii is feasible within the stated height/footprint envelope. The values are properly described as construction inferences from a perspective target, not recovered 3D facts.

The table is not yet sufficient to construct a single manifold trunk/fork mesh because its full-ring equality instructions are contradictory at both branching junctions:

- At **T3**, the trunk continues to T4 while right branch `R0` also “matches T3 collar dimensions.”
- At **T4**, left `L0` and upper leader `U0` both “match T4 collar dimensions.”

Two child tubes cannot each consume the same entire parent ring and remain a single connected manifold solely by overlapping. The existing text says “split/bridge,” but it does not allocate parent faces/arcs or define the required fork patch, so it leaves the exact section requirement ambiguous.

## Required correction before using the table as fresh geometry input

Keep all listed control-point centers, path lengths, bend angles, target section dimensions after taper, and the declared curvature contract. Add one explicit **manifold junction-patch rule** for T3 and T4: each parent ring must split into disjoint child-neck boundary arcs (or an equivalent explicitly modeled pair-of-pants/bridged junction surface), with shared faces/vertices and no overlapping full loops. State that child `R0`, `L0`, and `U0` are target outer-neck dimensions reached immediately after their respective junction patch, rather than each duplicating the full parent ring. The patch must leave a continuous trunk continuation at T3 and create separate left/leader necks at T4.

This is a local construction clarification, not a new silhouette method or a reason to alter the measured curves. After it is frozen, the tables are suitable for the planned fresh Trial B geometry.
