# M1 — portrait controls and camera

September12,2026. Producer selection under Chris's continuous goal-mode mandate. Mobile/casual first and portrait primary follow his wake-up steering. Landscape and desktop remain supported. This is browser/emulation evidence, not physical-phone acceptance.

## Selected result

R1 scored8.8/10 PASS; R2 supplemental/final review scored9.0/10 PASS. No third aesthetic round was needed. The generated target came from actual Camp framing. Independent judge was separate from implementation. `target.png` is a mockup; all other PNGs are actual runtime captures.

- Stable42° portrait pitch and1.2 distance multiplier; separate manual pitch preferences across orientations, stable yaw and existing zoom/collision recovery.
- One fixed portrait joystick, center(74,height−136), radius54 on normal phone widths;80px activation area. Landscape retains its floating stick. Both viewport resize paths cancel old touches.
- Compact status, atlas, equipped item and Pack. Equipped item opens the real five-slot belt; Pack remains physical storage/shortcut arrangement. Landscape retains its row and held Attack.
- Nearby actions occupy a124×72px thumb control with a world marker. Release uses a separate44px control; Jump/Dodge are48px. Disabled growth/care status sits above its object and leaves ordinary tools available.
- Candidate selection preserves physical ranges and checks viewport/LOS before selecting. Nursery/plots favor the camera-facing side; blocked storage, stations, gates and other priority candidates allow a visible fallback. Up to eight target caches and10Hz LOS reuse avoid repeated scene/body traversal. Author, section, streamed residency and construction/rootfall lifecycle changes invalidate caches; retired occluders do not block.
- Primary/secondary gestures belong to the exact target/action/stage. Cancellation, hidden state, resize and modal changes cannot turn an old press into another transaction. Held tool and nearby click actions remain separate.

## Native and developer proof

Developer origin8082 and portable origin8081 are isolated test saves. The user origin8080 was preserved. Both fixtures contain the previously created bed, garden, two parents and their welcomed child. Developer positions were supplied for repeatable framing and travel eligibility; those are not claims of an uninterrupted earned playthrough.

- Native portrait Feed:7→6berries and care0→1; two later feeds reached care3. Native Plant:6→5berries and one planted crop. Native full-care status allowed the selected Build tool to open construction.
- Native equipped button→belt→Construction selected slot5 and closed the belt. Native Pack, Field Atlas and Settings remained reachable. Auto Harvest changed ON→OFF→ON through its existing owner.
- A bounded synthetic PointerEvent fixture used the real touch/camera listeners, without calling movement methods. On the clear starting path,700ms moved1.436m. Camera yaw0→−.08 retained the same walk intent and cancellation returned idle/no attack. An earlier pod-overlap placement was rejected as movement proof. Exact values: `movement-evidence.json`.
- Native Jump became airborne at y1.422, vertical velocity3.4, with health5; landing retained health5.
- Native portrait Travel started a saved outing at the gate. A labeled outside/return position fixture established departed eligibility; native Return to Camp→confirmation→Continue cleared the active run and retained care3/backpack contents.
- Portable landscape844×390CSS retained32° camera, full shortcuts, Attack and contextual Feed. Native Feed changed7→6berries/care0→1. Switching to412×915CSS restored42°; native Feed changed6→5/care1→2. Screenshots use DPR1.25. Smaller375×812CSS also retained unobstructed controls/status.
- Dev/package error and warning logs were empty at their checks. Portable final gate check uses the post-correction package.

## Corrections and verification

The first aggregate exposed a construction test camera still aimed away from new visibility-dependent interactions. Its fixture now aims at the actual bed/plot and proves blocked-nearer fallback/offscreen rejection. A native gate check caught an optional `disabled` value passed as undefined to DOM classList.toggle; explicit boolean comparison fixed the unintended per-frame status toggling. These were correctness repairs, not additional aesthetic passes.

Final `npm run verify`:1,092/1,092 tests, world/campaign consistency, readable build and validation PASS. The legacy finite campaign checker still does not prove frontier progression. Final ZIP:21,010.6KB /20.52MB; unpacked44.05MB. Logs: `.dream-loop/living-frontier-m1/verify-release.log`. Image/source/package hashes are in `hashes.json`.

## Human check and remaining limits

On a phone, open Camp with a settled Mossling and berries in your Pack. In portrait, use the lower-left stick to approach its moss bed. Tap Feed at lower right: one berry and one bowl portion should change together. Tap the equipped item to choose the construction tool; when the bed is fully nourished, Build should remain available. Open/close the map, rotate to landscape and back, then walk: no old touch should remain held. A wrong creature marker, overlapping buttons, unexpected swing, repeated charge or stuck movement is a failure.

Physical-phone thumb comfort, heat/memory/load time and frame pacing remain unverified. Full portrait inventory/workshop redesign, richer terrain/ecotones, climbing/swimming, modular anatomy/eyes, guided genetics, alternate reproduction and DNA sharing are subsequent work. This slice adds no new runtime dependency, paid asset, network service or publication.

Browser handoff: temporary device metrics cleared on both isolated origins. Developer save is back at Camp with no active outing; portable save has just started an outing inside Camp at the gate. The three existing tabs were retained for goal continuation; no held inputs remain. The user save was not changed.
