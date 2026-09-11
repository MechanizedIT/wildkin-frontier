# Wildkin workflow retrospective

September 11, 2026. This records production lessons from the overnight work and physical-inventory cutover. It is a workflow review, not final package admission or owner approval of every art/balance choice.

## What worked

- **Separate target, production and judgment roles.** Exact reference/model hashes and independent image review prevented a successful export or persuasive implementation report from becoming automatic art approval. Locked targets survived failed versions.
- **Scripts for reproducible construction and exact contracts.** Small composers, export checks, quantity tests and real-Rapier fixtures made model revisions, world placement and save failures reproducible. They were especially useful for geometry bounds, true hulls, ground clearance, source parity and rollback.
- **Fresh export plus actual game review.** Neutral renders exposed construction mistakes; gameplay views exposed camera cropping, dark silhouettes, interaction occlusion and scenery hiding the Explorer. Author/export/reload and package checks caught paths that studio renders could not cover.
- **Concrete earned journeys.** Starter gathering/return/build and earned Tidefin attempts revealed route, supply and instruction problems. The inaccessible central Tidefin home was moved toward a real dry bank; tool-delay-confounded failures were not treated as proof of unavoidable difficulty.
- **Small repairs across real siblings.** Shared body-clear callouts, per-instance fading, truthful convex prop support and finite inventory transactions were checked across their callers rather than patched only at the reported screenshot.
- **Explicit ownership.** Root owned integration and final state; workers owned isolated modules or evidence. This allowed UI, art and contract review to progress without concurrent writes to canonical world data.

## What failed or cost too much

| Approach | Evidence and lesson |
| --- | --- |
| Treating metrics as appearance | Closed meshes, low triangle counts and matching bounds still produced blocky outcrops or weak silhouettes. Scripts help establish facts; direct image judgment is irreducible. |
| Repeated cosmetic geology revisions | Beveled blocks, repeated ribs, rectangular stairs and exposed connectors missed the locked natural-rock target. Structural changes to unequal masses and truthful convex assemblies were more useful than further color/profile adjustments. Several geology candidates remain rejected. |
| Flat overlays on analytic terrain | Gravel ribbons showed stripes/z-fighting where analytic height differed from the rendered terrain grid. Surface conformity or grounded irregular detail must be established before adding more painting. |
| Generic rig or height-mask shortcuts | Coordinate assumptions and inappropriate weight ownership produced joint damage and cheek hooks. Fitted proxy/anatomy methods, actual local weight inspection and compatible root/body weights were more reliable; they still required exported loaded-pose review. |
| Losing texture/source fidelity during processing | Surface appearance could change despite nominally unchanged assets. Preserve the original albedo/UV source, inspect color-space/byte handling and compare the fresh GLB under matched lights. Never discard the approved source to conceal a pipeline defect. |
| Calling subtle motion finished | Tidefin's neutral/limited deformation passes did not make Attack/Hurt readable at species scale. The replacement remains unshipped; its preserved action revision still needs independent motion/native admission. |
| Proving the menu before proving access | The inventory component fit the viewport, yet the pod's normal world interaction could be hidden. Integrate a real approach → open → transact → close → walk away loop early. |
| Over-trusting proof harnesses | Hidden zero-size buttons, wrong input assumptions, stale authored data and tool delays produced misleading results. Correct the harness and preserve exclusions; do not relabel a failed fixture as success. |
| Large logs and repeated context loading | Broad reads and oversized outputs lost useful evidence and consumed time/tokens. Several sprawling handoffs blurred active versus completed tasks. Prefer a short current-state guide, code map, exact artifact path and one bounded question. |

## Contract lessons from inventory/resume

- The pack and containers need one saved quantity owner; shortcuts and old counters are views. Capacity, partial claims, recipe costs and refunds must conserve quantities across failed writes as well as success.
- A successful import initially left an old snapshot provider attached, allowing later pagehide to overwrite imported run state. The provider was detached on success and a post-import checkpoint was reproduced.
- A failed death save initially left a dead active run vulnerable to a later snapshot. The repair holds resolution, retains the previous record and retries before returning to Camp.
- A minimal expedition snapshot preserves mobile interruption expectations without serializing every creature/projectile. Paid unfinished attempts and rebuilt actors are explicit limitations, not invisible full-world persistence.
- The real-Rapier step study rejected propagation-only as a blanket replacement for simulation: moved and newly enabled/created colliders could remain stale in broadphase queries. That performance idea is a future bounded experiment, not an implemented optimization.

## Standard approach next session

1. Start with [SESSION_START.md](SESSION_START.md), current owner feedback, newest [CURRENT_SLICE.md](CURRENT_SLICE.md), actual Git state and [CODE_MAP.md](CODE_MAP.md). Historical mandate text must not restart production after a playtest handoff.
2. Choose one player-visible vertical slice and one production writer per shared file. Use independent bounded reviewers where uncertainty warrants them. Keep ordinary implementation judgment with the producer; reserve owner questions for meaningful unresolved choices.
3. Reuse the project skill at [wildkin-development](../.agents/skills/wildkin-development/SKILL.md). It routes to existing Asset Forge/Dream Loop instructions instead of copying those manuals or creating a new production framework.
4. Keep the accepted target fixed. When a method repeatedly misses, preserve the rejected candidate and change the method. Separate reference, model, deformation, continuous motion, native scene and physical-phone gates.
5. Prove the actual access/effect early, then its changed save/physics/Author siblings. Label fixture versus earned, source versus dev versus package, and sampled frames versus watched motion honestly.
6. Run focused checks during development and one coherent parent-owned aggregate/package closure. Record the exact final revision, retained candidates and limitations, then stop for Chris's requested playtest.

The repository-local `.agents/skills/wildkin-development/SKILL.md` is the standard skill entry point for future repository sessions. No user-wide skill copy or tools installation was performed. If a future host does not list project skills, open this file explicitly; investigate discovery before creating a duplicate installation.

This session produced a stronger playable foundation, not completed commercial art, a finished crash-land story or measured physical-phone performance. The next priority should follow Chris's play observations rather than the length of the remaining agent backlog.
