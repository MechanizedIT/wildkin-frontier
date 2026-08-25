# Architecture — Wildkin Frontier (Phase 4B.0 — Primitive Visual Asset Authoring)

> Lightweight, explicit, human-editable, and optimized for repeated AI-assisted iteration. This document describes the **current implemented architecture through Phase 4B.0**. Phase 4A remains accepted; Phase 4B.0 consumes the existing AuthorTypeRegistry / normalized transform / VisualRef seam for a deliberately bounded primitive Visual Asset workflow.

## Permanent Goals

- One authoritative game loop owns per-frame gameplay/update/render work.
- `src/main.js` remains composition/bootstrap + fixed-loop wiring, not a home for domain rules.
- Mutable state has one explicit owner.
- Dependencies are injected, not hidden in gameplay globals.
- Gameplay rules should be testable independently of rendering where practical.
- Mobile-first: capped DPR, bounded pools, limited active simulation, minimal per-frame allocation.
- Offline-safe: all runtime libraries/assets/data local.
- Prefer small explicit systems over framework-heavy ECS/behavior-tree/editor architecture.
- Shared-contract changes follow the permanent `AGENTS.md` Change Closure / Consistency Sweep rule.

## Runtime / Submission Stack

- Three.js 0.160.0 — vendored `vendor/three.module.js`
- `@dimforge/rapier3d-compat@0.20.0` — vendored `vendor/rapier.js`
- Vanilla HTML/CSS/JavaScript
- Native ESM in development
- esbuild only for readable/unminified submission packaging
- One `requestAnimationFrame` loop in `src/main.js`
- Fixed gameplay/physics timestep 1/60 with bounded catch-up
- Root `index.html`, local runtime references, offline-safe ZIP <35 MB

# Current Accepted Foundation

Phase 3.1.1 validated core gameplay. Phase 3.5A added directed-world/runtime foundation. Phase 3.5B/B.1/B.2 human-accepted world-authoring pipeline. Phase 4A added first complete Camp ↔ expedition loop. Phase 4A.1 refines first-run/gate/start suppression and makes ground/boundaries authored. Phase 4A.2 closed authoring/input/spawn trusts; Phase 4A.2.1 repairs canonical ownership, preview atomics, spawn Y, region rehome, input latch, pulse, indicators. Phase 4A.2.2 establishes the shared AuthorTypeRegistry / normalized transform / VisualRef / ColliderDescriptor contract. Phase 4B.0 adds canonical reusable primitive Visual Assets and migrates the Camp Drop Pod without changing expedition content or pacing.

Accepted current systems:

- player movement/traversal + Rapier kinematic controller,
- Field Tool single-owner swing/cadence,
- Auto Harvest + manual interaction rules,
- resource nodes/physical pickups/magnet inventory (run-carry, hide-zero) + persistent bank,
- player health/dodge/death with Camp-return flow,
- melee/ranged Wildkin attacks, A/T/D/S temperaments, selected Wildkin-vs-Wildkin, home/leash/steering,
- collision-aware XP pop/rest + guaranteed magnet,
- bounded pools, data-driven `world.json` source with `camp.playerSpawn`, Camp + Area 1 regions/anchors/POIs + `frontierGateId/initialMajorWaypointId/spawnOffset/displayName`,
- explicit authored `groundPatches` (one per region, visible/collision toggles) + `boundaryColliders` (outer limits, hidden in Play, proxy in Edit) replacing hard-coded global floor/bounds walls,
- generic static presentation/collision contract (`visibleInPlay, collisionEnabled, opacity, color/tint` with per-object material cloning),
- current+neighbor region activation,
- `ExpeditionSession` (camp/active/extracted/dead, idempotent, `suppressUntilExit` generic),
- `frontierProgress` (bank + unlocks, isolated author key),
- frontier anchor interaction with `prime` edge-trigger + generic suppression,
- Map (inspect vs gate-start, displayName-only), anchor prompts + result cards using displayName, minimal edge indicators,
- `?dev=1` dev-only `RESET PLAYER SAVE` (clears `wildkin.frontierProgress` only),
- desktop Author Mode with categorized palette, Ground/Boundaries hierarchy, Display Name + presentation controls, Edit proxy for hidden colliders, live tint/opacity preview, deterministic export/reset,
- visual ↔ Rapier parity for supported solids including ground/boundary with rotation/opacity/tint,
- single rAF/fixed 1/60, offline/portrait/<35 MB.

# Current High-Level Module Areas

```text
src/main.js
  composition/bootstrap
  dependency wiring
  single rAF + fixed-step ordering
  debug exposure only

src/session/
  expeditionSession.js
    temporary expedition/run lifecycle summary

src/world/
  data/world.json
    one manually maintained authored world source
  data/world.generated.js
    generated runtime module; do not edit
  data/world.js
    thin import/re-export wrapper
  worldValidator.js
    normalize/validate authored world
  worldRegistry.js
    region/object/anchor query registry
  regionManager.js
    current+neighbor active-region owner
  staticWorldBuilder.js
    visuals + static/traversal descriptors from world data
  createMovementPlayground.js
    production wrapper into data-driven builder; legacy fallback only for old tests

src/author/
  authorDraft.js
    mutable author-only draft + persistence/export/reset
  authorUI.js
    palette/inspector/hierarchy
  authorMode.js
    Edit/Play orchestration, selection/drag/preview/camera visibility/home marker

src/game/
  scene/camera/renderer/config

src/input/
  keyboard + touch intent
  touch input has explicit enabled/disabled ownership for Author Mode/modal-safe integration

src/physics/
  Rapier world
  player capsule/controller/query helpers
  static colliders consume authored elevation/rotation/dimensions

src/player/
  movement/state/visuals

src/movement/
  movement bands
  jump/fall/dodge/climb/mantle

src/resources/
  harvestable configuration/system
  region-aware resource activation
  physical pickups + magnet + run inventory

src/tools/
  Field Tool visual/swing owner

src/combat/
  player health/combat targeting/projectiles/XP/session helpers

src/creatures/
  Wildkin creation/config/AI/temperament/steering
  region-aware activation

src/save/
  frontierProgress.js
    persistent bank + discovered/unlocked anchors (versioned localStorage, stale-filter, idempotent bank)

src/world/
  frontierAnchorSystem.js
    proximity/entry/armed state for gate/waypoint/beacon + start-suppress + keep-going guard

src/ui/
  frontierMap.js (inspect vs gate-start, unlocked-only selectable)
  anchorPrompt.js (EXTRACT/KEEP GOING, gate RETURN & SECURE)
  runResultCard.js (recovery/loss over Camp)
  frontierIndicators.js (extraction + next-waypoint edge guidance, active-run only)
  runInventoryHud.js (upper-left, hide-zero carry)

src/audio/
  procedural/local audio
```

