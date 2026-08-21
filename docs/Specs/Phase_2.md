# Wildkin Frontier — Phase 2: Satisfying Harvesting Loop

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 2  
**Primary player-visible goal:** The player can explore the current 3D frontier, immediately recognize harvestable resources, move near them to harvest automatically, see/hear every hit, collect physical drops, watch depleted nodes recover, and build a temporary run inventory.

This phase should answer one question:

> **Is gathering satisfying enough that the player enjoys doing it even before combat, progression, extraction, or Wildkin exist?**

Phase 2 is the first implementation of a primary repeatable resource-management action. It should feel physical, readable, fast, and mobile-friendly.

---

## 1. Source Design Intent

The project GDD already establishes:

- Player agency over rails.
- Satisfying moment-to-moment play before meta-progression.
- Compact depth instead of broad shallow systems.
- One-thumb movement should remain possible.
- Harvesting should minimize tiny precision targets.
- Harvested resources will eventually become at-risk expedition cargo.
- Harvesting progression may later modify speed, yield, rare finds, and tool capability.
- Phase 2 calls for 2–3 resource types, contextual/automatic harvesting, timing, drops/pickups, temporary run inventory, respawn/finite placement, and strong audiovisual feedback.

This slice expands those points into a concrete implementation.

---

## 2. Locked Phase 2 Design Decisions

### Harvesting is automatic and proximity-driven

The player does **not** press a dedicated harvest button and does not manually select individual nodes.

When one or more valid harvestables are within harvest range and the player is in a compatible movement state, the Field Tool automatically swings on a fixed cadence.

This preserves one-thumb play and keeps harvesting about movement, positioning, path choice, and resource density rather than tapping tiny targets.

### One Field Tool / omnitool for the prototype

Do not implement axe/pickaxe/shovel inventory switching in Phase 2.

Use one visible procedural **Field Tool** that can harvest all three starter resource types.

Future progression can support:
- overall tool frame/tier upgrades
- swing-speed upgrades
- harvest-range upgrades
- yield/rare-find upgrades
- capability/hardness gating
- optional resource-specific heads/modules such as axe, pick, cutter

The data model may anticipate those concepts, but **no upgrade UI or progression exists in this slice**.

### Multiple nearby nodes can be hit by one swing

A harvest swing should affect multiple valid nodes in range.

Use a configurable safety cap (recommended 3–4 nodes per swing) so dense clusters do not generate excessive effects/drops.

Do not require exact facing/precision targeting for basic resource collection.

### Every successful hit yields immediate value

Do not make the player strike a node several times with nothing happening.

Every successful node hit should:
1. visibly affect the node,
2. produce impact feedback,
3. spawn at least one resource pickup,
4. reduce the node's remaining harvest chunks.

The player should feel rewarded on every swing.

---

## 3. Starter Resource Types

Implement three data-driven resource types.

### A. Tree → Wood

Visual:
- simple low-poly trunk
- several distinct crown/branch/foliage chunks
- obvious stump/base component

Behavior:
- approximately 5 harvest chunks/hits
- each hit removes or visibly breaks one authored visual chunk
- wood pickup pops/lobs from the tree
- final hit transitions to a stump
- stump remains visible during respawn

Feedback:
- woody thunk/chop sound
- warm wood-colored fragments/dust
- stronger final break response

### B. Rock Outcrop → Stone

Visual:
- cluster of several low-poly rock lobes/chunks
- flatter rubble/base component

Behavior:
- approximately 4 harvest chunks/hits
- each hit removes/pops one rock chunk
- stone pickup lobs outward
- final hit leaves low rubble/base

Feedback:
- harder stone clink/crack sound
- small stone chips
- brief impact flash/wobble

### C. Fiber Bush → Fiber

Visual:
- distinct low bush/grass-like plant
- 3–4 leaf/tuft clusters
- small cut stem/root patch

Behavior:
- approximately 3 harvest chunks/hits
- fastest starter node to clear
- each hit removes a tuft/leaf cluster
- fiber pickup lobs outward
- final hit leaves small cut patch

Feedback:
- soft snip/swish sound
- light leaf/fiber particles
- quick springy squash

These values are starting points and must live in resource configuration.

Do not add rare-resource tiers in Phase 2.

---

