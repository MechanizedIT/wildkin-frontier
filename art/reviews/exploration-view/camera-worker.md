# Portrait camera worker receipt

## Result

- Portrait exploration now defaults to a 36° pitch and `1.5` profile zoom. With the unchanged base camera offset, neutral user zoom requests `11.5910795442m`.
- Landscape remains 32° with `.85` profile zoom.
- Portrait construction remains 42° and now uses `.8` relative user zoom. The combined `1.5 * .8` multiplier preserves the former construction request exactly: `9.2728636354m`.
- Existing construction ownership and restoration are unchanged. Cancel restores yaw, pitch, and zoom; successful placement retains useful yaw while restoring pitch and zoom; orientation close restores the saved portrait pitch before selecting the unchanged landscape profile.
- FOV, focus height, near/far planes, collision, shared `.72..1.3` zoom limits, input ownership, and camera persistence were not changed.

## Owned changes

- `src/game/config.js`
- `src/camera/constructionView.js`
- `tests/cameraFollow.test.js`
- `tests/constructionView.test.js`

## Focused proof

Command:

`node --test tests/cameraFollow.test.js tests/constructionView.test.js tests/landscapeCameraInput.test.js tests/landscapeInputAdapters.test.js`

The first run passed 23/24. Its only failure was an overly strict floating-point equality in the new construction-distance composition assertion (`2e-15m` difference). That assertion was corrected to a `1e-12` tolerance. The other 23 tests passed, including all construction, landscape camera, and input-adapter siblings.

Focused correction rerun:

`node --test tests/cameraFollow.test.js`

Result: 3/3 passed. No aggregate, browser run, build, or commit was performed by this worker.

