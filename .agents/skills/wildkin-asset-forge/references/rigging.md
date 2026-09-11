# Rigging and motion proof

Image-to-3D output is a surface, not a rigged game character. Inspect the actual orthographic front, both sides and rear for anatomy, joined limbs, hidden holes and separate equipment/foliage. Keep the approved silhouette and original UV/color texture through repairs. For a reference-driven production pass, first read [dream-loop-production.md](dream-loop-production.md).

## Establish source orientation before a rig

Fit a rig only after reviewing a neutral source pose. A humanoid needs a relaxed A- or T-pose with limbs distinct; a quadruped needs a relaxed, four-paw stance with distinct feet/paws and a readable head-to-spine line. Render the actual mesh in front, side and rear orthographic views before authoring bones or clips.

Establish **body forward**, **head forward**, and the paw/foot pair directions separately from the surface. A profile name, declared axis, bone landmarks, skeleton hierarchy or a good still cannot prove that the mesh faces its travel direction. In particular, an appealing three-quarter source can show a face facing +Z while its torso/flank, forefeet, hindfeet and tail run along X: yaw-normalizing that whole mesh cannot solve its head/body disagreement. Repair or reorient the source pose before accepting the rig. Record the decided source axes and the applied transform.

The game contract remains glTF Y-up, feet at Y=0 and ordinary travel forward at +Z. Validate this with an actual straight, ordinary-input game/runtime travel recording, viewed from front/three-quarter and side—not only by transforming a bone or sampling its numerical displacement.

## Existing quadruped helper — motion acceptance reopened

The project has a Mossling-specific direct-deformation profile at `tools/art/rigs/mossling.json` and Blender helper `tools/art/rig-character.py`:

The original source/profile is **not a production quadruped template**. The owner's phone test exposed a sideways head/body relationship that earlier reviewers missed. Retain the helper for its texture/export mechanics, but fit fresh anatomical landmarks after correcting or regenerating the neutral source. Do not reuse its front/rear leg coordinates for the corrected mesh.

The corrected neutral reference and sources are retained in `art/source/mossling-v2/`. Its production builder is `tools/art/rig-neutral-mossling.py`, fitted profile `tools/art/rigs/mossling-neutral-v2.json`. For **that exact neutral source**, set `MOSS_NEUTRAL_SCULPT=v2` before running the builder to reproduce the recorded local torso/haunch and muzzle refinement. Preserve the raw master and texture-aware reduction recipe; do not run that deformation or those landmarks against an unrelated generated animal.

```powershell
$env:MOSS_NEUTRAL_SCULPT='v2'
& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' --background --python tools/art/rig-neutral-mossling.py -- --input <reviewed-neutral-20k.glb> --profile tools/art/rigs/mossling-neutral-v2.json --output-dir <new-rig-directory>
```

It preserves the color texture/UVs, uses explicit bone landmarks and weights, exports an editable Blender source plus GLB, and round-trips the result. The profile was fitted to the retained Mossling master; do not apply its coordinates or weighting regions blindly to a different creature or humanoid. The helper's anatomy-specific behavior must be inspected/adapted when adding a new profile. Record the profile with the resulting source asset.

Blender automatic heat weights failed on this generated topology (zero assigned vertices in the trial). Rigify being installed does not mean it can automatically identify arbitrary anatomy. Use explicit anatomical landmarks or an appropriate fitted control rig. Small disconnected leaf/flower shells should remain attached to sensible bones; blending their corners to unrelated limbs produces stretching. Larger body/joint surfaces need smooth normalized weights and enough geometry to bend without collapsing. Maximum four active influences per vertex, no unweighted vertices, bounded deform-bone count.

## Check topology before repairing it

Inspect position-welded connectivity for diagnosis while preserving the original per-corner UVs in the actual mesh. Imported UV seams create duplicate positions and indexed boundary edges that are not physical holes. The Explorer trial had 23,340 indexed boundaries but zero physical open edges in its hands. Solidifying those boundaries damaged an intact model. Preserve the original mesh and fit the wrist/hand bones inside its actual bounds; rigid distal hand weights with a smooth forearm transition are the required correction before considering geometric repair. A rigid arbitrary vertex-set rotation can itself tear at the wrist and is not proof the original mesh is broken.

