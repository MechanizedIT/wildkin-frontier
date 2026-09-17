# Independent Rootbound enclosure R1 plan review

**HOLD for one consolidated envelope-layout correction before source work.** The composite-placeholder method is appropriate: it reuses the supported low-parts path, keeps broad forms non-colliding, and can establish room-scale silhouettes without an asset experiment. The recipe table and existing renderer constraints are sufficient.

The six proposed anchors do not preserve the current route envelope:

- The two 8.9m Gallery shelters are centred only about 10m apart (`x=-483` and `-473`). Their nominal combined width leaves roughly 1.1m between full envelopes before yaw/terrain effects, not the needed open Gallery lane. The `gallery-terminus` at `(-478,655)` is directly on the main spine from `(-480,643)` toward `(-472,663)`.
- The 10.7m Heartroot core at `(-474,718)` and both wings are centred on or immediately beside the Crown approach/return geometry. Their intentional overlap creates a useful landmark web, but at those anchors it also makes a visual ghost wall across the reveal. Non-colliding status does not make that acceptable.

## One correction

Keep the four recipes and six-instance scope, but re-anchor the **whole assemblies** using transformed full XZ hulls, not centre/radius approximations:

1. Place the Gallery shelters as true opposite shoulder envelopes with a measured **4m full visual corridor** around the main spine. The lintel must move out of the spine entirely—use it as a side-clipped/far shoulder cue, or omit it if its full envelope cannot sit outside that corridor. Do not retain the obsolete 6m-open requirement from the draft.
2. Place the Heartroot core beyond the Crown approach endpoint as a rear backdrop, then attach both wings laterally to that rear core. Its combined hull must leave the 4m main corridor and lower-middle reveal open from `(-452,696)` through `(-480,720)` and into the return. This can still be a 5–7m connected landmark; it simply cannot be centred on the route.
3. Run the promised exact final-height/full-hull projection after those anchors are chosen. Report the minimum hull-to-primary/optional route distance and the screen bounds in the baseline 36° Gallery/Crown poses. This is one group-level layout check, not a per-part gate.

With those anchors corrected, GO one visual blockout capture. No extra foliage model, collider, terrain pass, or stricter historical 6m gate is needed.

## Revised-anchor measurement decision

**Conditional GO for the six-instance visual blockout.** The full-hull route measurements resolve the prior route-wall conflict under the current 4m primary / 3m optional contract: each Gallery and Heartroot hull stays at least 2.92m from the main spine (and at least 26.38m from the optional branch where relevant), exceeding the 2m / 1.5m half-widths. The terminus is now a side/far cue with 3.18m main clearance rather than a route-centred wall. The attached core/wings form a valid rear Crown assembly rather than a route-centred cluster.

Two conditions belong in the final source/capture receipt:

1. Apply the stated grounding offsets before building—0.60m shelter embed and 0.15m for the other composites—and refresh the four-corner base-gap measurement. The current planning JSON still records pre-correction positive corner gaps as high as 0.652m, so it cannot be reused as the completed grounding proof.
2. Capture both Crown entry at `(-477,709)` and the ordinary reveal station near `z=716`. At entry, the core has a usable lower-root screen contribution, but the west wing is fully off-frame and the east wing is only a sliver. The reveal capture must show whether the intended connected web reads once approached. Gallery's upper-left terminus is partly objective-HUD cropped, so it is a secondary cue rather than the form that must establish the room.

No 6m historical corridor, new asset, terrain change, or collider is required. The real baseline-36° capture is the next perceptual gate.
