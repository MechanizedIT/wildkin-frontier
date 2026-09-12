# Independent camera engineering review

Date: 2026-09-12. Read-only review of the first pitch/collision implementation, before Root's native closure. **HOLD for two bounded clearance issues below.** This is an engineering finding, not a visual target score. No production edits, browser session, vendor-signature research or test run performed here. The worker's reported 23 focused passes are separate evidence.

Reviewed `cameraFollow.js`, `cameraCollision.js`, `gameCameraOrbit.js`, camera config/main wiring, the changed camera/input tests, and relevant static-world, Camp construction, resource, Author and occlusion owners.

## 1. High priority: retracting to an overlapping focus does not establish camera clearance

`cameraFollow.update()` interpolates the focus in all three axes and passes that point directly to the sweep. `cameraCollision.resolveDistance()` turns an initial overlap into zero distance; follow then places the camera at precisely that same focus. No branch validates or replaces an obstructed focus. The comment that this "collapses safely" is too strong: when the smoothed center is inside a solid, the camera is inside it too. With terrain represented by a surface mesh, a center below the surface can also cast toward the exit and stop short of it, remaining below the ground.

This is reachable in principle when the smoothed center cuts across a cliff/solid corner that the player walks around, or lags a fast vertical/ledge transition. It is a source-level failure of the clearance guarantee, **not a claim that a particular native Emberfall route has already reproduced it**. The 0-distance orientation fix correctly prevents a yaw/movement regression, but does not fix this separate spatial issue.

Bounded fix: validate the candidate follow focus against the active solid/terrain policy. On obstruction, use a checked current player-relative focus or last valid focus and sweep from that valid point; handle the case where that fallback is also obstructed explicitly. Keep this correction presentation-only. Do not push the camera out to a fixed minimum distance through a wall, move the player, or overwrite requested zoom. Test the actual corrected focus and final camera clearance, not only finite orientation or a nonnegative distance.

Native follow-up: walk around a tall convex corner and up/down a sharp supported transition while orbiting at low pitch. Inspect recovery after stopping. A diagnostic overlap fixture is useful, but distinguish it from an ordinary reachable route. Current tests cover a sphere starting in contact with a wall and preserve yaw at zero distance; they do not prove an interior focus escapes solid/terrain or that the final lens is clear.

## 2. Medium priority: runtime Camp solids are silently outside membership

The probe snapshots `physicsWorld.staticColliders` once. That array contains authored terrain, boundaries, platforms and authored solid obstacles from `createPhysicsWorld`, whose enabled state is checked correctly. However, `baseSystem.createInstance()` creates player walls, doorway posts/lintels, foundations and other fixed building colliders directly on the world. `campDefenses` likewise creates barricade/brace/console colliders directly. Neither owner registers those colliders in that array. All are therefore rejected by `staticSet.has(collider)` even while enabled and physically solid; later construction or save reload does not change this.

The result is asymmetric clearance: an authored wall retracts the camera, while a physically similar player-built wall or doorway lintel does not. Existing mesh fade may preserve player visibility, but it is not the promised physical camera clearance. Treat this as a deliberate category decision requiring closure, rather than describing the set as all active static solids.

Bounded fix: expose an explicit camera-solid membership lifecycle and register/unregister the relevant Camp structure/defense colliders on create/remove, retaining their existing activation ownership. A small injected membership predicate/shared set is sufficient; no scene traversal, new physics engine or broad collision-group framework is needed. Do not indiscriminately accept every fixed collider: `resourceSystem` also creates/removes fixed renewable-node and remnant colliders, and the foliage/fade policy must remain intentional. Cover created-after-probe, removed/rebuilt, inactive Camp and a doorway lintel, with no stale member after removal.

## What can stay