## 4. Harvestability Readability — Proximity Halo

Use the human-proposed solution:

> **A subtle, slowly pulsing white ground ring appears beneath each harvestable when it is close enough to be affected by the player's next harvest swing.**

Requirements:

- Ring is hidden when the node is outside harvest range.
- Ring fades/pulses in rather than popping harshly.
- Ring is visible from the existing high camera but does not dominate the scene.
- Ring is white/neutral so the resource itself carries type/color identity.
- If multiple nodes are currently valid targets, each receives the ring.
- Depleted nodes do not show the harvestable halo.
- The ring should make it obvious which nodes will be hit without requiring text labels.
- Ring eligibility must match actual harvest eligibility.

Suggested visual:
- thin RingGeometry or equivalent procedural ground mesh
- slight scale breathing, about 0.96 → 1.06
- opacity pulse rather than strong flashing
- about 1.2–1.8 second pulse cycle

---

## 5. Automatic Harvest Eligibility

A node is harvestable when:

- node state is `READY`
- node is within configured harvest radius of the player's authoritative Rapier position
- player is in a compatible state
- node has remaining chunks/yield
- node is not depleted/respawning

Compatible states:

```text
IDLE
SNEAK
WALK
RUN
```

Do not auto-harvest during:

```text
JUMP
FALL
DODGE
CLIMB
MANTLE
```

The player does not need to stop moving.

Running past a node may result in one quick hit if timing/range allows; lingering near it results in repeated swings.

Do not magnetically move or rotate the player toward resources.

---

## 6. Harvest Targeting / Multi-Hit

At each harvest impact event:

1. Query READY nodes within `harvestRadius`.
2. Sort nearest-first for deterministic behavior.
3. Select up to `maxTargetsPerSwing`.
4. Apply exactly one harvest hit to each selected node.

Recommended starting values:

```text
harvestRadius:       ~1.5–1.8 world units
maxTargetsPerSwing:  4
swingInterval:       ~0.48–0.60 sec
impactTime:          ~45–60% through swing animation
```

Do not use screen-space aiming or tiny target raycasts.

Later combat can have different targeting rules.

---

## 7. Field Tool Visual

Give the placeholder player a simple visible procedural harvesting tool.

The tool can be:
- short handle
- chunky multifunction head / energized wedge
- one readable accent/glow

It should look like a frontier device rather than requiring separate axe/pick animations now.

When an eligible target exists:

1. Start a short swing animation.
2. Rotate the tool around a pivot/arc.
3. Trigger the actual resource hit at one explicit impact point in the animation.
4. Recover to idle.
5. Repeat after cadence if targets remain.

Avoid hitting every frame.

If tool attachment becomes disproportionately complex, prioritize a clean visible swing/effect over rig work.

No final animation pipeline in this phase.

---

## 8. Per-Hit Resource Feedback

Every hit combines several inexpensive cues.

### Node response
- quick squash/wobble/rotation impulse
- one authored visual resource chunk detaches/disappears/scales away
- optional tiny hit flash

### Particles
Spawn a small bounded burst:
- tree: wood/leaf fragments
- rock: stone chips
- bush: green/fiber flecks

Use small primitive meshes or lightweight points.

### Pickup launch
At impact:
- spawn one pickup per struck node
- pickup starts near hit position
- lobs outward/upward along a short readable arc
- nearby nodes launch slightly different directions so drops separate visually

### Sound
Each type should sound different.

Prefer procedural Web Audio in Phase 2:
- wood thunk/chop
- rock click/crack
- fiber snip/swish
- pickup chime/pop
- stronger final-depletion accent

AudioContext must unlock from a user gesture.

If procedural audio is poor/brittle, use tiny local owned/generated assets. Never use network audio.

### HUD feedback
When a pickup is collected:
- inventory count bumps/pulses briefly
- optional compact `+1 Wood`, `+1 Stone`, `+1 Fiber`
- avoid large banners

---

## 9. Visible Node Degradation

Do not implement runtime mesh slicing.

Construct each procedural harvestable from authored child chunks corresponding approximately to remaining yield.

Example tree:

```text
stump/base
trunk
canopyChunkA
canopyChunkB
canopyChunkC
branchChunkD
branchChunkE
```

Each hit consumes one visual chunk with a short detach/pop/fade.

