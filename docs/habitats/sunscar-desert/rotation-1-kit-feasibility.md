# Sunscar Desert rotation 1 — kit feasibility

**Status: pre-selection, read-only feasibility evidence.** The two generated
portrait directions are reference directions, not an admitted asset request or
source authorization. Their director selection, fixed native-camera projections,
full-footprint support, protected-source/home clearance, and ordinary-route
proof remain required before any placement.

## The visual requirement

Both directions need a close, readable *warm eroded rib*, rather than another
vertical landmark: a broad, low-poly sandstone mass with a long horizontal top
break, a broken end, and shallow vertical weathering. In the arrival direction
it is an edge/backstop that holds the central walking lane; in the destination
direction it is a forward-facing low rib behind/alongside the existing crystal
fan. The teal remains a concentrated mineral accent and is not the rock
material.

These are target-image observations, not claims of surveyed world dimensions.
For a later projection test, the primary visible silhouette should occupy about
3.8–4.8 m wide, 1.8–2.5 m high, and 1.3–1.9 m deep at unit scale. A rotated,
scaled reuse may make the lower companion break at 55–70% scale. The target does
not call for an arch, cave, bridge, spire, or a new interactable.

## Existing library audit

| Candidate | Evidence | Sunscar decision |
| --- | --- | --- |
| `asset_verdant_cliff_toe`, `buttress`, `ledge` | Registered opaque V1 GLBs with convex hulls. The native GLB inventory measured 3.110 x 1.375 x 1.779 m / 268 tris; 3.068 x 3.828 x 2.020 m / 458 tris; and 3.280 x 2.465 x 2.070 m / 384 tris. They are cold Verdant rock forms, accepted for that family only. | **Do not reuse as Sunscar target art.** Their scale and grounded convex-hull recipe are useful implementation precedent only; their material and stepped rock silhouette do not supply the warm, horizontally eroded sandstone read. |
| `asset_fen_bank_outcrop_left/right` | Registered external Fen GLBs with convex hulls. Their unit hulls are approximately 3.30 x 0.85 x 2.80 m and 2.60 x 1.60 x 2.50 m respectively. They are named and admitted as Fen banks, with no Sunscar render evidence. | **HOLD, not a substitute.** Their wet-bank family/material has not been shown to fit Sunscar, and external GLBs are not generic low-scenery content. No placement should infer compatibility from their geometry alone. |
| `asset_fen_stone` | 14 authored parts; 1.2 x 2.3 x 1.0 m box collision; a standing Shatterfen monolith. | **Reject.** Narrow, tall, wetland silhouette; it is not a desert boulder or rib. |
| `asset_ember_spire` and `asset_wind_arch` | Respectively a 1.3 x 3.3 x 1.3 m Emberfall spire and a 1.2 x 4.4 x 1.2 m Windscar Stone Needle. | **Reject.** Both are vertical landmarks. Neither gives the required broad eroded mass; the named arch/needle role would also change the target language. |
| `asset_iron_ore_rock`, `asset_crystal` | Existing resource visuals: iron GLB is only 1.245 x 0.833 x 1.011 m; crystal is a harvestable 2.04 x 1.55 x 1.60 m box. | **Retain only at existing source identities.** They can remain the mineral payoff but cannot be cloned into a rock formation or used to add new resource semantics. |
| `asset_trail_stones`, `asset_pebble_cluster` | Small authored, non-colliding detail props. Trail stones are explicitly mossy. | **Secondary only.** They may later provide sparse edge rhythm if admission/projection succeeds. They cannot provide a landmark silhouette. |

The prior [Verdant cliff audit](../../../art/reviews/skybreak-tablelands/rotation-1/kit/verdant-cliff-audit.md)
also establishes an important deployment constraint: model-only assets with
`parts: []` are not supported by generic low scenery. The existing external
model + transformed convex-hull lifecycle is a deliberately bounded
`frontierLandformVisual.js` Terrace recipe. It is a precedent to review, not a
silent generic path for Sunscar.

## Conditional, single asset-loop recommendation

If the selected direction still needs a readable rib after fresh native camera
projection and terrain blockout, open **one** bounded `Sunscar weathered rib`
asset loop. It should produce a single reusable opaque prop, then obtain the
low companion only by approved rotation/scale rather than a second asset.

- **Envelope:** 3.8–4.8 m wide, 1.8–2.5 m high, 1.3–1.9 m deep; flat, fully
grounded base with no walk-under gap.
- **Silhouette:** one asymmetric horizontal cap/break, one broken end, two or
three shallow vertical erosion planes; clearly wider than tall from the fixed
portrait views. No arch, cave mouth, needle, teal crystal, vegetation, glow, or
new interaction cue.
- **Material/budget:** one opaque warm ochre/sienna sandstone material, with
subtle darker bedding planes; target at or below 700 triangles before any
collision representation.
- **Placement contract:** at most two transformed instances in the eventual
bounded circuit, only after full transformed-planform support, source/home
footprint clearance, route-shoulder clearance, and all fixed-pose mesh
projection. It may frame the lane but cannot occupy it.

This is deliberately conditional. Terrain alone may provide the necessary
warm band and negative-space boundary; then no asset loop is warranted.

## Deployment uncertainty and proof

A new visual asset does not yet have an approved streaming/collision route.
An authored-parts version could use the low-scenery renderer, but that path does
not establish physical collision. A model-only GLB with a convex hull would
need a separately approved, tightly scoped landform-visual recipe following the
Terrace lifecycle; it cannot be smuggled through the canopy path or a global
renderer change. The asset loop therefore needs independent reference/mesh
review, registry and renderer admission, exact transformed support and collider
proof, protection parity, native captures, and an ordinary route test before it
can enter a Sunscar structural pass.

Until those gates and target selection are complete, the result is **HOLD**:
existing low details and terrain may be planned, but no current asset honestly
fills the target's warm broad-rib role.