- Spherical pitch at 20–64 degrees, explicit look direction even at zero distance, and pre-physics yaw application retain a stable horizontal movement basis. I found no pitch-to-player-facing mutation in this wiring.
- User zoom, requested distance and temporary collision distance are separate. Immediate shortening and exponential recovery are appropriately small and readable; shortening does not persist a new zoom request.
- Right drag X/Y ownership, pinch exclusivity, remaining-touch coordinate reset, left joystick separation and input cancellation remain coherent. The added pitch path does not create a second gesture owner.
- Gameplay follow is suppressed in Author/Edit, input is disabled through the existing seam, and applying an Author draft reloads the runtime. I found no new game-camera update running over the editor camera and no stale runtime-world reuse from Apply.
- Active-section and authored-object enablement is respected for colliders that are in the set. Their factory identity is stable within this runtime. Player/creature/companion kinematics and sensors are filtered out. The problem is omitted runtime fixed families, not evidence that disabled sections presently collide.
- Foliage fading remains its own renderer-only owner after the camera update. Keep that separation and the single render loop. Native fading plus retraction still needs Root's actual evidence.

`collisionNearDistance` currently reports tight-clearance diagnostics rather than imposing a minimum. That is safer than forcing the camera beyond a nearby wall; naming/comments can make its diagnostic role clearer, but this is not a third blocker. No larger camera architecture rewrite is justified.

The focused tests establish useful arithmetic/input behavior but do not replace the two missing clearance cases or Root's ongoing native tests. Physical-phone framing and motion comfort remain unproven by this review.

## 2026-09-12 correction review — membership closed; terrain focus still HOLD

Reviewed the narrow correction without re-reviewing unchanged input. **Finding 2 is closed at source level. Finding 1 remains a concrete blocker for terrain meshes.** Root's native session is separate and still owns reachable-route evidence.

The shared live `cameraColliders` set now includes initial authored colliders and explicitly registered Camp construction/defense/console colliders. Both distance and focus queries use the same membership predicate and enabled-state check. Base replacement/disposal and defense replacement/disposal unregister before removing Rapier colliders; current visibility/section suppression remains with those owners. Renewable nodes/remnants remain deliberately outside membership. This is the small lifecycle correction requested; no extra registry architecture is needed. The new dynamic-member test directly exercises add/remove membership, while the production call sites supply the registration/removal lifecycle.

The focus fallback no longer caches a previous-section focus: it tries the current desired player focus and bounded local samples. `snap()` resets the center to the destination player's desired focus, preserving the existing transition contract. I found no new retained-focus state that drags a prior section's center into the destination. The new solid-box test correctly demonstrates recovery when interpolation intersects a box.

**Remaining defect:** `intersectionWithShape` checks whether the focus sphere intersects the terrain's triangles. A sphere entirely below a terrain surface does not intersect those triangles, so `isFocusClear()` incorrectly accepts it without trying the clear current focus. The subsequent upward camera sweep finds the terrain surface and stops below it. This is the original under-terrain concern, still unhandled by the new box-only regression.

Ran two small read-only Rapier diagnostics, not a suite or browser: a 20×20m horizontal terrain trimesh at Y=2, smoothed focus `(0,1,0)`, clear current desired focus `(0,3.4,0)`, requested distance 6. Both return `recoverFocus.status = 'clear'` at the below-ground point. At the production default **32° pitch**, returned distance is **1.3512899923m**, final camera Y **1.7160745985**, still below terrain Y=2. A vertical diagnostic also remains below ground (Y=1.6600028324). These are intentionally constructed fixtures; they prove the query failure, not an ordinary player-route reproduction.

Bounded next correction: make accepting a smoothed focus respect the playable side of terrain or validate its clear connection to the current valid player focus, so a separated below-surface candidate is rejected. Retain explicit active-solid filtering and current-focus recovery, and add the terrain-trimesh case. Check any local sample remains on the player's visible side of an intervening solid; finding an empty point above a lintel alone is not proof of visibility beneath it. No need to change orbit/input or reopen the closed membership fix.

Exact SHA-256 of reviewed correction:

| File | SHA-256 |
| --- | --- |
| `src/camera/cameraFollow.js` | `80ac4561f6d7ba12a2871e016dd4c315a43c57d6d9a8c48127d4a10ca6ed0ad3` |
| `src/camera/cameraCollision.js` | `cdaa0fac34b311412dadb2ad2335046d7a81b4502c09364e2dd7b548b4734040` |
| `src/physics/createPhysicsWorld.js` | `89bde19dee5733c35eda50981b91bf8e05c99eb792f89c359a422e1e8de54452` |
| `src/base/baseSystem.js` | `fb6dabdb4958e3de4c43c55eb8fffbf720de7af1915f6db15b32b949554d6354` |
| `src/base/campDefenses.js` | `914750cd5b2ad46d307ba3d42b55a6eea6da67cfc47f3f7e1a4b5da31ce01ce6` |
| `tests/cameraCollision.test.js` | `505ad024cb08df8f1c9c0de33dcde5d4774365eccd67cbda11aa41aa4b9c4870` |

