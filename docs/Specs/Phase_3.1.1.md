# Wildkin Frontier — Phase 3.1.1: Combat & Ecology Validation Fixes

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 3.1.1  
**Purpose:** Fix the concrete failures discovered during the Phase 3.1 human playtest so the existing combat/ecology systems can actually be evaluated.

This is a **validation/fix slice**, not a feature expansion.

Do not start Phase 3.5.

---

## 1. Player-visible goal

After this pass, the player should be able to:

- reliably find and test each temperament,
- get attacked by the intended aggressive/territorial/defensive creatures,
- see skittish creatures flee correctly,
- observe at least one Wildkin-vs-Wildkin interaction,
- trust Field Tool cadence,
- collect XP that behaves like physical drops before magnetizing,
- see the Field Tool in the character's actual anatomical right hand, swinging right-to-left from the character's perspective.

The core question is:

> **Can the Phase 3.1 ecology/combat system now be tested fairly, without map-placement bugs or cross-system timing defects obscuring the design?**

---

# 2. Hard scope

Fix only:

1. invalid creature spawn placement,
2. human-readable temperament test identification,
3. defensive/skittish reaction to player damage,
4. steering probe target exclusion,
5. Field Tool shared cadence exploit,
6. XP collision + XP core shape,
7. anatomical Field Tool handedness/swing,
8. exact regression/integration coverage for the above.

Do **not** add:
- A*,
- navmesh,
- new creature archetypes,
- new weapons,
- capture,
- companions,
- real frontier/world expansion,
- world editor,
- world.json migration,
- extraction,
- persistence,
- skill tree,
- Phase 3.5 refactor.

---

# 3. Fix authored creature spawn clearance

Human playtest could not evaluate combat because multiple authored creatures spawn inside the brown traversal platforms.

Before changing AI, fix the test environment.

## Required

For every entry in `CREATURE_SPAWNS`:

- verify the creature capsule can exist at its authored home position without overlapping:
  - platform volumes,
  - diagnostic boxes,
  - world boundary collision,
  - solid resource colliders,
  - another creature's spawn capsule.

Move the current test spawns onto obvious clear walkable ground.

Do not change their intended temperament coverage.

The test map should contain at least:

- one clearly accessible AGGRESSIVE creature,
- one clearly accessible TERRITORIAL creature,
- one clearly accessible DEFENSIVE creature,
- one clearly accessible SKITTISH creature,
- one accessible aggressive-vs-skittish Wildkin interaction.

The player must have breathing room at spawn.

## Regression test

Add a pure or integration test that validates every authored creature spawn against the current playground geometry with creature radius expansion.

The test should fail if a future spawn is placed inside a platform/obstacle.

Do not rely only on coordinates in comments.

---

# 4. Add debug-only temperament readability

The prototype currently reuses identical Rusher/Spitter visuals across different temperaments, making human playtesting ambiguous.

Add a **debug-only** temperament marker.

Acceptable:

```text
A = Aggressive
T = Territorial
D = Defensive
S = Skittish
```

Preferred presentation:
- small floating letter above creature, OR
- small ground/debug marker near creature.

Requirements:

- visible enough on phone for testing,
- hidden when normal debug UI is disabled,
- not treated as final-game UI,
- does not affect collision/targeting.

Do not redesign final creature art.

---

# 5. Fix player → Defensive retaliation

Current runtime records player participation for XP but does not consistently set Defensive retaliation state when the player is the attacker.

This must be fixed.

When **any living actor** damages a Defensive creature:

```text
attacker = player OR Wildkin
        ↓
record attacker identity
        ↓
set bounded retaliation target
        ↓
after HURT lock
        ↓
ALERT / CHASE / attack attacker
```

For the player:

- `retaliationTargetId = "player"` or equivalent,
- retaliation timer starts,
- after HURT recovery the creature should visibly engage the player,
- if player escapes beyond leash / retaliation expires, creature returns home.

Do not tie player participation tracking and temperament reaction into mutually exclusive branches.

They are separate concerns.

## Required tests

- player hit → Defensive retaliates,
- Wildkin hit → Defensive retaliates,
- no hit → Defensive ignores,
- retaliation expires,
- dead attacker invalidates retaliation.

