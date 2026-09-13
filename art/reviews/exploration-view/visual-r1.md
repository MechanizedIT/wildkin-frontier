# Portrait exploration-view visual review — R1

**Verdict: PASS — 8.8/10 for the narrow camera/pickup-HUD scope.** The production view closely matches the feasible native blockout and frozen generated reference: both mineral silhouettes and both Caldera edge kits enter the portrait frame, steady-state pickup rows are absent, and the existing player, companion, controls, Pack and hotbar remain readable. This score gives no world-art credit and does not change Caldera's separate **3.8/10 HOLD**.

Evidence inspected at full resolution:

- Portrait R1: `caldera-after.png`, 309×686, SHA-256 `56050dea15b46fc2d99fc489bdeaadb20eb66b9fb5d845b5292af932952a95bc`.
- Construction sibling: `construction-after.png`, 309×686, SHA-256 `2f0f0d2ce589ed7d6606e2b51037233ea107283efd122a5213f1112986dc3e9c`.
- Landscape sibling: `landscape-after.png`, 686×309, SHA-256 `cc5d2997def6d6c8b70aecafe9e36bfe25f6b00f4d4b740c8036f15f6d08ea93`.
- Frozen target / native blockout: SHA-256 `c0ef59326c528c8d95672931ca9bf097239a26d71ab4b85e5f49d07ed3e573e7` / `6e738d284af6d2f62cc9f4d20be020542ddedd2b222e285e0948ee820b6afa7c`.

| Category | Score | Judgment |
| --- | ---: | --- |
| Composition | 2.5 / 3 | The camera and fixed UI geometry match the reference well. Crystal, iron and the two edge clusters are visible with a clear route, and player/control scale is preserved. The moving Emberhorn is currently mostly hidden behind the upper-left health panel, so the encounter target is not reliably readable in this actual frame. |
| Lighting / palette | 2.8 / 3 | The production witness preserves the native blockout's exposure, charcoal/rust palette and silhouette contrast without a camera-induced washout or darkening. Generated target smoothing is not a runtime requirement. |
| Materials | 2.7 / 3 | Existing runtime mineral, spire, creature, terrain, player and HUD materials remain intact and recognizable at the wider view. No new material or world-art admission is credited; small differences from the generated upscale are inherited reference stylization. |
| Details | 0.8 / 1 | Steady portrait pickup rows are cleanly absent while Pack and exact-count ownership remain represented. Control and hotbar silhouettes survive unchanged. One still cannot prove the timed pulse lifecycle or exploration-to-construction restoration. |
| **Total** | **8.8 / 10** | **PASS** (`>= 8`) for this presentation slice. |

## Sibling evidence and current limit

Construction-after retains the close placement view, readable preview footprint and construction controls. Landscape-after keeps its prior wide composition and visible positive resource rows. These stills support presentation compatibility, while transition restoration, timed pulses and actual interaction remain native behavior proof owned by the integration review.

The current visual limit is dynamic HUD occlusion. The wider view makes distant objectives attainable in-frame, but an independently moving target can still enter the fixed top HUD corridor; here the Emberhorn is reduced to a partial silhouette behind health. Solving continuous encounter visibility would require movement-aware framing, target placement, or a broader HUD/camera decision outside this narrow pass. Do not retry Caldera terrain or asset art to address it.