Rock:
- several stone lobes disappear/detach one per hit.

Bush:
- several tuft groups disappear/detach one per hit.

The node should visibly communicate:
- untouched
- partially harvested
- almost depleted
- depleted

Do not add resource health bars.

---

## 10. Depletion State

When the last chunk is harvested:

### Tree
- main tree disappears/falls/scales down quickly
- stump remains

### Rock
- outcrop disappears
- low rubble/base remains

### Fiber bush
- foliage disappears
- cut patch/root remains

Play stronger final feedback.

Node enters `RESPAWNING` and cannot be harvested.

Resource Rapier collider must change appropriately:
- full tree/rock collider removed or replaced by small stump/rubble collision if desired
- bush may remain non-solid
- never leave an invisible full-size collider

---

## 11. Respawn Timer

Use respawning nodes so the action can be repeated in one session.

Suggested starting durations:

```text
Tree:  15–20 sec
Rock:  15–20 sec
Fiber: 10–15 sec
```

### Visible countdown

While depleted, display a subtle circular progress indicator around the stump/rubble/patch.

Prefer:
- 8–16 small ring segments filling/brightening over time, or
- another lightweight procedural radial representation.

Do not build a shader-heavy radial UI.

When respawn completes:
- reset visual chunks
- restore collider
- short regrow/pop effect
- return to `READY`

---

## 12. Resource Pickups

Pickups are visible world objects, not immediate hidden counters.

Suggested states:

```text
LAUNCHED
RESTING
MAGNETIZING
COLLECTED
```

### Launch
Use lightweight scripted ballistic/parabolic motion rather than dynamic Rapier bodies unless Rapier is genuinely simpler.

### Magnet/pickup
When player is inside `pickupMagnetRadius`:
- pickup smoothly accelerates/eases toward player
- disappears at player
- inventory increments exactly once
- pickup sound/HUD bump plays

Suggested:

```text
pickupMagnetRadius: ~2.0–2.8
magnetDelayAfterSpawn: ~0.15–0.30 sec
```

If player runs away, pickup may remain until collected.

Prevent duplicate collection.

Cap/pool active pickups if needed.

---

## 13. Temporary Run Inventory

Create in-memory run inventory:

```js
{
  wood: 0,
  stone: 0,
  fiber: 0
}
```

Requirements:
- increment only when pickups are collected
- compact visible HUD counts
- reset on page/game restart
- no persistence
- no capacity limit
- no item menu
- no crafting
- no banking/extraction

Design APIs so Phase 4 can later distinguish unsecured vs banked inventory without rewriting harvesting.

---

## 14. Harvesting and Rapier

Rapier remains authoritative for character/world collision.

Trees and rock outcrops should have simple fixed Rapier primitives so player cannot walk through them.

Fiber bushes may be non-solid if that feels better.

Suggested collision:
- tree: simple cylinder/capsule/cuboid approximation
- rock: simple cuboid/ball approximation
- no trimesh requirement

On depletion:
- remove/disable full collider
- optionally use smaller stump/rubble collider
- restore full collider on respawn

Keep physics ownership clear.

Harvest-range query itself can remain a simple distance query against registered node positions; do not add sensors unless simpler.

---

## 15. Map Placement / Exploration

Evolve the test playground into a tiny harvesting playground while retaining important Phase 1 diagnostics.

Suggested content:

```text
Trees:       5–7
Rock nodes:  4–6
Fiber:       6–8
```

Do not create a dense farm at spawn.

Use clusters to encourage:
- running toward visible resources
- navigating around obstacles
- climbing/jumping for a couple nodes
- choosing between clusters

Examples:
- starter tree/fiber cluster near spawn
- rock cluster near/beyond jump platforms
- fiber near the precision corridor
- one resource on the high platform
- resources around perimeter to reward fast movement

No procedural world generation.

---

## 16. Architecture

Recommended responsibilities:

```text
src/resources/
  resourceConfig.js
  createResourceNode.js
  resourceSystem.js
  resourceVisuals.js
  pickupSystem.js

src/tools/
  fieldTool.js

src/audio/
  gameAudio.js

src/ui/
  runInventoryHud.js
```

Exact names are optional.