# Fixed Update Ownership

Conceptually (Phase 4A):

```text
main.js (thin: creates, injects, owns single rAF)
  ├─ init scene/Rapier/worldRegistry(regionDepthMap)/campSpawn/frontierProgress(load)/session(camp)/regionManager
  ├─ create player/input/FieldTool/resource/pickup/creature/projectile/XP/combat/audio/HUD/Map/AnchorPrompt/ResultCard/Indicators
  ├─ wire anchorSystem callbacks → Map/prompt/frontierProgress/session
  ├─ wire playerCombat.onDeath → deathFlow, anchor prompts → extractionFlow, map start → beginExpedition
  └─ single rAF tick
       ├─ syncInputBlock (authorEdit | Map|Prompt|ResultCard) → touch/keyboard setEnabled
       ├─ gather/merge intents → effectiveIntent (zeroed when blocked)
       ├─ fixed substeps (when !blocked && !resolved)
       │    ├─ frontierAnchorSystem.update(playerPos) → may open Map/Prompt
       │    ├─ combatSession, FieldTool, playerCombat, playerController/Rapier, regionManager
       │    ├─ creatures/projectiles/XP/resources/pickups + focus rings
       │    └─ harvesting allowed only when session.isActive() && !blocked
       ├─ indicators.update(camera) (visual, active-run only)
       └─ render
```

Order remains deterministic; extraction/death share `resetTransientWorldToCamp` helper.

# Rapier Ownership

Rapier remains the single physics/collision runtime.

- Player remains kinematic.
- Creatures remain simple kinematic actors unless a later slice proves otherwise.
- Visual meshes are not automatically colliders.
- Combat damage remains explicit gameplay logic.
- Query exclusions distinguish actor targets from static obstacles.
- No second physics engine.

## Authored static transform contract — accepted Phase 3.5B.2

Supported authored solids flow through the same semantic transform path:

```text
world.json authored values
→ normalize/validate
→ staticWorldBuilder visual + collision descriptor
→ createPhysicsWorld Rapier collider
→ Author Mode preview/export
```

For supported solid props:

```text
position/base = x, y, z
rotationY = radians
size = width, height, depth
```

Legacy traversal schema names may remain internally, but Author Mode adapters expose human-facing Width/Depth/Height semantics.

Rotated colliders use a Y-axis Rapier quaternion. Elevated colliders include authored baseY. Conservative rotated AABBs are recomputed where broad-phase/steering metadata needs them.

# Player Movement Ownership

`playerController` owns locomotion:

- walk/run/sneak bands,
- acceleration/deceleration,
- facing,
- jump/fall/air control,
- dodge,
- climb/mantle,
- collision-resolved Rapier movement.

Combat may inject temporary movement constraints/knockback but must not become a second movement controller.

Phase 4A blocking UI may suppress **input**, but should not create a second movement-state owner.

# Field Tool Ownership

One Field Tool visual/interaction owner controls:

- hand/head transforms,
- trail,
- swing timing,
- shared readiness/cadence,
- manual vs Auto Harvest initiation priority.

Rule:

```text
one Field Tool swing
  ├─ valid harvestables in arc → harvest hit
  └─ valid attackable Wildkin in arc → combat hit
```

Harvesting/combat systems must not independently animate or schedule competing tool impacts.

# Resource / Pickup / XP Ownership

- Resource nodes own harvest/depletion/respawn state.
- Resource pickup system owns temporary physical drops + magnet collection + current run resource inventory.
- XP mote system owns live run XP pickup/collection state.
- Pools remain bounded.
- Region deactivation freezes/culls according to the accepted Phase 3.5A policy.

**Phase 4A must not turn the live pickup inventory into the persistent bank.** It may snapshot current run resources/XP for outcome resolution, but persistent bank values need a separate owner.

# Creature Ownership

Keep these concerns conceptually separate without introducing a heavyweight framework:

```text
PERCEPTION
  nearby actors / threats

TEMPERAMENT / DECISION
  ignore / warn / flee / pursue / attack / return

LOCOMOTION / STEERING
  move toward/away
  obstacle probes
  home/leash

COMBAT BEHAVIOR
  windup / lunge / projectile / recover / hurt / dead
```

Wildkin may target/react to the player and other Wildkin.

Use simple probes/steering first. Add pathfinding only when authored-world evidence requires it.

# ExpeditionSession — Implemented Temporary Run Owner

