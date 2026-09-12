# F2D — bounded habitat fullness

September 12, 2026. SelectedR2 checkpoint. Mobile/portrait primary; local main. No new dependency, asset, saved schema, collision family, or frame loop.

## Result and visual selection

Three actual runtime rounds were captured at the same northbound clearing. Independent review scored R1 **5.4/10 HOLD**, R2 **6.9/10 HOLD**, and R3 **6.2/10 regression**. R2 is the strongest usable result: it keeps a readable central route between the west canopy/mushroom flank and the damp east verge. The target remained unmet; the reused low-poly foliage did not create the broad, layered ground cover shown in the mockup.

Actual captures are `.dream-loop/living-frontier-f2d/baseline-portrait.png`, `r1-portrait.png`, `r2-portrait.png`, and `r3-portrait.png`; `target.png` is a direction reference only. The selected frame is at `(7, -75)` with the ordinary 42° camera and a 412×915 CSS portrait viewport. The browser compositor captured at 60%, yielding 309×687 pixels.

R3 was rejected for a right-side plant wall near center and clipped lower-right composition. Its four experimental soft ground-anchor patches were verified as correctly world-space and surface-grounded, then archived in `.dream-loop/living-frontier-f2d/rejected-r3/`. Two anchors sat behind the player and the other two overlapped existing right-bank props; they were outside/occluded in the portrait frame, not buried below terrain. The selected R2 source restores the 1.15 m soft framing clearance, original staged right verge placement, and the separate 2.1 m clearance for solid trunks/stones. No fourth aesthetic pass was made.

## Bounded implementation and cost

- Deterministic recipes retain a maximum of 34 resident specs, including at most 12 canopies, and a maximum of 72 merged ground tufts. The selected `(7, -75)` residency contains 26 props, 12 canopies, 15 compact terrain colliders, and 72 tufts.
- Existing admitted canopy, mushroom, reed, lily, stone, and ground-foliage kit content is reused. Low props and foliage remain one owned, vertex-colored merged draw; selected resident cost is 10,368 tuft triangles and 19,954 low triangles in that draw.
- Heights and existing compact trunk/stone collider rules remain authoritative. No terrain height, terrain collider, save state, runtime ownership, or RAF behavior changed.

## Focused proof and pending finalization

`node --test tests/frontierScenery.test.js tests/frontierSceneryVisual.test.js` passes **9/9** after the R2 restoration. The tests cover deterministic/chunk-bounded recipes, staged route and clearance rules, terrain grounding, merged low geometry, bounded tufts, world-space compact surfaces, and owned-resource disposal.

Final aggregate:1,127/1,127 and world/campaign/build/validation/ZIP PASS;44.10MB unpacked/20.53MB ZIP. The earlier1,128-test R3 aggregate is superseded by this selected-R2 run. Exact source/package/images in `hashes.json`.

Native route: initial diagnostic placement at Camp's north approach(0,-44), then ordinary keyboard listeners and actual physics/time reached all seven Camp→first clearing→second clearing→safe terrace slope→upper shelf waypoints in27.68seconds. Health stayed5; final feet31.383,8.820,-129.944. No direct position writes occurred during travel. `route-final-proof.json` retains samples. Final restored R2 capture and resident counts match the selected recipe. Packaged source reports the same26props/15surfaces/72tufts/19954lowtriangles; native Jump entered JUMP then landed grounded at health5. Final developer/package logs were clean; package resource origins were local only. Emulated phone proof is not physical-phone performance acceptance.

## Human check

Leave Camp through the north opening, follow the tree/mushroom flank and damp plants to both Mossling clearings, then take the broad left slope onto the rocky terrace. The center should remain walkable, gathering and creature approaches reachable, and trunks/stones solid. Sticking on invisible walls, foliage floating above the ground, or health loss while taking the safe slope are failures. The scene remains visibly sparse compared with the target; this selected improvement does not complete the procedural-world art direction.