Rules:
- resource definitions are data-driven
- node visuals do not own inventory
- pickup collection is the only path that increments inventory
- playerController does not become harvesting owner
- Field Tool consumes player state/nearby node data, not world ownership
- one authoritative rAF/fixed-step architecture remains
- render updates may handle purely visual interpolation/effects

Do not put harvesting logic into `main.js`.

---

## 17. Configuration

Make all feel values easy to find.

Include:

```text
harvestRadius
maxTargetsPerSwing
swingInterval
impactNormalizedTime
pickupMagnetRadius
pickupMagnetSpeed/acceleration
pickupLaunch parameters
respawn times
per-node chunk/yield count
particle counts/lifetimes
halo pulse speed/opacity
```

Resource type config should include fields like:

```js
{
  id,
  displayName,
  resourceId,
  maxChunks,
  respawnSeconds,
  solid,
  colliderShape,
  feedbackProfile,
  visualProfile
}
```

Do not expose upgrades yet, but avoid architecture that prevents later modifiers.

---

## 18. Tests

Keep existing movement/Rapier tests.

Add pure tests for harvesting state and inventory.

Priority:

### Resource node
- READY hit reduces exactly one chunk
- every successful hit creates exactly one yield event
- final hit enters RESPAWNING
- depleted nodes cannot be hit
- respawn resets chunks/state
- respawn timer progression correct

### Multi-target
- nearest eligible nodes selected
- outside-radius nodes excluded
- target cap respected
- depleted nodes excluded
- incompatible player state yields no targets

### Pickups/inventory
- pickup collected once only
- inventory increments only on collection
- correct resource count increments
- run inventory resets

### Timing
- one swing creates one impact event
- holding near target does not hit every frame
- cadence deterministic under fixed-step updates

No heavy test framework.

---

## 19. Performance Guardrails

- No per-frame DOM creation.
- Reuse/pool pickups/particles where practical.
- Low-poly resource geometry.
- No runtime mesh cutting.
- No expensive post-processing.
- Do not create dynamic Rapier bodies for every particle/drop without concrete need.
- Avoid unbounded pickup accumulation.
- No network requests.
- Keep capped DPR.
- Maintain smooth phone performance.

---

## 20. Acceptance Criteria

### Readability
- Tree, rock, fiber are visually distinct.
- Pulsing white halo appears under every currently harvestable in-range node.
- No halo under depleted/out-of-range nodes.
- Player can understand what will be hit without tiny text.

### Harvest feel
- Walking near resources begins harvesting automatically.
- No harvest button.
- Player can keep moving.
- One swing may hit multiple nearby nodes.
- Hits occur on cadence, not every frame.
- Every hit gives immediate audiovisual feedback and a pickup.
- Nodes visibly lose chunks.

### Tool
- Field Tool swing is visible/readable.
- Impact timing matches node response.
- No manual axe/pick/shovel switching.

### Drops
- Pickups visibly lob out.
- Magnet/collection works.
- No duplicate collection.

### Inventory
- Wood/Stone/Fiber counts visible.
- Counts increment only on pickup collection.
- No persistence/banking/crafting.

### Depletion/respawn
- Tree leaves stump, rock rubble, fiber cut patch.
- Collider matches depleted visual.
- Circular respawn progress exists.
- Node respawns cleanly.
- No invisible full collider remains.

### Existing systems
- Movement/camera remain accepted.
- Rapier stable.
- Jump/fall/dodge/climb/mantle still work.
- Resource colliders do not embed player.
- Single rAF/fixed timestep retained.

### Verification
- `npm test` passes
- `npm run verify` passes
- `npm run zip` passes
- dev/submission load
- phone portrait works
- offline compliance
- ZIP <35 MB
- BUILD_LOG updated

---

## 21. Human Playtest Checklist

Manual test instructions must be descriptive and player-facing.

### A. First-time readability

**Setup:** Start at normal spawn without deliberately walking into a resource.

**Action:** Look around, then approach a tree, rock outcrop, and fiber bush one at a time.

**Expected:** Each has a distinct silhouette. As you enter actual harvest range, a subtle white ring fades/pulses beneath it; moving away removes it.

**Failure signs:** Resources look like decoration, ring is invisible/overwhelming, or ring appears on something that will not be hit.

### B. Automatic harvesting

**Setup:** Approach one isolated tree.

