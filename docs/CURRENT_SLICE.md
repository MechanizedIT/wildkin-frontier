# Wildkin Frontier — current scope and checkpoint

Updated September 11, 2026. **0.3.0-alpha.1 · local pre-alpha · owner playtest handoff.**

## Current request and entry points

Chris asked to wrap up overnight development, provide a concise changelog, actual visuals, a fresh-game route and unfinished roadmap, update documents, and create an efficient code index and project workflow. Finish this playable checkpoint and stop autonomous expansion. Future sessions take his playtest notes or new request as scope; **do not restart the historical overnight mandate automatically**.

Read SESSION_START.md, OVERNIGHT_HANDOFF.md and CODE_MAP.md next. Use `.agents/skills/wildkin-development/SKILL.md` for production and WORKFLOW_RETROSPECTIVE.md for lessons. This file owns current scope; Git/source own actual implementation. Previous full chronology is preserved in CURRENT_SLICE_HISTORY_2026-09-11.md and must not override this handoff.

## Current playable systems

- Landscape-first mobile/web, fixed-pitch right-drag camera orbit, camera-relative movement, explicit attack/dodge and five equipment shortcuts. Offline vanilla Three.js/Rapier with one frame loop.
- Camp plus five larger authored regions; renewable gathering, combat, discovered return points, persistent repaired routes, ability caches and a Guardian/Core finale. Whole-world layout and campaign pacing still need playtest.
- Four taming approaches: Mossling lure/feeding, Tidefin dry-bank snare/release, Emberhorn dodge/tether/food and Skydancer quiet perches/chime. Pending bonds remain at risk until extraction. Companions use loose intent and their own world-colliding kinematic bodies; stealth and bounded social startle are active.
- Free Camp construction with validation/rotation/removal, three articulated stations, field medicine/rations and taming supplies. Current clearing expansion remains the older tiered area; automatic defended sectors are not implemented.
- Physical inventory v3: 16-slot pack, 24-slot pod/crate storage, drag/tap/split/swap/sort, finite legacy overflow, pack-only equipment counts and capacity-safe transactions. Materials stay in the pack on return. Costs use the pack plus one explicitly selected nearby container. Pack → Journal exposes Gear/Work/Skills/Wildkin/Settings.
- Persistent expedition snapshot: run identity, supported position, health, XP, pending bonds and Core possession. Ordinary actors rebuild on reload; unfinished tame attempts clear. Import/pagehide and failed-death-save retries preserve ownership.
- **Provisional death rule:** keep the backpack, lose carried XP and unsecured bonds. Core possession is recoverable; its materials/XP are rewarded once. Exact capacities, recipes, pacing and survival rules await Chris's playtest.

## Art and evidence boundary

The approved blue-jacket Explorer is the master style: substantial faceted forms, readable contrast, restrained matte shading and no reflections. Admitted families include Explorer/Mossling, crates, Sapwood/stump, three alien canopy variants, three stations, articulated field/Ember caches and moving Fen receiver/rock bank. See DREAM_LOOP_REVIEW.md and the handoff. Other families retain provisional prototypes.

**Replacement Tidefin is not shipped.** Neutral/deformation gates pass; V2 action readability held. Action-only V3 is frozen at `.dream-loop/overnight-tidefin-animation/v3/README.md`, awaiting independent action review, continuous motion and species-specific native cadence integration. Do not restart rendering merely to resume. TRELLIS remains off below unchanged safe memory guards.

Current aggregate: **810 tests**, world/campaign synchronization/readiness and portable build/validation pass. Final package/native proof and sizes are recorded in OVERNIGHT_HANDOFF.md and BUILD_LOG.md. Fresh native gathering → literal expedition reload → Lookout return passes; UI/storage transactions have separate native fixture evidence. These are not physical-phone performance or complete campaign acceptance.

## Accepted next direction, not completed content

Chris's crashland vision joins a landing pod, Camp robot/drone and scattered supplies/beacons to progressively larger wrecks, parts and blueprint discoveries. Survival inventory should make preparation/storage useful without hardcore chores. Generic gates become unique fallen alien growth, ravine wreckage or cave-rubble clearing/repair tasks. Camp starts behind emergency barricades and expands into cleared adjoining sectors whose cost automatically extends the perimeter.

After playtest feedback, the smallest next slice is one survey wreck, one backpack upgrade/blueprint, one distinctive obstruction and one defended Camp yard. Powered harvesting tools, ranged weapons/ammunition, alloys/salvage, further creature/resource/ruin art and richer region composition remain planned. CRASHLAND_PROGRESSION_PROPOSAL.md is provisional design, not implemented unlocks.

## Engineering and delivery

Work directly on local **main**. No branches, publication or paid services without fresh authorization. Preserve offline relative assets/vendor libraries, accepted movement/collision and Author parity. The old hackathon35MB cap is retired; report real costs. Keep one mutable owner per domain and close shared changes across input → state → runtime/physics → save/export → relevant proof.

Use focused tests during a task; root owns required aggregate test/verify/ZIP at an integrated boundary. Record BUILD_LOG, exact proof and remaining limits. Chris's phone observations override prior scores and implementation claims. Historical phase/hackathon documents and the overnight mandate remain evidence, not permission to restart work or reimpose obsolete scope.
