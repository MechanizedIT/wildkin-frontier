# Heartwood ground-cover follow-up

Status: **provisional native A/B only; current art remains HOLD**.

## Read of the final-source frames

`berry-approach.png` has a broad, nearly uniform foreground between the player and the distant vegetation. A few pale tufts exist, but at phone scale they read as isolated marks rather than an understory. The forage cluster removes several nearby grass candidates, and the remaining small tufts are concentrated near the far edge of the view. The berry/resource silhouette and player remain clear.

`departure-apron-production.png` reads fuller because trees, mushrooms, reeds, flowers and their local grass clusters overlap the camera view. It does not prove that the broad ground layer has adequate coverage; the large open apron still shows the same small isolated terrain tufts between prop groups.

This is principally a **coverage/scale** issue, not a lighting diagnosis. Heartwood samples at both captures report `habitatId: heartwood-basin` and `provinceInfluence: 0`. In `src/world/frontierChunkRuntime.js`, the broad layer `frontier_groundcover` therefore keeps only 96 deterministic candidates per 50 m chunk and uses the protected legacy scale range **0.38–0.76**. Candidates are then removed using the real nearby forage footprint plus the scaled foliage radius. Its `MeshBasicMaterial` is unlit and `toneMapped:false`, so the proposed shared-light A/B will not materially increase its visual mass.

The other layer, `frontier_scenery_ground_cover` in `src/world/frontierSceneryVisual.js`, is lit Standard material and grows small 13/28-instance patches around selected scenery anchors up to the existing 640-cluster cap. It explains local thicket fullness in the departure frame. It should not be expanded to solve an empty open floor: doing so would densify prop clusters, consume the same cap sooner and risk competing with the berry silhouette while leaving gaps between anchors.

## Smallest candidate A/B

Owner: **`src/world/frontierChunkRuntime.js`, inside `addFoliage`**.

Keep the 96 candidate positions, geometry, material, tint, draw count, resource-footprint rejection and all Fungal/Caldera rules unchanged. Test one bounded Heartwood-circuit scale gain on already accepted terrain-foliage instances: baseline **A** retains 0.38–0.76; candidate **B** multiplies that existing scale by about **1.2** only for `heartwood-basin` samples in the starter/berry circuit interval. Do not relax `hasRegionalForageClearance`; because it receives the final scale, larger tufts must still clear the berry/resource footprint.

Capture the same berry approach and departure apron transforms for A/B. Prefer B only if the mid/foreground reads as a connected low understory at phone size while the player outline, berry leaves/fruit and interaction space remain immediately legible. Confirm unchanged instance count, draw count and resource access. If scale alone only makes the same sparse dots larger, restore A; a later bounded second density stratum would be a separate, higher-cost proposal.

Do not change lighting, `frontierSceneryVisual` patch counts, the 640 cap, forage clearance, geometry or terrain color in this comparison. The result can address floor readability only; it cannot clear the broader Heartwood habitat art HOLD or supply missing ecological variety.
