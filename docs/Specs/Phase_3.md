# Wildkin Frontier — Phase 3: Combat, Wild Creatures & Death

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 3  
**Player-visible goal:** The frontier becomes dangerous. The player can intentionally attack hostile wild creatures, read and dodge telegraphed attacks, take damage and knockback, defeat enemies for temporary XP, die, and restart quickly.

This phase should answer:

> **Is combat understandable, fair, and satisfying enough that fighting creates real danger without making the player wish they could simply avoid the system?**

Phase 3 is a combat/death slice, not the complete expedition loop. Do not add extraction, banking, persistent skills, Wildkin capture, companions, or base progression.

---

## 1. Source Design Intent

The GDD establishes:

- Survival & Resource Management, run-based wilderness expeditions.
- Player agency over rails.
- Satisfying movement, harvesting, combat, pickups, capture, and companions before meta-progression.
- Danger should primarily be spatial: pushing farther from safety means stronger/more complex enemies.
- Combat should minimize tiny precision targets.
- Exact combat input was intentionally left open until prototyping.
- Phase 3 requires:
  - one simple combat input model,
  - 1–2 hostile wild creature behaviors,
  - health / damage / knockback,
  - creature drops / XP,
  - death state,
  - fast restart,
  - spatial difficulty gradient.
- Human test:
  - Can combat be understood without instructions?
  - Does danger feel fair?
  - Is dying/restarting quick enough to invite one more run?

---

## 2. Locked Phase 3 Combat Input

Use a **manual attack + forgiving melee targeting** model.

Do not use full auto-combat.

### Mobile

The existing right-side action region becomes:

```text
TAP   = ATTACK
SWIPE = DODGE
```

Rules:

- A right-side gesture that crosses the existing dodge distance/velocity requirements is a dodge and must **not** also attack.
- A right-side tap/release that does not qualify as a dodge creates one attack request.
- No hold-to-repeat is required in Phase 3. Human playtesting can decide later whether repeated tapping is tiring.
- Keep the left floating joystick unchanged.

Add a subtle player-facing hint/control so the input is discoverable:

```text
Tap: attack
Swipe: dodge
```

Do not add several small combat buttons.

### Desktop

Recommended:

```text
WASD / arrows = movement
Shift         = run
C             = sneak
Left click    = attack
F             = attack keyboard fallback
Space         = dodge
```

### Input architecture

Extend merged intent with explicit one-frame events such as:

```js
attackRequested
dodgeRequested
```

Combat code must not read DOM/input state directly.

---

## 3. Starter Weapon — Field Tool

The existing oversized Field Tool is also the Phase 3 starter melee weapon.

Do not add weapon inventory, swords, guns, weapon swapping, or equipment UI.

The Field Tool now has two explicit use profiles:

```text
HARVEST SWING
COMBAT SWING
```

There must be **one authoritative owner of Field Tool visual transforms**.

Do not let harvesting and combat modules both write the same pivot hierarchy.

Refactor only as needed so gameplay systems can request a swing profile and receive one deterministic impact event.

Combat has priority over harvesting.

---

## 4. Combat Swing

Combat uses a faster, aggressive version of the accepted wide right-to-left Field Tool sweep.

Starting tuning:

```text
attackDuration:       ~0.42–0.50 sec
attackImpactTime:     ~0.42–0.50 normalized
attackCooldown:       ~0.10–0.18 sec after recovery
attackRange:          ~1.65–1.85 units
attackArcDegrees:     ~150–170°
maxTargetsPerAttack:  3
baseDamage:           1
```

The attack:
- begins from the player's right side,
- sweeps right → left across the player's front,
- has a synchronized whoosh,
- applies damage exactly once at impact,
- shows a visible trail,
- does not damage harvestables.

Attack detection uses player facing.

Use true 3D distance or XZ distance plus a strict vertical tolerance. A player on a platform must not hit an enemy far below simply because X/Z overlaps.

---

## 5. Movement During Attack

Do not root the player completely.

During active combat swing:
- movement remains possible,
- cap locomotion to roughly **60–70% of normal current band speed**,
- do not allow sprint-speed attack skating,
- facing is briefly committed around the impact portion.

After recovery, normal movement/facing resumes immediately.

Dodge may cancel an attack if dodge input occurs before impact.

Do not modify Rapier collision ownership.

---

## 6. Forgiving Attack Readability

When a living hostile is inside the player's actual current attack range + frontal arc, display a subtle **orange/red ground focus ring** beneath it.

Meaning:

