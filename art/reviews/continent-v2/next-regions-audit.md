# Next finite-region slice

## Recommendation

Add one finite, authored macro-region catalog with exactly ten connected regions, then complete **Emberglass Caldera** as the first new habitat. The other nine records establish continent ownership and adjacency only; they do not count as finished habitats until each has its own readable landform, composition, useful interaction, traversal/risk, and persistence proof.

This is the smallest vertical slice because it replaces the repeating three-profile province field once, keeps the existing seeded relief as local detail, and proves one genuinely different expedition without introducing a quest system, new species, or a fourth general terrain framework.

## Concrete ownership

| Owner | Files | Bounded responsibility |
|---|---|---|
| Macro geography | `src/world/frontierRegionCatalog.js` (new), `src/world/frontierRegion.js`, focused tests | Ten fixed IDs and one connected polygon per region, with explicit shared edges/neighbors; select one dominant region with boundary blend weights; retain the current Lush/Sunscar/Ironspine relief functions as seeded detail inside each polygon. |
| Terrain contract | `src/world/frontierTerrain.js`, terrain/continent tests | Carry stable `regionId`/`habitatId` through the existing height, ground, coast, and chunk-physics sample. Add only the Caldera's bounded radial rim, bowl, and breached approach modifier. |
| One habitat composition | `src/world/frontierLandform.js`, `src/world/frontierScenery.js`, focused tests | Author the Caldera's one finite rim/breach landform alongside the existing finite Skybreak landform and project its spire/foreground/midground kit through scenery. Use existing cache, caps, preload, support, coast, place, and fixed-site checks. Do not create a generic habitat-place framework for one site. |
| Useful content | `src/world/frontierEcology.js`, `src/world/frontierWildlife.js`, state-focused tests | Add a small supported crystal/iron circuit and one bounded territorial Emberhorn origin using existing resource/capture owners and stable new IDs. No new resource type or species. |
| Map and save closure | `src/world/frontierAtlasRenderer.js` and focused rendering test; existing `frontierAtlasState.js`, `frontierAtlasSurvey.js`, `src/save/frontierProgress.js` verified unchanged | The atlas derives the Caldera's shape/color from terrain samples. Existing surveyed masks, depleted-resource records, and captured-origin records persist the outing. Add no visited-region ledger, campaign milestone, POI, chest, or save-version change. |

The smallest concrete representation is a frozen planar partition: one clockwise polygon for each region, shared boundary vertices authored once, plus an explicit neighbor list and transition width. A point-in-polygon query chooses exactly one owner. Only a narrow signed-distance band along that owner's shared edges samples the named neighbor for blending; there is no nearest-site search and therefore no detached islands or repeated fragments. Seeded relief is evaluated in stable world coordinates after ownership is chosen, so it adds local ridges/rolls without moving macro boundaries. A focused validator should reject polygon overlap, uncovered land samples, disconnected polygons, mismatched shared edges, or undeclared neighbors.

Display names are metadata for later UI and do not establish completion. Region selection remains a pure coordinate query; consumers must not enumerate all ecology, wildlife, scenery, or places across the continent.

## Compatibility chain

`frontierRegionCatalog` chooses the single authored macro region and boundary blend. `frontierRegion` applies that record's existing seeded local relief. `frontierTerrain` remains the authoritative height/ground/coast sample consumed by terrain meshes and collision. Scenery, ecology, and wildlife consume the same stable habitat ID plus the shared finite-place footprint, while retaining their current admission, residency, and cache rules. The atlas samples that terrain and stores only its current surveyed-cell masks. Resource depletion and captured Wildkin continue through their current stable-ID save owners; campaign progress remains untouched.

This is pre-alpha world regeneration. Replace the old repeating province field rather than preserving its envelope indefinitely, and allow documented regeneration of unvisited/unaccepted geography and coordinate-derived content. Keep only compact explicit protection around Camp, Skybreak, the Signal Cache, and the earned grove witness in this batch where inexpensive. The protected fixtures must remain reachable and functional; broad exact hashes are unnecessary. Put Emberglass outside those compact reserves so its polygon and transition can be authored cleanly.

## First complete habitat: Emberglass Caldera

The Caldera is distinct through physical form rather than a color swap: a broad crater rim, one readable breach, a lower bowl, and a central spire. It reuses the current seeded Ironspine relief beneath one finite radial modifier in `frontierLandform.js`.

The continent-map crater outline is not sufficient at the current short portrait camera range. Scope one representative approach at camera scale: two asymmetric rim shoulders frame a 10–14m wide breached route; a spire or tall ember silhouette sits in the midground; ember blooms, stones, trail stones, crystal, and iron create sparse foreground leads while preserving a clear walking lane. The player should read “enter through the breach” from an ordinary portrait view before seeing the whole bowl. Candidate assets are `asset_ember_spire`, `asset_ember_bloom`, existing stones, trail stones, crystal, and iron ore. Their actual frontier model admission, footprint, collider, and mobile cost must be verified before use; presence in `WORLD_DATA` alone is insufficient.

