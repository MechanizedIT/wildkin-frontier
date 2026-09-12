# F2C — habitat scenery and northbound route

September12,2026. Producer selection under Chris's continuous goal mandate, portrait/mobile primary. Local main; no dependency, new external asset, save schema, network service or publication.

## Result and visual judgment

R1 scored4.5/10 HOLD, R2 scored5.4/10 HOLD, R3 scored6.1/10 HOLD. R3 is the strongest usable of three passes and remains below the art target. It adds a readable tree flank and staggered damp plants around an open northbound passage. Upper-center ground is still empty, canopy depth is shallow, grass is sparse and the purple mushroom group dominates. Uniform terrain and richer geography remain separate unfinished work. These scores are independent review, not owner acceptance.

`target.png` is an imagegen mockup based on `baseline-portrait.png`; other PNGs are actual runtime. Baseline and rounds use developer origin8082 at(7,-75), ordinary42° camera,412×915CSS/DPR1.25. The initial two source Mosslings were already owned; the grown child follows. `baseline-overhead.png` is a temporary diagnostic camera with fog disabled, subsequently restored, not a new gameplay camera. The target's layered leaves/soft shade/dense grass exceeded the reused kit; future targets should include actual admitted-asset references.

Root authored the target and integrated lifecycle/physics/fade/LOS, route proof and checkpoint. Separate workers owned pure recipes and visual payload; an independent Sol judge scored all three rounds. No fourth aesthetic pass was taken.

## Ownership and cost

- `frontierScenery` deterministically selects seeded clusters and a small staged route. It borrows terrain's immutable chunk residency with18near/16outer/34total caps, at most12canopies; current outer selection is capped at8. Candidate sampling excludes Camp, forage, roaming clearings, excessive slopes and the terrace's ramp/lips.
- `frontierSceneryVisual` reuses shared standard/spread/tall canopy GLBs. It merges indexed low-prefab parts, placement transforms, vertex colors and up to24existing ground tufts into one owned draw. Current route:26props,12canopies,14low props,20tufts,one low draw/16,278triangles. Direct low prefabs would cost10–30draws each.
- Compact outward-wound trunk/stone surfaces enter the existing terrain physics batch; route frame has13surfaces. Trees reuse existing player-foliage fade. Aggregate scenery participates in existing interaction LOS; residency changes invalidate its caches. No per-frame DOM, parallel loop or persistent scenery state.
- Runtime builds the replacement before retiring the old payload; failed construction preserves the old one for retry. Collider removal and fade unregistration precede visual disposal. Shared canopy geometry/materials are retained; owned merged resources dispose completely. Main updates scenery after terrain and before movement/resume queries.

## Native and developer evidence

Origins8082(dev) and8081(portable) are isolated diagnostic saves; user origin8080 was preserved. Supplied positions/inventory/previous nursery state are fixtures, not an earned playthrough or physical-phone performance proof.

- `route-r3-evidence.json`: one initial supported fixture at Camp's north approach(0,-44), then continuous bounded PointerEvent steering through the real joystick listeners. All seven waypoints through the two clearings and terrace reached in48.711seconds. No direct movement/time advance after start. Health5→5, endpoint(31.6405,8.8022,-129.9912), maximum capsule support error.0574m. Sampled maxima26scenery residents,52total draws and248,106total triangles. This is route traversability, not complete frontier economy/pacing.
- `trunk-r1-evidence.json`: real input listeners held forward against the first-round tree. Player stopped/deflected before the trunk, health5→5. This proves the compact-solid path on R1 geometry; the tree placement/model was subsequently revised. Final R3 route and focused geometry tests cover the selected result.
- `lifecycle-evidence.json`: synchronous developer residency fixture, restored before a frame, verified retirement/return and Author-clear equivalent. Initial/returned/restored counts were terrain23,scenery26,static223,camera163,one scenery group. Cleared counts were0,0,181,121,zero groups. No accumulating collider/group counts. This is explicit lifecycle proof, not a native Author UI walkthrough.
- Portable final source had the same26resident IDs/13surfaces/20tufts. Native Jump became airborne, landed grounded at approximately(7,2.4015,-75), health5. Literal reload→native Continue restored approximately(7,2.3986,-75), grounded with unchanged inventory/health and scenery IDs. `package-evidence.json` records post-reload state. All observed resources were same-origin; dev/package warning/error logs were empty at checks.
- `package-portrait.png` and `package-landscape.png` show412×915 and844×390CSS atDPR1.25. Controls remained visible on orientation change. Temporary metrics were cleared on both origins; all existing tabs retained for goal continuation, no held input/timers. Dev save remains on the terrace with an active outing; portable remains on the northbound route with an active outing.

## Verification and human check

Final focused10/10. Final `npm run verify`:1,102/1,102 plus world/campaign consistency, readable build and validation PASS. Final ZIP21,015.8KB/20.52MB; unpacked45,130.1KB/44.07MB. Logs in `.dream-loop/living-frontier-f2c/verify.log` and `focused-r3.log`; exact image/source/package hashes in `hashes.json`. Legacy campaign checks do not validate generated-world progression. No unchanged aggregate rerun after documentation/evidence edits.

From Camp, walk north past the outer approach and first Mossling clearing. In portrait, pass between the tree flank and the damp reed/lily clusters, continue through the second clearing, then use the terrace's broad left slope and cross its top. Feet should remain supported and the open route should not catch on scenery. Walk into a tree trunk from clear ground: it should block or deflect movement while nearby foliage fades when it hides the player. Return, reload outside Camp, and revisit: no duplicate trees or missing ground. Floating feet, invisible walls, unreachable forage, persistent opaque foliage over the player or lost saved position are failures.

Next F5B: slow, cancellable natural-face climbing with clear physical exits and the existing Explorer Climb/Mantle/Fall clips. General swimming, richer landforms, modular eyes/anatomy, guided genetics, alternate reproduction and DNA exchange remain unfinished.