> **If you attack now, this creature will be hit.**

If multiple enemies will be hit, each may show the ring.

Requirements:
- exact same range/arc logic as damage,
- no ring for vertically invalid targets,
- no tiny crosshair,
- no forced camera rotation,
- no 180° auto-turn toward enemies.

The player's movement/facing remains meaningful.

---

## 7. Combat vs Harvesting

Use the Phase 2 separation between player preference and gameplay permission.

When combat is actively engaged:
- suppress actual auto-harvesting,
- suppress harvest swings,
- hide harvest halos if they create visual confusion,
- preserve the player's Auto Harvest ON/OFF preference.

Combat is engaged when:
- a hostile has aggroed the player within combat range,
- the player attacked recently,
- the player took enemy damage recently.

Suggested:

```text
combatDisengageDelay: ~1.5–2.5 sec
```

After combat ends, harvesting becomes available automatically if the player's preference is ON.

If attack is requested during a harvest swing, combat takes priority and safely cancels/recoveries the harvest swing.

---

## 8. Player Health

Use a small integer model:

```text
maxHealth: 5
```

Basic enemy attacks deal:

```text
1 health
```

Add a compact 5-pip/heart HUD, safe-area aware.

No armor/resistance/stat panel yet.

---

## 9. Player Damage Feedback

On valid damage:
- decrement health once,
- brief player flash,
- short screen-edge red pulse/vignette,
- impact sound,
- lightweight particles,
- knockback away from source,
- temporary post-hit invulnerability.

Starting:

```text
postHitInvulnerability: ~0.60–0.75 sec
playerKnockbackDistance: ~0.7–1.1 units
playerKnockbackDuration: ~0.15–0.25 sec
```

Player knockback remains kinematic and collision-aware through Rapier.

Do not turn the player into a dynamic body.

---

## 10. Dodge Gains Combat Meaning

Preserve existing dodge movement unless integration requires a tiny correction.

Add:

```text
dodgeInvulnerability: ~0.18–0.26 sec
```

Enemy melee/projectile hit resolution checks this window.

No stamina, charges, or cooldown redesign.

---

## 11. Hostile Archetypes

Use exactly two placeholder hostile archetypes:

```text
RUSHER
SPITTER
```

Do not finalize Wildkin species/capture identities yet.

Shared simple states may include:

```text
ROAM
ALERT
CHASE / REPOSITION
WINDUP
ATTACK
RECOVER
HURT
DEAD
RESPAWNING
```

Prefer explicit state logic, not a generic behavior-tree framework.

---

## 12. Rusher

Purpose: close-range threat, readable windup, dodge timing, melee test.

Visual:
- compact low-poly creature,
- low/broad silhouette,
- warm red/orange accents,
- obvious front direction.

Starting stats:

```text
health:             3
aggroRadius:        ~5.0–6.0
moveSpeed:          ~2.2–2.8
attackRange:        ~1.1–1.3
windup:             ~0.45–0.60 sec
lungeDuration:      ~0.20–0.30 sec
recover:            ~0.55–0.75 sec
damage:             1
```

Behavior:

```text
ROAM
→ ALERT
→ CHASE
→ WINDUP
→ committed LUNGE
→ RECOVER
→ CHASE
```

Telegraph:
- stop,
- squash/compress,
- warning color/pulse,
- optional small ground indicator,
- distinct sound.

Commit lunge direction near end of windup so a dodge can work.

Do not continuously home through the full lunge.

---

## 13. Spitter

Purpose: ranged spatial pressure.

Visual:
- clearly different silhouette,
- cool purple/teal,
- bright projectile.

Starting stats:

```text
health:             2
aggroRadius:        ~6.0–7.0
preferredDistance:  ~3.5–4.5
moveSpeed:          ~1.7–2.1
windup:             ~0.55–0.75 sec
shotCooldown:       ~1.4–1.9 sec
projectileSpeed:    ~3.8–4.8
projectileLifetime: ~3 sec
damage:             1
```

Behavior:
- roam,
- aggro,
- maintain approximate preferred distance,
- clearly charge,
- fire one slow visible projectile toward the player at release,
- recover/reposition.

Projectile:
- large/readable on phone,
- pooled,
- collision-aware with solid world,
- damages once,
- disappears on player/world hit or timeout.

No hitscan or advanced prediction.

---

## 14. Enemy Movement & Rapier

Do not build navmesh/pathfinding.

Hostiles should not casually pass through major boxes, platforms, trees, or boundaries.

