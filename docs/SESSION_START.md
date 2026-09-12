# Start the next Wildkin Frontier session

**September 11 evening: Chris completed a short phone playtest and explicitly resumed overnight goal-mode production until he says stop.** Read CURRENT_SLICE.md and OVERNIGHT_RUN_2.md first; the earlier handoff pause is historical. This is a local pre-alpha, not a published release. Exact art/balance choices remain provisional.

After a fresh clone or machine replacement, read [RECOVERY.md](RECOVERY.md). The September11 GitHub backup also retains the unshipped Tidefin candidate and the locally installed Asset Forge workflow; ignored study folders are not required to recover those snapshots.

## Read the minimum first

**Current production priority:** Emberfall ravine/plateau exploration and a camera that supports larger height differences, following Chris's latest requests. A baseline atlas and independent role/layout and camera audits are retained under `.dream-loop/emberfall-ravine-v1/`. Bounded pitch plus terrain/solid collision retraction is the first implementation slice; tree fading and yaw-relative movement remain. These changes are not part of the 953-test package below. Powered-tool progression is queued afterward.

**Bedtime delegation supersedes aesthetic holds:** Chris explicitly asked the producer to choose the best usable of three or four versions and move on while he sleeps. Do not wait on Rootfall or another art preference question. Preserve honest scores and record the delegated choice; functional/collision/save safety still governs whether a candidate can ship. See CURRENT_SLICE for the exact current scope.

**Current integrated checkpoint:** Shatterfen V3 and physical Backpack hotbar editing are packaged. All953tests, world/campaign, build/validation and ZIP pass;43.84MB unpacked/20.46MB ZIP. V3 was selected from three scene versions under Chris's bedtime delegation; it remains below the visual target, with sparse floor and modest terrain/wreck masses. V2 native segmented proof covers harvesting/crossings, grades/Jump, cache/descent and nonzero reward Continue; V3 adds changed west/Grotto/NE approach proof. Fresh packaged hotbar/region/Jump/Continue smoke passes. Browser fixtures are not full earned progression or physical-phone performance. World SHA640f9239e3e42555322a3cc3267071ccdeb6d3d41029afc32e24b1719e1d829f; generated SHA69db106b859df19f4491aadfdb82a22523cfd8a89e6e11444bda1b3d8dfc0bd5; package index SHAc288c321780e26d5599bbeaf019c80edb1fa4c8fbf18698b4bc52ec671c34760; ZIP SHA782bd3d2ff5f269b9338da1bae5864abc5a4bbfc5d3124bf2472fd079ce27180. Evidence: art/reviews/shatterfen-v3/.

**Previous V7 checkpoint:** packaged Verdant V7 has18 owner-accepted V3 cliff instances,57 scenic canopies, warm gravel and a repaired boundary crest seam. Aggregate940/940, world/campaign/build/validation and ZIP pass at43.80MB unpacked/20.45MB ZIP. A fresh packaged native fixture passes the Survey approach, both ore approaches, iron harvest/pickup, Jump/landing, cache, descent, West Hollow return and Continue. The later Auto Harvest diagnostic shows five yields aggregate in one valid, reachable pickup outside the idle magnet radius, then collect on normal walking; it found no terrain/drop lifecycle defect. Independent visual review remains HOLD7.3; the subsequent V8 representative-face study was held and restored away, and Chris has since accepted the grass/rock transition with selective grass/rock dressing if needed. Keep verified V7; the narrow appearance question is closed without changing the historical score. Movement cue routing/mute/reset has native proof, but perceptual sound quality and phone audibility remain unreviewed. Read CURRENT_SLICE for hashes and remaining gates.

1. Read the current user request and repository `AGENTS.md`, then the newest status at the top of [CURRENT_SLICE.md](CURRENT_SLICE.md). The full old chronology is archived separately; do not load it unless history matters.
2. Read OVERNIGHT_RUN_2.md for the active priorities; OVERNIGHT_HANDOFF.md is the September11 first-run playtest handoff. Use the latest BUILD_LOG entry only for exact closure evidence.
3. Run `git status --short` and `git log -3 --oneline` to establish the actual checkout and unexplained changes. Preserve other writers' files. Work directly on **main**; no branches, push, publication or paid services without explicit authorization.
4. Use [CODE_MAP.md](CODE_MAP.md) to open only the relevant owner module and focused tests. Use `rg` for a specific symbol or behavior. Do not read the entire build log, all phase docs, all source or all art studies by default.
5. For inventory/save work, read [PHYSICAL_INVENTORY_PLAN.md](PHYSICAL_INVENTORY_PLAN.md). Read design/architecture sections only when the task changes those contracts. Query the local brain only when owner intent/history is relevant; repository evidence owns current implementation.

