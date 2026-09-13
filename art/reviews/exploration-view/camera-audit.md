# Portrait exploration camera audit

## Recommendation

Use the existing orbit control to native-blockout **38° portrait pitch at the current portrait zoom**, then make that the default only if Camp, Caldera, and grove comparisons agree. This is a one-value change in `CAMERA_CONFIG_FOLLOW.portraitPitch` in `src/game/config.js`; it needs no camera mode, new controller, FOV change, or collision change.

The current camera has vertical FOV `52°`, focus height `.9m`, base offset distance `7.727m`, portrait pitch `42°`, and portrait distance multiplier `1.2`, producing a requested distance of `9.272m`. On flat ground at a `412×915` aspect:

| Portrait profile | Camera height above player ground | Camera distance behind player | Ground at top of frame | 20m-ahead ground NDC Y |
|---|---:|---:|---:|---:|
| Current `42°`, zoom `1.2` | `7.10m` | `6.89m` | `17.9m` ahead | `1.054` (clipped) |
| Candidate `38°`, zoom `1.2` | `6.61m` | `7.31m` | `23.8m` ahead | `.930` |
| Strong fallback `36°`, zoom `1.2` | `6.35m` | `7.50m` | `28.5m` ahead | `.870` |

At `38°`, five-, ten-, and fifteen-metre ground points move from NDC Y `.404/.713/.914` to `.353/.631/.808`. This opens useful vertical room for resource and creature silhouettes while retaining the current subject scale and distance. The 36° fallback is feasible but should be used only if the native blockout still cannot show the intended 20–25m route; its lower camera path has more collision and horizon-compression risk.

## Existing control path

Normal gameplay already supports bounded pitch and zoom on the open right half:

- A roughly **12px downward drag** at the configured `.006 rad/px` moves portrait pitch from 42° to about 38°. About 17px reaches 36°. Pitch is clamped to `5–64°` and does not rotate the player's yaw-relative movement basis.
- Two right-side touches moving closer zoom out; mouse wheel down does the same. User zoom is clamped to `.72–1.3`. For the first blockout, retain user zoom `1` and profile zoom `1.2`. If pitch alone is insufficient, try only a modest user zoom around `1.05–1.08` before changing the default `portraitZoom`; larger values shrink the player and extend the collision corridor.

Pitch preferences are already stored separately for portrait and landscape during the session. Yaw and user zoom survive aspect changes; resize clears active drag/pinch ownership and updates only the perspective aspect.

## Preserved sibling behavior

- Keep `CAMERA_CONFIG` (`52°` FOV, `.9m` focus, base distance, near/far planes) unchanged. Changing FOV or focus would affect every mode, character framing, projection assumptions, and collision recovery.
- Keep landscape at `32°` with `.85` profile zoom. `cameraFollow.syncCameraProfile` restores its independent landscape pitch after rotation.
- Keep portrait construction at `CONSTRUCTION_VIEW_CONFIG` `42°` and user zoom `1`. Construction already snapshots yaw/pitch/zoom, aims at the placement target, and restores the exploration pitch and zoom on cancel or placement. Thus a 38° exploration default does not weaken the current building view.
- Camera collision remains presentation-only. It shortens the spherical offset against active static colliders and recovers toward the requested user distance without moving the player or altering requested zoom.

## Ownership and focused proof

- Default tuning: `src/game/config.js` (`CAMERA_CONFIG_FOLLOW.portraitPitch`; optionally `portraitZoom` only after blockout evidence).
- Existing profile/collision owner: `src/camera/cameraFollow.js`, with no behavioral change expected.
- Existing gestures: `src/input/gameCameraOrbit.js`, with no behavioral change expected.
- Construction override/restoration: `src/camera/constructionView.js`, retained at 42°/1.
- Focused tests if the default changes: update `tests/cameraFollow.test.js` for the exact portrait default and requested distance; retain `tests/constructionView.test.js` restoration across cancel/place/resize and `tests/landscapeCameraInput.test.js` landscape independence. Gesture ownership is already covered in `tests/landscapeInputAdapters.test.js`.

Native acceptance should compare the same feet/yaw at Camp, the Caldera breach, and a familiar grove. Record requested versus effective collision distance, player screen size, five-/ten-/twenty-metre ground projection, mineral/creature visibility, and landscape restoration. Camp placement should still enter 42° construction view and restore the exact prior exploration pitch afterward.