`src/session/expeditionSession.js` — camp/active/extracted/dead (dead alias for lost), idempotent `tryResolveExtract`/`tryResolveDeath`, `beginRun`/`resetToCamp`, transient cargo/xp/kills + `runDiscoveries` (newWaypoints/newBeacons), `regionDepthMap`/`maxDepth`. `reset()` retained as legacy active-reset for old tests; `resetToCamp()` is the Phase 4A camp-return path used by main.js.

It does not own:

- player health,
- resource node rules,
- live pickup inventory implementation,
- persistent frontier progression (frontierProgress owns bank),
- map DOM,
- creature AI.

# Single-Source World Pipeline — Accepted

```text
src/world/data/world.json
  → tools/generate-world.mjs
  → src/world/data/world.generated.js
  → src/world/data/world.js
  → normalize / validate
  → worldRegistry
  → staticWorldBuilder + gameplay placement systems
```

Rules:

- `world.json` is the one manually maintained authored source.
- Generated runtime data is never hand-edited.
- `npm run world:check` catches stale generated data.
- `npm run verify` includes world consistency before build validation.
- Runtime world/UI systems should query normalized/registry data rather than duplicate anchor/region coordinates.

Current authored skeleton:

```text
Camp
  ↓ gate
p1 Forest Edge
  ↓
p2 Tangled Hollow / Beacon
  ↓
p3 Sunken Rise / Beacon
  ↓
p4 Threshold Rise / next Major Waypoint
```

This is a spatial proof, not final pacing/art.

# Spatial Activation / Streaming — Accepted

Three.js frustum culling is render-only. `src/world/regionManager.js` owns lightweight gameplay activation.

```text
ACTIVE = current region + immediate neighbors
INACTIVE = distant regions
```

Accepted behavior:

- resources hide/remove collider/freeze timers while inactive,
- creatures hide/disable collider/freeze AI/attack/respawn while inactive,
- pooled pickups/projectiles/XP are culled by region policy,
- entities are created once and toggled rather than duplicated,
- neighbor buffer prevents visible simulation holes,
- author Edit visibility can follow editor camera while gameplay remains paused,
- Play restores player-centered region activation.

Do not add async/network asset streaming until profiling proves it necessary.

# Author Mode — Accepted Phase 3.5B.2

Desktop-only `?author=1` is now accepted infrastructure.

## Authoring ownership

```text
canonical repo world
  └─ Author Mode mutable draft (isolated localStorage)
       ├─ palette → click-world placement
       ├─ scene raycast/hierarchy selection
       ├─ direct X/Z drag
       ├─ supported Y/Rot/Width/Depth/Height edits
       ├─ Wildkin Spawn/Home editing
       ├─ Region → Category → Object hierarchy
       ├─ Validate
       ├─ deterministic Export
       └─ Reset Draft From Repo
```

Edit mode owns gameplay input explicitly. Normal player progression in Phase 4A should use a different persistence owner/key and must not be accidentally mutated by Author Mode world-draft reset.

## Scope guardrail

Do not turn Author Mode into a general engine editor. No prefab system, scripting, multi-select, full undo stack, asset browser, or mobile authoring unless a future accepted slice explicitly requires it.

# Phase 4A Architecture — IMPLEMENTED

## 1. Persistent frontier progress owner

`src/save/frontierProgress.js` — implemented as specified:

```text
version: 1
bankedResources: { wood, stone, fiber }
bankedXp
unlockedMajorWaypointIds: [initialMajorWaypointId]
discoveredBeaconIds: []
hasDepartedOnce
```

- localStorage `wildkin.frontierProgress` (normal) vs `wildkin.authorFrontierProgress` (author isolated key),
- version/default normalization, stale-filter via worldRegistry, dedup,
- idempotent `bankRun` token guard, `unlockWaypoint`/`discoverBeacon` return true only on new discovery, `markDeparted` once,
- no DOM dependency.

## 2. Frontier anchor interaction owner

`src/world/frontierAnchorSystem.js` — implemented:

- Camp gate, Major Waypoints (excluding wp_camp_gate marker), Extraction Beacons,
- per-anchor `armed`, `inside`, `cooldown` state,
- `disarmStartWaypoint` until first exit, `handleKeepGoing`/`handleExtracted` leave-and-re-enter guard,
- gate dispatches `onGateStartPrompt` (camp) vs `onGateReturnPrompt` (active),
- waypoint/beacon dispatch with unlock/discover via frontierProgress,
- callbacks only; UI owns no proximity.

## 3. Map owner

`src/ui/frontierMap.js` — implemented:

- top-right `MAP` button, `openInspect` (camp+gate+unknown before first departure, then known frontier) vs `openStartSelection` (gate-triggered, only unlocked Major Waypoints tappable),
- beacons shown only when discovered, never selectable,
- `inspect` never teleports, `startSelection` validates unlocked + exists before `beginExpedition`,
- reads registry + frontierProgress, owns no persistence.

## 4. Outcome/result owner

`src/ui/anchorPrompt.js` + `src/ui/runResultCard.js` + shared lifecycle in `src/main.js`:

```text
snapshot run (cargo/xp + newWaypoints/newBeacons)
→ tryResolveExtract / tryResolveDeath (once)
→ bank (extraction) or lose (death) via frontierProgress
→ resetTransientWorldToCamp (shared: player/moves/health/clear pickups/projectiles/motes, reset creatures/resources, reprimes region, no duplicates)
→ show recovery/loss card over Camp
→ CONTINUE → Camp control, next run via gate→Map
```

Old `deathOverlay` replaced; no competing arena restart.

## 5. Blocking UI input ownership

One suppression path: `isAnyBlockingModal()` (Map|AnchorPrompt|ResultCard) + authorEdit → `setGameplayInputBlocked`. Both `touchMovement.setEnabled` and `keyboardInput.setEnabled` clear held joystick/swipe/keys and disable `getIntent`. Restored exactly once on close. Field Tool also gated via `fieldCanAttack && session.isActive()`.

