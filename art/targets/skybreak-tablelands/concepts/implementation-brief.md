# Skybreak Tablelands rotation 1 — implementation brief

Primary perceptual reference: `selected.png` (the crown direction). Use the ascent target only for the grammar of broken height bands and sheltered side pockets.

1. **Crown room first.** In `src/world/frontierLandform.js`, shape only bounded existing crown/rim planes so the locked crown pose reads as open center → broken rim → east shelf/outlet. Preserve `SKYBREAK_BOUNDS`, anchors, route support, detailed-triangle and coarse-edge behavior; no new landform or unreachable lip.
2. **Protect the encounter composition.** In `src/world/frontierScenery.js` retain cloudflowers around `(13–15,-232..-231)`, Mossling home `(9.5,-231.5)` and its clearance/support disk, and crystal `(32,-214)`. Review fixed crown projection before treating a change as successful.
3. **Give ascent three unequal bands.** Improve existing western ascent only through shallow, broken side planes and compact existing-kit pockets that leave the central supported route broad. Match ascent `(-7,-184)`, yaw `-0.5404195`, and do not literalize the target's high canyon walls.
4. **Use the admitted low kit as accents.** Map edge punctuation to `asset_trail_stones`, `asset_fen_stone`, `asset_pebble_cluster`, `asset_fen_reed`, and `asset_mushroom_ring`; use cloudflowers only on cap semantics. Preserve finite berry/fiber/crystal IDs, existing staged coordinates, and clearances. No new colliders for low props.
5. **Keep the transition and descent legible.** At arrival `(4,-153)`, yaw `0`, and return `(36,-188)`, yaw `π`, preserve the actual Heartwood HUD and show entry/exit orientation with the existing east high/mid/low stone beats. Do not alter labels, normal camera/HUD/light, Camp, or the physical route contract.

One structural pass is followed by independent fixed-pose review. A focused repair may only address the largest demonstrated fixed-view gap. Route, gathering, bond, reload, streaming, and mobile proof remain separate acceptance work.