Preferred:
- simple Rapier kinematic creature body + basic collider,
- lightweight collision-resolved movement,
- one small character controller per creature is acceptable because enemy count is low if that is the cleanest approach,
- otherwise use simple shape-cast/collision movement.

Do not use fully dynamic enemy rigid bodies.

Recommended:
- creatures collide with world,
- creatures do not need to physically push the player,
- creature-vs-creature physical collision may be disabled if it creates jitter.

Combat hits remain explicit gameplay checks.

---

## 15. Enemy Hit Feedback

When Field Tool hits a creature:
- damage once per attack,
- flash,
- squash/recoil,
- knockback away from player,
- distinct sound,
- particle burst.

Starting:

```text
enemyKnockbackDistance: ~0.5–0.9
enemyHurtLock:          ~0.12–0.22 sec
```

Enemy knockback respects major world collision.

No ragdoll/status effects.

---

## 16. Enemy Death

At zero health:
- immediately stop attacks/damage,
- clear target ring,
- short defeat animation/pop,
- death sound,
- particles,
- increment run kill count,
- spawn temporary XP reward,
- remove/disable live collision.

Enemy may respawn later for repeated Phase 3 testing.

---

## 17. Temporary XP Reward

Use **XP/essence motes** as the only Phase 3 creature drop.

Suggested:

```text
Rusher:  2–3 XP
Spitter: 3–4 XP
```

Motes:
- pooled/shared geometry,
- pop visibly from enemy,
- after brief delay magnetize,
- collection increments temporary run XP,
- distinct pleasant sound.

Add compact:

```text
XP 12
```

HUD.

XP is **run-only**.

Do not persist XP, award skill points, open skill tree, or decide failed-run XP retention.

---

## 18. Creature Respawn for Testing

Suggested:

```text
enemyRespawnSeconds: ~8–12 sec
```

Respawn:
- authored spawn point,
- not while player occupies the spawn,
- short materialization/pop,
- full health,
- reset AI.

This is prototype test behavior.

---

## 19. Spatial Difficulty Gradient

Danger must increase spatially, not through waves/timers.

Use three bands:

### Near Spawn
- breathing room,
- harvesting remains easy to test,
- no immediate spawn attack,
- one weak Rusher visible nearby.

### Mid Frontier
- 1–2 Rushers,
- threats overlap useful resource routes.

### Outer / Deeper Area
- introduce Spitter,
- optionally a slightly tougher Rusher,
- encounters may combine two threats.

If using stat tiers, keep them modest:

```text
deep health: +1 max
deep speed:  +0–10%
```

Behavior combinations should create most of the added difficulty.

---

## 20. Enemy Population

Recommended active map population:

```text
Rushers:  2–3
Spitters: 1–2
Total:    ~4–5
```

No waves, hordes, procedural spawning, or survival timer.

---

## 21. Death State

At zero player health:

1. Disable movement/attack/dodge input.
2. Stop further player damage.
3. Quick visible death response.
4. Stop/safely pause hostile attacks.
5. Show:

```text
EXPEDITION LOST

Enemies defeated: X
XP collected: Y
Resources carried: ...
```

6. Large:

```text
TRY AGAIN
```

button.

Target:
- overlay within ~0.5 sec,
- obvious restart,
- no long animation.

---

## 22. Fast Restart

On Try Again reset:

- player spawn/facing,
- health,
- combat timers/i-frames,
- movement/traversal state as needed,
- enemies/AI/health/positions,
- projectiles,
- temporary XP,
- kill count,
- loose XP motes,
- temporary harvested resource inventory,
- resource nodes to a sensible fresh state if needed.

Resetting temporary resource inventory is acceptable because it is expedition cargo and banking does not exist yet.

Preserve:
- player Auto Harvest preference,
- debug preferences where appropriate.

Do not implement banked resources or extraction.

---

## 23. Combat Engagement Signal

Create one clear signal such as:

```text
combatEngaged
```

Owned by combat/session logic, not `main.js`.

Use it for:
- harvesting suppression,
- future combat UI/audio extension.

It is derived from hostile/attack/damage activity, not a permanent player toggle.

---

## 24. Field Tool Ownership

Do not allow:

```text
harvest system -> writes tool transforms
combat system  -> writes tool transforms
```

in parallel.

Evolve the Field Tool into one visual controller with an API conceptually like:

```js
fieldTool.requestHarvestSwing(...)
fieldTool.requestCombatSwing(...)
fieldTool.update(...)
fieldTool.isBusy()
```

or equivalent.

Priority:

```text
DODGE / DEATH
> COMBAT
> HARVEST
> IDLE
```

Do not build a general animation framework.

---

## 25. Suggested Modules

Exact names may differ:

```text
src/combat/
  combatConfig.js
  playerCombat.js
  combatTargeting.js
  projectileSystem.js
  xpMoteSystem.js
  combatSession.js

src/creatures/
  creatureConfig.js
  createWildCreature.js
  creatureSystem.js
  creatureAI.js

src/ui/
  combatHud.js
  deathOverlay.js
```

Existing ownership:
- `playerController` = movement,
- Rapier = collision,
- `fieldTool` = tool visuals,
- resources = harvesting,
- inventory = resource inventory.

Do not turn `playerController.js` or `main.js` into combat god objects.

---

## 26. Fixed-Step Ownership

Preserve:
- one permanent requestAnimationFrame,
- existing fixed 1/60 gameplay/physics step.

Fixed-step combat logic should include:
- attack cadence/impact,
- AI states,
- damage i-frames,
- projectiles,
- death,
- respawns.

Avoid `setTimeout` for gameplay state.

---

## 27. Performance Guardrails

- Shared creature geometry/materials where practical.
- Pool projectiles.
- Pool XP motes.
- Pool repeated combat effects where practical.
- No unbounded arrays.
- No pathfinding.
- No ragdolls.
- No per-enemy rAF.
- No per-frame DOM creation.
- Keep active enemies around 5.
- Preserve Phase 2 pooling stability.

---

## 28. Configuration

Centralize:

```text
playerMaxHealth
postHitInvulnerability
dodgeInvulnerability
playerKnockback

attackDuration
attackImpactTime
attackCooldown
attackRange
attackArc
maxTargetsPerAttack
playerDamage

Rusher:
health
aggroRadius
speed
attackRange
windup
lunge
recover
damage
respawn

Spitter:
health
aggroRadius
preferredDistance
speed
windup
projectileSpeed
projectileRadius
projectileLifetime
cooldown
damage
respawn

combatDisengageDelay
XP rewards
```

No scattered combat magic numbers.

---

## 29. Tests

Preserve all existing movement/harvesting/Rapier tests.

Add focused tests:

### Input
- right-side tap = attack,
- qualifying swipe = dodge and NOT attack,
- desktop click/F = attack.

### Targeting
- front/in-range enemy eligible,
- enemy behind not eligible,
- vertical separation invalid,
- target cap/nearest ordering deterministic,
- dead enemy excluded.

### Attack
- one impact per attack,
- one enemy damaged at most once per swing,
- cooldown respected,
- dodge cancel if implemented.

### Player health
- damage once,
- post-hit i-frame works,
- damage resumes afterward,
- zero health enters death once.

### Dodge
- valid dodge i-frame blocks combat hit,
- outside window damages normally.

### Rusher
- aggro → chase → windup → lunge → recover,
- lunge damage once,
- lunge direction committed.

### Spitter
- one projectile per windup,
- damages once,
- expires correctly,
- pool bounded.

### XP
- enemy death creates reward,
- collection once,
- XP increments once,
- pool bounded.

### Harvest suppression
- combat engaged prevents actual auto-harvest,
- Auto Harvest preference unchanged,
- harvesting returns after disengage.

### Restart
- health/XP/kills/enemies/projectiles/motes/temp inventory reset,
- Auto Harvest preference preserved.

---

## 30. Acceptance Criteria

### Input
- Mobile tap attacks.
- Mobile swipe dodges without accidental attack.
- Desktop attack works.
- Attack is readable and forgiving.

### Combat clarity
- Enemy ring means "will be hit."
- Windups are visible before damage.
- Rusher and Spitter feel distinct.

### Damage
- Health readable.
- Attacks damage once.
- Knockback is collision-aware.
- Post-hit i-frames prevent multi-frame deletion.
- Dodge genuinely avoids attacks.

### Enemy feel
- Hits have visible/audio response.
- Death is unmistakable.
- Enemy collision does not break traversal.

### Rewards
- XP motes enjoyable/readable.
- Temporary XP works.
- No persistent progression yet.

### Combat/harvest coexistence
- Combat suppresses harvesting.
- Auto Harvest preference stays intact.
- Harvest resumes naturally afterward.

### Death/restart
- Clear failure at zero health.
- Death overlay quick.
- Try Again obvious.
- Clean restart quick.

### Spatial danger
- Spawn safer.
- Outer map more dangerous through behavior/combination.
- No wave timer.

