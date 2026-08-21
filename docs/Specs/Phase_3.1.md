# Wildkin Frontier — Phase 3.1: Creature Ecology & Combat Refinement

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 3.1  
**Player-visible goal:** Combat becomes reliable and the frontier begins to feel inhabited by creatures with different temperaments rather than generic enemies. The player can keep harvesting during danger, manually tap or hold to swing the Field Tool, and observe Wildkin reacting to the player and to one another.

This is a refinement slice. Preserve the working Phase 1–3 foundation.

## Locked interaction rules

- There is one physical Field Tool swing.
- A swing may hit both valid harvestables and living Wildkin in the same arc.
- Auto Harvest only initiates swings for nearby resources while the player is nearly stationary.
- Enemy presence does **not** disable Auto Harvest.
- There is **no auto-attack**.
- Mobile: right-side tap = one swing; hold = repeat swings at weapon cadence; swipe = dodge and takes precedence.
- Manual swings can harvest even when Auto Harvest is OFF.

## 1. Fix Spitter projectile collision

Separate environment collision from actor damage.

Each projectile should know its owner. World shape-casts must exclude the projectile owner and must not allow the player's Rapier capsule to consume the shot as generic world collision before actor-hit resolution.

During each fixed step, sweep the projectile volume from previous position to intended next position against valid living actors:
- projectile → player,
- projectile → Wildkin other than owner.

Rules:
- cannot hit owner,
- valid actor hit damages once then removes projectile,
- world hit removes projectile,
- lifetime expiry removes projectile,
- player facing must have no effect on whether the projectile damages,
- Field Tool/head/direction-arrow Three.js visuals are not physical projectile blockers,
- dodge/i-frame still prevents player damage.

Add regression tests for player hits from every facing direction, owner exclusion, world blocking, Wildkin targets, once-only damage, and bounded pooling.

## 2. Fix dead creature collision

When a creature dies:
- stop AI/attacks,
- remove from perception/target lists,
- clear target rings,
- disable/remove meaningful Rapier body/collider collision,
- hide/play death effect,
- start respawn timer.

While dead/respawning:
- player and creatures can pass through former position,
- projectiles cannot hit it,
- it is not targetable.

On respawn:
- restore at authored home/spawn,
- restore health/AI/visual/collision,
- do not restore directly inside the player; delay or use a nearby safe authored offset.

## 3. Unify Field Tool impact

Create one authoritative impact event such as `resolveFieldToolImpact(...)`.

At the impact frame evaluate both:
- resource hit rules from Phase 2,
- creature combat hit rules from Phase 3.

Do not maintain separate competing tool-impact owners. The Field Tool remains one visual mesh/pivot owner.

A single swing may validly harvest a tree and damage a creature if both are actually inside their respective physical/vertical interaction rules.

## 4. Keep Auto Harvest during danger

Remove the Phase 3 global rule equivalent to:

`harvestingAllowed = autoHarvestEnabled && !combatEngaged`

Combat engagement may remain for AI/UI/recent-danger tracking, but it no longer suppresses harvesting.

With Auto Harvest ON:
- valid nearby resource can initiate a swing while an enemy is attacking,
- resource halo behaves normally,
- that same swing can hit a Wildkin physically in its arc.

With Auto Harvest OFF:
- no resource auto-initiation,
- manual tap/hold still swings,
- manual swing can harvest resources and damage creatures.

A hostile creature with no resource nearby must never automatically cause a player swing.

## 5. Tap / hold / swipe

Expose input intent similar to:
- `attackRequested` — one-frame edge,
- `attackHeld` — intentional held state,
- `dodgeRequested`.

Right-side pointer flow:
- pointer down → PENDING,
- valid swipe before attack commit → DODGE, no attack,
- quick release → ONE ATTACK,
- hold ~0.20–0.25s without qualifying as dodge → ATTACK_HELD,
- while held, request another swing only when Field Tool/combat cadence is ready,
- release immediately clears held attack,
- do not queue attacks after release,
- once hold is clearly established, tiny later finger drift should not become dodge.

Use the weapon cadence as authority; do not build a second fast mobile repeat timer.

Desktop current attack controls remain. Mouse-hold repetition is optional parity if it naturally fits the same intent model.

## 6. Temperament model

Separate combat archetype from temperament.

Existing Rusher/Spitter describe **how** a creature fights. Temperament describes **when/why** it fights, warns, ignores, or flees.

Support data-driven:
- AGGRESSIVE
- TERRITORIAL
- DEFENSIVE
- SKITTISH

Creature instance data should support roughly:
- id,
- archetype,
- temperament,
- homePosition,
- roamRadius,
- noticeRadius,
- personalSpaceRadius,
- leashRadius,
- speciesTag,
- minimal optional hostile/prey tags.