# Phase 4A.1 Refinements — IMPLEMENTED

## Fresh launch / gate
- `camp.playerSpawn` authored at `0,10.0` (outside gate radius 1.85 at `0,7.2`), validated finite/near Camp bounds, used by `worldRegistry.getCampSpawnPosition`.
- `frontierAnchorSystem.prime(playerPos)` sets `inside` from actual position before first tick; gate requires genuine outside→inside transition even if future spawn inside radius.
- Camp spawn now far enough that intended playtest starts outside trigger naturally.

## Start-Waypoint suppression (generic)
- `suppressUntilExit(waypointId)` generic set (not only `wp_p1_entry`), `prime` then `suppressUntilExit` in `beginExpedition`; stays suppressed while inside, requires leave then re-enter for any selectable Major Waypoint; works whether spawn offset inside or outside radius; `handleKeepGoing` still requires leave/re-enter.

## Interaction restore
- After `CHOOSE START` close, session active, `isAnyBlockingModal` false, `harvestingAllowed && session.isActive()` and `fieldCanAttack && session.isActive()` true, focus rings/combat available. Covered by integration tests.

## Dev reset
- `?dev=1` shows `RESET PLAYER SAVE` centered top, confirm dialog, `frontierProgress.clear()` + reload, does not clear `wildkin.authorDraft`.

## DisplayName
- `worldRegistry.getAnchorDisplayName` helper (displayName → region displayName + fallback). Added `displayName` to `wp_p1_entry=Forest Edge`, `wp_p4_threshold=Threshold Rise`, `beacon_p2_01=Tangled Hollow Beacon`, `beacon_p3_01=Sunken Rise Beacon`.
- `frontierMap`, `anchorPrompt`, `runResultCard`, `frontierIndicators` all use helper; normal Map no longer exposes `wp_*`/coordinates.

## Authored Ground / Boundary
- `world.json` now has `region.groundPatches` (one per region, `pos/size/color/opacity/visibleInPlay/collisionEnabled/rotY`) and `region.boundaryColliders` (four outer walls in camp, hidden in Play). `worldValidator` validates IDs, pos/size, `visibleInPlay/collisionEnabled` bool, `opacity 0..1`, `color` number or `#RRGGBB`, duplicate IDs, displayName length.
- `staticWorldBuilder` builds ground patches/boundaries from authored data (no hidden global floor; safety floor at -30 only). Per-object material cloned when tint/opacity override, so fence tint does not affect all fences.
- `createPhysicsWorld` builds colliders from `groundPatches`/`boundaries` where `collisionEnabled`, no hard-coded bounds walls; safety floor at -30 far below.
- Hidden objects (`visibleInPlay=false`) get wireframe Edit proxy (`isEditProxy`) visible only in Edit via `setProxyVisibility`; boundaries especially readable.

## Palette / Hierarchy / Inspector
- Palette categorized: World (Ground Patch, Boundary Collider), Environment/Props (Box, Fence, Gate, Forest Boundary, Water, Island, Drop Pod, Resonator), Traversal (Platform, Obstacle, Ladder), Resources (Tree, Rock, Fiber), Wildkin (Rusher, Spitter), Frontier/POI (Major Waypoint, Extraction Beacon, POI Chest).
- Hierarchy adds `Ground` and `Boundaries / Colliders` under each Region.
- Inspector shows `Display Name` for Waypoints/Beacons and `Visible in Play` / `Collision` / `Opacity` / `Tint` for props/ground/boundary (only where supported); tint text + color picker sync, live preview via `syncPreviewForId` cloning material per object.

# Phase 4A.2.1 Repair — IMPLEMENTED

## Canonical draft ownership & preview atomics
- `authorDraft.getDraft()` and `findObjectById()` now return deep-cloned snapshots; normal UI cannot mutate canonical before validation.
- All edits route through `updateTransform` / `createObjectAtPosition` transactional `transact()` → `normalizeWorldData` → atomic commit → one history entry → `persist`.
- Drag/placement use preview-only state (`dragState` worldPos + `applyPreviewTransform` directly on Three meshes, no canonical mutation), Esc cancels preview and restores canonical via `syncPreviewForId`, invalid release snaps back and shows error.
- `createObjectAtPosition(kind,subtype,worldPos,regionId)` creates at final intended transform/region in one transaction (no intermediate center then mutate).
- `updateTransform` now auto-rehomes point-owned objects: `findContainingRegionStrict` for `pos` patch, exactly one containing region → set `patch.regionId` atomically, ambiguous/outside → reject with readable error, hierarchy updates in same transaction.
- For Major Waypoint with explicit `runSpawn`, rehoming is rejected if runSpawn would leave target region (readable error, no silent move).
- `getAllObjectIds` + `reconcilePreview()` ensures undo/redo/place/delete leave no stale ghost meshes: removes stale, creates missing via descriptor, re-syncs, updates hierarchy/selection.

## Static descriptor single authority
- `src/world/staticDescriptor.js` is now the production authority for rectangular statics (Box, Fence, Gate, ForestBoundary, GroundPatch, BoundaryCollider, Resonator, DropPod transform, Water/Island where visual-only, Platform/Obstacle where rectangular base-Y).
- `staticWorldBuilder` and `createPhysicsWorld` both consume normalized descriptor (`position/baseY, rotationY, size, visibleInPlay, collisionEnabled, opacity, tint`) for Edit preview, runtime visual, and Rapier collider; elevated/rotated parity preserved.
- `authorMode.syncPreviewForId` uses descriptor for Ground/Boundary live X/Y/Z/size/rotation/elevation, and for material reset: cloning per-object, restoring baseColor/transparent/opacity when opacity→1 or tint removed, sibling materials unaffected.

