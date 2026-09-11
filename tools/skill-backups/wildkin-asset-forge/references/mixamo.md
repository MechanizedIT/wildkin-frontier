# Mixamo humanoid animation recipe

Use this only for a humanoid asset whose own mesh and texture can be uploaded to Mixamo. It is a candidate-production workflow, not admission evidence.

## Prepare and rig

1. Use `tools/art/prepare-mixamo-character.py` to export the original character's unrigged bind surface as a clean neutral, upright FBX with embedded texture. Keep the original base-color PNG separately; Mixamo FBX re-import may duplicate or alter material nodes.
2. In the browser, upload the FBX and place the chin, wrist, elbow, knee and groin markers shown by the auto-rigger. Use No Fingers for this mitten-style Explorer (25 bones). Review the cloud preview for an upright head, forward-facing gait, compact feet, and normal shoulder swing before downloading.
3. Download **FBX Binary, With Skin, 30 fps, Key Reduction: none** for the neutral/primary clip. Download every animation for that exact uploaded rig. Skeleton-only clips from Mixamo packs are valid only when their 25-bone names exactly match the primary rig.
4. Retain every downloaded FBX beside the candidate. Never use an unrelated stock character clip or a clip with a different bone-name list.

The helper `tools/art/retarget-mixamo.py` defaults to this safe same-rig path. Its old direct 16-bone retarget is deliberately gated behind `--experimental-retarget`: the Explorer test deformed limbs and backpacks because the two rigs have incompatible rest axes and weights.

## Explorer v2 reproducible command

This records the tested input mapping. Use a new output directory for a replay; the retained recipe archive in an admitted source package can avoid downloading the animations again:

```powershell
blender --background --python tools/art/retarget-mixamo.py -- `
  --input assets/models/explorer-v1/model.glb `
  --texture .dream-loop/workflow-proof/mixamo-explorer-trial/prepared-v1/texture-0.png `
  --jog '.dream-loop/workflow-proof/mixamo-explorer-trial/downloads/Standard Run.fbx' `
  --run '.dream-loop/workflow-proof/mixamo-explorer-trial/downloads/Fast-Run-travel.fbx' `
  --clip 'Idle=.dream-loop/workflow-proof/mixamo-explorer-trial/downloads/Breathing-Idle.fbx' `
  --clip 'Sneak=.dream-loop/workflow-proof/mixamo-explorer-trial/downloads/Sneaking-Forward.fbx' `
  --clip 'Jump=.dream-loop/workflow-proof/mixamo-explorer-trial/downloads/adventure-pack/jumping up.fbx@1:8:0.233333' `
  --clip 'Fall=.dream-loop/workflow-proof/mixamo-explorer-trial/downloads/adventure-pack/falling idle.fbx' `
  --clip 'Dodge=.dream-loop/workflow-proof/mixamo-explorer-trial/downloads/adventure-pack/falling to roll.fbx@16:43:0.22' `
  --clip 'Climb=.dream-loop/workflow-proof/mixamo-explorer-trial/downloads/Climbing-Up-Wall.fbx' `
  --clip 'Mantle=.dream-loop/workflow-proof/mixamo-explorer-trial/downloads/Braced-Hang-To-Crouch.fbx@1:35:0.28' `
  --clip 'Attack=.dream-loop/workflow-proof/mixamo-explorer-trial/downloads/Stable-Sword-Outward-Slash.fbx@1:62:0.46' `
  --clip 'Hurt=.dream-loop/workflow-proof/mixamo-explorer-trial/downloads/Standing-React-Small-From-Front.fbx@1:37:0.333333' `
  --output-dir .dream-loop/workflow-proof/mixamo-explorer-trial/candidates/explorer-auto-skin-full-motion-v2 `
  --resolution 240
```

`NAME=FBX@START:END:SECONDS` crops source frames and resamples to whole 30-fps frames. This fits existing gameplay state timing; it does not add gameplay. In particular, the short crouched Dodge is an animation fit for the existing dodge duration.

## Motion and scale policy

- Preserve vertical Hips motion for cyclic Idle, Walk, Run, and Sneak. Hold their local horizontal travel at the first-frame baseline so foot weight transfer remains visible.
- For physics-owned Jump, Fall, Dodge, Climb, Mantle, Attack, and Hurt, hold all Hips translation at the baseline. Keep limb rotations/crouch/extension; gameplay owns travel and vertical trajectory.
- Measure a non-in-place travel FBX before choosing a cadence. Explorer v2 native rates were Sneak 1.32719 m/s, Walk 2.636013 m/s, and Run 3.376671 m/s. Runtime gameplay remains 1.6/3.3/6 m/s, so the animation controller uses game speed divided by the native rate. Do not set descriptor locomotion to gameplay speed when the controller expects authored speed.
- Mixamo imports commonly use an armature scale of `.01` with an inverse `100` mesh child scale. Bake this to meter units before export and multiply pose-location keys by the old armature scale. Verify world mesh height is unchanged (Explorer: 1.28 m) and armature/bones are scale 1. This prevents a 100x local hand attachment.
- Three.js sanitizes `mixamorig:RightHand` to `mixamorigRightHand` in GLTFLoader. Use the sanitized name in runtime descriptors. Start tool placement at an actual weighted palm location, then visually fit it in the real game; a geometric Explorer v2 seed was approximately `{x:.012,y:.04,z:.024}`. Euler orientation must be fitted against the running character, not guessed from Blender alone.

## Required gates

1. Run `tools/art/check-game-glb.py` with the player profile and all eleven clip names. Verify triangles, bones, texture dimensions, original base-color SHA, and clip count.
2. Inspect the exported GLB, not Blender's action editor. Capture full endpoint-inclusive clips from multiple views, including Idle, Walk, Run, Sneak, Jump, Fall, Dodge, Climb, Mantle, Attack, and Hurt.
3. Run `tools/review-model-travel.mjs` with a fresh `OUTPUT_DIR`, exact `PLAYER_MODEL` and persisted `PLAYER_DESCRIPTOR`. Confirm the character faces travel, no sideways gait/head, no root flight, grounded feet, compact stride at gameplay speed, and tool stays in the palm during locomotion and attack. Field Tool attacks require an active expedition; Camp deliberately disables them. Space is Dodge, and Jump comes from crossing an authored traversal trigger. Hold synthetic taps across game frames and assert the real state entered and exited. Never label an all-idle capture an action pass.
4. Have an independent reviewer judge the images/video. A structural pass, cloud preview, or a static Blender still is insufficient.

Known failures caught by this workflow: stale NLA/static proof frames; deleting vertical pelvis bob (made gaits float); using root trajectory in physics states (double motion); choosing Jogging for a 3.3 m/s walk (needs excessive 2.8x cadence); direct legacy retarget deformation; and an unsanitized bone name or unnormalized rig that places the tool through the backpack.

This recipe is humanoid-only. Quadrupeds and creatures require their own neutral-pose, rig, gait, and anatomy review pipeline.