### Regression
- movement/facing release accepted,
- jump/fall/dodge/climb/mantle accepted,
- harvesting works outside combat,
- resource pickups/inventory/respawn work,
- performance remains stable,
- one rAF retained.

### Build
- `npm test` PASS,
- `npm run verify` PASS,
- `npm run zip` PASS,
- offline/self-contained,
- ZIP <35 MB,
- BUILD_LOG updated.

---

## 31. Required Human Playtest Instructions

Agent final response must give descriptive player-facing tests with setup/action/expected/failure signs.

At minimum:

### A. Discover attack
Approach first hostile. On phone tap right side once. Expected: one obvious Field Tool combat swing. Desktop left-click/F equivalent.

### B. Tap vs swipe
Alternate taps and directional swipes. Expected: tap attacks; swipe dodges; never both.

### C. Attack direction
Put enemy in front and one behind. Attack. Expected: broad frontal hit, no invisible 360° damage.

### D. Vertical combat
Test from elevated area if possible. Expected: no melee hitting far below/above.

### E. Rusher fairness
Let Rusher attack repeatedly. Expected: readable windup, committed lunge, dodge can avoid it.

### F. Spitter fairness
Fight Spitter in open area and near wall. Expected: readable charge, visible dodgeable projectile, wall blocks projectile.

### G. Player damage
Take one hit. Expected: exactly one health lost, visible/audio feedback, knockback, brief i-frame.

### H. Enemy hit feel
Hit enemies repeatedly. Expected: swing/impact/flash/recoil/sound/particles synchronized.

### I. XP reward
Kill creature and collect motes. Expected: motes pop/magnetize, XP increments once.

### J. Combat suppresses harvesting
Fight next to harvestable with Auto Harvest ON. Expected: combat tool attacks only enemies; harvesting resumes after danger ends without toggle changing.

### K. Spatial danger
Travel from spawn outward. Expected: early breathing room, deeper combined threats.

### L. Death
Intentionally die. Expected: quick clear EXPEDITION LOST state, no continued hidden damage.

### M. Restart
Press TRY AGAIN. Expected: quick clean reset with full health, enemies reset, temporary run counters/cargo reset, immediate controls.

### N. Regression
Re-test run/facing release, jump/fall, dodge, ladder/mantle, harvesting, elevated resource targeting, drops/inventory, Auto Harvest.

### O. Is combat fun?
Fight 3–5 minutes and record:
- Is tapping satisfying or tiring?
- Attack arc too broad/narrow?
- Movement + attack fluid?
- Dodge timing fair?
- Which enemy is more fun?
- Any confusing/unavoidable damage?
- Combat/harvest conflicts?
- Does death invite immediate retry?
- Single weakest combat element?
- Single strongest combat element?

---

## 32. Explicit Non-Goals

Do not add:

- Wildkin capture/bonding,
- companions,
- secured Wildkin,
- extraction/banking,
- base progression,
- persistent XP,
- skill tree,
- equipment/loadout UI,
- weapon inventory,
- ranged player weapon,
- combos,
- charged attacks,
- stamina/mana,
- armor/status effects,
- consumables/healing,
- boss,
- procedural waves,
- navmesh/pathfinding,
- dozens of enemies,
- final creature art,
- Phase 4 systems.

---

## 33. Implementation Priority / Stop Condition

Implement in this order:

1. Attack input: tap vs swipe + desktop.
2. One authoritative Field Tool combat swing + impact event.
3. Attack targeting/range/arc + target rings.
4. Player health/damage/i-frames/knockback.
5. Rusher end-to-end.
6. Dodge invulnerability.
7. Spitter + pooled projectile.
8. Enemy hit/death feedback.
9. XP reward + temporary XP HUD.
10. Combat engagement → harvest suppression.
11. Spatial placements/difficulty gradient.
12. Death overlay + fast restart.
13. Tests/performance/build/docs.

Do not start Phase 4.

If Spitter threatens the stability of the first complete combat loop, finish and validate a strong Rusher first, then add Spitter. Target Phase 3 completion remains both behaviors unless there is a real blocker.

At completion report:
- combat input model,
- Field Tool combat behavior,
- attack range/arc/timing,
- health/i-frame/dodge rules,
- Rusher tuning,
- Spitter tuning,
- enemy collision/movement approach,
- XP behavior,
- combat/harvesting suppression,
- death/restart behavior,
- spatial danger placements,
- automated checks,
- submission size,
- detailed manual tests,
- BUILD_LOG confirmation.
