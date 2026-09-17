# Fungal Hollow structural plan v2 — conditional, screen-aware candidate

## Bounded result

V1 only disproved its guessed offscreen lobes. This revision performs one finite camera-first 2 m survey in destination ±30 m. Of 39 useful projected mesh vertices, 35 lie in the route support band; only four useful vertices are outside it. The largest non-route component is two cells: `(-2842,-1288)` and `(-2840,-1288)`, at screen `x=352.22..396.25`, `y=174.42..177.18`. It cannot form a meaningful bank on its own.

The one conditional material candidate is a route-adjacent rear shoulder: a smooth elliptical low relief centered `(-2840,-1289)`, radii `(6 m,5 m)`, peak `.55 m`. It changes 20 2 m vertices, intersects no resource, fitted-stone, or Thorn-home disk, and projects seven post-addition vertices inside the useful frame, covering `x=198.01..365.37`, `y=165.29..245.69`. It is a visible low backstop, rather than an offscreen perimeter.

## Camera and mesh evidence

The fixed destination camera is player `(-2826,14.146509,-1298)`, yaw `2.432966`, pitch `.628319`, 52° FOV, 412 × 915. Reconstructed eye: `(-2819.897279,21.859575,-1305.119836)`. The finite survey covers `x=-2856..-2796`, `z=-1328..-1268` at the actual 2 m terrain mesh interval. Full post-addition 2 m vertex rows and projections are in [`fungal-structural-plan-v2-proof.json`](../../../art/reviews/fungal-hollow/rotation-1/fungal-structural-plan-v2-proof.json).

All 138 current 2 m terrain triangles with centroids in the 3 m route interior were recomputed from the candidate vertex heights: maximum slope `.169643`, zero above `.32`. This is necessary mesh evidence, not a substitute for full `.32 m` player-footprint, native traversal, collision, and reload proof.

## Contract audit

`docs/FUNGAL_HOLLOW_CONTRACT.md` requires each frozen centerline to retain a **3 m supported half-width** on analytic terrain and rendered 2 m triangles. It does not require zero terrain-height delta over the corridor. The independent route review expressly allows a future structural pass to make a lower-side-to-rear bank read if it leaves both capsule corridors open and proves support, routes, blossoms, the Thorn disk, stones, sampler parity, and cap parity.

A gentle supported route reshape is therefore within authorized structural scope after independent plan review and complete terrain, player-footprint/physical traversal, resource/home/stone support, identity, sampler, cap, and persistence proof. It does not require an owner decision merely because its height is nonzero. No width, route point, stable ID, source/home footprint, stone fit, or cap may be weakened.

## Hard exclusions and review gate

The candidate is outside all four resource disks, all three fitted solid-stone disks, and the complete Thorn home. Existing dressing is neither moved nor added. The 23 fixed records, IDs/order/caps, sampler order, and life records remain frozen. An independent reviewer must approve this material plan before any bounded source pass; that pass must prove actual rendered mesh support over the full 3 m corridor, `.32 m` footprint traversal, native reload, and exact life/scenery/sampler/cap parity.
