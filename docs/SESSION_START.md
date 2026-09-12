# Start the next Wildkin Frontier session

**September 11 evening: Chris completed a short phone playtest and explicitly resumed overnight goal-mode production until he says stop.** Read CURRENT_SLICE.md and OVERNIGHT_RUN_2.md first; the earlier handoff pause is historical. This is a local pre-alpha, not a published release. Exact art/balance choices remain provisional.

After a fresh clone or machine replacement, read [RECOVERY.md](RECOVERY.md). The September11 GitHub backup also retains the unshipped Tidefin candidate and the locally installed Asset Forge workflow; ignored study folders are not required to recover those snapshots.

## Read the minimum first

**September 12 jump/uplands prototype checkpoint:** ordinary Jump (Space/touch) and R Dodge replace active jump pads and checkpoint courses throughout Play and Author. Former reward/save IDs remain ordinary terrain caches. Forest Edge is now 140×90m with shared polygon terrain, connected 3/6/8m shelves and a separate descent. The five mistakenly removed gameplay props are restored, including both renewable iron veins and the original Thornprowler. All 934 tests, world/campaign checks, build/validation and ZIP pass: 43.69MB unpacked / 20.42MB ZIP; index SHA256 `3700c1acc91f951e0d5dc71a1901155f39672f606e385b13622970a8a8c1c30d`. Portable native Start → Survey route → 3m shelf → actual iron harvest/collection → Jump/landing → reload Continue retaining iron passes, with no browser errors or external/failed requests. This is a functional prototype checkpoint, not visual admission: Verdant V4 holds 7.3; Rootfall V4 holds 7.1 and its original-target modeling decision remains pending with Chris. Other overnight work continues.

1. Read the current user request and repository `AGENTS.md`, then the newest status at the top of [CURRENT_SLICE.md](CURRENT_SLICE.md). The full old chronology is archived separately; do not load it unless history matters.
2. Read `docs/OVERNIGHT_HANDOFF.md` for the current playable checkpoint and remaining work. Use the latest BUILD_LOG entry only for exact closure evidence.
3. Run `git status --short` and `git log -3 --oneline` to establish the actual checkout and unexplained changes. Preserve other writers' files. Work directly on **main**; no branches, push, publication or paid services without explicit authorization.
4. Use [CODE_MAP.md](CODE_MAP.md) to open only the relevant owner module and focused tests. Use `rg` for a specific symbol or behavior. Do not read the entire build log, all phase docs, all source or all art studies by default.
5. For inventory/save work, read [PHYSICAL_INVENTORY_PLAN.md](PHYSICAL_INVENTORY_PLAN.md). Read design/architecture sections only when the task changes those contracts. Query the local brain only when owner intent/history is relevant; repository evidence owns current implementation.

## Snapshot to verify, not silently upgrade

-Historical initial September12 state, superseded above: add ordinary jumping and a Jump button/animation; retire jump pads/checkpoint courses in favor of natural terrain/hidden loot. Existing Rapier kinematic jump/fall and Explorer clips can be reused; implementation is underway, not yet closed. RootfallV1 model held7.2; V2 passes neutral8.0 with native integration still pending. Keep current uncommitted writers separate.
-The requested map/model review is delivered privately through Drive and an email to the owner. VISUAL_ATLAS.md links the12pagebook and originals, with repeatable capture tools and coordinate metadata. It is a static Survey-checkpoint snapshot, not proof of jumping/Rootfall/minimap implementation.

- Latest Survey checkpoint:888tests/world/campaign/build/validation/ZIP pass,43.44MB unpacked/20.37MB ZIP. Unique physical cartridge→placed Salvage fitting16→20slots, item-loot/Author closure and new wreckV2 are integrated. Fresh ordinary recovery/exit/reload and separate diagnostic fitting/reload pass; independent native8.0 and station UI8.4. V1 was rejected, not shipped. Rootfall is the next unimplemented passage; its source plan is `.dream-loop/overnight2-rootfall/planning.md` and its target is being prepared from the actual raised ridge. See CURRENT_SLICE for exact package hash and remaining limits.

- Preceding Camp checkpoint:867tests/build/ZIP pass,42.97MB unpacked/20.29MB ZIP. One defended adjoining yard clears/pays/expands/reloads, with independently reviewed openings, console and new armor. Legacy construction/storage survives. Read SURVEY_RECOVERY_SLICE for the integrated discovery/expansion loop and remaining Rootfall work.

- September11 evening phone candidate:842tests/build/validation/ZIP pass at42.56MB unpacked/20.26MB ZIP. Square inventory/lifted drag, rounded frames, fullscreen/right-side zoom/real joystick, quiet persistent observation notes and continuous harvesting are integrated. The pickup-dependent next-hit gate was explicitly rejected by Chris. Read OVERNIGHT_RUN_2 rolling status and latest BUILD_LOG before relying on the older handoff below. Camp target is independently reviewed; barricade/layout work is underway, not admitted content.

- Physical inventory is integrated: finite pack, physical pod/crate storage, drag/tap/split/sort, selected nearby crafting source, capacity-safe transactions, v3 migration and an active-expedition reload snapshot. Saved quantities belong to frontier progress; old counters are derived views.
- Parent's wrap-up checkpoint reports **810 tests** and build/validation/ZIP success, about **42.53 MB unpacked / 20.25 MB ZIP**. Native/package closure passed; see the handoff for exact fixtures and limitations. Counts and bytes are historical evidence, not a reason to rerun everything on session start.
- Death currently keeps the pack while losing unsecured XP/bonds; mobile reload resumes a supported saved expedition. Exact survival balance is provisional. Migration-fixture checks do not prove an earned full campaign.
- Tidefin's new model/rig is **not shipping**. V2 failed action readability. Preserved V3 changes only Attack/Hurt and now passes independent pose-frame review8.0; continuous motion, companion-scale readability, native cadence/event timing and owner phone gates remain open. Existing shipping Tidefin stays in place. See `art/source/tidefin-candidate-v3/independent-action-review.md`.
- V3 candidate: `.dream-loop/overnight-tidefin-animation/v3/README.md`; GLB SHA256 `5f22dfe31acc9c2b16924d0e662d357c92e17af3518a0c2413ba26440e12eb5f`. Geometry/UV/weights and Idle/Walk/Run are exactly preserved from V2. No further rendering is needed merely to resume.
- Robot/drone, the wider crash-land story, unique natural passages and further wreck-led blueprints remain planned. One Survey wreck/pack upgrade and one defended Camp expansion are now integrated. `CRASHLAND_PROGRESSION_PROPOSAL.md` is broader provisional design; CURRENT_SLICE owns actual scope/status.

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