---

# 6. Fix player → Skittish reaction

Player damage should also trigger the intended skittish response.

When the player hits a Skittish creature:

- mark player participation for XP,
- set player as flee threat,
- enter/continue urgent flee state,
- use post-hit flee duration/speed,
- do not retaliate.

This should work exactly as Wildkin-caused damage does.

## Required tests

- approaching player causes normal flee,
- player hit causes urgent flee,
- Wildkin hit causes urgent flee,
- no transition to CHASE/WINDUP.

---

# 7. Steering probes must not treat current actor target as world obstacle

Creature steering uses Rapier world probes.

The probe should avoid static world geometry, but a creature pursuing the player or another Wildkin should not decide:

> "my target's collider is a wall I need to route around"

## Required behavior

When steering toward an actor:

- exclude the moving creature's own collider,
- exclude the current intended actor target collider from obstacle probes,
- continue excluding other actor colliders if that remains consistent with the current lightweight steering design.

Static world collision must still block.

For fleeing:
- the threat actor should also not be treated as static world geometry.

Do not remove actual movement collision resolution.

This is only for **steering probes / route choice**.

## Test

Set a clear straight-line actor target within attack approach distance.

Expected:
- direct steering remains direct,
- creature can close into attack range,
- target capsule does not trigger false left/right routing.

---

# 8. Shared Field Tool cadence — no auto-harvest + manual speed exploit

Human playtest found that Auto Harvest plus manual tapping can produce impacts faster than the physical Field Tool's intended cadence.

This must be fixed.

## Locked rule

There is one physical tool and therefore one shared action cadence.

Auto-harvest initiation and manual attack initiation do not own independent effective attack speeds.

### Before impact

If an auto-harvest swing is still in windup and the player manually attacks:

- manual intent may take priority,
- the pre-impact auto-harvest swing may be converted/cancelled into the manual combat swing if that preserves responsiveness.

### After impact

Once **any** Field Tool swing has fired its impact:

- that swing must complete its valid recovery,
- manual input cannot cancel it into another immediate damaging/harvesting impact,
- no second impact may occur sooner than the intended shared tool cadence.

### Input buffering

At most **one** pending manual attack may be remembered while the tool is unavailable.

For held input:
- do not accumulate a queue,
- next attack starts only when the tool is genuinely ready,
- release clears pending held repetition.

For taps:
- one late tap may buffer one next swing,
- repeated tapping during recovery must not stack multiple queued attacks.

## Central authority

Prefer a single readiness concept such as:

```text
fieldTool.isReadyForSwing()
```

or equivalent.

Avoid separate timers that allow harvest and combat to bypass one another.

## Required timing test

Simulate:

```text
auto harvest starts
→ impact
→ tap immediately
```

Assert next impact cannot happen before the shared allowed cadence.

Also test:
- hold respects cadence,
- tap spam respects cadence,
- pre-impact manual takeover remains responsive,
- release stops held repeat.

---

# 9. XP motes — collision-aware pop/rest, guaranteed magnet

Phase 3.1 XP essence improved readability but currently passes through solid terrain.

Match the robust reward philosophy already used for harvest pickups.

## XP state rules

```text
POP / THROW
    = collision-aware

REST
    = valid resting position

MAGNETIZING
    = may ignore world collision and guarantee collection
```

## POP

During ballistic pop:

- use radius-aware collision against static world,
- do not pass through brown platforms, boxes, terrain, or solid obstacles,
- resolve/stop/bounce minimally using the simplest stable behavior.

No elaborate physics simulation is required.

A simple:
- sweep,
- place at valid contact,
- damp/stop,
is enough.

## REST

Resting XP should not end up:
- inside a box,
- below a platform,
- inside solid collision.

If a bad resting point is detected, move to the last clear position or a small nearby clear offset.

## MAGNETIZING

Once magnet begins:

- ignore world obstruction if necessary,
- guarantee reward reaches player,
- do not get stuck behind geometry.

This is intentionally the same design principle used for robust harvest rewards.

---

# 10. XP visual shape refinement

