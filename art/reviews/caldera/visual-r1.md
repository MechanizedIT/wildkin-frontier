# Emberglass Caldera visual review — R1

**Verdict: HOLD — 1.5/10.** This is the implementation score for the actual R1 witness, not the locked target's separate 8/10 fitness score.

Evidence inspected at full resolution:

- Frozen target: `art/targets/caldera-v1/target.png`, 841×1870, SHA-256 `bf9a40529161cbe2656c8e7c4bf972a8de8088746ecadf5dcdadcb42f7e98d88`.
- Actual R1: `.dream-loop/caldera/r1.png`, 309×686, SHA-256 `86546b7e50c637296821bdb3625652c3df88a5294e5dd198ca853f2ee41887cd`.
- Old baseline: `art/targets/caldera-v1/baseline.png`, 309×686, SHA-256 `14f8e3edd7a3697c31d380523eada49988547d48a3b4223f8616848fab61ba60`.
- Analytical projection: `.dream-loop/caldera/projection.json`, ordinary fixed 42-degree portrait camera at witness `(850, -1962)`.

## Score

| Category | Score | Judgment |
| --- | ---: | --- |
| Composition | 0.5 / 3 | The fixed camera, player and HUD are coherent, but almost the whole playable frame is empty. The shoulder/spire pair, minerals and Emberhorn that define the locked composition are above or outside the frame. Even the old baseline had a clearer near/midground scenic rhythm. |
| Lighting / palette | 0.5 / 3 | R1 reads as uniformly pale tan. It does not establish the locked charcoal lane, rust-red shoulders, dark silhouettes, or warm orange edge accents. Existing shadows are legible but cannot create the missing volcanic identity. |
| Materials | 0.3 / 3 | The visible world is dominated by one smooth, low-information ground surface. The admitted spire, pebble, bloom, crystal and iron material families have no meaningful in-frame presence. |
| Polish | 0.2 / 1 | Player, companion and UI remain clean, but the outing itself looks like an uncomposed staging area. Tiny clipped fragments at the top/side edges make the framing feel accidental. |
| **Total** | **1.5 / 10** | **HOLD** (`PASS >= 8`). |

## Blocking diagnosis

This is a projection/composition failure before it is a tint problem. The analytical projection explains the witness: the left and right spire feet fall outside the side edges; the crystal is pushed into the upper/HUD band; the right spire, crystal top and Emberhorn are outside the frame. At 24 m ahead the Emberhorn is already above the view. Consequently, the current ordinary camera cannot show the staged outing. The full crater ring is not relevant to this gate; the frozen target explicitly asks the normal view to make only the next 5–20 m meaningful.

## One structural correction packet for R2

Rebuild the **breach mouth inside the existing 42-degree portrait frustum**, keeping the witness and camera fixed. Pull the current staged composition south and inward so it forms two terrain-backed shoulders around the clear lane instead of a wide, offscreen ring:

1. Give the near view solid terrain mass from roughly 5–14 m ahead. The left inner shoulder should enter the frame near `x ≈ 847–848`; the right inner shoulder near `x ≈ 852–853`. Keep the central route `x = 848–852` supported and completely open. Use broad terrain for the shoulder/rim silhouettes; the admitted 3.53 m spires are dark accents on those shoulders, not enlarged walls.
2. Restage the existing kit in three readable depth bands: a dominant left shoulder/spire and bloom/pebble cluster about 6–9 m ahead; separated crystal-left and iron-right choices about 8–12 m ahead, outside the four-metre route; Emberhorn centered or slightly right about 12–15 m ahead. The current 24 m Emberhorn position is not usable in this camera. Keep all feet supported and keep harvestable/creature footprints out of the lane.
3. Apply the locked surface read to the same rebuilt mouth: charcoal lane and bowl floor, rust-red shoulder fields, near-black spire silhouettes, bounded orange bloom accents and dark rubble clusters. Confirm the Caldera habitat weight actually owns the witness/frustum samples; R1's tan floor suggests the visible mouth is missing or receiving too little of that regional treatment.
4. Capture R2 from the same witness, yaw and 42-degree pitch. It should immediately show a strong asymmetric left silhouette, a smaller right frame, the open charcoal path between them, both mineral choices, and a readable Emberhorn/bowl cue without relying on anything behind the HUD or on a full-ring overview.

Do not spend the next pass on small tint adjustments alone. The decisive repair is to move the terrain shoulders and existing authored anchors into the camera's useful depth/lateral envelope, then let the target palette articulate that structure. No UI redesign, new controls, new creature anatomy, lava, smoke, or full-ring beauty shot is needed for this witness.
