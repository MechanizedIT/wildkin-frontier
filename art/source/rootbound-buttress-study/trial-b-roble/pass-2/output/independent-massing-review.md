# Rootbound buttress study — Trial B pass-2 massing review

**Scope:** repaired untextured Gate A review. This is not an export, collider, runtime, or placement decision.

## Decision: HOLD — one final consolidated structural repair only

The actual all-angle frames are a hard Gate A failure: the upper trunk/branch/canopy assembly floats above a separate lower root cluster. `component-audit.json` independently reports two closed disconnected wood shells (242 and 160 vertices), so the script's hardcoded `woodComponents: 1` field in `manifold-audit.json` is not valid evidence. A zero boundary/non-manifold count does not make two disconnected closed shells a single tree.

## Root cause and visible consequences

1. **The CSG result lost the continuous lower trunk.** This is not a small collar-contact gap. The exact Boolean input/saddle solids produced a separate upper and lower shell, leaving no full trunk from T0 through T4. The final repair must rebuild that structural surface, not raise or enlarge the lower ellipsoid cluster.
2. **The loft frame violates the plan's continuity rule.** `tangent_frame()` recomputes `U = Z × projectedTangent` at every section and never carries/parallel-transports the prior frame. At the trunk's T4 endpoint the tangent reverses X direction relative to the preceding interior tangent, which can flip the local frame nearly 180 degrees. Similar return/bend paths are exposed on the leader and roots. That twist can create invalid Boolean solids and must be corrected at the loft source.
3. **Even without the topology failure, the visible form misses the target.** The roots are not grounded buttress webs: the numeric path cores begin high and taper to toes, so they need added shared surfaces down to ground and closed collar valleys. The three canopy groups still read as simple floating icosphere clusters rather than connected/deep grouped foliage volumes seated on branch endpoints.

## One final repair packet

Preserve the frozen skeleton centers, bends, and tapered core paths, but rebuild Trial B wood as one explicitly welded manifold surface—no Boolean CSG for the trunk/root/fork structural result. Use a parallel-transport frame: seed an initial U, project/renormalize the prior U into each new tangent plane, re-orthogonalize V, and flip the new frame when its U dot prior U is negative. Build the T3/T4 pair-of-pants junction patches and a full trunk from T0 through T4 with shared vertices/faces.

Treat the root paths as upper contours, then add broad grounded vertical/tapered buttress webs from each contour down into the shared T0/T1 collar and ground. Close the valleys as exterior surface so five roots read as one planted base, not a radial fan or a floating cluster. Build two-to-four irregular deep hulls per left/high/right canopy group, seated over visible branch stubs with real branch windows.

Before any visual judgment, compute—not hardcode—one connected component for the final wood, zero boundary/non-manifold edges, coherent outward normals, and no self-intersections; then render the five Gate A views. This is the last Trial B repair. If it cannot make the whole trunk/base present and pass those computed checks, retain the trial as HOLD with no export or integration.