Keep:
- cyan/blue identity,
- emissive/glowy appearance,
- large readable size,
- soft halo,
- pooling.

Change the core from a generic smooth sphere into a more recognizable **faceted essence/crystal**.

Preferred:
- low-poly icosahedron or octahedral/faceted crystal,
- slightly vertically stretched,
- slow rotation,
- cyan emissive core,
- soft spherical halo remains.

Do not make it read like gold/currency.

Do not add dynamic point lights.

---

# 11. Correct anatomical Field Tool handedness

The previous diagnostic encoded the wrong assumption.

The player visual explicitly uses:

```text
+Z = forward
```

Human visual testing shows that the existing `+X` hand anchor is the character's **left** side.

For this player basis, treat anatomical right as the visually verified side.

## Acceptance orientation

Use **player facing away from the camera** as the primary human test.

When facing away:

```text
viewer and character share left/right orientation

CHARACTER RIGHT side:
tool must be visibly attached here
```

The swing must travel:

```text
CHARACTER RIGHT-FRONT
        ↓
across CHARACTER FRONT
        ↓
CHARACTER LEFT-FRONT
```

When the player turns to face the camera, the screen-space result should naturally mirror:

- anatomical right appears viewer-left,
- character right→left appears viewer-left→viewer-right.

That is correct.

## Implementation

Mirror the current primitive rig deliberately rather than guessing.

Likely changes include:
- hand anchor X sign,
- shoulder/arm attachment X sign,
- swing start/follow yaw signs,
- any trail math that assumes the old side.

Do not modify gameplay attack arc because of visual mirroring.

## Diagnostic

Replace the previous circular:

```text
+x means right because we named it right
```

diagnostic.

The new diagnostic should describe the **actual chosen anatomical basis** and sample the tool head relative to it.

Human visual acceptance overrides numeric comments.

---

# 12. Do not redesign the AI yet

Once spawn placement and reaction bugs are fixed, test the existing temperament design before tuning it further.

Do not:
- increase AI complexity,
- add new states unless necessary for a bug,
- add A*,
- add navmesh,
- expand the map.

This pass exists to make the existing system observable.

---

# 13. Architecture guardrails

Phase 3.5 is coming next.

Do not make current architecture debt worse.

In particular:

- do not add more large logic blocks to `main.js`,
- keep spawn validation in a focused helper/test,
- keep temperament reaction logic centralized,
- keep Field Tool cadence owned by the Field Tool / interaction layer,
- keep XP movement rules inside XP system or shared pickup collision helper,
- do not create another global timer system,
- preserve one rAF and fixed-step loop.

Small refactors required to fix ownership are allowed.

Large architecture migration is not.

---

# 14. Required automated integration/regression tests

Add tests that exercise actual runtime paths where practical, not only pure helpers.

Required coverage:

### Spawn validity
- every authored creature spawn is clear of expanded platform/obstacle geometry,
- intended ecology interaction spawns are mutually reachable in open ground.

### Defensive
- player attack sets retaliation target,
- enters retaliation behavior after HURT,
- Wildkin attack also works,
- expires/leashes.

### Skittish
- player attack sets flee target/urgent flee,
- Wildkin attack does same,
- never attacks due to being hit.

### Steering
- current actor target collider does not make direct route appear blocked,
- static box still does.

### Field Tool cadence
- post-impact manual tap cannot create early second impact,
- auto + tap cannot exceed shared cadence,
- hold cannot exceed cadence,
- no unbounded buffering,
- one buffered tap maximum if implemented,
- pre-impact takeover still valid.

### XP
- pop cannot cross solid box/platform,
- resting state not inside solid collision,
- magnet may cross obstruction to guarantee collection,
- pool remains bounded,
- once-only XP count.

### Handedness
Prefer a small structural test plus required human visual test:
- mirrored anchor/hierarchy uses intended anatomical side,
- do not pretend this alone proves visual correctness.

Preserve all previous tests.

---

# 15. Required human playtest

The agent final response must give recognizable human-facing instructions.

At minimum:

## A. Temperament map readability
With debug markers ON:
- identify A / T / D / S without coordinates,
- confirm all four are standing on clear walkable ground.

