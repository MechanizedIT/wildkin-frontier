# Rigging research — September 11, 2026

**Recommendation, provisional:** keep the liked Mossling surface and repair its fitted torso/foliage deformation before changing rig systems or baking another complete motion library. Rigify is useful for authoring controls, but does not solve this mesh's skinning. Explorer's owner-liked Mixamo animation shapes should remain on their tested path; the requested slower locomotion is a separate runtime/cadence adjustment.

## What the supplied leads actually establish

| Lead | Verified result and limit |
| --- | --- |
| [CGDive: prebuilt human/quadruped metarigs](https://cgdive.com/rig-anything-with-rigify-chapter-3-the-prebuilt-metarigs-human-and-quadruped/) | Author's page read. It teaches human/dog metarig fitting and identifies wrong rig size, disconnected spine/head/tail, duplicate generated rigs and wrong limb bending as troubleshooting subjects. Embedded demonstrations were not watched. This supports a fitting exercise, not automatic animal recognition or a guaranteed game export. |
| [How to Rig and Animate in Blender](https://www.youtube.com/watch?v=1khSuB6sER0) | Page title accessible; no useful video/transcript content available in the fetch. Do not attribute specific steps or frame demonstrations to it. |
| [Second supplied video](https://www.youtube.com/watch?v=BYe9QeYBp3o) | Fetch failed; content and author-specific advice unverified. |
| [Supplied Reddit discussion](https://www.reddit.com/r/gamedev/comments/1ukaso4/best_blender_tutorials_that_show_creation_of/) | Accessible recommendation comment names Grant Abbitt and CGDive and suggests game-rig/NLA learning. It is discovery evidence, not technical proof of either course or our GLB export settings. |
| [Facebook group post](https://www.facebook.com/groups/3dartistsb/posts/7661216990582945/) | Throttled/unavailable. No content or workflow conclusion adopted. |

The supplied Google summary's Grant Abbitt and Royal Skies prescriptions were not verified from actual tutorial instruction. Its blanket origin/applied-scale/T-or-A-pose and centroid advice needs qualification: normalize on a coherent pre-bind copy, distinguish ground origin from internal pivots, use an anatomical quadruped stance, and place named joints by visual anatomical fit. Centroids can aid selected-volume measurements; they cannot locate hidden anatomy automatically.

## Primary-source findings that change our workflow

- [Blender 4.5 Rigify introduction](https://docs.blender.org/manual/en/4.5/addons/rigging/rigify/introduction.html) explicitly separates generated controls/bones from mesh skinning. The [positioning guide](https://docs.blender.org/manual/en/4.5/addons/rigging/rigify/bone_positioning.html) distinguishes rigid head/chest/pelvis from flexible boundaries. For Mossling this suggests checking anatomical pivots, transition weights and torso range before adding controls.
- [Bone roll](https://docs.blender.org/manual/en/4.5/animation/armatures/bones/editing/bone_roll.html) belongs to rest orientation. [Rigify limb settings](https://docs.blender.org/manual/en/4.5/addons/rigging/rigify/rig_types/limbs.html) distinguish automatic bend-axis inference from manual modes. Our custom IK needs explicit limb-plane inspection; arbitrary global roll resets or copied Euler signs can break mirrored legs.
- [Automatic weights](https://docs.blender.org/manual/en/4.5/animation/armatures/skinning/parenting.html) can require manual correction and can overwrite existing groups. On the generated 20k-triangle surface, semantic ownership of flower/leaf assemblies matters more than merely normalizing per-vertex weights. A flower attached to the body's connected component still needs its own reviewed selection.
- [Bake Action](https://docs.blender.org/manual/en/4.5/editors/nla/editing/strip.html) evaluates final constrained motion; Visual Keying captures it. Retain controls in the authoring master and validate the baked export copy without its source constraints.
- [Action slots](https://docs.blender.org/manual/en/4.5/editors/dope_sheet/modes/action.html) and [NLA strip settings](https://docs.blender.org/manual/en/4.5/editors/nla/sidebar.html) require checking the selected armature slot and clip timing. Our one-Action/one-track-per-clip convention keeps the library simple, but is not an intrinsic Blender limit.
- [Blender 4.5 glTF export](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html) distinguishes Actions from NLA Tracks. Installed exporter source confirms `export_animation_mode`, `export_force_sampling`, `export_frame_step`, `export_anim_slide_to_zero` and `export_def_bones`. Its legacy `export_nla_strips` explicitly does nothing. These options are now documented in the skill; correct clip names/counts/times still require actual GLB inspection.

Official English 4.5 pages sometimes returned 402 through the browser fetch; direct read-only HTTP retrieval succeeded for positioning, weights, bone roll and glTF. Source conclusions above use the actual 4.5 content plus installed exporter source, not newer-manual behavior inferred backward. No add-on installation, paid resource or heavy Blender job was used.

## Reuse free tools in the current stack

Owner steering favors existing free/open-source tools over recreating their capabilities. No framework switch or new dependency is needed for the next experiment.

| Existing tool | Fit, license/source and integration cost |
| --- | --- |
| Blender Rigify | Use its fitted metarigs and interactive controls if those are the bottleneck. Installed Blender 4.5 source identifies `GPL-2.0-or-later`; it is part of the documented 4.5 LTS toolchain. Already available, no paid add-on required. Cost is anatomical fitting, explicit weight repair and export-bake proof. It does **not** repair Mossling weights automatically. |
| Blender weight editing and Bake Action | Already installed; use the workbench's native selection/weight tools and evaluated bake rather than another custom auto-rigger. The custom code should retain only reproducible asset-specific selections, fitting and checks. Generated disconnected/connected foliage still requires a visual ownership decision. |
| [Khronos glTF-Blender-IO](https://github.com/KhronosGroup/glTF-Blender-IO) | Installed exporter is Apache-2.0; upstream documents the Blender 4.5 LTS release branch and round-trip/validator CI. Reuse its sampled GLB export. Integration cost is selecting the correct actions/slots/options and checking Three.js output, with no runtime dependency added. No exporter update is required for this study. |
| [Three.js SkeletonUtils](https://github.com/mrdoob/three.js/blob/r160/examples/jsm/utils/SkeletonUtils.js) | Already vendored from Three 0.160.0 under MIT, and `modelAssetRuntime.js` already uses `clone` for independent skeleton instances. Keep it. Its existing `retargetClip` transfers mapped bone motion; inspected r160 source does not fit joints or calculate replacement skin weights. An optional donor-motion comparison can reuse it after anatomy/rest-axis checks, but moving retargeting into gameplay would add cost without curing the torso/flower defect. Current online docs may describe newer versions; the vendored implementation governs this game. |
| [glTF Transform](https://gltf-transform.dev/) | MIT Node/Web tooling with existing inspect, resample, prune and dedup capabilities. Consider build-time reuse if a measured GLB packing/animation-size problem needs those operations. It is not needed for this rigging repair and does not solve semantic skinning. No install or codec/runtime integration proposed. |

The strongest reuse path is therefore native Blender fitting/weight tools → evaluated glTF export → the existing Three.js loader/mixer/SkeletonUtils path. The remaining custom work is anatomical judgment and asset-specific adaptation, not recreating these general libraries. Tool licenses above describe the software; donor asset reuse retains its separate provenance/license record.

## Local evidence and the next bounded experiment

The current shipping Mossling-v2 has 19 bones/five clips and a liked mesh, but owner-rejected motion. Analytic v3/v4 passed several numerical sole checks yet failed visual review. The later authored Wolf transfer adds chest/pelvis ownership and more readable gather/flight; its candidate remains rejected. Evidence: `.dream-loop/overnight-mossling-motion/retarget-v2/IMPLEMENTER-NOTES.md`, `root-review.md`, and output SHA-256 `8f5ad0f2ba70eeda2d012af7a23794031054c82abff7649372530f0bed2c4561`.

This research pass directly inspected the approved `art/source/mossling-v2/reference.png` and exact candidate `runtime-motion/run-side-04.png` and `run-side-01.png`. The phase-04 connection between chest and hips visibly loses substantial body volume; phase 01 shows an edge-on back flower. These stills corroborate the local rejection; they do not independently establish full-cycle timing. The candidate's standalone translated recording is not ordinary AI/gameplay proof, and its 2.27 m/s Run recording does not prove the prior 4 m/s game speed.

**Next experiment: one three-pose deformation study, then one short export.**

1. Duplicate the rejected retarget-v2 source into a fresh evidence revision; retain the approved mesh/texture and shipping asset. In the live workbench show neutral, loaded extension and gathered phase 04 from matched side/front views. Add visible named pelvis, chest, neck, shoulder/hip and leg landmarks plus axes. Keep source constraints/actions intact in the master.
2. Change only torso motion/weight ownership first: keep chest and pelvis attachment distances coherent, reduce their relative pitch to the range this short body can sustain, and smooth the belly/haunch transition. Compare with fixed cameras. Preserve donor contact order and gather/flight timing; do not tune slip numbers yet.
3. Select the whole back-flower crown semantically, including any vertices connected to the body. Inspect its neutral shape, chosen bone, inherited rotation/scale and base transition. Correct ownership/orientation if animated pose causes flattening; if it is already too flat in neutral, record a source-shape limitation rather than claiming weights can restore missing geometry.
4. An independent visual judge checks these three poses against the reference. If body volume/flower silhouette still fails, diagnose pivots/weights/topology and stop the full-cycle bake. If they pass, bake/export only Run, compare the same poses and two complete translated cycles with the exact export, then perform the existing contact and ordinary wild/companion travel gates. Recheck Idle/Walk/Attack/Hurt after any admitted weight/hierarchy change.

A Rigify trial is the next tool experiment only if this fitted surface can deform acceptably but authoring controls remain the obstacle: fit a minimal Basic Quadruped/Wolf metarig on a copy, prove one forelimb, one hindlimb and torso pose, and bake to a compact deform hierarchy. This is lower risk than replacing the skeleton, weights, gait and export method at once. It remains a producer recommendation, not owner-accepted art or a newly proven production method.

## Skill changes and validation

Asset Forge now routes problematic character fitting/export to `references/anatomy-and-export.md`, alongside its existing rigging, quadruped motion, workbench and independent-judge references. The source/export pose checkpoints precede expensive full-cycle work. No game code, model, generation script or accepted art was changed by this research task. The system skill-creator validator reports `Skill is valid!`; added local skill-reference targets were checked. Application-level test/build/ZIP ownership remains with the implementation parent.