No production files changed. Original findings remain above as history; this addendum supersedes their correction status only.

## 2026-09-12 final narrow review — PASS for the reviewed camera correction

**PASS at source/focused-test level: both original findings are closed for this bounded implementation.** This supersedes the HOLD statuses above; their evidence and original source hashes remain preserved. Native route, camera comfort and physical-phone admission remain Root's separate gates.

The probe now validates the current desired focus against **active terrain height + camera sphere radius**, as well as actual solid overlap. `staticWorldBuilder.getTerrainHeight()` factors the existing active-region `getSurfaceHeight` lookup without folding platform tops/lintels into the terrain height. Main injects that helper directly. This closes the below-trimesh classification error while permitting a genuinely clear focus beneath an overhead solid.

A smoothed focus is accepted only if a sphere sweep from the valid current focus reaches it without obstruction. Otherwise the camera uses the current focus. Both overlap and corridor/distance queries use the same active camera-solid predicate. No nearby upward sample remains to relocate the focus through a roof, and no cached previous-section focus was added. The existing transition snap and active-surface lookup keep recovery local to the current player/section.

I ran only `node --test tests/cameraCollision.test.js`: **8/8 passed**. This includes an actual Rapier terrain trimesh and moving follow center: the below-ground interpolation is replaced by current focus Y=3.4 and the final camera is above terrain Y=2. It also includes below-terrain desired focus explicitly reporting `blocked`, and a clear focus beneath a low lintel remaining accepted. The tests exercise the two different terrain/overhead cases rather than treating them as interchangeable. The box-recovery and runtime membership add/remove cases also pass.

Runtime Camp registration/removal remains as reviewed in the prior addendum. I additionally read the updated base runtime assertions covering removal/disposal, leaving Camp and Author suppression. The three exact authored canopy IDs (`asset_verge_canopy`, `asset_verge_canopy_tall`, `asset_verge_canopy_spread`) are omitted only from camera membership on both box and convex obstacle paths; their gameplay colliders remain registered and enabled by the original physics owner. `staticWorldBuilder` preserves the visual asset ID into those obstacle records. The canopy test checks all three families and an ordinary solid control. Those unchanged/additional test files were inspected, not independently rerun in this narrow pass.

An actually invalid desired player focus still reports `blocked`; the code does not promise to rescue arbitrary embedded players or every possible low ceiling. That is an explicit diagnostic limitation rather than a false `clear` result or a new roof-jumping fallback. Root's native route tests must show ordinary supported play avoids this unresolved state. This review does not turn a synthetic fixture into proof of reachable gameplay or device comfort.

Exact final reviewed SHA-256:

| File | SHA-256 |
| --- | --- |
| `src/camera/cameraFollow.js` | `80ac4561f6d7ba12a2871e016dd4c315a43c57d6d9a8c48127d4a10ca6ed0ad3` |
| `src/camera/cameraCollision.js` | `a3a6a5628bf46cea7662585316a7e54d3acd914e6a9a50368b1b83d4e7df1d9b` |
| `src/physics/createPhysicsWorld.js` | `83df71aaafb99343f49de0ee5f997a4d93c80edfc8990bb358bff5fb65285f4a` |
| `src/base/baseSystem.js` | `fb6dabdb4958e3de4c43c55eb8fffbf720de7af1915f6db15b32b949554d6354` |
| `src/base/campDefenses.js` | `914750cd5b2ad46d307ba3d42b55a6eea6da67cfc47f3f7e1a4b5da31ce01ce6` |
| `src/world/staticWorldBuilder.js` | `e44184404d3c48a129545e1d85adb5d39086ee10173830d10078fd23129ad9d3` |
| `src/main.js` | `211091d104054a1c907516e646ae32daa8e104c6e84ba0583e491f3359997f6d` |
| `tests/cameraCollision.test.js` | `ee11893f733d4c158c482f64a01dc3ab87e9b3b51bf6cb7f61f573f05210f50a` |

No production edits, browser, aggregate suite or new feature scope in this final review.
