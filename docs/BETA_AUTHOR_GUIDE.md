# Sunlit Wilds 0.3.0-alpha.1 — author guide

Author mode is a desktop tool for the local alpha. Open the game with `?author=1`. It works on an isolated `wildkin.authorDraft` local draft; player progression, companions, and expedition cargo remain separate. This guide describes the current tools, not a release workflow.

## Work with a draft

Start in **Play Test** to inspect the current draft, then select **EDIT**. Editing suppresses player controls and the gameplay HUD so the scene remains selectable. Choose Camp or a frontier section from **Section Context** before placing or moving objects. Camp and each of the five sections use their own local coordinates.

Select an object in the scene or **Hierarchy**. The Selected card exposes player-facing transform and type fields. Drag on X/Z or enter a precise position. The palette places standard props, anchors, resources, and traversal helpers. Hold Shift while dragging to bypass the selected snap increment. Validate before switching back to Play Test.

## Shape a Sunlit Wilds region

Each region can own an authored landscape surface. Open **Landscape · paths, hills & water** to edit its palette, routes, raised landforms, ponds, and grass detail, then apply the changes. The editor keeps placed objects grounded against the edited surface and rejects invalid terrain data as part of the draft transaction.

Kill Volumes now preview as thorn-crystal beds in both Edit and Play. Their position, size and yaw drive the visible footprint and failure region together; put them under the flight gap, with clear space around the takeoff, landing and checkpoint. Course protection bounds remain editor helpers.

Use landscape to make a route legible before filling it: define the primary path, reserve clear movement space, put water and elevation at meaningful edges, then place landmarks, resources, creatures, and optional detours. Re-enter Play Test and approach the result as a player; visual placement alone does not prove a navigable route.

## Build objects and visual assets

Open **Visual Assets**, select an asset, then enter **Asset Workbench**. Asset recipes support simple parts and authored mesh parts with local transforms, materials, and collision. They drive the project’s original sculpted Wildkin, environment, Camp structures, resource visuals, and other editable low-poly models.

For harvestables, set drops, hit count, respawn timing, impact feel, and depleted remnant. For Wildkin, set species tag, behavior archetype, temperament, health, damage, movement, notice range, and leash. The four companion abilities remain tied to their catalogued asset IDs; changing a visual species tag does not create a new companion power.

## Validate, readiness-check, and export

Use **Validate** for structural world-data errors. Use **Campaign Readiness** for the draft’s route links, renewable economy, companion rewards, and finale requirements. Treat a READY result as a structural check, then play-test the actual route and interactions.

**Export** creates the complete validated world draft, including region surfaces, asset recipes, and custom fauna. Review the export before replacing `src/world/data/world.json`, then run:

```sh
npm run world:generate
npm run verify
```

The baseline authoring script rebuilds the canonical authored world and can overwrite an editor export. Keep reviewed exports separate until deliberately integrated. Undo and redo are available during editing; validate again after undoing or redoing a landscape or object change.

## Short author acceptance pass

In EDIT, make one recognizable object adjustment and one modest landscape change. Use Undo and Redo, then confirm both states visually. Switch to Play Test, follow the intended route to the changed object, and verify visibility, collision, terrain grounding, and the expected interaction or creature behavior. Record the section and landmark for any blocked route, floating object, hidden prompt, or visual regression.

The current evidence and open quality work are tracked in the [Sunlit Wilds review](SUNLIT_WILDS_REVIEW.md) and [visual redesign plan](VISUAL_REDESIGN_PLAN.md). The older [beta candidate report](BETA_CANDIDATE_REPORT.md) is historical.
