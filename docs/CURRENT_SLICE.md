# Wildkin Frontier — current scope and checkpoint

Updated September 11, 2026. **0.3.0-alpha.1 · local pre-alpha · second overnight development run active.**

## Current request and entry points

Chris explicitly resumed autonomous overnight development after his phone playtest on September11. Continue until he says stop: implement, independently review and refine complete playable slices; when the prioritized plan is complete, audit the game and plan another useful pass. The earlier playtest pause is superseded by this new request. See **OVERNIGHT_RUN_2.md** for the full current brief, priorities, professional review roles and rolling status.

**Active first slice:** phone inventory square slots and lifted drag preview; rounded UI; fullscreen entry with honest platform fallback; usable portrait and landscape layouts, real moving joystick affordance, bounded camera zoom with multi-touch ownership; reproduce/fix the intermittent first-tree harvest; replace fleeting creature inspection hints with a persistent, stealth-aware observation/journal loop. Prioritize owner-reported defects before broad new content. Subsequent authorized slices cover the crashland/blueprint/tool progression, defended adjoining Camp expansion, flexible hotbar/equipment, world/art/animation and audio polish. Exact balance and design proposals remain provisional.

**22:45 Camp checkpoint:** defended starter apron, material-only build bay, three saved clearing bundles, reachable world-console payment and adjoining perimeter expansion are integrated. New-target and neutral-model reviews pass8.3; independent bounded native Camp review passes8.0. Ordinary walking passes both openings, root diagnostic auto-clearing/payment/reload passes, and full physical crates survive reload/import at all three cleared sites.867tests, world/campaign, portable build/validation and ZIP pass;42.97MB unpacked/20.29MB ZIP, index SHA256 `ce4e3571d382a9305c372adf56bd3c8acd71da15b0d805a0a1a128487b9d2afe`. Next: survey wreck/cartridge → Salvage bench16→20-slot fitting, then Rootfall. Existing pod/services, yard-edge dressing and exact economy remain provisional.

**22:00 phone checkpoint (preceding):** the first-slice changes are integrated;842tests, world/campaign checks, portable build/validation and ZIP pass. Native touch inventory/fullscreen/pinch, quiet observation → Journal → reload and continuous tree depletion pass their stated fixtures. Moving creature-label native review is closing separately; whole-campaign and physical-phone acceptance remain open. Chris explicitly corrected harvesting: uncollected drops must never block further hits. The old pickup-dependent gate and attempted recall workaround are removed across resource families. Next bounded work is [SURVEY_RECOVERY_SLICE.md](SURVEY_RECOVERY_SLICE.md), beginning with the independently reviewed Camp target; its new barricade models/layout are candidates, not shipped content.

**September11 backup follow-up:** after restarting his PC, Chris explicitly requested restarting the playtest server and pushing this work to the existing GitHub repository for recovery if the PC fails. This authorizes the current backup sync to origin/main; it does not resume game expansion or authorize a deployment. Preserve unfinished source candidates separately from admitted runtime assets.

The finished-game checkpoint is backed up in origin/main at `98f93e1`. The additional source recovery bundle preserves the unshipped Tidefin candidate and custom asset workflow; see [RECOVERY.md](RECOVERY.md). Backup-only validation uses server reachability, manifest hash checks and remote HEAD confirmation; no gameplay changes require repeating the prior aggregate suite.

Read SESSION_START.md, OVERNIGHT_HANDOFF.md and CODE_MAP.md next. Use `.agents/skills/wildkin-development/SKILL.md` for production and WORKFLOW_RETROSPECTIVE.md for lessons. This file owns current scope; Git/source own actual implementation. Previous full chronology is preserved in CURRENT_SLICE_HISTORY_2026-09-11.md and must not override this handoff.

## Current playable systems