## Spawn authoring/runtime parity
- `authorDraft` virtual `camp_spawn` / `wp_*__runSpawn` now via explicit spawn mutation path: `updateTransform` on spawn id mutates `camp.playerSpawn.position` / `waypoint.runSpawn.position` + `facingYaw` transactionally; marker group is world-positioned (`group.position = pos, rotation.y = facing`) with children at local offsets (capsule 0,0.52, arrow 0,0.12,0.55, ring 0,0.06), line updates after movement; `ensureSpawnMarkers` clears/recreates from canonical, `updateSpawnMarkers` only moves group.
- Q/E in `authorMode` now branches: spawn → `facingYaw` ±15° with immediate arrow preview, normal static → `rotY`; inspector numeric rotation for spawns also uses `facingYaw`.
- `worldRegistry.getRegionDepthMap()` now BFS-derived from Camp via neighbors (not array order); validates explicit `depth` field if present.
- Runtime spawn Y: `src/main.js` `resolveSpawnCapsuleCenter(feetY) = feetY + capsuleHalfHeight(0.20) + capsuleRadius(0.32) + 0.02` using `RAPIER_CONFIG`; Camp and every Waypoint `beginExpedition`/`resetToCamp` use authored `position.y` feet/support elevation, not global ground, and apply facing coherently to physics (`characterPhysics.setPosition`), visuals (`player.position`, `playerController.state.facing`), and `cameraFollow.snap`.
- Spawn validation in `worldValidator`: for Camp/Run spawns checks finite X/Y/Z/facing, strict containment, feet very near support surface (groundPatch/platform top within 1.0), capsule not intersecting blocking collider (oriented box test, support excluded, radius 0.32 + eps).

## Input latch
- `src/input/keyboardInput.js`/`touchMovement.js` own disabled/clear semantics; `src/main.js` now latches tap edge: `pendingAttackLatch` set on `rawWasAttackRequested`, `effectiveAttackRequested = pendingLatch`, consumed only after an eligible fixed step (`physicsSubstepsLast>0`) invokes Field Tool once; zero-substep render frames keep latch pending, hold-repeat remains, duplicate mousedown+pointerdown guarded, F/touch precedence preserved.

## Activation pulse & guidance
- `src/ui/activationToast.js` pulse spawns at `pos.y+0.12` (authored world Y, elevated anchor correct) + small offset, no private `requestAnimationFrame`; exposes `update(dt)` driven by authoritative `main` tick, disposes geometry/material when age≥1.0, one pulse per first discovery only (frontierAnchorSystem still owns discovery).
- `src/ui/frontierIndicators.js` reuses two persistent DOM nodes (`extractionNode`, `waypointNode`, `display:none` toggle) instead of `innerHTML=""` per frame; `getNextDeeperWaypoint` returns null at deepest depth (no backward pointing), uses BFS depthMap, keeps camera projection behavior.

## Change Closure sweep covered
- Sibling families checked: Box/Fence/Gate/ForestBoundary/GroundPatch/BoundaryCollider/Resonator/DropPod/Water/Island/Platform/Obstacle for descriptor/capability/material; resources/creatures/Waypoints/Beacons/POIs/props for point-owned rehome; Camp/RunSpawn for Y/facing; ground/boundary footprint vs point ownership.

# Phase 4A.2.2 Author Object Contract — IMPLEMENTED

## AuthorTypeRegistry + normalized Author transform
- Central `src/author/authorTypeRegistry.js` is the single source of truth for every current authorable object. Every world object (props, groundPatches, boundaryColliders, platforms, obstacles, climbables, resources, creatures, waypoints, beacons, POIs, camp/run spawns) resolves to exactly one Author type via `resolveAuthorType(found)`. `checkAllObjectsResolve` contract test proves this.
- Normalized Author transform seam:
  ```js
  { position:{x,y,z}, rotationY, size:{width,height,depth}, uniformScale, sizeMode:"box"|"uniform"|"none" }
  ```
  Author Mode never constructs raw family patches (`{pos}`, `{x,z}`, `{bottomY}`) itself. It submits normalized candidate transforms to the resolved adapter; the adapter writes correct canonical fields atomically inside the existing `transact → normalizeWorldData` boundary.
- Keep canonical schemas: `world.json` objects retain `pos`, `x/z/y`, `baseY`, `w/h/height`, `bottomY/topY`, `facingYaw`, etc. Adapters translate. No universal schema migration.
- Transform adapters live in registry definitions: `transform.read(found)` returns normalized view, `transform.write(candidateObj, found, normalized)` mutates canonical fields (including ladder dependent fields: `topPlatform`, `topEntryRegion`, `mantleExit`, `wallNormal`). No shadow `pos` for platforms, no `x` for resources.
- `authorDraft.updateNormalizedTransform(id, normalized)` is the transactional entry point for Author Mode drag/rotate/resize. `updateTransform` remains for legacy callers but now also delegates through registry for custom fields and prevents shadow fields.
- `worldValidator` now allows optional `rotY`, `uniformScale`/`scale` for resources, creatures, waypoints, beacons, POIs, platforms, obstacles.

## Registry-owned capabilities (removed hard-coded UI branching)
- Deleted production hard-coded `supportsY`, `supportsRot`, `supportsSize`, `getCapsForFound` from `authorUI`. Transform controls now come from `def.capabilities`:
  - `elevation`, `rotation`, `resize`, `sizeMode`, `presentation`, `collisionControl`, `draggable`, `selectable`, `duplicatable`, `deletable`.