## Transform and animation contract

- Export glTF Y-up with character forward +Z, feet on Y=0 and explicit meter-scale height. Record the source-axis rotation instead of guessing it from the screenshot.
- The gameplay parent owns position, yaw and physics. The animated model is a child. Export in-place clips with no accumulated root travel.
- In-place does not mean freezing every pelvis translation. Retain vertical compression, weight transfer and deliberate flight in ground locomotion. The old shared `key_pose` forcibly reset root location after its caller supplied a bob: the neutral Mossling wrapper now keys its own vertical root motion. For jumping/climbing/mantling, distinguish the gameplay-owned trajectory from local body compression so the animation does not add a second jump or climb.
- Map clip names to actual runtime states. Mossling uses Idle, Walk, Run, Attack and Hurt. Its faster flee behavior needs Run; speeding Walk up fivefold produces a visible buzz. A player needs its real movement/action states and hand/tool anchors; absence of these is not a finished humanoid integration.
- Set Blender glTF `export_anim_slide_to_zero=True` and verify the actual exported time accessors start at zero. A frame-1 start adds a frozen lead-in every loop in Three.js. Cycle duration is `(lastFrame-firstFrame)/fps`, not the inclusive frame count. The checker records actual GLB durations.
- Record authored movement speeds in `model.locomotion` and scale playback from actual world displacement and total instance scale. Mossling Walk is 0.98 m/s and Run is 4 m/s; a smaller companion needs a different playback rate. Do not scale attack timing with movement.
- The player gameplay root is at capsule center: its grounded 1.28 m model needs descriptor pivot Y=-0.52 at scale 1. Creature roots are already at the feet. Preserve physics and camera offsets.
- Bake portable bone transforms into glTF animations. Do not rely on Blender-only constraints or drivers at runtime.
- Loop idle/walk without a discontinuity. Attack/hurt are one-shot actions tied to existing gameplay events. Each instance has its own skeleton and animation state while sharing immutable mesh/texture data.

## Independent motion review

Still poses are a first gate only. Play complete exported GLB clips in the actual Three.js runtime. Review at least front/three-quarter and side views, all frames of the gait, and transitions between idle/movement/action. Translate along the declared +Z forward direction using ordinary game input. Measure contiguous sole/paw support windows, not every low sample across a whole loop, and distinguish deliberate flight from unwanted floating. Include ground contact and a translated walking example to judge sliding rather than assuming any in-place walk is correct. Inspect knees/elbows, shoulder/hip junctions, belly, tail base, fingers, backpack and foliage attachments where relevant.

For quadrupeds, verify that head and body both face the travel direction; then inspect left/right leg order and a stable four-paw stance before judging speed. For humanoids, the full-body gait must show natural hip and chest response, balanced arm swing and a stride appropriate to body height and game speed. A rigid upper body, very wide leg swing, or lower-body travel that reads sideways fails even when feet technically alternate. Match gameplay velocity by local playback retiming or clip work; do not change gameplay movement to conceal a poor gait.

Fail on detached parts, head/body directional disagreement, collapsing joints, implausible limb order, severe clipping, drifting root, visible loop pops, sideways ordinary-input travel, stiff humanoid torso, unreasonable stride, or feet sliding at the intended movement speed. A judge's conditional still-image pass remains pending until full motion is inspected. Record the actual motion evidence, its viewing angle and reviewer identity. If a weight or clip adjustment is made, export to a new revision and review that exact GLB hash. An owner physical-phone observation reopens a motion pass regardless of clip count, metrics or prior still images.

Do not describe a procedural first-pass animation as polished merely because tracks exist. Document the class-specific setup and any manual corrections needed so the next asset can reproduce the process.

## Humanoid animation sources and entry point