**Action:** Move into ring range and stay nearby without pressing another action.

**Expected:** Field Tool swings automatically at a steady rhythm. Each impact visibly affects the tree and launches one wood pickup. You remain free to move away.

**Failure signs:** Nothing happens, unexplained input is required, hits happen every frame, movement locks, animation/hit timing disagree, or impacts give no immediate reward.

### C. Multi-target harvesting

**Setup:** Find a cluster where multiple nodes can fit inside range.

**Action:** Position so several nodes show white rings and remain through several swings.

**Expected:** One impact affects all eligible highlighted nodes up to the cap. Each reacts and launches its own pickup.

**Failure signs:** Only one node reacts despite multiple highlighted, out-of-range nodes get hit, or dense clusters cause lag/effect spam.

### D. Visual depletion

**Setup:** Fully harvest one node of each type.

**Action:** Watch each hit.

**Expected:** Node becomes visibly more depleted after every impact; no health bar required.

**Failure signs:** Node looks untouched until it suddenly vanishes, or visible chunks do not match remaining yield.

### E. Drops and pickups

**Setup:** Harvest while moving past a node.

**Action:** Let drops launch, move slightly away, then walk near them.

**Expected:** Drops visibly pop/lob. Nearby drops magnet smoothly to player and increase the correct HUD count exactly once.

**Failure signs:** Items become hidden counters immediately, teleport confusingly, increment twice, or get permanently stuck.

### F. Respawn readability

**Setup:** Deplete a tree or rock and stay near the stump/rubble.

**Action:** Watch through respawn.

**Expected:** Circular progress visibly advances. Node regrows cleanly, full collision returns, and it can be harvested again.

**Failure signs:** No indication it will return, timer jumps/backtracks, invisible full collider remains, or respawn traps player.

### G. Resource collision

**Setup:** Approach full trees and rocks from multiple directions.

**Action:** Walk/run into them and slide around them. Then deplete one and test the remnant.

**Expected:** Full solid nodes block Rapier cleanly; depleted collision matches stump/rubble.

**Failure signs:** Walking through full resource, sticking/teleporting, or hitting invisible full-size collision after depletion.

### H. Traversal regression

**Setup:** Use existing gap and ladder areas.

**Action:** Jump, fall, dodge, climb and mantle near resources.

**Expected:** Harvesting does not activate during JUMP/FALL/DODGE/CLIMB/MANTLE; movement remains accepted.

**Failure signs:** Tool swings midair/on ladder, resources alter jump path, or new colliders break traversal.

### I. Is gathering fun?

Spend 3–5 minutes primarily gathering.

Record:
- Does every hit feel rewarding?
- Is cadence too fast/slow?
- Is Field Tool readable?
- Do pickups encourage movement through clusters?
- Is multi-hit satisfying or messy?
- Do three node types create route choices?
- Does respawn feel useful or too gamey?
- Single weakest part?
- Single strongest part?

---

## 22. Explicit Non-Goals

Do not implement:

- manually switched axe/pickaxe/shovel
- tool upgrade UI
- tool crafting/durability
- resource hardness tiers
- rare resources
- crafting recipes
- inventory capacity
- persistent inventory
- banking/extraction
- selling/base spending/construction
- Matter Resonator
- XP/skill tree
- combat/enemies/damage
- Wildkin/capture
- waystones
- procedural world generation
- quests
- final art pipeline

---

## 23. Stop Condition

Priority:

1. Data-driven resource nodes + proximity halos.
2. Automatic Field Tool cadence + multi-hit.
3. Per-hit degradation + yield.
4. Visible pickups + temporary inventory.
5. Depletion + respawn indicator.
6. Resource collision with Rapier.
7. Sound/particles/feedback.
8. Tests/performance/packaging/docs.

Do not start Phase 3 combat.

If visual chunk removal gets complex, use authored child chunks rather than runtime slicing.

At completion report:
- resource types/yield counts
- harvest range/cadence/multi-target rules
- Field Tool behavior
- halo behavior
- degradation/depletion/respawn
- pickup/inventory behavior
- Rapier collider lifecycle
- audio/particles
- module architecture
- automated verification
- submission size
- **detailed human-facing manual tests with setup, exact action, expected behavior, and visible failure signs**
- BUILD_LOG update