Failure:
- any creature starts inside brown/grey geometry.

## B. Aggressive combat
Approach the clearly marked A creature without hitting it.

Expected:
- it can physically reach and attack the player.

Failure:
- stuck in geometry,
- endlessly routes around player,
- never enters attack.

## C. Territorial
Approach marked T.

Expected:
- notice/warn first,
- entering/remaining in personal territory causes attack,
- it can physically reach player.

## D. Defensive
Approach marked D.

Expected:
- ignores player initially.

Hit once.

Expected:
- HURT feedback,
- then retaliates against player.

Failure:
- continues wandering as though nothing happened.

## E. Skittish
Approach marked S.

Expected:
- moves away.

Hit it.

Expected:
- flees more urgently.

Failure:
- ignores hit or attacks player.

## F. Wildkin-vs-Wildkin
Observe marked aggressive and intended prey/skittish pair.

Expected:
- one creature can chase/attack/flee without player intervention,
- both are on reachable clear ground.

## G. Leash
Use the aggressive or territorial creature.

Lead it away from its marked/home area while staying targetable.

Expected:
- after traveling beyond its allowed home radius, it abandons pursuit,
- visibly returns toward its home area,
- resumes normal behavior near home.

Explain in the final response which creature is easiest to use for this test.

## H. Steering
Stand opposite a large box from an engaged creature.

Expected:
- it attempts to route around the box,
- when no box is present it approaches directly instead of treating the player as an obstacle.

## I. Auto-harvest + tap cadence
Auto Harvest ON beside a resource.

Let auto swing reach impact, then immediately tap repeatedly.

Expected:
- impacts remain at the intended shared Field Tool cadence,
- no rapid double-hit after harvest impact.

Repeat while holding.

Failure:
- visibly faster damage/harvest than ordinary tool speed.

## J. XP terrain collision
Kill a player-participating creature beside a brown platform/grey box.

Expected:
- blue faceted essence pops out but does not fly through the solid object,
- it finds/rests at valid visible space.

Approach until magnet starts.

Expected:
- magnet may pass through obstruction and is guaranteed to collect.

## K. XP visual
Expected:
- recognizable faceted cyan essence/crystal,
- larger than ordinary pickups,
- glow shell remains,
- does not look like gold or a plain bubble.

## L. Field Tool handedness
Primary test:

1. Face the player **away from the camera**.
2. Do not judge based on labels/debug text first.
3. Look at the character itself.

Expected:
- tool is visibly in the character's RIGHT hand,
- swing begins on character's right-front,
- travels across front,
- ends character-left.

Then face the camera.

Expected:
- screen-space appearance mirrors naturally.

Failure:
- when facing away, tool is still on character-left or swings character-left→right.

---

# 16. Completion gate

Phase 3.1.1 is complete only when:

- all authored test creatures spawn clear,
- aggressive/territorial creatures can physically attack,
- Defensive retaliates against player,
- Skittish urgently flees after player hit,
- Wildkin-vs-Wildkin interaction can be observed,
- leash can be meaningfully tested,
- player collider does not confuse steering probe,
- auto/manual tool interaction obeys one shared cadence,
- XP pop/rest respects world collision,
- XP magnet guarantees reward,
- XP uses faceted cyan essence core,
- dead collider fix remains good,
- Field Tool is visually correct when player faces away,
- previous movement/harvest/combat/death/restart behaviors remain intact,
- one rAF remains,
- `npm test` PASS,
- `npm run verify` PASS,
- `npm run zip` PASS,
- package remains offline and <35 MB,
- BUILD_LOG updated.

---

# 17. Stop condition

Implement in this order:

1. Move/validate creature spawns.
2. Add debug temperament markers.
3. Fix player → Defensive retaliation.
4. Fix player → Skittish flee reaction.
5. Exclude intended actor target from steering probes.
6. Fix shared Field Tool cadence/buffering.
7. Add XP POP/REST collision.
8. Change XP core to faceted cyan essence.
9. Mirror Field Tool anatomical hand/swing.
10. Add exact integration/regression tests.
11. Run test/verify/zip.
12. Update BUILD_LOG.
13. Stop.

Do not begin Phase 3.5.
