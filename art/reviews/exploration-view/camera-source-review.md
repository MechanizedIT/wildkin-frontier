# Exploration camera source review

Independent bounded review, September 13, 2026. **SOURCE PASS.** Native framing remains root-owned.

The ordinary portrait profile changes from 42° / `1.2` distance scale to 36° / `1.5`. Construction keeps its established requested distance by applying the temporary `0.8` user zoom: `CAMERA_CONFIG.distance × 1.5 × 0.8 = CAMERA_CONFIG.distance × 1.2 = 9.273m`. Its temporary pitch remains 42°. Landscape retains its existing 32° pitch and `.85` distance scale.

`cameraFollow` remains the single camera-state owner. `constructionView` stores only one temporary `{yaw,pitch,zoom}` snapshot, uses the public follow methods, and adds no update loop, camera position calculation, input owner or resize listener. `baseSystem` continues to own the placement lifecycle and sends the existing begin/end events.

Exit-path review passes:

- cancel, external close, hidden-page close, viewport resize, orientation change, leaving Camp, superseding placement and disposal all reach the same `phase:'end'` restoration path;
- cancel/external restore yaw, pitch and zoom exactly; duplicate begin/end calls are inert;
- successful placement intentionally retains the useful target-facing yaw while restoring pitch and zoom, and the next placement snapshots that retained view normally;
- if aspect changes before close, restoration first writes the saved portrait pitch, then `snap()` switches to the untouched landscape profile while retaining that portrait preference for a later return;
- landscape and square-aspect construction begins are no-ops, and invalid targets cannot create a restoration snapshot;
- player position and movement state are never mutated.

Focused command:

```powershell
node --test tests/cameraFollow.test.js tests/constructionView.test.js
```

Result: **7/7 passed**. Tests cover the exact 11.591m ordinary portrait request, exact retained 9.273m construction request, collision shortening without request corruption, independent orientation pitch preferences, cancel/place restoration, resize into landscape, duplicate lifecycle calls, landscape no-op and invalid targets.

No source repair is indicated. Perceptual claims about additional visible terrain, construction preview readability and physical-phone safe areas require the current native run; the source/tests establish the camera contract only.
