# Rootbound Wildwood spatial plan V2 — independent level-design review

## Decision: HOLD for high-quality map/image generation pending coordinate and zone corrections

The prose has improved from the initial outline: it fixes the retained Arrival, Gallery, and Destination stations; gives each proposed zone a different ecological role; keeps the 3–5 minute circuit conditional on an ordinary measured loop; and does not convert provisional materials, climate, or Trailgloam into runtime facts. The current source supports the claimed *markers*: `frontierRootbound.js` places the crown proxy at `(-468,717)`, the hollow at `(-445,678)`, ridge segments around `(-478..-465,714..721)`, and the Lantern/Thorn curated records around the destination room.

The arrival capture also supports the station rather than a guessed relocation: it records position `(-475,590)`, yaw `-1.743`, portrait pitch `0.6283`, and effective distance `11.5911m`. It is reasonable to plan a generally northward Gallery cue from there, but it is not yet a demonstrated rootline screen projection or an actual visible ridge claim.

### Blocking corrections

1. **Use one real map transform.** The current layout SVG says one grid equals 10m, but its station locations do not preserve world deltas: Arrival to Gallery is about 130m in world Z and only 5m in X, while the illustrated points are displaced hundreds of pixels in both axes. Its gold route is also not a closed Arrival → Gallery → Lantern → Crown → Meadow loop despite the legend. Rebuild it from a declared world-X/world-Z origin, scale, north arrow, and exact station/zone polygons; do not treat the present art positions as implementation coordinates.
2. **Resolve the Gallery/Crown overlap.** Gallery station `(-480,720)` and the source ridge/crown proxy occupy the plan’s Crown bounds (`z[705,735]`), while the plan labels Root Galleries as `z[615,655]`. The actual terrain classifier calls the ridge points `root-gallery`; it does not establish a separate Crown zone. Either show the Crown as a proposed overlay/branch of the existing gallery marker, or move its proposed extent only after source and route evidence. The map cannot depict both as independent current rooms at the same location.
3. **Make the plan an art-production brief, not a color-block diagram.** The composition SVG currently has four generic curves/triangles and no per-station foreground/midground/background design. For each of Arrival, Gallery, and Destination, specify: camera yaw/pitch/distance from the capture, central HUD-safe lane, one foreground edge form, one mid-frame anchor, one background/return cue, permitted height band, density edge, and existing asset or explicit gap. Add the Crown and Verge as a branch/overlay with their actual status. This is needed before per-subhabitat image generation can be judged against the map.

### Required feasibility annotations

- Mark protected life plates, retained grove/earned-grove uncertainty, hollow radius, and existing curated scenery separately from proposed forms. The plan is right not to equate Heartroot Crown with the earned grove; the vector and captions must retain that distinction.
- Define the optional Verge route as an ordered branch with rejoin point, not a dashed stroke. All five zones need a lane width/asset-hull/support check before they become placement instructions.
- Preserve the asset matrix’s current/gap distinction. The buttress anchor is a reviewed reference and unadmitted geometry; all Crown silhouette and Lanterncap cluster claims remain proposed until camera/support/asset evidence exists.

After those corrections, the prose can serve as a strong map-image source. It is not yet a sufficient high-detail technical map or a construction-ready spatial plan.

## Corrected layout map re-review

### Decision: conditional GO for a bounded whole-map concept image; runtime HOLD remains

`build-rootbound-planning-maps.mjs` now implements the declared transform exactly: `X = 80 + (worldX + 525) × 4`, `Y = 140 + (750 − worldZ) × 4`. Its 25m grid, 35 parsed life points, three current protection plates, three actual ridge polylines, hollow outline, Crown point, camera positions, and 298.244m proposed centerline all agree with the reviewed source or `restart-r2-captures.json`. Re-running the tool reproduced its stated 298.244164585m centerline. The route is visibly closed, and its east-Verge branch is explicitly proposed rather than falsely presented as the existing thorn feature.

The recorded camera treatment is also now grounded: Arrival is `(-475,590)`, yaw `-1.743`; Gallery is `(-480,720)`, yaw `-1.36`; Destination is `(-449,675)`, yaw `-2.3`; all recorded portrait pitch and effective distance are approximately `0.6283` and `11.591m`. With the tool’s documented forward convention `(-sin(yaw), -cos(yaw))`, Arrival faces mostly east, not north. The map correctly identifies Gallery as the **proposed Crown threshold**, avoiding the earlier claim that this captured point proved a separate Gallery room.

This is enough to generate one bounded whole-map concept: it has real spatial relations, retained/proposed visual language, route intent, and clear non-runtime labels. It is **not** a placement or terrain approval. Full final-triangle support, life/resource/home and asset-hull clearance, actual camera projection, ordinary route timing, persistence, and native views remain required.

Before per-portrait composition work becomes construction-ready, remove the superseded early zone table from `SPATIAL_PLAN.md` and replace the old generic `composition-target-v2.svg`. The composition diagram still lacks the corrected east-facing Arrival relationship, map-aligned Crown threshold, and per-station foreground/midground/background/HUD-safe rules. Those corrections can proceed in parallel with the one map concept image; they are required before source/asset placement.

## Portrait composition and reference-plan re-review

### Decision: GO for bounded scene-reference illustrations; frozen acceptance targets remain limited to Arrival, Destination, and Crown-threshold Gallery

The revised five-panel composition sheet is a useful production reference. It correctly declares itself schematic visible ground, not a horizon/terrain/runtime view; gives every zone a central clear lane, an edge-only anchor family, and a distinct height/density rhythm; and keeps the player disc at about 10% of panel height and 56% down from the panel top. The upper 18%, lower 10%, and lower side-control bands make the HUD constraint visible without painting a fabricated HUD. The prompt plan matches the actual portrait configuration: `createCamera.js` supplies 52° FOV, config/captures supply 36° pitch, and the recorded effective distance is 11.591m.

The added journal key convention, content status, audience state, and evidence-link requirement also close the earlier documentation gap. They remain explicitly document metadata, not a runtime schema or journal feature.

Gallery and Verge do **not** have frozen matching native poses. They may still receive bounded **scene-reference illustrations** now, using the declared generic portrait camera class, player scale, HUD-safe bands, and map relationship. Their generation records must label them `provisional-camera-class` and must not say “matched to supplied native frame,” become acceptance targets, anchor geometry/placement, or support before a new recorded native pose and projection are reviewed. Arrival and Destination may be matching-pose reference candidates; the present Gallery frame may be a Crown-threshold candidate only, as the plan correctly states.

One wording correction is required in the composition SVG footer: replace “Gallery and Verge require new native poses before image generation” with “before matching-pose selection or runtime acceptance.” The current sentence conflicts with the valid scene-reference lane above. This does not authorize any source or runtime work.
