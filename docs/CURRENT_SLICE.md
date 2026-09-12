# Wildkin Frontier — current scope and checkpoint

Updated September 12, 2026. **0.3.0-alpha.1 · local pre-alpha · production stopped at Chris's request.**

Chris asked to come to a stopping point, then said he will restart his PC and resume in a new Codex session. The prior all-night mandate is paused. Do not start another implementation/generation cycle in this thread. A new explicit resume request may continue from the handoff below.

Read **SESSION_START.md → SESSION_HANDOFF_2026-09-12.md → CODE_MAP.md**. This file owns current scope. Git and source own actual implementation; older dated plans/logs are historical evidence.

## Verified playable checkpoint

- Bounded camera pitch (20–64°, default32°), horizontal orbit, right-side pinch/wheel zoom and yaw-relative movement. Terrain/solid collision shortens camera distance and smoothly restores the requested zoom. The three scenic canopy families keep fading without retracting the camera; their gameplay trunks remain solid. Built structures and Camp defenses participate in camera clearance.
- Camera focus recovery respects the active terrain surface and solid clearance. Independent review passes after correcting below-terrain smoothing and missing runtime construction registration. Native browser proof covers pitch limits, joystick plus pinch, terrain recovery, Jump, moving shoulder clearance, portrait resize, foliage fade, a placed wall and Author isolation. Packaged touch orbit, terrain clearance, Jump and literal Continue pass. These are disclosed fixtures, not earned progression or physical-phone acceptance.
- **966 tests, world/campaign checks, build/validation and ZIP pass.** Package43.84MB unpacked /20.46MB ZIP. Exact hashes and receipts: **art/reviews/gameplay-camera-v1/**. World and generated region data remain the selected Shatterfen checkpoint.
- Shatterfen V3 is integrated:100×100m wetlands, connected banks, eastern grades, northwest crest/wreck supply loop, protected gameplay identities. Best of three versions selected under Chris's bedtime delegation; sparse dressing and modest rock/wreck masses remain visual debt. Evidence: art/reviews/shatterfen-v3/.
- Backpack supports five square persistent shortcuts assigned by tap or drag, without moving item quantities. Camp expansion, Survey pack upgrade, Rootfall passage, quiet creature observation, continuous harvesting and ordinary Jump remain integrated.

World SHA256: 640f9239e3e42555322a3cc3267071ccdeb6d3d41029afc32e24b1719e1d829f
Generated SHA256: 69db106b859df19f4491aadfdb82a22523cfd8a89e6e11444bda1b3d8dfc0bd5
Package index SHA256: e0703ece3ea3ec2febb18c75ecc0ce0c75aad7c0137999cd86714de9716b0727
ZIP SHA256: c2949b6acaeaef651c2e42943864f9f1f98fe268e4774bccbc14e3ec395e8bfb

## Next work, only after resume

**Emberfall ravine is NOT in the playable world.** Independent target fitness passes8.1. Plan: retain120×120m, broad low ravine, west12m ridge, east16m summit, existing cache on12m shoulder, separate ascent/descent routes and the protected low foundry. See EMBERFALL_RAVINE_SLICE.md and art/targets/emberfall-ravine-v1/.

The isolated composer is preserved at tools/compose-emberfall-ravine.mjs. Its explicitly opt-in test is tests/emberfallRavine.candidate.mjs: **3/4 pass; west-descent full-width grade fails near its foundry merge**. The candidate is not imported by world authoring or runtime. Its failing test is deliberately outside the normal test glob, not weakened or marked passing. Fix the merge before renaming it to .test.js, integrating, generating or claiming traversal proof. Follow the exact candidate handoff.

After that: queued Survey-discovery → repeatable physical cutter → existing ore/crystal plan; more natural region/ruin variety; remaining creature and machine art; audio/progression/UX polish. No cutter, ranged weapon, alloy system, helper drone or extra expansion sector was added in this checkpoint.

**Tidefin V3 remains unshipped.** The exact candidate and independent sampled review are retained; full-clip execution is proven, uninterrupted perceptual/native cadence and species attack/hurt timing are not. Retain it rather than regenerating on resumption. Current runtime remains the older Tidefin. Explorer/Mossling and accepted V3 cliff assets remain unchanged.

## Binding direction and engineering

- Alien world; substantial matte faceted forms, high contrast, restrained shading, no reflections. Approved Explorer sheet is the master style. Harvestables must read differently from scenery.
- Landscape first with usable portrait fallback; offline vanilla Three.js plus vendored Rapier, one authoritative frame loop, explicit ownership, no runtime network service. The old hackathon35MB cap is retired.
- Player can keep hitting a harvestable until depleted regardless of uncollected drops. Jump replaces active pads/checkpoint courses. Existing save/reward/resource/actor identities must survive level edits.
- Work on local main, no branches. No new push/deployment/paid service is authorized by this stopping request. The last remote backup is older than this local checkpoint; see RECOVERY.md.
- Use the project Wildkin skill and Dream Loop where applicable. Separate author/implementer/judge, inspect actual maps/native camera, keep focused proof proportional, and reserve aggregate verification for an integrated boundary. During a newly resumed delegated run, choose the best usable of three/four aesthetic versions when Chris is unavailable; never waive collision/save/resource safety or claim personal approval of an unseen candidate.
- Serialize heavy browser/Blender/inference jobs. TRELLIS stays off below its existing memory guards; no paid fallback. Do not restart tools merely to reload context.

Earlier scope chronology is archived in CURRENT_SLICE_HISTORY_2026-09-12.md and CURRENT_SLICE_HISTORY_2026-09-11.md. Their active/pending wording does not supersede this stopped checkpoint.
