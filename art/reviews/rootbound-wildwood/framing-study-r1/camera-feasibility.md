# Rootbound blockout — portrait camera feasibility

## Finding

The current Rootbound repair captures use the production portrait rig: 52° FOV, base focus height `0.9m`, horizontal distance `6.55m`, portrait distance multiplier `1.5`, and pitch `36°`. At Meadow (`-475, 590`, yaw `3.012`) the player is already in the lower half of the normal portrait frame; the useful forward ground and blockout silhouettes compress toward the upper UI region. The blockout needs more usable forward-frame area, not a HUD move or a new camera system.

`cameraFollow` already owns a safe temporary capture lever: `portraitPitch`. It creates the camera direction from yaw/pitch, keeps camera-relative movement based on yaw, and clamps the value to the existing `[5°, 64°]` interval. The active portrait value is `36°`; landscape uses `32°`.

## Recommended scene-only comparison

Use a temporary Rootbound capture configuration with **`portraitPitch: 32°`**, keeping all of these baseline values unchanged:

- yaw and player position;
- `focusHeight: 0.9m`;
- `portraitZoom: 1.5` and user zoom `1`;
- FOV, near/far planes, terrain, scenery, collision settings, and HUD.

This is the smallest existing-rig adjustment. A local projection check at the Meadow repair state (52° FOV; 330×732 capture coordinates) moves a point 15m forward from y≈116px at 36° to y≈148px at 32°, away from the top HUD, while the player's projected center changes only about 2px downward. The exact CSS/canvas scaling differs in the saved native PNG, so root's matched capture—not those absolute pixels—decides usefulness.

Capture the same Meadow, Gallery, and Crown stations with the baseline and 32° variant. Record `cameraFollow._debug()` for each: pitch, requested/effective distance, collision distance, focus recovery, and center. Retain the variant only if it reveals a meaningful forward shoulder/landmark without putting the player, primary interaction label, or landmark under HUD controls.

## Why the nearby alternatives are not first

| Option | Effect | Consequence |
| --- | --- | --- |
| **Pitch 36° → 32°** | Places forward ground lower in the portrait frame. | Existing config path; collision ray direction changes, so capture debug must confirm no new clamp. Recommended first comparison. |
| Focus height `0.9m` → `1.25m` | Lowers the player about 18px in the same local projection and shifts the entire aimed composition upward. | It also moves the collision focus point upward and changes the default distance/pitch unless pitch is explicitly held. Consider only if 32° still leaves the player too high; it risks pushing the player toward the hotbar. |
| User zoom above `1` | Shows more world by increasing requested distance. | Reduces silhouette scale and can be shortened by collision. It is already player-controlled through right-half pinch, so it is not a stable showcase composition change. |
| Projection-matrix / film offset | Could shift all world projections without moving the rig. | No current supported path. It would change interaction-label and combat-feedback projections without changing camera collision, creating a second framing contract. Do not add this for a capture. |
| Direct `camera.position` nudge after follow update | Looks cheap for one screenshot. | The next `prepareForInput`/`update` overwrites it and debug/collision state no longer describes the rendered camera. Do not use. |

## Input, targeting, and collision limits

- The fixed left movement control and empty right-half orbit split are screen-region rules (`touchMovement`, `gameCameraOrbit`); a pitch-only capture does not move those hit areas.
- Right-half drag calls `cameraFollow.orbitBy`; pinch/wheel call its bounded zoom. Neither maps a touch to a world target. Movement remains camera-yaw-relative, so pitch-only changes do not rotate movement intent.
- Nearby action labels and creature envelopes project their live world anchors through the current camera every update (`worldInteractionAnchor`). A retained framing change therefore needs ordinary label visibility checked in the same capture; no CSS offset should be coupled to it.
- Camera clearance is presentation-only, but it is real: `cameraCollision` tests the focus's local terrain clearance and shape-casts from focus along the orbit direction. Pitch changes that direction; raising focus height changes the focus itself. The temporary capture must retain `focusRecovery: "clear"` and an effective distance equal to the requested distance, or record the clamp as a failed comparison.

## Existing contracts to preserve

- `createCameraFollow` owns center smoothing, pitch/yaw/zoom, collision probing, and the final `lookAt`; no scene code should mutate the camera afterward.
- Existing tests cover portrait distance/pitch initialization and collision-distance propagation (`tests/cameraFollow.test.js`, `tests/cameraCollision.test.js`) plus portrait/landscape orbit behavior (`tests/landscapeCameraInput.test.js`). A later retained configuration change would add a focused portrait projection assertion and collision-debug assertion; this study changes no source or tests.

## Source evidence

- `src/game/createCamera.js:5-13` — FOV 52°, base height/focus/distance.
- `src/game/config.js:94-102` — portrait pitch, bounded pitch range, and profile zoom.
- `src/camera/cameraFollow.js:6-19,39-61,98-118` — focus center, profile pitch, requested distance, collision calls, and debug state.
- `src/camera/cameraCollision.js:50-95` — terrain/focus validation and direction-dependent clearance cast.
- `src/input/gameCameraOrbit.js:20-79` — right-half orbit/pinch ownership.
- `src/ui/worldInteractionAnchor.js:9-42,53-192` — live camera projection and occlusion path for action presentation.
- Visual basis: `art/reviews/rootbound-wildwood/showcase-blockout-r1/repair-meadow.png` and `repair-galleries.png` inspected 2026-09-14.

This is a capture recommendation only. It does not authorize a permanent camera change or compensate for missing Rootbound massing.