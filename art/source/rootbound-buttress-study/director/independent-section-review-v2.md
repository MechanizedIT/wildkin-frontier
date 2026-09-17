# Rootbound buttress study — independent section-topology review v2

**Scope:** focused topology clarification only. This is a construction-plan decision, not a model or admission decision.

## Decision: HOLD — boundary-loop separation remains underspecified and likely self-overlapping

V2 makes an important correction: it treats T3/T4/R0/L0/U0 as skeleton anchors, introduces explicit exterior pair-of-pants patches, prohibits caps/duplicate full rings, and retains the v1 skeleton values. The root collar also now states a closed collar, five exterior necks, and non-overlapping angular order.

The claimed **actual** child loops are not yet geometrically credible as disjoint boundaries at their supplied centers and full diameters:

- At T3, `T3-C` (`.61 × .54 m`) and `T3-R` (`.57 × .50 m`) have centers only about **0.10 m** apart. Their half-widths are about `.305 m` and `.285 m`; even allowing for their differing tangent planes, these broad 8-vertex loops cannot be treated as reliably non-overlapping boundary loops in that immediate region.
- At T4, `T4-L` and `T4-U` are about **0.17 m** apart while each is `.52 × .46 m`. The same issue applies.
- The root recipe gives angular order and a non-overlap instruction, but it does not define actual band start/end arcs or neck centers on the collar. It therefore cannot yet be audited as five non-overlapping attachments rather than five intended ones.

## Minimal correction

Keep every frozen skeleton point, curve, taper, and parent/child topology method. Recast the listed near-anchor positions as **junction-control locations**, then put each actual child boundary loop farther along its own child direction after the common saddle has separated the forms (relax the current `.12 m` local-offset cap where required). Define a nonintersection condition for the planar/loft boundary loops and record their final centers, local frames, full axes, and vertex counts. For the root collar, record five explicit non-overlapping parent-band arc indices/ranges and five root-neck centers/frames rather than only their ordering.

With those values, the exterior pair-of-pants construction can become a real manifold prescription. As written, it still risks precisely the overlapping-tube geometry it was meant to prevent.