The outing is a deliberate descent through the breach toward visible crystal and iron guarded by one existing Emberhorn. Tidefin Ward gives a safer entry and retreat; Emberhorn Cragbreaker offers a faster mining alternative after the player learns the route. The broad breach must remain passable without either companion. The player can survey the bowl, collect a useful load, avoid or engage the territorial Wildkin, and return with atlas, depletion, and capture state preserved. No cache reward or campaign objective is needed for the first exploration proof.

## Minimal target proof

1. Pure catalog proof: exactly ten unique stable IDs and footprints; deterministic selection and blending; every finite land sample has one owner; no repeated region instance. Record the nine unfinished regions as allocated, not implemented.
2. Compatibility proof: bounded functional checks at Camp, Skybreak, Signal Cache, and the earned grove witness; document intentional regeneration elsewhere instead of preserving the infinite old field.
3. Caldera proof: bounded samples show a continuous breached approach, supported bowl, traversable slopes, coast clearance, and no unintended terrain seam. Ordinary portrait play from the representative approach must show both rim shoulders, the open breach, a midground landmark, and foreground resource/decor cues.
4. Content proof: every selected prop/resource/home disk passes actual footprint, support, place, coast, and solid-clearance checks. Unload/reload preserves depletion and captured-origin behavior without duplicate residents.
5. Journey proof: start from a disclosed nearby test fixture, enter using normal controls, visibly face the risk, gather the useful circuit, retreat, reload, and see the same surveyed/depleted/captured state. Measure the affected residency only; no full-continent life scan.

Do not count the Caldera complete from a map label, palette, or pure sample alone. Human portrait evidence must show the landform and route, and the full outing must work through existing gameplay owners.

## Main risks

- **Topology errors:** independently authored polygons can overlap, leave gaps, or blend with the wrong neighbor. Store shared vertices/neighbor declarations explicitly and validate the finite partition with bounded continent samples.
- **Intentional save regeneration:** replacing the repeating field moves unvisited coordinate-derived content. Document that pre-alpha regeneration; protect only the compact accepted fixtures named above and verify their behavior.
- **Boundary and traversal seams:** independent region and crater blends can create cliffs, gaps, or a blocked breach. Use one shared region sample and test terrain, physics, resource support, and scenery against it.
- **Asset/runtime mismatch:** Ember assets may exist in data but lack frontier admission, measured footprints, colliders, or acceptable mobile cost. Admit only the audited subset and let terrain carry most of the silhouette.
- **Authored encounter persistence:** the fixed Emberhorn must have one stable origin ID, obey resident caps, disappear after capture, and never spawn twice at region boundaries.
- **Premature breadth:** assigning ten footprints can be mistaken for delivering ten habitats. Keep later grammar/composition work separate and require the same vertical proof for each region.

## Real source bottlenecks

- `frontierRegion.js` currently derives ownership from an infinite nearest seeded-site field. This must be replaced at the ownership branch; layering polygon labels after its three-way output would retain fragmented/repeating geography.
- `frontierTerrain.js` blends legacy/global height, region height, finite landform offsets, and coast in a fixed order. The Caldera modifier must enter through the existing finite-landform stage so terrain meshes, height queries, physics, and support checks agree.
- `frontierScenery.js`, `frontierEcology.js`, and `frontierWildlife.js` currently interpret three province weights. They should consume stable habitat ownership while retaining their own admission and persistence logic; changing every habitat palette/grammar in this patch would make the first vertical proof too broad.
- The asset data catalog is wider than the frontier runtime's measured visual/collider admission. The first composition is limited by audited footprint/collider support, not by whether an Ember asset name exists.

Camp storage or crafting automation can follow only after repeated expeditions show that preparation or unloading is the main exploration friction. It should reuse physical Camp stations and existing inventory transactions; it is not part of this region slice.

## Root planning clarification

The polygon representation above is a candidate, not a framework requirement. A connected polygon clipped by this concave coastline can still leave detached land fragments; verify actual land connectivity and shared-border coverage rather than assuming that point-in-polygon ownership proves them. Compare a simpler fixed finite site partition if it achieves the same connected, unique-region contract with less code and sampling cost. Do not retain the current infinite repeating field under new labels.

The last paragraph's friction-only trigger is narrower than Chris's intent. Factory-style building can be a satisfying goal in its own right, while also supporting exploration. It remains outside this immediate habitat slice, but future priority does not require proving that unloading is the main source of friction.
