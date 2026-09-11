# Early Access Campaign World Guide

`src/world/data/world.json` is the shipped campaign. `node tools/author-beta-world.mjs` reconstructs the deliberately hand-composed Early Access layout, then `npm run world:generate` produces the runtime artifact. The helper uses fixed coordinates and named placements; it contains no random placement or procedural population.

The playable route begins at Frontier Haven. Tap Travel at the Camp arch to enter **Verdant Verge** at the south gate, with renewable Sapwood, stone, fiber and berries nearby. Walk north to Verdant Lookout, which itself offers Extract, or explore toward the western Mosslight Beacon and the deeper Thornprowler territory. Extraction keeps materials in the finite pack and secures XP/new bonds; deposit packed items into physical Camp storage yourself. The ruined gate at the far north leads to **Shatterfen** after level 2 and a wood/stone payment.

Shatterfen puts reeds, standing stones, crystal clusters, and Tidefin around a blue wetland. Its deeper gate leads to Emberfall once the player banks enough XP and brings the repair materials as carried cargo. Emberfall changes the silhouette language to red spires, orange blooms, ore, Emberhorn, and Cinderjaw. Windscar uses tall pale needles and cloudflowers; Heartwood Vault ends the route among ancient trees and the Heartwood Guardian.

Every expedition section has a Waypoint, Beacon, repeatable parkour cache, secret cache and return gate. The first four each have a matching companion-sealed cache. Section five instead has `chest_heartwood_core`, the campaign completion reward guarded by the encounter and only secured by extraction.

## Content conventions

- Section IDs `section_1` through `section_5` form the release route. Preserve old Section 1/2 gate, waypoint, entry, and chest IDs when revising them because compatibility tests and saves reference them.
- The author tool is suitable for hand-adjusting positions and creating primitive recipes. When making a wide campaign change, update the explicit helper too, regenerate, and validate.
- Asset IDs `asset_wildkin_mossling`, `asset_wildkin_tidefin`, `asset_wildkin_emberhorn`, and `asset_wildkin_skydancer` are the companion candidates. Their matching secret chest IDs are `chest_mossling_secret`, `chest_tidefin_secret`, `chest_emberhorn_secret`, and `chest_skydancer_secret`.
- Visuals combine editable recipes and retained local GLB models, including admitted canopies, Sapwood, field chests and the Fen receiver/outcrops. Landscape mobile is primary, with a portrait fallback. Exact model and native art admissions belong to their reviews; the new Tidefin V3 animation study is not shipping.

Run `npm run world:check` after a world edit. It verifies IDs, region bounds, gate reciprocity, spawn clearance, parkour course coverage, asset references, and section-data contracts.