- Landscape-first mobile/web, fixed-pitch right-drag camera orbit, bounded right-side pinch/wheel zoom, closer default landscape framing, browser fullscreen control, actual touch-origin joystick, camera-relative movement, explicit attack/dodge and five equipment shortcuts. Offline vanilla Three.js/Rapier with one frame loop.
- Camp plus five larger authored regions; renewable gathering, combat, discovered return points, persistent repaired routes, ability caches and a Guardian/Core finale. Whole-world layout and campaign pacing still need playtest.
- Four taming approaches: Mossling lure/feeding, Tidefin dry-bank snare/release, Emberhorn dodge/tether/food and Skydancer quiet perches/chime. Pending bonds remain at risk until extraction. Companions use loose intent and their own world-colliding kinematic bodies; stealth and bounded social startle are active.
- Quiet, visible, unobstructed observation earns two persistent Journal notes per species at provisional species-specific timings. Existing wildlife detection interrupts study. Basic taming remains available without earning notes; completed species yield to unfinished studies. Square pack cells, lifted touch preview, scroll cues and rounded frames address phone feedback.
- Free Camp construction with validation/rotation/removal, three articulated stations, field medicine/rations and taming supplies. One saved adjoining work yard now extends emergency defenses after three marked bundles are cleared and the console cost is paid. Existing paid/construction saves are grandfathered; further sectors remain planned.
- Physical inventory v3: 16-slot pack, 24-slot pod/crate storage, drag/tap/split/swap/sort, finite legacy overflow, pack-only equipment counts and capacity-safe transactions. Materials stay in the pack on return. Costs use the pack plus one explicitly selected nearby container. Pack → Journal exposes Gear/Work/Skills/Wildkin/Settings.
- Persistent expedition snapshot: run identity, supported position, health, XP, pending bonds and Core possession. Ordinary actors rebuild on reload; unfinished tame attempts clear. Import/pagehide and failed-death-save retries preserve ownership.
- **Provisional death rule:** keep the backpack, lose carried XP and unsecured bonds. Core possession is recoverable; its materials/XP are rewarded once. Exact capacities, recipes, pacing and survival rules await Chris's playtest.

## Art and evidence boundary

The approved blue-jacket Explorer is the master style: substantial faceted forms, readable contrast, restrained matte shading and no reflections. Admitted families include Explorer/Mossling, crates, Sapwood/stump, three alien canopy variants, three stations, articulated field/Ember caches and moving Fen receiver/rock bank. See DREAM_LOOP_REVIEW.md and the handoff. Other families retain provisional prototypes.

**Replacement Tidefin is not shipped.** Neutral/deformation gates pass; V2 action readability held. Action-only V3 is frozen at `.dream-loop/overnight-tidefin-animation/v3/README.md`, awaiting independent action review, continuous motion and species-specific native cadence integration. Do not restart rendering merely to resume. TRELLIS remains off below unchanged safe memory guards.

Current aggregate: **867 tests**, world/campaign synchronization/readiness and portable build/validation pass; **42.97MB unpacked /20.29MB ZIP**. Current build index SHA256 `ce4e3571d382a9305c372adf56bd3c8acd71da15b0d805a0a1a128487b9d2afe`. First-run handoff proof remains historical. New native diagnostics and independent reviews cover the changed phone, observation and harvesting paths; they do not establish complete campaign acceptance or physical-phone performance. See BUILD_LOG for exact evidence boundaries.

## Accepted next direction, not completed content

Chris's crashland vision joins a landing pod, Camp robot/drone and scattered supplies/beacons to progressively larger wrecks, parts and blueprint discoveries. Survival inventory should make preparation/storage useful without hardcore chores. Generic gates become unique fallen alien growth, ravine wreckage or cave-rubble clearing/repair tasks. Camp starts behind emergency barricades and expands into cleared adjoining sectors whose cost automatically extends the perimeter.

After playtest feedback, the smallest next slice is one survey wreck, one backpack upgrade/blueprint, one distinctive obstruction and one defended Camp yard. Powered harvesting tools, ranged weapons/ammunition, alloys/salvage, further creature/resource/ruin art and richer region composition remain planned. CRASHLAND_PROGRESSION_PROPOSAL.md is provisional design, not implemented unlocks.

## Engineering and delivery

Work directly on local **main**. No branches, publication or paid services without fresh authorization. Preserve offline relative assets/vendor libraries, accepted movement/collision and Author parity. The old hackathon35MB cap is retired; report real costs. Keep one mutable owner per domain and close shared changes across input → state → runtime/physics → save/export → relevant proof.

Use focused tests during a task; root owns required aggregate test/verify/ZIP at an integrated boundary. Record BUILD_LOG, exact proof and remaining limits. Chris's phone observations override prior scores and implementation claims. Historical phase/hackathon documents and the overnight mandate remain evidence, not permission to restart work or reimpose obsolete scope.