- Universal authoring policy enforced: every appropriate object supports position/elevation/rotation/meaningful resize unless concrete gameplay reason. Exceptions are explicit in registry:
  - Box/Fence/Gate/ForestBoundary/Ground/Boundary/Platform/Obstacle/Ladder: all true, box dimensions.
  - DropPod/Resonator: dimensions true.
  - Tree/Rock/Fiber: uniform scale + rotation, collider scales coherently, foliage not collider.
  - Wildkin: position+initial facing, no scale (avoid altering combat/capsule).
  - Waypoint/Beacon: position+rotation, no scale.
  - POI/chest/barrier: uniform/box where safe.
  - Camp/Run Spawn: position+facing only, no duplicate/delete, fixed ownership.
- `authorUI` now shows/hides Y/rotation/size/scale rows and presentation controls based on `caps.elevation`, `caps.rotation`, `caps.resize`, `caps.sizeMode`, `caps.presentation`.

## Inspector declarative field system
- Small declarative `inspector: []` arrays on each type definition. Supported control types: `number`, `text`, `enum/select`, `boolean`, `color`, `json` (requires).
- Proved real writes for: Wildkin `temperament`, `roamRadius`, `noticeRadius`, `personalSpace`, `leashRadius`, `speciesTag`; Waypoint/Beacon `displayName`; POI `requires`; `uniformScale`/`scale` for resources/POIs. All go through `authorDraft.updateInspectorField(id, key, value)` or via `updateTransform`’s registry-backed generic path, inside transactional `transact`, not direct snapshot mutation.
- `authorUI` builds creature/anchor/POI fields from registry; `setSelected` populates via normalized reads.

## VisualRef + VisualFactory seam (future kitbash seam)
- Bounded `VisualRef` `{kind:"builtin", id:"prop/box"}` etc. `src/world/visualFactory.js` exports pure deterministic visual constructors:
  - `createVisual(visualRef, {objectId, size, poiType}) -> THREE.Object3D` local-space, no scene add, no Rapier, no AI/timers/DOM/private rAF, deterministic for same objectId.
  - Built-ins: `prop/box`, `traversal/platform`, `traversal/ladder`, `resource/tree` (Cylinder trunk + Cone foliage, deterministic RNG from objectId), `resource/rock`, `resource/fiber`, `creature/rusher`, `anchor/waypoint`, `poi/chest`, etc. `BUILTIN_MAP` is the registry.
  - `getVisualSignature` helper for tests: real Tree gives Cylinder+Cone, Ladder gives Box+Cylinder, not single placeholder BoxGeometry.
- `authorMode.createPreviewMeshForNewObject` now uses `createVisual` via `getAuthorVisualRef(found)`; new Tree/Ladder immediately show real visuals in Edit, no green/gray placeholder Box (`createPreviewMeshForNewObject` previously created BoxGeometry 0.5 for Tree/Wildkin/Ladder).
- Runtime `createResourceNode` now uses `objectId`-derived deterministic RNG (same `hashString`+`mulberry32` as VisualFactory) and is called with authoritative `nodeId` from `worldRegistry` (`createResourceNode(p.type, p.pos, i, nodeId)`), so Edit and Play produce identical tree/rock variation for same id. `resourceSystem` propagation of `authorId` to children preserves pickability.

## ColliderDescriptor + Edit proxy lifecycle
- `src/world/colliderDescriptor.js` exports simple descriptor seam: `describeBoxCollider`, `describeResourceCollider` (scaled from `resourceConfig` halfExtents * uniformScale, offset `colliderCenterY * scale`), `describeCreatureCollider`, etc. Shape is always `box`/`capsule`/`none`, never detailed foliage mesh.
- Same transform interpretation for visual root, Edit proxy, and runtime Rapier. `getColliderCenter` = `position + offset`; visual root at `position` (base) + `size.height/2` matches collider center.
- Live proxy lifecycle: `authorMode.syncPreviewForId` now ensures `!visibleInPlay && collisionEnabled` immediately creates a wireframe `isEditProxy` Box (`0xffff00`, wireframe, opacity 0.42) at same transform, without requiring Play→Edit rebuild. Proxy geometry resizes/rotates/moves coherently with normalized size/rotation; visibility is `isEdit && shouldHaveProxy`. `staticWorldBuilder` never constructs editor artifacts, so a fresh Runtime Play scene contains no proxies. Existing and newly placed Boundaries gain their proxy only through the descriptor-driven `authorPreview.syncEditProxy` path while Edit is active.

## Author Mode simplification (generic preview handle)
- `authorMode` now around `resolveAuthorType`:
  ```
  select → resolve type → readNormalizedSnapshot → previewHandle (root visual + optional proxy) → drag/inspector produces normalized candidate → adapter transactional write → reconcile from canonical → syncPreviewForId
  ```
  Concrete gameplay checks remain only for truly unique visuals (spawn marker line).
- `dragState` stores normalized `position`/`rotationY`; `applyPreviewTransform` applies previewNorm to meshes without touching draft; `onPointerUp` calls `updateNormalizedTransform`. `Q/E` rotation, `Space/C` elevation, `PageUp/Down`, `WASD` nudges all now via `readNormalizedTransform` → mutate → `updateNormalizedTransform`, ensuring platform `x/z` canonical update, ladder dependent recompute, resource uniform scale coherence.
- `syncPreviewForId` is now registry-driven: `sizeMode==="uniform"` scales group, `sizeMode==="box"` resizes BoxGeometry and positions at `baseY+height/2`; presentation/proxy handling via `caps.presentation`.

