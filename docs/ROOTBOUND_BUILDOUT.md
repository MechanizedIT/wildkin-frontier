# Rootbound buildout — September 15

Fresh owner direction: build the complete Rootbound region and its constituent parts in goal mode. Repeat plan, implementation, independent review, and polish until stopped or usage ends. Use useful guidance without treating previous workflow rituals as gates. Free matching online assets first, local TRELLIS 2 for missing forms, Blender if generation fails. Work locally on main and preserve unrelated work.

## Experience

A forest basin with a strong vertical journey. The player should repeatedly see somewhere inviting above or below, reach it, then recognize the route from a new angle. Avoid a uniformly flat field, uniform scatter, and a single decorated corridor.

| Place | Shape and pacing | Exploration purpose |
|---|---|---|
| Orientation Meadow | Low sunlit clearing, asymmetric tree edges and rolling approach | Orientation, supplies, first glimpse of the rising forest |
| Root Galleries | Climbing contour path between high root banks; alternating narrow passages and wider alcoves | Route choice, gathering, side overlooks, partial landmark reveals |
| Lantern Grove | Sheltered low bowl, deadwood and mushroom islands with open creature floor | Quiet encounter, observing Trailgloam, forage, a contrasting cool pocket |
| Thornstone Verge | Dry rocky shelves above the grove with a switchback | Optional climb, mineral reward, clear return direction |
| Heartroot Crown | Broad raised summit and exceptional tree silhouette, surrounding root terraces | Destination, discovery reward and outlook; a different descent to Meadow |

## Build sequence

1. **Terrain:** add coherent physical relief, including rising and descending paths. Mesh, collision and placement use the same terrain. Broad ramps carry the main outing; steeper outer faces invite optional climbing.
2. **Forest:** use a small licensed free tree/understory kit in bounded instanced batches. Compose groves, gaps and perimeter depth across the region. Keep trunks out of routes and creature homes; make substantial trunks physical.
3. **Constituents:** place supplies and discoveries to give side routes purpose; reuse existing harvesting, wildlife and save ownership. Preserve source identities where practical while regrounding to the changed surface.
4. **Review:** inspect all five rooms in actual portrait play and a regional overview; walk the ascents/descents, inspect grounding, stream out/back, check draw costs and console.
5. **Polish:** act on the largest visible/playable gaps, then repeat. Retain useful improvements and report remaining limitations honestly.

## Retained first region pass

- Physical shelves and route ribbons connect all five places. Crown is approximately 10.5 m above Meadow, with a lower Grove bowl and an optional elevated Verge loop. Terrain drawing, queries and Rapier use the same underlying surface.
- Five low-poly CC0 Kenney Nature Kit assets add varied broadleaf trees, shrubs, ferns and fallen timber. Rooted trees have physical trunks. Forest density and resident limits are bounded; the Crown landmark receives priority.
- Per-instance canopy fading preserves player visibility without fading every tree in a batch. Existing single-model fading and resource disposal remain intact.
- Seven authored gathering sources and two finite caches give optional pockets a purpose. Their identities use the existing depletion/save owners. Wildlife homes, including the full eastern resident leash, remain supported.
- Independent review retains the five-room terrain/forest composition. A focused Verge repair now creates a visible mineral-side thornstone edge. Gallery rise cues, Crown outlook framing and Grove enclosure remain next.

## Owner addition: slope sliding

Use the existing 45-degree walking limit. Above 45 through 60 degrees, a terrain-only contact makes the player slide downhill with limited steering. Above 60 degrees or on losing contact, ordinary falling takes over. Airborne contact records one landing impact before sliding; reset, jump-pad, climbing and swimming ownership are preserved.

Actual Rootbound trials prove no-input sliding on a 52-degree face and falling on a 68-degree face, then recovery through gentler ground. Presentation freezes the existing idle pose with a slight lean, rather than playing walking strides. This is a provisional pose, not a bespoke animation.

## Current proof and next loop

The first complete normal-play main circuit after sliding uses one initial setup followed by ordinary keyboard movement: 11 waypoints in 142.087 seconds, all 534 samples grounded, health 5/5 throughout, no page errors. This is an isolated desktop browser at a 412×915 viewport, not physical-phone performance proof. Earlier protected scout walks are additional route evidence only.

Final checkpoint validation passes all 1,462 tests plus world/campaign/build/validation and ZIP. The ZIP is 25,989,125 bytes. Both caches opened through native controls and restored their claimed state on a fresh page after export/import. Crown's faded canopy initially hid its action; the shared interaction ray now respects per-instance fading while opaque sibling instances still block. Chest, portal and waypoint paths have focused coverage. See the [actual review gallery](../art/reviews/rootbound-wildwood/buildout-2026-09-15/review.html).

Next bounded loop: one Crown viewing-window/buttress composition and one Grove deadwood boundary, each reviewed at player height with an unobstructed route and creature floor. Continue the authorized goal after this checkpoint.
