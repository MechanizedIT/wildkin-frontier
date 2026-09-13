# A large continent with ten unique habitats

September13,2026. Chris explicitly requires a quite large, non-round/non-egg-shaped continent, at least **ten distinct nonrepeating habitats for early alpha**, fuller natural scenery, and continued passes over core loops, mechanics and portrait UI/UX. Handcrafted geography is allowed when it improves the result or saves time. Thirty species remains a separate staged content ambition; three useful species currently exist.

**Product priority:** exploration leads. Discovery/exploration, Wildkin collection, and base building/crafting are overlapping player motivations. Creatures, equipment and Camp support deeper expeditions, with later physical machines/logistics/factory-style automation serving builders too. The first outing should start from curiosity or a chosen goal, not mandatory repetitive care. Keep useful building choices without turning the core loop into base maintenance.

![Polished continent direction, not current gameplay](../art/targets/continent-v2/target.png)

This frozen image is the **macro silhouette and landform direction**, not an implemented world, a player atlas, or a promise that its rivers, snow, bridges and every plant already exist. Its illustrative scale bar is not a calibrated survey. Engineering aim: approximately **6 km east–west ×7 km north–south**, compared with the former sampled 2.467 × 3.550 km / 6.63 km² continent. The selected R3 now measures approximately 28.95 km² of land on a 25 m grid. A bounding rectangle is not land area. At current3.9m/s run and2.145m/s walk, ideal straight crossings are about26–30minutes running or47–54minutes walking; actual routes take longer.

## Build deliberately, fill procedurally

Choose the overall coastline, ten connected region footprints, mountain masses, major basins and hero landmarks deliberately. Use seeded local height variation, vegetation patches, harvestables and encounters inside each region. Each habitat appears once; transitions are blended borders rather than additional repeated biomes. Keep procedural generation where it makes natural detail economical and handmade terrain/props where composition matters. Do not count ten map labels or differently colored versions of the same grassland as ten completed habitats.

A habitat is ready when normal portrait play can recognize its landform and foreground/midground composition, find a useful resource or Wildkin interaction, experience its particular traversal/risk, and return with persistent progress. A small landmark is not a whole habitat. Regional concepts below are provisional design choices, not accepted finished content:

| Unique region | Readable identity | Useful play |
| --- | --- | --- |
| Heartwood Basin | Sheltered redwood country, fern floor and clear Camp approaches | First forage, Mossling bond and reliable home orientation |
| Rootbound Wildwood | Dense layered canopy rooms, exposed roots, fallen trunks and fungal clearings | Mossling Bloom, grove rewards and careful sightline navigation |
| Skybreak Tablelands | Tall skinny plateaus with resources above and below, separated crowns and shoulders | Climbing, height-based route choice and fall exposure |
| Sunscar Desert | Broad dry basins, dunes, eroded ribs and isolated mineral pockets | Long exposed outings, Cragbreaker mining and preparation |
| Ironspine Range | Jagged mountain spine, steep mineral shelves and sheltered gullies | Deliberate ascent, iron and visible danger routes |
| Shatterfen | Shallow channels, dry hummocks, reed walls and open pools | Tidefin encounters, wading choices and safe retreat points |
| Fungal Hollow | Moist enclosed basin, mushroom masses, soft ground and contrasting clearings | Forage/observation and distinct close-range exploration |
| Emberglass Caldera | Breached volcanic bowl, dark broken rim and crystal/spire core | Committed mineral expedition with territorial danger |
| Verdant Stair | Green cliff gardens, buttresses, hanging growth and long terraces | Vertical resource circuit and Mossling-supported recovery |
| Saltglass Headlands | Pale exposed coastal rock, salt flats, glassy deposits, coves and tide-cut shelves | Coastal mineral routes, shelter choice and shore/swim traversal |

Reuse the admitted kit and three height vocabularies as starting materials, then add only what makes the next habitat visibly and mechanically distinct. Audit asset admission before using the unrelated Verdant/Emberfall studies. Regions7/8/10 need more than a palette swap; no completed-region claim until their real terrain and play pass. New rivers, environmental damage, weather, snow behavior, aerial traversal or extra Wildkin are separately scoped systems, not implied by this table.

## First production slice: silhouette and scale