## Current facts to verify

- Latest unshipped study: VerdantV8 was held7.3 by a fresh judge, preserved, and restored away to exact V7 runtime after local contact/jump proof. Chris has resolved its grass/rock appearance question as acceptable with selective dressing; Rootfall V4 is retained under the bedtime delegation for clearer cut sites; its historical7.1 remains. Shatterfen targetV3 plus its omitted-mark role plan is admitted; sceneV3 is now selected, native-checked and packaged. Current hashes and remaining visual limits are at the top of CURRENT_SLICE. Check CURRENT_SLICE before treating any target as implemented.

- Ordinary Jump (Space/touch), R Dodge, camera orbit/zoom, square inventory, lifted dragging, rounded UI, continuous harvesting and persistent quiet observation are integrated. No active jump pads/checkpoint courses remain.
- Physical inventory/save ownership includes finite pack and pod/crate storage, capacity-safe transactions, selected nearby crafting storage and expedition reload. Provisional death keeps the pack and loses unsecured XP/bonds.
- Camp has one saved adjoining expansion with automatic emergency defenses. A physical Survey cartridge fitted at a Salvage bench expands16→20pack slots. Rootfall cutting/bracing and reciprocal travel work; V4 is selected as the best usable existing compromise under bedtime delegation, preserving the7.1 review and known art flaws.
- Chris accepted exact cliff-kit candidate-v3/final. Do not restart its model loop or substitute rejectedV4. Improve scene assembly using those accepted models; retain original scores and OWNER_ACCEPTANCE.md.
- Replacement Tidefin is not shipping: V3 pose-frame review passes8.0, but continuous/native motion and owner's visual concerns remain open. Keep its preserved sources; do not regenerate merely to resume.
- VISUAL_ATLAS.md contains the private map/model book and original references. Dated atlases are before snapshots; capture tools now support filtered regions/models and exact source hashes. No runtime minimap was added.
- Camp helper drone, further wreck/blueprint progression, powered/ranged tools and armor and other region/art passes remain planned. CRASHLAND_PROGRESSION_PROPOSAL.md is provisional design, not shipped unlocks.

Historical checkpoints and evidence are in BUILD_LOG, CURRENT_SLICE and the dated handoffs. Avoid loading their full chronology during routine resumption.

## Non-negotiable implementation habits

- Single-player, offline-safe Three.js/HTML5 with local vendored Three/Rapier; no runtime network dependency. Landscape first with a usable portrait fallback. The old hackathon35MB limit is retired; report real package and mobile costs.
- One authoritative animation frame loop in `src/main.js`; keep new domain rules in focused modules. Inject dependencies; `window.__game` is diagnostic only. Keep mutable state under one explicit owner.
- Fix a shared contract across its actual siblings: input/UI → state/validation → runtime/physics → save/export → relevant tests. Preserve Author/Play parity, resource IDs and accepted movement/collision unless the task authorizes a change.
- Chris's actual play/phone observations outrank test counts and prior agent visual scores. A diagnostic setup, sampled frames, an earned journey and physical-phone performance are different evidence; label them accurately.
- Keep local work gentle. Do not start Blender, browsers or inference on resumption without a concrete need and resource coordination. Never terminate an unfamiliar user process. TRELLIS safety guards remain unchanged; no paid fallback.

## Run only the proof the task needs

For a focused change, run the relevant Node test files from the code map and one bounded native check when behavior is perceptual. Example: `node --test tests/inventorySlots.test.js tests/inventoryActions.test.js`.

Reserve aggregate `npm test`, `npm run verify` and `npm run zip` for a coherent integrated boundary, release/package change, or an explicit required check; don't run the full suite as an onboarding ritual. `verify` already runs the Node suite, world/campaign checks, build and validation. Follow the current task's validation instructions and repository closure requirements.

`npm run dev` serves the repository; `npm run serve:submission` serves the existing package on8081. Check whether the parent already has a server before starting another. Building regenerates `dist/submission`; don't overwrite a judged package casually.

At closure, report what changed for the player, exact proof and remaining limits. Parent owns the integrated checkpoint, current-status/build-log updates and consolidated brain brief. Do not copy stale “work continues” text forward as permission to ignore the playtest pause.
