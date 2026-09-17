# Rootbound buttress — structural R2 repair plan

Input is cleanup-R1 derivative (154468 triangles, measured 3.917m height and 5m spread) plus selected V2 target. Preserve the useful derivative and raw PLY master; this is local consolidation, not a new mesh.

Observed target landmarks: four broad ground webs join one continuous collar; a thick asymmetric trunk bends before two short unequal fork stubs; no canopy. Hidden rear depth is inferred and limited to the recorded 1.5m base envelope.

## Deterministic regional edits

1. Create four vertex groups by local X/Z masks around the existing base: front-left, front-right, rear-left, rear-right. Proportional-edit connected vertices only, flattening each outward foot into a web. Front full widths .85–1.05m; rear .65–.85m. Keep inner 8–15cm of every foot inside the collar, preventing detached rods.
2. Create a collar group spanning Y .35–1.15m. Apply local voxel remesh only to this group plus 12cm overlap, then shrinkwrap the boundary ring to cleanup-R1. This connects feet without global blob smoothing.
3. Lattice-deform only trunk/fork vertices above Y .65m: centerline (0,.65,0) → (.12,2.10,-.08) → (.32,3.00,.12), full widths 1.25→.88→.62m. The lateral offset .32m exceeds half the upper shaft width and must remain visible in side/three-quarter.
4. Shape two thick stubs from the upper trunk: left (-.42,3.75,-.10), width .48m; right (.58,3.92,.20), width .42m. Pull existing volume and locally smooth; do not append tube/ball primitives.
5. After deformation, dissolve only hidden dense microfaces, recalculate outside, and audit manifold edges/normals. Do not decimate before silhouette review.

## Review gates

Neutral front/rear/side/three-quarter must show four broad web feet, a single collar, visible bent trunk, and two unequal fork stubs. HOLD if feet remain spikes, collar becomes a sphere, trunk reads straight, or rear web disappears. Ground contact cadence and exact source-facing silhouette remain unresolved until actual R2 renders.