## Sibling consistency sweep (after Box/Tree/Ladder proofs)
- Platform/Obstacle: via same box descriptor, `x/z/w/h/height` + `rotY` now editable, `y/baseY` live, collider parity verified.
- Rock/Fiber: uniform scale path same as Tree, rotation coherent, collider scales.
- Fence/Gate/ForestBoundary: same prop/box path, `rotY`/`size`/`visible`/`collision` live.
- Ground/Boundary: same box descriptor, footprint ownership preserved, proxy via same path, sibling materials unaffected.
- DropPod/Resonator: via prop/box, `rotY`/`size` coherent, special DropPod group handled.
- Water/Island: water `collisionEnabled false` correctly hidden from collision row, island collider true.
- Waypoint/Beacon/POI: position/rotation via normalized, `displayName`/`requires` via inspector, POI uniform scale where safe.
- Rusher/Spitter: `pos`+`facingYaw` via normalized, `homePos` follows spawn delta, all temperament/radius fields via inspector, no scale.
- Camp/Run Spawn: `position`+`facingYaw` only, no duplicate/delete, fixed ownership, `resolveSpawnCapsuleCenter` still uses `RAPIER_CONFIG` for runtime placement.

## Tests (new contract/integration, not source-string-only)
- `tests/phase4a2_2.test.js` (27 tests) covers: every object resolves once, Platform drag no shadow, Platform rotation/resize descriptor, Ladder dependent fields, Tree/Ladder placement real geometry, Box hidden proxy live, existing Boundary via same contract, registry-driven capabilities, Wildkin/POI/displayName persistence via export/reload, no shadow fields, VisualRef same Edit/Play, collider parity, full sibling sweep. All 489 tests pass (462 prior + 27 new).
- Existing resource visuals now deterministic (`variationRng = makeDeterministicRng(state.id)`); two `tree_abc` produce identical rotations, `tree_abc` vs `tree_xyz` differ.
- Vertical pan inverted, fog, region overlays, input latch, rAF single owner, world generation deterministic, zip size all still pass.

## Change Closure sweep note for shared-contract change
- Checked sibling families that share the normalized transform path: static props (Box/Fence/Gate/ForestBoundary/Water/Island/DropPod/Resonator), traversal (Platform/Obstacle/Ladder), resources (Tree/Rock/Fiber), anchors/POIs (Waypoint/Beacon/POI chest/barrier), Wildkin (Rusher/Spitter), spawns. All now exercise actual adapter/preview/runtime paths, not just compile.

## Phase 4A.2.2 stabilization correction — 2026-08-24

This checkpoint supersedes the earlier implementation report where it described runtime visuals as merely transform-compatible or claimed manual acceptance. The finalized contract is:

```text
Author UI / canvas input
        ↓
authorActions (capability-gated production controller)
        ↓
authorDraft transaction → resolved adapter → canonical object
        ↓
authorPreview
  ├─ VisualFactory root synchronization
  └─ ColliderDescriptor-driven Edit proxy synchronization
        ↓
Play reload
  ├─ staticWorldBuilder → VisualFactory
  ├─ resource lifecycle wrapper → VisualFactory resource visual
  ├─ Wildkin lifecycle wrapper → VisualFactory creature visual
  └─ simple descriptor-derived Rapier colliders
```

- `src/author/authorActions.js` owns production placement and transform/inspector commits. Capability checks happen before normalized candidates reach the draft transaction.
- `src/author/authorPreview.js` owns visual-root creation/rebuild, transform synchronization, disposal, and the one descriptor-driven hidden-collider proxy lifecycle. Author Mode retains only spawn-marker-specific presentation behavior.
- Visual recipe keys include the inputs that can alter geometry (`VisualRef`, dimensions, POI type/requirements). A dimension change rebuilds the entire local recipe, so Ladder wall, rungs, and marker cannot fragment.
- Runtime statics/traversal/anchors/POIs use `VisualFactory` directly. Resource and Wildkin systems keep their gameplay/lifecycle wrappers but obtain their detailed visible models from the same factory used by Author Edit.
- `createRuntimeResourcePlacements` is the explicit world-registry → resource-runtime adapter. It preserves `rotY`/`rotationY` and canonical `uniformScale`/legacy `scale` instead of narrowing placements to only ID/type/position. Resource rotation/scale therefore reach the runtime visual root, interaction height, overlap checks, and Rapier collider descriptor. Temporary wobble/respawn animation applies to the inner visual, preserving authored root transform.
- Gameplay keyboard capture rejects disabled input and focused input/textarea/select/contenteditable targets before shortcut handling. Author text fields therefore retain Space and other gameplay-bound keys; Waypoint/Beacon display names with spaces commit through the normal transactional inspector writer.
- Rotated rectangular footprints are recomputed conservatively for props, ground, platforms, obstacles, and Ladder-derived entry regions. Ladder writes update `wallNormal`, `approachDir`, `topPlatform`, `topEntryRegion`, and `mantleExit` in the same transaction.
- Pointer drags are capability-gated, track one active pointer, and restore canonical preview on cancel/lost capture. No second frame loop was introduced.
- Older tests that assumed an authored object was a scene-root `Mesh` now query the tagged visual root and descendant world transform. Phase 4A.2.2 proof tests call the production action and preview modules rather than recreating proxy logic inside the test.

Implementation and automated/browser verification are complete. The 2026-08-24 closure pass additionally verified editor-only proxies, Tree runtime transform persistence, and spaced Beacon display names through the real UI → Play reload. Spec §17 human acceptance remains pending; Phase 4B.0 is not authorized.

# Phase 4B.0 Primitive Visual Assets — IMPLEMENTED

## Canonical data and validation

```text
world.json
├─ visualAssets[]
│  ├─ id / displayName / version: 1
│  ├─ parts[] (flat primitive recipes)
│  └─ collision: null | one Box recipe
└─ regions[].props[]
   └─ subtype: visualAsset + visualAssetId + independent instance transform
```

