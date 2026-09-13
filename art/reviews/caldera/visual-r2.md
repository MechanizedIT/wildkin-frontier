# Emberglass Caldera visual review — R2

**Verdict: HOLD — 4.0/10.** This is the implementation score for the actual R2 witness. The frozen target's 8/10 target-fitness review remains separate.

Evidence inspected at full resolution:

- Frozen target: `art/targets/caldera-v1/target.png`, 841×1870, SHA-256 `bf9a40529161cbe2656c8e7c4bf972a8de8088746ecadf5dcdadcb42f7e98d88`.
- Actual R2: `.dream-loop/caldera/r2.png`, 309×686, SHA-256 `3dbcd5c8c5316926bd2c158e4c890317054bd024fd6080791e1b2407df6877fe`.
- Prior R1: `.dream-loop/caldera/r1.png`, 309×686, SHA-256 `86546b7e50c637296821bdb3625652c3df88a5294e5dd198ca853f2ee41887cd`.
- Same fixed witness `(850, -1962)`, yaw 0, zoom 1 and 42-degree portrait camera.

## Score

| Category | Score | Judgment |
| --- | ---: | --- |
| Composition | 1.1 / 3 | R2 now has an open forward lane and two volcanic edge clusters, a substantial recovery from R1. However, both clusters are compressed into the top/HUD band, and the playable middle remains broad and empty. The measured shoulder peaks at `x=839.5` and `x=861.5` are outside the image and provide no visible framing. Minerals and Emberhorn remain movement reveals, so this witness needs the breach/bowl silhouette itself to carry the midground; it currently does not. |
| Lighting / palette | 1.6 / 3 | The charcoal/slate ground is the first convincing Caldera cue and the orange accents give useful warmth. Broad rust shoulder fields, stronger dark silhouettes and low-frequency charcoal/rust variation are still scarcely visible. Bright green clustered grass cuts against the locked dry volcanic palette. |
| Materials | 0.9 / 3 | The ground is cleaner and darker, and the small edge rocks/blooms have readable low-poly surfaces. Most of the image is still one flat gray material interrupted by repeated green tufts. The admitted spire, rubble, bloom and mineral families do not yet form a substantial material hierarchy in the useful frame. |
| Polish | 0.4 / 1 | UI, player, companion and shadows remain clean, and R2 no longer looks like the tan staging field. The cropped top-edge props and evenly scattered grass still make the scene feel procedural rather than deliberately composed. |
| **Total** | **4.0 / 10** | **HOLD** (`PASS >= 8`). |

R2 improves by 2.5 points over R1 because the terrain palette and near edge clusters now communicate the intended habitat at all. The score remains well below admission because the visible natural structure is still absent; this is not a request to expose the whole crater ring or pull future life anchors into the shot.

## One final R3 correction packet: build the visible inner breach

Use the final pass to put **terrain-backed inner shoulders in the camera**, then dress only those shoulders. Do not enlarge the existing offscreen peaks or add more content to the high/HUD band.

1. Narrow the current shoulder exclusion from the full `x=846..854` ramp width to the actual clear travel lane, approximately `x=848..852`, for the near breach segment. Extend asymmetric inner buttresses into `x≈844.5..848` on the left and `x≈852..855.5` on the right, chiefly `z≈-1965..-1973`. Keep a supported four-metre central route. These should be broad, sloped heightfield shoulders rising about 1.5–3 m above the lane in the visible 5–11 m depth, with the left side stronger and closer than the right. Preserve the distant crater peaks and the Emberhorn home-disk exclusion; they do not need to become visible in this fixed witness.
2. Ground the admitted near spire/bloom/pebble clusters on the inner faces/toes of those new buttresses, low enough in the frame that their bases and terrain contact read below the HUD. Use the spires as 3.53 m-kit accents rather than terrain substitutes. Favor one dominant left spire/rubble/bloom group and one smaller right group; avoid symmetric rows and avoid scaling any form that remains offscreen.
3. Suppress the green clustered-grass instances throughout the fixed Caldera breach/bowl influence visible here. Replace only a bounded portion of that density with dark pebble clusters, sparse warm ember blooms and rust ground patches along the shoulder edges. Leave the center route mostly charcoal and quiet. This converts the current repeated grass field into volcanic negative space without adding a new asset family.
4. Recapture the same witness and camera. The pass succeeds visually when the explorer stands inside a readable asymmetric breach: solid dark/rust terrain enters both sides of the midframe, a dominant left kit silhouette is visibly grounded, a smaller right frame balances it, and the charcoal lane remains clearly open toward the offscreen mineral/Emberhorn exploration reveal.

This is one composition repair: bring the permitted inner terrain envelope inward around the route and make the scenery inherit that visible structure. Palette polishing without those shoulders will not close the gap.