Use `tools/art/rig-humanoid.py` with `tools/art/rigs/explorer.json` and the original reviewed 20k Explorer input as a repairable local baseline. Both this helper and the shared `rig-character.py` must be present. The fitted profile has 16 bones and exports Idle, Walk, Run, Sneak, Jump, Fall, Dodge, Climb, Mantle, Attack and Hurt. Gameplay speeds remain 1.6/3.3/6 m/s: Walk reads as a light jog and Run includes brief flight because this 1.28 m character cannot take ordinary long walking steps at those speeds. Do not change gameplay speed to hide bad foot motion.

Mixamo is an **owner-authorized, tested biped rigging and animation source**. Chris approved this Explorer trial and completed sign-in; do not ask for that approval again. Adobe documents its free Adobe-ID workflow ([FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html), [rigging guide](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html)). The prepared FBX auto-rigged successfully using chin, wrist, elbow, knee and groin markers, symmetry, and the 25-bone No Fingers skeleton. Keep an ordinary neutral pose and inspect the full body at a sufficiently wide browser viewport. If resizing distorts Mixamo's canvas, reload before positioning markers.

Download compatible clips on the **same uploaded skeleton** as FBX Binary, 30 fps, no keyframe reduction. One With Skin file supplies the fitted surface; animation packs can supply skeleton-only FBXs plus a character file. Keep originals and exact settings/hashes outside shipping assets. `tools/art/retarget-mixamo.py` merges the compatible actions locally and restores the exact original PNG. Its historical filename does not mean that arbitrary rig retargeting is safe: naive 25-to-16-bone rest-axis transfer and transfer of the old procedural actions both visibly failed. Prefer the tested fitted skeleton instead of copying transforms between incompatible rest poses.

Measure each locomotion source's traveled distance on a root-motion copy, normalize to the final meter scale, and record its authored speed. Gameplay remains 1.6/3.3/6 m/s; animation descriptor speeds may differ and drive playback rate. Validate the resulting cadence and ground contact in ordinary game movement. Fit source action crops to the existing brief gameplay actions rather than letting a two-second anticipation play during a fraction-of-a-second dodge or attack. Preserve originals and record crop frames and final exported durations. Export every action through explicit NLA tracks and verify names/durations in the **actual GLB**, not just Blender's action list. Blender preview sheets can accidentally show a stale NLA pose; use `tools/capture-character-motion.mjs` on the export and verify phases change.

Check armature units and held-tool size as well as the outer model bounds. Mixamo FBX can leave a 0.01 internal armature scale with centimeter bone coordinates, which shrinks any meter-sized tool parented directly to the hand. The tested helper bakes that scale into the rig and animated translation curves, preserving the 1.28 m surface while exporting a unit-scale armature. Changing the hand bone name alone is insufficient. The FBX/GLB hand name is `mixamorig:RightHand`, but the vendored Three.js loader sanitizes it to `mixamorigRightHand`: use the **actual loaded name** in the runtime descriptor. All eleven state, tool, ordinary-travel and independent review gates still apply; service success is not character admission. Mixamo is not a solution for quadrupeds.

The current Explorer descriptor, including its measured palm attachment and capsule-relative pivot, is retained in `art/source/explorer-v2/asset.json` (hand anchor and playerVisual under provenance) and canonical world playerVisual. Follow [mixamo.md](mixamo.md) for the tested recipe. `tools/playtest-explorer-game-candidate.mjs` can preview a staged GLB and descriptor without replacing production; `tools/review-model-travel.mjs` captures translated gait, active-expedition attack, Space dodge and authored-pad Jump. Inspect actual tool grip rather than accepting parent-child hierarchy as visual proof.

For a local Mixamo preparation only, run Blender with `--python tools/art/prepare-mixamo-character.py -- --input <reviewed-player.glb> --output-dir <fresh-directory>`. This exports the existing bind surface as an unrigged FBX with embedded texture and verifies a local reimport. It excludes Blender's imported bone-display widgets. It performs no upload, does not create a new A/T pose, and cannot establish Mixamo rigging or animation compatibility. Inspect the source pose before use.
