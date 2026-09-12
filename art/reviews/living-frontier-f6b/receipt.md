# F6B — physical berry garden

September 12, 2026. Producer-selected R2, independently 8.6/10 PASS. Local main only; owner playtest acceptance is still open.

## Player result

Build a Berry garden for4wood/3fiber, approach it and Plant one backpack berry. Three visible growth stages ripen over90seconds of active play, including outings. Harvest yields3berries, or4if an assigned, fully nourished Mossling's bed is within6m. The ripe shrubs show cream Bloom flowers and the world action shows the extra berry. Paused, hidden, Author and offline time do not count; there is no absence penalty.

One crop can be planted at a time. The plot stays occupied until harvest. Full inventory and failed writes keep the crop available. Garden and nursery catalog thumbnails now depict their actual runtime models.

## Visual loop

Actual Camp baseline and imagegen edit target retain the camera and surrounding Camp. R1 scored7.7/HOLD: sparse thin stems. R2 scored8.6/PASS (composition2.6, lighting2.5, materials2.7, details.8): broader radial leaves, grouped berries and soil contact. Independent reviewer: frontier_integration_audit. R2 is selected after two passes; fuller organic silhouettes remain optional polish. Images are baseline, target, r1, r2, sprout-native, unripe-native, phone-landscape, catalog and package.

Final ripe+tended garden costs8 visible draws/2,112 rendered triangles, including all instances. Footprint1.8×1.4m, top decoration.928m, supporting surface.32m. Real WebGL renderer counters confirmed this; unique-geometry counts alone would undercount instances. Owned materials/geometry dispose with the base instance. No new dependency, imported asset or animation is used. Berries/flowers change visibility at a cached.3second base poll.

## Ownership and verification

frontierProgress owns nullable version1 campCrop(plotId,growthSeconds0..90), strict import/load, atomic planting/harvest, occupied-plot removal and authoritative Bloom eligibility. campGarden owns the bounded active-play clock and physical access checks; it uses the existing fixed loop. Five-second commits bound unsaved progress; a failed growth write drops that quantum without touching inventory. baseSystem owns the plot/bed anchors and nearest physical interaction; UI cannot grant the bonus. The shared contextual action displays reward/cost and short Bloom feedback.

Integrated **1,070/1,070 tests**, world/campaign/build/validation/ZIP PASS.44.01MB unpacked /20.51MB ZIP (21,001.1KB). Focused tests cover strict records/copies, quantum limits, pause/large-frame behavior, save rollback, pack-full harvest, exact6m bonus boundary, occupied removal and physical revalidation. The retained campaign check does not prove frontier progression.

Isolated localhost:8082 proof used material/position fixtures, then native construction Place and Plant. Uneven ground correctly rejected the first placement; a clear Camp patch succeeded. The first crop advanced naturally from0to90 over94.3seconds (active-growth-proof.json). Forced save failure during native Harvest retained crop90 and0berries; literal reload preserved both. Native retry produced4berries and cleared the crop.

A second native Plant spent one berry (4→3). Backpack pause kept growth5 unchanged for29.93seconds. A disclosed position fixture crossed the Camp boundary: session active/frontierDeparted true, crop5→35 during27.7seconds of active outing. Physical gate return and native banking retained growth60. It ripened naturally again; phone-sized native Harvest changed3→7berries and cleared the crop. Landscape915×412 CSS at1.25DPR is viewport proof, not physical-phone performance. No held keys or failure overrides remain.

Portable localhost:8081 reloaded the new build, imported the isolated developer save through the normal save owner, and reloaded again. Native Plant changed7→6berries; ordinary active play advanced growth. Runtime logs were checked for errors/warnings. Package screenshot and exact selected hashes accompany this receipt.

## Human check and limits

In Camp, use the Construction tool to build a Berry garden on clear ground. Approach with a berry and Plant. Explore briefly, then return: expect small shoots to become leafy plants, green fruit, then red berries. Feed an assigned Mossling three times at a bed near the plot; ripe garden flowers and Harvest4/Bloom+1 should appear. Harvest should empty the plot and add exactly the shown yield. Failure signs: payment without a crop, growth while paused, a vanished full-pack harvest, blocked approach or an action covering the plants.

This is one simple food crop with a proximity benefit, not habitat simulation or autonomous gardening. No breeding, genetics research, young life stages or DNA machines are implemented at this checkpoint. F7A next connects physical pairing and fixed offspring to the nursery.
