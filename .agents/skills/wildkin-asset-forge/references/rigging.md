# Rigging and motion proof

Image-to-3D output is a surface, not a rigged game character. Inspect the actual front, sides and rear for anatomy, joined limbs, hidden holes and separate equipment/foliage. Keep the approved silhouette and original UV/color texture through repairs.

## Proven quadruped entry point

The project has a Mossling-specific direct-deformation profile at `tools/art/rigs/mossling.json` and Blender helper `tools/art/rig-character.py`:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' --background --python tools/art/rig-character.py -- --input <reviewed-optimized.glb> --profile tools/art/rigs/mossling.json --output-dir <new-rig-directory>
```

It preserves the color texture/UVs, uses explicit bone landmarks and weights, exports an editable Blender source plus GLB, and round-trips the result. The profile was fitted to the retained Mossling master; do not apply its coordinates or weighting regions blindly to a different creature or humanoid. The helper's anatomy-specific behavior must be inspected/adapted when adding a new profile. Record the profile with the resulting source asset.

Blender automatic heat weights failed on this generated topology (zero assigned vertices in the trial). Rigify being installed does not mean it can automatically identify arbitrary anatomy. Use explicit anatomical landmarks or an appropriate fitted control rig. Small disconnected leaf/flower shells should remain attached to sensible bones; blending their corners to unrelated limbs produces stretching. Larger body/joint surfaces need smooth normalized weights and enough geometry to bend without collapsing. Maximum four active influences per vertex, no unweighted vertices, bounded deform-bone count.

## Check topology before repairing it

Inspect position-welded connectivity for diagnosis while preserving the original per-corner UVs in the actual mesh. Imported UV seams create duplicate positions and indexed boundary edges that are not physical holes. The Explorer trial had 23,340 indexed boundaries but zero physical open edges in its hands. Solidifying those boundaries damaged an intact model. Preserve the original mesh and fit the wrist/hand bones inside its actual bounds; rigid distal hand weights with a smooth forearm transition are the required correction before considering geometric repair. A rigid arbitrary vertex-set rotation can itself tear at the wrist and is not proof the original mesh is broken.

## Transform and animation contract

- Export glTF Y-up with character forward +Z, feet on Y=0 and explicit meter-scale height. Record the source-axis rotation instead of guessing it from the screenshot.
- The gameplay parent owns position, yaw and physics. The animated model is a child. Export in-place clips with no accumulated root travel.
- Map clip names to actual runtime states. Mossling uses Idle, Walk, Run, Attack and Hurt. Its faster flee behavior needs Run; speeding Walk up fivefold produces a visible buzz. A player needs its real movement/action states and hand/tool anchors; absence of these is not a finished humanoid integration.
- Set Blender glTF `export_anim_slide_to_zero=True` and verify the actual exported time accessors start at zero. A frame-1 start adds a frozen lead-in every loop in Three.js. Cycle duration is `(lastFrame-firstFrame)/fps`, not the inclusive frame count. The checker records actual GLB durations.
- Record authored movement speeds in `model.locomotion` and scale playback from actual world displacement and total instance scale. Mossling Walk is 0.98 m/s and Run is 4 m/s; a smaller companion needs a different playback rate. Do not scale attack timing with movement.
- The player gameplay root is at capsule center: its grounded 1.28 m model needs descriptor pivot Y=-0.52 at scale 1. Creature roots are already at the feet. Preserve physics and camera offsets.
- Bake portable bone transforms into glTF animations. Do not rely on Blender-only constraints or drivers at runtime.
- Loop idle/walk without a discontinuity. Attack/hurt are one-shot actions tied to existing gameplay events. Each instance has its own skeleton and animation state while sharing immutable mesh/texture data.

## Independent motion review

Still poses are a first gate only. Play complete exported GLB clips in the actual Three.js runtime. Review at least front/three-quarter and side views, all frames of the gait, and transitions between idle/movement/action. Translate along the declared +Z forward direction. Measure contiguous sole/paw support windows, not every low sample across a whole loop, and distinguish deliberate flight from unwanted floating. Include ground contact and a translated walking example to judge sliding rather than assuming any in-place walk is correct. Inspect knees/elbows, shoulder/hip junctions, belly, tail base, fingers, backpack and foliage attachments where relevant.

Fail on detached parts, collapsing joints, implausible limb order, severe clipping, drifting root, visible loop pops or feet sliding at the intended movement speed. A judge's conditional still-image pass remains pending until full motion is inspected. Record the actual motion evidence, its viewing angle and reviewer identity. If a weight or clip adjustment is made, export to a new revision and review that exact GLB hash.

Do not describe a procedural first-pass animation as polished merely because tracks exist. Document the class-specific setup and any manual corrections needed so the next asset can reproduce the process.

## Proven humanoid entry point

Use `tools/art/rig-humanoid.py` with `tools/art/rigs/explorer.json` and the original reviewed 20k Explorer input. Both this helper and the shared `rig-character.py` must be present. The fitted profile has 16 bones and exports Idle, Walk, Run, Sneak, Jump, Fall, Dodge, Climb, Mantle, Attack and Hurt. Gameplay speeds remain 1.6/3.3/6 m/s: Walk reads as a light jog and Run includes brief flight because this 1.28 m character cannot take ordinary long walking steps at those speeds. Do not change gameplay speed to hide bad foot motion.

The admitted Explorer descriptor, including its measured RightHand attachment and capsule-relative pivot, is retained in `art/source/explorer-v1/asset.json` (hand anchor under provenance) and the canonical world playerVisual. `tools/playtest-explorer-game-candidate.mjs` can preview a new staged GLB without replacing the production model. It is a diagnostic preview; inspect the actual tool grip rather than accepting parent-child hierarchy as visual proof.