## Risks

- A shallower pitch lowers the camera about `.49m` at 38° and can meet rising terrain or Camp solids sooner. Collision retraction is safe but may erase the intended view gain, so effective distance matters more than the requested value.
- More distant ground can increase visible triangles/draws within the already bounded residency, especially in dense Lush cells. Compare render calls and visible triangle count; no streaming or far-plane expansion is justified by this audit.
- Camera tuning cannot recover pixels covered by the objective, minimap, or inventory HUD. Judge world projection separately from HUD occlusion and combine it with the independent HUD audit.
- The existing broad manual range down to 5° is useful for inspection but unsuitable as a new default. Do not persist a construction pitch into exploration or unify the portrait and landscape pitch profiles.

**Preferred blockout:** `portraitPitch: 38°`, `portraitZoom: 1.2`, user zoom `1`. **Fallback:** `36°` at the same zoom. Avoid FOV, focus-height, collision, far-plane, and construction-view changes unless native evidence isolates a separate defect.

## Native-selected default (supersedes the pre-blockout recommendation)

The native comparisons select **36° portrait pitch with a total portrait distance multiplier of `1.5`**. Configure that as `portraitPitch = 36°`, `portraitZoom = 1.5`, and neutral `userZoom = 1`. This reproduces the winning native blockout exactly: the blockout's old profile `1.2` multiplied by temporary user zoom `1.25` is the same total `1.5`. It also leaves saved/session user intent at the neutral value instead of baking the default into a user adjustment.

At the current base distance of about `7.727m`, the candidate requests `11.591m`, versus `9.272m` today. At 36°, the camera is about `9.38m` behind the focus point and `6.81m` above it, or about `7.71m` above player ground after the `.9m` focus height. The inspected Caldera capture fits the right stage, raises the near-left spire from the reported 58.8% to 90.4% visible, and brings both mineral anchors into the frame. The grove capture retains a clear central subject and destination silhouette while revealing substantially more surrounding terrain. The objective panel can still cover high distant content; camera tuning cannot itself solve HUD occlusion.

Use the following minimal production values once implementation is authorized:

- `CAMERA_CONFIG_FOLLOW.portraitPitch = THREE.MathUtils.degToRad(36)`.
- `CAMERA_CONFIG_FOLLOW.portraitZoom = 1.5`.
- `CONSTRUCTION_VIEW_CONFIG.zoom = 0.8`, retaining its existing 42° pitch.

Construction zoom is relative to the active profile. The new `1.5 * 0.8 = 1.2` combination preserves the current construction requested distance of `9.272m` exactly, along with its current 42° projection. The existing snapshot/restore path should return to exploration pitch 36° and user zoom 1 after placement or cancellation. Landscape remains 32° with profile zoom `.85`; no landscape config, gesture ownership, or resize contract needs to change.

Retain the shared user zoom limits of `.72..1.3`. With the wider portrait profile, they yield requested distances of about `8.345..15.067m`, compared with the current portrait range of about `6.676..12.055m`. The portrait extreme-close endpoint therefore moves outward. Lowering the shared minimum would also alter landscape behavior and would add a profile-specific range contract without evidence that it is needed.

The collision implementation remains compatible because it shortens only effective distance and later restores toward the request. The longer, shallower camera corridor will retract more often near Camp walls, Caldera buttresses, and grove canopies, which can reduce the visual gain. Native acceptance should record requested and effective distance at those three witnesses. The farther default also makes the player, combat telegraphs, harvest focus, companion, and placement preview smaller and may reveal more rendered scenery; those are the material perceptual and mobile-cost checks even though the far plane, residency rules, and collision algorithm are unchanged.

Focused production proof:

- `tests/cameraFollow.test.js`: assert the actual portrait defaults resolve to 36° and `baseDistance * 1.5`; assert landscape remains 32° and `baseDistance * .85`; retain independent portrait/landscape pitch memory and `.72..1.3` user limits.
- `tests/constructionView.test.js`: from the portrait default, construction uses pitch 42° and user zoom `.8`, yielding exactly the former `baseDistance * 1.2`; placement and cancellation restore pitch 36° and user zoom 1; resize during construction still selects landscape and later restores portrait 36°.
- Keep the existing landscape input-adapter proof for pinch, vertical orbit, and resize ownership. No new camera-collision unit contract is needed; requested/effective-distance native witnesses are the useful check for real occlusion.