Avoid a heavyweight behavior-tree/faction framework.

### Aggressive
May initiate against eligible player or configured Wildkin target without being hit first.

### Territorial
Notices/watches/warns first. Attacks only after personal-space/territory intrusion or persistent proximity. Warning should be visibly readable through facing/pulse/stance/sound.

### Defensive
Generally ignores player/neutral creatures until damaged, then retaliates against the attacker for a bounded time.

### Skittish
Moves away from approaching threat; flees more urgently if hit.

## 7. Wildkin perceive other Wildkin

Do not assume AI target is always the player.

Generalize only enough for an AI-relevant actor to expose:
- id,
- actorType (`player` or `wildkin`),
- position,
- alive,
- speciesTag.

Creatures may choose an attack target, flee target, or warning target.

At least one authored wildlife interaction must occur without player initiation, for example:
- aggressive Rusher attacks a configured rival/prey Wildkin,
- defensive Wildkin retaliates,
- skittish Wildkin flees an aggressive one.

Existing Rusher lunge and Spitter projectile must be capable of damaging valid Wildkin targets once. Owners cannot damage themselves. Dead actors leave target lists immediately.

Do not make every creature hostile to every other creature.

## 8. Player reward rule for wildlife kills

Do not allow passive XP farming from wildlife killing wildlife.

Simplest acceptable rule:
- player-participation kill may drop normal XP,
- wildlife-only kill with no recent/player damage contribution does not spawn normal player XP.

No complex assist percentages.

## 9. Home / roam / leash

Each creature has an authored home.

When idle:
- roam within bounded radius,
- pause/change direction,
- do not wander through whole map.

When engaged:
- pursue/flee only within reasonable leash,
- when too far from home or engagement ends, disengage and return home.

Respawn resets to home and temperament state.

## 10. Lightweight obstacle steering

Do **not** add A* or navmesh.

Keep Rapier collision-resolved creature locomotion. Add small steering assistance when direct movement is blocked or progress stalls:
1. try direct desired direction,
2. probe ~45° left/right,
3. optionally ~80–90° left/right,
4. choose a viable side that still advances toward/away/from home,
5. hold that steering choice briefly to prevent oscillation,
6. retry direct path later.

Use radius-appropriate probes. Creatures should not phase through major boxes, solid resources, walls, or bounds.

Ground Wildkin do not need ladders/jump/parkour navigation.

Add light short-range separation if creature physical collision is disabled, only enough to prevent obvious center-overlap.

## 11. XP visual

Replace gold-looking XP motes with large glowing cyan/blue essence.

Target:
- perceived radius about 0.28–0.32,
- bright cyan/blue core,
- darker blue emissive body,
- soft transparent/glowy shell/halo,
- gentle pulse,
- roughly twice prior perceived size.

No expensive per-mote point lights. Keep pooling/shared geometry/materials and once-only collection.

## 12. Field Tool handedness diagnostic

Do not blindly flip yaw/anchors again.

Camera perspective can invert apparent screen-left/screen-right: when the player faces the camera, the player's anatomical right appears on the viewer's left.

For this slice, use a dev-only diagnostic to verify actual player-local coordinates:
- +X = anatomical right,
- -X = left,
- +Z = forward,
- mark right-hand grip,
- sample tool-head at start/middle/end.

Correct character-relative swing:
- start: local X > 0 and Z > 0,
- middle: crosses the front with Z > 0,
- end: local X < 0 and Z > 0.

Only change animation hierarchy if the actual player-local diagnostic proves it wrong. Remove/disable temporary markers afterward. This is lower priority than projectile/dead-collider/input/ecology fixes.

## 13. Small-map scope

The current arena is a systems test, not the real frontier.

Do not spend scope faking the final spatial difficulty gradient.

Require only:
- no unavoidable immediate spawn damage,
- enough breathing room to harvest/test controls,
- aggressive/territorial/defensive/skittish behaviors can be observed,
- at least one Wildkin-vs-Wildkin interaction can occur.

Reuse Rusher/Spitter combat archetypes with different temperament configuration rather than adding a large new roster.

## 14. Architecture guardrails

Phase 3.5 is the deliberate architecture/world-authoring checkpoint. Do not do that full refactor now, but do not worsen debt.

- Do not put new temperament/gesture/targeting rules into `main.js`.
- Small focused creature perception/temperament/steering helpers are encouraged.
- Keep one authoritative Field Tool visual and one impact event.
- Do not add persistence/extraction/run-session systems yet.
- Preserve one rAF and existing fixed-step ownership.
- Rapier remains approved collision/query runtime.