The concept has a southeast gulf and two southern arms that cannot be represented by one radius from the old center. Use a modest authored closed polyline in the existing `frontierContinent` owner, with stable optional bounded seed variation. Signed distance and inward normal must come from the same nearest boundary. Do not add a general polygon/world framework. Benchmark direct edge sampling before adding any local acceleration.

Retain the current land envelope as an expansion floor for this first slice so the earned Camp, starter/Skybreak, Signal and existing grove journey stay supported. Keep the finite grove catalog in explicit existing bounds; expanding its eager scan to the full6×7km would roughly quadruple startup work and may exceed the200 persisted claim/POI limit. The baseline is59 groves plus Signal; check the new actual count and retained identities because formerly wet corners within the same rectangle can now become land. New regions receive deliberate landmarks in later slices; the limited catalog is not the final continent-wide discovery promise.

The actual outline should have a large northwest mass, a deep east/southeast gulf, unequal southern arms and strong headlands. Compare an actual sampled overview to the frozen image for silhouette first. Rivers/snow/vegetation painting in the concept do not raise that slice's scope. The subsequent macro-region pass replaces repeating province selection with ten unique authored region records and seeded local detail.

Root owns discovery bounds and matching regional-place admission, integration, atlas-capacity measurement, actual/native comparison and documentation. A geometry writer owns continent math and focused tests. An independent tool writer owns a bounded overview mode in `tools/inspect-frontier.mjs` and its tests, with continent/terrain sampling only and no all-world resource/creature generation. Root's final review covers terrain→physics→land admission→ocean/current→resume→atlas/catalog. Existing one RAF, local assets and bounded resident chunks remain. Grove compositions must not appear outside their registered finite catalog; ordinary mineral places remain available beyond it. Expanded land inside the existing scan rectangle may add valid groves, so measure the resulting count and retained identities rather than promising that an expansion floor alone freezes59.

Proof includes deterministic seed/outline, no self-intersection, actual extent/area, preserved prior land and named sites, concave-bay/peninsula support, true inward shore direction, shallow/shelf distances, coast dressing and real swim/return behavior, old-save continuation and catalog identity/capacity. Measure explored land/coast chunks against the16,384 saved-atlas cap with headroom. Keep ordinary traversal timing in view; the current161ms boundary frame/86.6ms ecology cost remains debt. Do not enlarge an expensive diagnostic into an all-world build.

## Continue toward the alpha

After the silhouette, build the finite ten-region map and finish representative habitats one at a time, integrating a recognizable outing in each. Improve layered natural ground/vegetation composition as part of that work. Recheck an unaided fresh-player loop, meaningful danger and portrait control clarity; physical-phone and cold-offline admission remain outstanding. Replan after each completed pass. Consider one small secondary feature when useful—such as a personal atlas pin if navigation testing shows the need—without substituting it for unfinished core play.

Current renderer/worker/Wasm options and the measured reasons to use them are recorded in [scenery technology notes](SCENERY_TECH_OPTIONS.md). Current source/package evidence remains the [scenery checkpoint](../art/reviews/scenery-preload/receipt.md).


## Implemented first slice

The continent now spans **6 × 7 km**, with approximately **29 km² of land**, a broad eastern gulf and unequal peninsulas. The third silhouette review passed **8.3/10**. Normal controls crossed the new shore from walking to swimming and back to dry ground; residents stayed bounded. All **1,357 tests** and package checks pass (44.33 MB unpacked / 20.58 MB ZIP), and the earned Camp survives developer and portable reload exactly. There are still **three terrain grammars**, not ten completed habitats. [Source-derived overview and native evidence](../art/reviews/continent-v2/receipt.md). The first three silhouette rounds scored 6.5, 7.8 and 8.3. The old 60 discovery identities remain; newly dry corners inside the same finite catalog domain add 26 more. The roughly 29 km² land area is about 4.4 times the prior 6.63 km².

Next: allocate ten connected, nonrepeating habitat regions, then build a genuinely distinct Emberglass Caldera outing with a readable breached rim, layered scenery, useful minerals and existing Wildkin danger. Keep compact Camp/Skybreak/Signal/earned-grove witnesses where practical; this pre-alpha does not require preserving all unvisited generated geography. Use the existing terrain, scenery, resource, encounter and save owners. A region label alone is not a completed habitat.
