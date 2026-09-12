# Living Frontier F3 — outings and personal atlas

September 12, 2026. Selected R3: independent visual score **8.5/10 PASS**. R1 scored7.3, R2 scored7.9; target feasibility8.8. This is a delegated producer selection, not a claim that Chris personally reviewed the result.

## Player result

Walk four metres beyond the Camp boundary to begin the existing outing at the current supported position. The Camp gate also starts an outing in place. Position, motion, health and physical pack are retained. Return to the physical Camp gate to secure carried XP and bonds through the existing return flow. Departure is saved so a reload after returning inside Camp still allows banking.

The minimap and Field Atlas reveal nearby10m cells, using an18m sampling radius and the actual Camp-aware terrain sampler. A canonical edition/seed and compact25-bit chunk masks persist under the existing save owner. Unknown cells reveal no terrain. Camp/You, player heading, distance and scale use actual coordinates. Fullscreen supports pan, zoom, recenter and keyboard close/focus. The live minimap is104px desktop/86px short landscape.

Live map work uses the visible coordinate grid, a64-tile cache and5Hz updates in the existing loop. Full-map view span is capped at300m; pan reaches farther surveyed places. Stored survey capacity is16,384chunks (40.96km² of chunk area), not unlimited. Terrain/forage retain their earlier bounded streaming windows. Author mode suppresses spatial surveying. No new dependency or network service.

## Verified behavior

- Isolated developer origin8082: a position fixture beyond Camp at x0/z−114 automatically started a saved outing. Health5, carried8berries/2fiber, run XP0 and position were retained. Literal reload restored the exact run ID, supported feet, health, pack and atlas. This proves the ordinary loop after a position fixture, not an earned walk from Camp.
- A return position fixture at the physical Camp gate exposed native RETURN TO CAMP. Native confirmation resolved the active run and retained the physical pack. The first Bring It Home milestone separately awarded2berries/+15securedXP, explaining the resulting10berries/2fiber.
- Scoped storage-failure injection at x170/z−100 kept activeRun null, session in Camp status, and both pack and atlas byte-equal to their prior values. Restoring the storage method allowed automatic start/survey retry. The message now accurately says the outing was not recorded rather than claiming the player physically stayed at Camp. Injection removed.
- Diagnostic death invoked the existing death flow: active run cleared; atlas and forage scars remained. Existing rules retain the pack and lose carried XP/unsecured bonds. No new falling or combat danger was added in this slice.
- A later outing saved frontierDeparted=true, returned to supported Camp-gate feet, and literally reloaded there. The same run and departure flag restored; native RETURN TO CAMP was available immediately. Cached resume support also carries run identity, preventing a new airborne outing from using the previous run's feet.
- Actual native map open/zoom/drag/recenter and close worked. Landscape915×412CSS and portrait390×844CSS show the map within bounds; close44px and zoom/recenter46px targets are usable. Desktop and phone HUD siblings have separate bounds. These are emulated layouts, not physical-phone performance proof.
- Fresh packaged origin8081: Continue and native Field Atlas open PASS, no error/warning logs. The comprehensive fault/reload journey is developer-origin proof, not repeated packaged proof.

Aggregate F3 verification passed1,026/1,026 tests plus world/source campaign checks, build and validation. The campaign check still evaluates retained finite-source content; it does not prove a complete procedural campaign economy. Final R3 UI focused suite10/10; selected sources rebuilt, validated and zipped at43.90MB unpacked/20.48MB ZIP. Exact hashes are in hashes.json.

## Visual evidence and limits

Baseline is the old destination map. The generated target establishes UI/layout only; illustrated roads/ponds were never imported as map facts. Desktop captures use1280×720. Phone images are1144×515 for915×412CSS and488×1055 for390×844CSS at DPR1.25. A diagnostic curved survey corridor was seeded through the normal reveal API for visual comparison; it was not earned travel. Test save8082 retains this diagnostic coverage. Existing user save8080 was not used for these mutation tests.

R3 makes markers/scale readable and separates minimap, fullscreen, auto-harvest and inventory. The recorded-cell footprint is still blocky; terrain remains sparse with the F1 horizon/seam debt. No community mapping, wildlife streaming, breeding, isolated coat/eye changes, water or fall damage is claimed here.

Workflow lesson: verify map heading against controller coordinates, and scale bars against canvas/CSS pixel ratios. A width clamp can silently falsify the label. Reserve bounds for every HUD sibling when enlarging one control. In this browser, default screenshots under CDP emulation showed a scaled inset; supported CDP capture with an explicit CSS clip produced the correct full viewport. All temporary viewport overrides were cleared.