## 15. Tests

Preserve existing tests and add focused coverage for:
- Spitter projectile player hit regardless of facing,
- owner exclusion,
- projectile world blocking,
- projectile → Wildkin,
- dead collider disable and safe respawn,
- one Field Tool impact resolving resource + creature targets,
- combat no longer suppressing Auto Harvest,
- hostile alone does not auto-attack,
- manual harvest with Auto Harvest OFF,
- tap/hold/swipe classification,
- hold stops on release and never queues unbounded attacks,
- aggressive/territorial/defensive/skittish decisions,
- actor cannot target self/dead actors,
- Wildkin-vs-Wildkin damage,
- wildlife-only kill gives no player XP,
- player-participation kill can give XP,
- home/leash return,
- pure steering choice tests where practical.

## 16. Performance guardrails

- no A*,
- no navmesh,
- no per-creature rAF,
- no unbounded arrays,
- preserve projectile/XP/particle pooling,
- keep pairwise perception small/bounded,
- avoid hot-loop allocations,
- shared geometry/materials where practical,
- capped DPR,
- one rAF.

## 17. Acceptance criteria

Phase 3.1 is ready for human review when:
- Spitter shots reliably hurt the player on real contact from any facing, while walls still block them.
- Dead creatures never leave invisible collision.
- Auto Harvest continues during danger.
- No auto-attack exists.
- One swing can hit resource + creature.
- Manual swing harvests while Auto Harvest is OFF.
- Tap = one swing, hold = repeated cadence, swipe = dodge only.
- Creatures no longer all instantly aggro identically.
- Aggressive, territorial, defensive, and skittish behaviors are testable.
- At least one Wildkin-vs-Wildkin interaction occurs without player initiation.
- Creatures respect home/leash and simple steering reduces obvious obstacle-sticking.
- XP reads as large blue/cyan essence.
- movement/traversal/harvest/combat/death/restart regressions remain good.
- `npm test`, `npm run verify`, `npm run zip` pass.
- offline package remains <35 MB.
- BUILD_LOG updated.

## 18. Required human tests

Agent final response must give setup/action/expected/failure signs for:

1. Spitter shot while player faces toward/away/left/right.
2. Spitter shot into a solid wall.
3. Kill creature and walk through its former body position.
4. Auto Harvest beside a resource while being attacked.
5. Same Field Tool swing hitting resource + creature.
6. Hostile nearby with no resource: confirm no auto-attack.
7. Auto Harvest OFF + manual resource swing.
8. Separate tap, long hold, and swipe gestures on phone.
9. Aggressive creature behavior.
10. Territorial warning → intrusion → attack behavior.
11. Defensive creature ignored until hit → retaliation.
12. Skittish flee behavior.
13. Wildkin-vs-Wildkin interaction without player attack.
14. Wildlife-only kill does not give free XP; player-participation kill does.
15. Lure creature from home and confirm leash/return.
16. Put engaged/fleeing creature opposite a large obstacle and observe simple steering.
17. Kill player-participating creature and confirm XP is large blue/cyan/glowy.
18. Use handedness diagnostic only after other tests; judge anatomical local right/left, not raw screen side.
19. Five-minute free play: harvest during danger, hold attack, dodge, provoke different temperaments, watch wildlife.

Ask the human to record:
- Does harvesting during danger feel better than Phase 3 suppression?
- Is hold-to-attack comfortable?
- Are temperaments understandable without labels?
- Do wildlife interactions make the frontier feel more alive?
- Are creatures still getting stuck enough to justify future pathfinding?
- Does unified swing cause annoying accidental hits?
- Strongest improvement?
- Weakest remaining combat/wildlife issue?

## 19. Explicit non-goals

Do not implement:
- player ranged weapon,
- equipment/loadout,
- skill tree,
- capture/bonding,
- companion,
- extraction/banking,
- persistence,
- waystones,
- base building,
- Matter Resonator,
- world editor,
- world.json migration,
- real frontier expansion,
- A*,
- navmesh,
- procedural world generation,
- final creature roster/art,
- new physics engine.

## 20. Implementation order / stop condition

1. Projectile hit fix.
2. Dead collider fix.
3. Unified Field Tool impact.
4. Remove combat suppression of Auto Harvest.
5. Tap/hold/swipe.
6. Manual harvesting with Auto Harvest OFF.
7. Temperament/perception.
8. Wildkin-vs-Wildkin targeting/damage.
9. Home/roam/leash.
10. Simple steering/separation.
11. Blue XP essence.
12. Handedness diagnostic/verification only.
13. Tests/performance/build/docs.
14. Stop.

Do not begin Phase 3.5.
