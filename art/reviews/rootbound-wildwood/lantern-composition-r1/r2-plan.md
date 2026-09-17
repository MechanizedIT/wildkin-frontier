# Lantern Grove composition R2 — margin assembly plan

## Evidence and intent

R1’s normal-HUD capture (`r1-normal-hud.png`, frame 856) retains the rear fungal colony but confirms the review finding: it reads as a small accent behind two isolated thornstones. R2 changes the room silhouette instead of adding more scatter. It adds **three existing admitted canopy forms** as an asymmetric upper-left/back margin over the R1 rear colony, keeps the lower-centre travel/apron free, and adds no new model or terrain work.

The pose remains destination `(-449, 675)`, yaw `-2.3`, camera `(-455.993, 17.604, 668.752)`, 52° vertical FOV at 412×915. The normal HUD occupies the top corners; the margin must remain secondary there and cannot be claimed clear merely because the Scout diagnostic was hidden.

## Proposed bounded R2 assembly

| stable key | existing asset | x,z / scale / yaw | projected full AABB | planned scene role |
| --- | --- | --- | --- | --- |
| `lantern-margin-left-spread` | `asset_verge_canopy_spread` | `(-445,683) / .52 / .20` | support-adjusted; final native frame pending | broad upper-left vegetated shoulder, visually joining the foreground log to the rear colony |
| `lantern-margin-back-tall` | `asset_verge_canopy_tall` | `(-439,688) / .48 / .12` | support-adjusted; final native frame pending | narrow back-right vertical break behind the R4 colony |
| `lantern-margin-back-spread` | `asset_verge_canopy_spread` | `(-443,686) / .50 / .10` | x312–464, y161–291 | cropped rear-right crown mass; counterweights the left shoulder without blocking the lower centre |

This is three meaningful upper/mid-frame forms, not another low-prop cluster. R1’s nine records remain; the R2 total would be twelve, at the top of the previously reviewed room range. The existing foreground log/rings stay in place, as do both thornstones for this preview. A native review may recommend moving or reducing a thornstone only if it materially improves the opening; no relocation is part of this plan.

The three canopies use their already admitted external GLBs and current collision/lifecycle route. Their raw envelopes are spread `5.550×3.820×3.650 m` and tall `3.250×6.200×2.220 m`; proposed scaled heights are 1.99 m, 2.98 m, and 1.91 m. The lower-centre player travel space is deliberately untouched: no new centre lies closer than 6.33 m to a sampled identity source and the visual mass is at y≈99–291 rather than the player’s lower frame.

## Support and preservation gates

`r2-canopy-probe.json` is a bounded initial CPU screen/support study, using full external-GLB POSITION accessor bounds, current terrain height, and 31 current forage/home centers. The initial whole-crown AABB study motivated the exact support adjustment. `r2-bearing-proof.json` samples the actual 1.1 m square existing canopy trunk bearing geometry at the final centers: spans are .0718 m (left spread), .0277 m (back tall), and .0815 m (back spread), with controlled .0208–.0375 m lower embedding. These values support the selected runtime base heights; the canopy crowns are not treated as flat feet.

Before implementation, use the runtime’s existing canopy collider/hull placement and verify:

1. default-world-only selection, no alternate/disabled Rootbound rows;
2. full transformed collision/support contact for each canopy, including intended embedded lower geometry;
3. all forage IDs/transforms, wildlife homes, R1 nine IDs, and player apron unchanged;
4. no collider intersects the ordinary approach or the central opening; and
5. the camera shows a connected edge across the useful mid-frame, rather than three HUD-hidden crowns.

The current probe reports nearest source-center distances of 6.33 m (left spread), 10.21 m (back tall), and 11.08 m (back spread). Those are only an early warning; final full-footprint protection uses the authoritative source/home records, not center distance.

## Native review gate

Retain R2 only if the portrait reads as one room with a green upper/side enclosure, the R4 colony nested beneath it, a visible foreground log, and a walkable lower-centre opening. Hold it if the canopies form an alien-looking roof, land under the normal HUD, or leave the stones as the dominant room silhouette. No new inference, asset, gameplay, or terrain pass follows from a HOLD.
