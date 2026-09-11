# Start the next Wildkin Frontier session

**September 11 handoff: Chris is playtesting the overnight checkpoint. Await his notes or a new task; do not restart overnight autonomous production merely because an older mandate says “continue.”** This is a local pre-alpha, not a published release. Exact art/balance choices remain provisional.

After a fresh clone or machine replacement, read [RECOVERY.md](RECOVERY.md). The September11 GitHub backup also retains the unshipped Tidefin candidate and the locally installed Asset Forge workflow; ignored study folders are not required to recover those snapshots.

## Read the minimum first

1. Read the current user request and repository `AGENTS.md`, then the newest status at the top of [CURRENT_SLICE.md](CURRENT_SLICE.md). The full old chronology is archived separately; do not load it unless history matters.
2. Read `docs/OVERNIGHT_HANDOFF.md` for the current playable checkpoint and remaining work. Use the latest BUILD_LOG entry only for exact closure evidence.
3. Run `git status --short` and `git log -3 --oneline` to establish the actual checkout and unexplained changes. Preserve other writers' files. Work directly on **main**; no branches, push, publication or paid services without explicit authorization.
4. Use [CODE_MAP.md](CODE_MAP.md) to open only the relevant owner module and focused tests. Use `rg` for a specific symbol or behavior. Do not read the entire build log, all phase docs, all source or all art studies by default.
5. For inventory/save work, read [PHYSICAL_INVENTORY_PLAN.md](PHYSICAL_INVENTORY_PLAN.md). Read design/architecture sections only when the task changes those contracts. Query the local brain only when owner intent/history is relevant; repository evidence owns current implementation.

## Snapshot to verify, not silently upgrade

- Physical inventory is integrated: finite pack, physical pod/crate storage, drag/tap/split/sort, selected nearby crafting source, capacity-safe transactions, v3 migration and an active-expedition reload snapshot. Saved quantities belong to frontier progress; old counters are derived views.
- Parent's wrap-up checkpoint reports **810 tests** and build/validation/ZIP success, about **42.53 MB unpacked / 20.25 MB ZIP**. Native/package closure passed; see the handoff for exact fixtures and limitations. Counts and bytes are historical evidence, not a reason to rerun everything on session start.
- Death currently keeps the pack while losing unsecured XP/bonds; mobile reload resumes a supported saved expedition. Exact survival balance is provisional. Migration-fixture checks do not prove an earned full campaign.
- Tidefin's new model/rig is **not shipping**. Animation V2 passed limited frame/deformation review but failed action readability. V3 changes only Attack/Hurt and awaits independent action review; continuous/native cadence and owner phone gates remain open. Existing shipping Tidefin stays in place.
- V3 candidate: `.dream-loop/overnight-tidefin-animation/v3/README.md`; GLB SHA256 `5f22dfe31acc9c2b16924d0e662d357c92e17af3518a0c2413ba26440e12eb5f`. Geometry/UV/weights and Idle/Walk/Run are exactly preserved from V2. No further rendering is needed merely to resume.
- Crash-land story content, robot/drone, improvised barricades and defended adjoining Camp sections, unique natural/wreck obstacles, wreck-led blueprints and pack upgrades are **planned work**, not completed gameplay. See `CRASHLAND_PROGRESSION_PROPOSAL.md` and the inventory plan after Chris's feedback establishes priority.

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
