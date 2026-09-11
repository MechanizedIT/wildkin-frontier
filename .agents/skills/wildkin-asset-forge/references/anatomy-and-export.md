# Fit the anatomy before baking motion

Use this when a generated character has unstable joints, stretched torso or foliage, or when choosing between a custom deform rig and Rigify. Research provenance and the current Mossling experiment are in the project's `docs/RIGGING_RESEARCH.md`. This supplements the existing motion/admission gates; it does not admit a new rig.

## Choose the tool for the failed stage

Rigify generates controls and bones from fitted components; skinning remains separate ([Blender 4.5 introduction](https://docs.blender.org/manual/en/4.5/addons/rigging/rigify/introduction.html)). A prebuilt quadruped is a starting structure, not anatomical detection or an animation library. Use it when interactive IK/FK, paw roll and body controls would materially help authoring and its limb structure fits the mesh. Retain the metarig and editable control rig; do not replace a working export skeleton merely to acquire controls.

For Mossling, first correct the fitted deform rig's torso/attachment response with a few poses. Its short legs, large head, dense triangulated surface and foliage do not become well weighted by generating more controls. If the fitted surface passes deformation but authoring controls remain the bottleneck, trial a Basic Quadruped or Wolf metarig on a copy with minimal useful segments, then drive/bake a compact export skeleton. Do not install another add-on or begin a library-wide conversion for this experiment.

Reuse native Blender fitting/weight tools and its glTF exporter before writing replacements. The game already vendors MIT Three.js `SkeletonUtils` and uses its `clone` for independent instances. Its `retargetClip` may support a bounded motion-transfer comparison but does not infer anatomy or repair weights; inspect the project's r160 implementation rather than assuming current-web API behavior. Keep retarget/bake work offline. glTF Transform is a possible build-time option for a measured packing/resampling problem, not a rigging fix; no new dependency is needed here. Tool/license evidence and integration costs are in `docs/RIGGING_RESEARCH.md`.

## Neutral pose and named landmarks

- Preserve the liked source, UVs and texture. Show actual front, side and rear orthographic views with bone axes visible. Establish anatomical left/right, head direction, chest-to-pelvis direction and paw direction independently.
- Humanoids need a practical separated A/T rest pose. Quadrupeds need an anatomical four-paw stance with readable shoulder, elbow, wrist, hip, stifle, hock and paw; do not force them into a human T-pose. A slight natural bend declares each IK plane. Do not invent an extra hock where the stylized mesh has no corresponding articulation: document any simplified chain.
- Record named landmark positions with screenshots: pelvis inside the haunches, chest/ribcage support, neck base, head pivot, tail base, left/right shoulder, elbow, wrist/carpus, forepaw sole, hip, stifle/knee, hock/tarsus and hindpaw sole. Fit pivots to the intended joint and visible volume from at least two axes. A centroid of an anatomically selected cross-section can assist placement; a centroid of all nearby triangles, foliage or a whole mesh cannot define anatomy.
- Separate rigid head/chest/pelvis regions from the flexible connecting surface. Blender's [positioning guide](https://docs.blender.org/manual/en/4.5/addons/rigging/rigify/bone_positioning.html) describes rigid torso zones and boundary topology; use that principle with the creature's actual proportions, not the human diagram's coordinates.
- Normalize mesh/armature transforms coherently **before binding** on the working copy and record source-to-meter conversion. Keep ground origin and body pelvis pivot distinct. Do not apply transforms to one member of an already animated rig and assume the bind matrices/actions still agree.

## Bend axes, weights and attachments

[Bone roll](https://docs.blender.org/manual/en/4.5/animation/armatures/bones/editing/bone_roll.html) is part of the rest orientation around bone length. For a custom chain inspect local axes, pole direction and both mirrored limbs in a small bend. Identical Euler signs or zeroing every bone's roll is not a fitting method. Rigify's automatic limb-axis mode can infer roll from the bend; do not impose manual roll rules intended for a different mode. See [Rigify limbs](https://docs.blender.org/manual/en/4.5/addons/rigging/rigify/rig_types/limbs.html).

Automatic heat weights are only a first trial on a copy. They can overlap undesirably and overwrite existing same-named groups ([Blender parenting](https://docs.blender.org/manual/en/4.5/animation/armatures/skinning/parenting.html)). Preserve manually corrected groups. The project's failed heat-weight trial is evidence about that mesh, not proof that heat weights never work. Check physical connectivity separately from UV-split vertex indices; dense triangles are neither guaranteed bend topology nor an automatic reason to remesh.

Assign each decorative assembly an anatomical owner. A complete leaf/flower head should normally move rigidly with one bone; its stem/base may need a short smooth transition into the body. Use a reviewed semantic vertex selection even when the generator joined the flower to the body. Conversely, do not assign an entire connected body component rigidly because one flower belongs to it. Connected-component detection is a selection aid, not the ownership rule. Check attachment orientation as well as normalization: a rigid flower can still tilt into an unreadable edge-on sheet. Keep body-joint weights smooth, normalized and at most four active influences per vertex, with zero unweighted vertices.

Review neutral, loaded/compressed and gathered/extended poses before a full bake. The belly must keep substantial volume; shoulder and hip junctions must remain attached; paws must bend in their own planes; flower faces/leaves must keep their intended shape. Compare the same cameras and scale with real texture and a weight overlay separately. If collapse remains, distinguish excessive motion, bad pivots, bad weights and insufficient topology before choosing the next correction. Retopology is a targeted fallback when fitting/weights cannot sustain the needed pose, with UV/texture reprojection independently reviewed.

## Blender 4.5 actions and portable export

Keep authoring controls/constraints in the editable source; export evaluated transforms on the required deform hierarchy. Never copy donor Euler curves directly between incompatible rest axes. On an export copy, bake each approved clip's evaluated pose with Visual Keying, explicit frame range and frame step, then verify it with source constraints disabled. Blender documents that [Bake Action](https://docs.blender.org/manual/en/4.5/editors/nla/editing/strip.html) includes drivers/constraints in the final motion. Do not clear constraints on the authoring master. Root/object transforms need explicit handling as well as pose transforms. Do not rely on Blender-only B-Bone deformation or Preserve Volume looking identical in Three.js; judge the exported skin.

For this project's simple library use one named Action per runtime clip, assigned to the correct armature **Action slot**, and one corresponding NLA track/strip per clip. This is a project convention, not a claim that Blender requires one object per Action: [slotted Actions](https://docs.blender.org/manual/en/4.5/editors/dope_sheet/modes/action.html) may contain animation for multiple data-blocks. Preserve actions with a real active/stashed association, not only an unused name. Check the strip's slot, range, scale and repeat, and isolate the intended action while previewing to prevent stale NLA poses.

Choose export mode explicitly ([4.5 glTF manual](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html)):

| Actual Python option | Use |
| --- | --- |
| `export_animation_mode='ACTIONS'` | Independent baked Actions associated with the armature; active/stashed actions become clips. |
| `export_animation_mode='NLA_TRACKS'` | Deliberately evaluated track compositions, strip timing or modifiers. One desired clip per track. |
| `export_force_sampling=True`, `export_frame_step=1` | Sample evaluated animation at the declared scene FPS. |
| `export_anim_slide_to_zero=True` | Shift exported clip starts to zero; verify actual time accessors. |
| `export_def_bones=True` | Filter toward deform bones when exporting a control rig; inspect the resulting hierarchy/root/attachments. It does not prove a clean portable rig. |

These names were checked against the installed Blender 4.5 exporter. `export_nla_strips` is a deprecated **no-op**, not the mode selector. `export_bake_animation` means bake animation on every object; it is not a substitute for a correctly evaluated pose bake. `ACTIVE_ACTIONS` and `SCENE` can merge motion into one clip; do not use them accidentally for the five-clip library. Blender 4.4+ changed default action merging to action identity with slots, so verify final names/counts rather than trusting old track-name tutorials.

Retain an unmodified traveling source for cadence measurement. Export in-place horizontal motion while preserving intended local compression, pitch and flight. Measure distance/time after meter normalization; record authored speed and clip duration. Runtime playback must use actual ground displacement and total instance scale. Read the current game tuning: older skill examples predate the owner's September 11 request to slow Explorer locomotion about 35%. Do not change gameplay speeds to mask a poor gait.

Export one short diagnostic clip first. Compare three source/export poses and a complete cycle in Three.js, then proceed to the library and ordinary-input wild/companion/player paths that use it. Separate reference author, implementer and visual judge. Numeric skin/contact checks find errors; they do not establish body weight, charm or motion readability. Admission remains tied to the exact exported GLB hash and the existing motion gates.