- `src/world/worldValidator.js` owns strict normalization and validation for the top-level recipe table and instance references. Asset IDs and part IDs are unique in their scopes; colors are canonical `#RRGGBB`; transforms are finite; scales and collision sizes are positive; instance scale is a bounded positive uniform value.
- The v1 part vocabulary is intentionally closed: `box`, `cylinder`, `cone`, `sphere`, `capsule`, `icosahedron`. Parts are flat. There are no imports, textures, nested groups, arbitrary meshes, CSG, inheritance, scripting, or material graphs.
- Asset deletion is rejected while any world instance references the recipe. Export/reload runs through the same full-world normalization boundary, so a draft cannot persist dangling references or malformed recipes.

## Shared visual and collision paths

```text
VisualRef { kind: "asset", id }
        ↓
VisualFactory.createVisualAssetVisual(recipe)
        ↓
Author preview and Runtime Play use the same local primitive root

asset collision recipe + instance transform
        ↓
ColliderDescriptor.describeVisualAssetCollider
        ↓
Author collider proxy / native Rapier cuboid
```

- `src/world/visualFactory.js` is the sole primitive recipe interpreter. It creates deterministic local-space Three.js geometry, applies part-local transforms/colors, and tags roots/parts for selection and reconciliation. Recipe keys include the resolved asset recipe so a shared edit rebuilds all matching previews.
- Render geometry never becomes collision geometry. `src/world/colliderDescriptor.js` scales the one Box recipe by the instance uniform scale and rotates its local X/Z offset into world space. `src/world/staticWorldBuilder.js` consumes that descriptor to create a native Rapier cuboid and the normal obstacle record.
- Runtime presentation (`visible`, `collisionEnabled`, opacity, tint) remains the ordinary Author Object contract. Visual Asset instances therefore participate in selection, region rehome, duplicate/delete, independent transform edits, export, and Play like other props.

## Transactional Asset Edit ownership

- `src/author/authorDraft.js` owns asset and part mutation inside the existing transaction/normalization/undo stack. Deterministic counters create collision-free asset, part, and instance IDs.
- `src/author/authorUI.js` owns the dynamic palette and bounded inspector. `src/author/authorMode.js` owns the temporary Asset Edit camera/context, part selection and canvas-local X/Z drag, selected-part highlight, unrelated-root de-emphasis, and the dedicated collider proxy. It does not own another frame loop.
- `src/author/authorPreview.js` receives the current recipe table and rebuilds matching visual roots while preserving each instance's normalized transform. Undo/redo follows the same reconcile path.
- Entering Asset Edit through New/Place/Edit synchronizes the visible badge and the UI's authoritative edit-mode flag. Returning to Play therefore takes one click and clears Asset Edit-only presentation.

## Required proof asset

`asset_drop_pod` is the canonical Camp proof recipe. The existing Camp prop now references it through `subtype: "visualAsset"` instead of embedding a special visual. Its placement and simple Box collision remain independently authored on the instance/recipe boundary.

Phase 4B.0 automated and browser verification is complete; human perceptual/phone acceptance remains pending. Do not expand this into a general-purpose modeling tool. On acceptance, freeze this infrastructure and proceed to Phase 4B expedition pacing/content work.

# Persistence Separation — Phase 4A Guardrail

Three different persistence/state concepts must remain distinct:

```text
world.json
  authored world layout/data

Author Mode draft
  developer-only mutable world layout copy

frontierProgress save
  player bank + discovered/unlocked frontier state
```

`ExpeditionSession` is a fourth category: **temporary current-run state**, not persistence.

Do not merge these because they all happen to use localStorage/data objects.

# Reset / New-Run Integration Direction

Phase 4A needs a shared return/begin-run path that can coherently reset transient gameplay without duplicating logic across death, extraction, and gate-start callbacks.

Reset guarantees should cover:

- player position/health/action state,
- run inventory/XP,
- pickups/projectiles/XP motes,
- resources,
- creatures,
- region activation,
- session status/start anchor,
- no duplicate entities/colliders,
- Auto Harvest preference preserved,
- persistent bank/map progress preserved except intended outcome changes.

Prefer one small lifecycle coordinator/helper over three copied reset blocks.

# Performance Guardrails

Continue to preserve:

- one rAF,
- fixed 1/60 gameplay,
- bounded fixed-step catch-up,
- capped DPR,
- region/pocket-limited active simulation,
- bounded pools,
- no unbounded arrays,
- no per-frame DOM creation,
- small active creature counts,
- shared geometry/materials where practical,
- no whole-world AI loop,
- no unnecessary network/async streaming,
- profile before adding complex optimizations.

# Build & Submission

Required gates remain:

```text
npm test
npm run world:check
npm run verify
npm run zip
```

Submission requirements remain:

- offline runtime,
- local vendor/assets/data,
- readable/unminified first-party source in packaged build,
- root `index.html`,
- portrait-safe layout,
- <35 MB.

# Architecture Red Flags

Stop/reconsider if a slice introduces:

- second `requestAnimationFrame` loop,
- second physics engine,
- persistent player progress inside Map DOM or `main.js`,
- persistent bank inside live pickup inventory,
- duplicate run lifecycle owners,
- separate death/extraction reset implementations that drift,
- hard-coded Waypoint IDs scattered through UI,
- Author Mode draft and player progression sharing one key/owner,
- duplicate world coordinates outside the `world.json` pipeline,
- per-frame whole-world iteration after region activation,
- major feature framework not required by current slice,
- human world iteration blocked again on agent coordinate edits.

Phase 4A should cross one threshold only:

> **The current systems become a complete, repeatable Camp → expedition → secure-or-risk → outcome → Camp loop.**
