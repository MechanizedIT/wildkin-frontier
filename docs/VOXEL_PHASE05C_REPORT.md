# Phase 0.5C — Mixed-material support and interaction

**Result: PASS; stop for owner review.** This bounded proof puts dirt and hard rock in one authoritative scalar volume. Excavating dirt changes shared support; the unsupported rock transfers to a ROCK actor without a reward, falls on an approximate Rapier proxy, and remains targetable and mineable with the hard-rock strategy. The independent read-only review passed after the shared-boundary crumble protection was fixed. This is not production terrain or mobile readiness.

## VERIFIED

- One 13³, 0.5 m sample volume (seed 9212026) stores both material IDs and one parcel-ownership ledger. It begins with **336 rock** and **3,564 dirt** units. There is no double ownership.
- Surface targeting selects visible dirt and rock on their respective sides. Dirt excavation and dirt crumble are restricted to dirt samples/parcels; the hard-rock chip is restricted to rock. A regression exercises the dirt component-crumble candidate at a shared material boundary. Rock and dirt keep their registered cohesion and brittle-stress policies.
- Initial shared support has one anchored component. A dirt scoop removes 58 dirt units while all 336 rock units remain static and supported. Literal reload retains that state. A later ordinary dirt scoop removes the actual supporting occupancy: the shared result changes from one anchored component to two, and rock support changes true → false. There is no edit counter or scripted detachment.
- At revision 2, all **336 rock units** transfer atomically from the static volume to one ROCK actor. Transfer grants zero stone and dirt. The static volume has zero rock afterward. The actor uses four approximate convex colliders; peak body count is one. Rapier settles it about 1.78 m from its initial pose with about 0.19 rad of rotation. The moved surface is targeted and receives a hard-rock chip and persistent bond stress.
- Literal reload before detachment preserves the supported boulder and dirt cavity. Reload after moved-rock mining preserves the single ROCK actor, its stress, pose (0.0035 m position delta; 0 rad rotation delta), cavity, and ledgers. Injected actor mesh/proxy preparation, persistence, stale-result and invalid-ownership failures remain atomic. No page errors or external requests occurred.

Final source-browser accounting:

```text
rock:  336 initial = 0 static + 334 actor + 2 consumed
dirt: 3,564 initial = 3,345 static + 0 actor + 219 consumed
combined: 3,900 = 3,345 static + 334 actor + 221 consumed
rewards: 2 stone, 219 dirt
```

The 219 dirt consumed is 179 directly excavated plus 40 crumbled. Rock transfer itself changes no quantity or reward. Later rock mining consumes 2 rock units and does not change the dirt ledger.

## PROVISIONAL

- The minimal boundary rule is shared occupancy contact for external support, with material-specific internal failure: dirt uses local cohesion/crumble; rock uses its own bond graph and stress. Rock may be supported by dirt without entering dirt's failure domain. This rule is only proved in the curated fixture.
- Static mixed edits analyze the bounded whole fixture. The accepted dirt edits report 6,915 and 6,912 support work units (the initial support count is 2,106). The measured detachment transaction was 42.7 ms, including 23.9 ms connectivity and 18.8 ms cohesion/crumble work in headless Edge/SwiftShader. Phase 0.5B observed 6,920–10,424 support work units, 46.6–287.2 ms support/cohesion and 150–684 ms whole edits. The C work count is comparable and does not show a material increase over B; the browser timing samples are not an apples-to-apples benchmark.
- The detached actor retains ROCK identity and uses the established approximate four-sector proxy. Its contact shape, fixture tuning, and physics are research evidence only.
- No major brittle fracture was reached in the captured post-fall sequence; chip and accumulated stress are verified.

## FAILED / corrected attempts

- The first independent review found mixed static handlers bypassing registered material policies. Dirt now runs `DIRT_MATTER_POLICY.analyzeSupport` with shared mixed connectivity and foreign-sample protection. Static rock runs its registered removal, bond-graph, stress, and rock-connectivity hooks; shared mixed occupancy remains authoritative for rock's dirt-supported static detachment.
- The next review found that the disconnected-component crumble helper could clear foreign rock samples. Both the component and weak-sample crumble paths now receive dirt identity and the protected foreign-sample mask. A focused shared-boundary test covers the former failure. No known failing attempt remains unaddressed.

## FUTURE

Spatially cropped support, terrain-like excavation/chunk seams, general collapse, scale/performance admission, other materials, production migration, and real-device/mobile validation remain future work. Do not start Phase 0.5D until fresh owner direction.

## Evidence and validation

- Browser receipt and 12 captures: [source evidence](evidence/voxel-phase05c/source/).
- Human-visible sequence board: [mixed-material interaction](evidence/voxel-phase05c/material-interaction.html).
- Focused mixed suite: 8/8. A.4 hard-rock and B dirt regressions: 16/16. `npm test` and `npm run verify` each pass 1,555 tests across 175 suites. Verify also passes world/campaign checks, submission build (63.12 MB unpacked), and submission validation.
- Independent read-only review: PASS. Browser evidence is headless Edge/SwiftShader evidence, not owner perceptual approval or mobile performance evidence.
