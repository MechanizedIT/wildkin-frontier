# Character motion workflow correction

## September 11 phone follow-up — current status

Chris likes the revised models and Explorer animation, but finds all three
player locomotion modes around 30–40% too fast. Ground speed and speed-linked
cadence now use a provisional 0.65 multiplier: sneak 1.04, walk 2.145 and run
3.9 m/s. The existing native clip rates remain truthful. A clarification was
offered about cadence versus travel; applying both is an agent interpretation,
not an additional accepted owner decision. Walking still triggers authored
jumps after scaling the takeoff threshold, and the falling-control minimum
stays equal to walking speed. Ordinary-input review measured a 35% decrease
in each mode and passed attack, dodge and first-pad jump entry/exit.

Mossling-v2 appearance is liked, but its motion approval is reopened. A fresh
exact-hash audit identifies unclear footfalls, little weight transfer and a
hovering/puppet-like faster gait. The new fixed-length IK experiment improves
contact, and sole weights plus whole-component attachment weights fix distinct
skinning errors. However, v3/v4 still fail independent visual review: v4 scores
8.3 likeness, 6.9 walk, 6.4 run and 7.2 deformation. **No new Mossling model is
admitted or substituted.** Numeric contact correctness is insufficient.

[Quadruped research](QUADRUPED_RESEARCH.md) and Asset Forge's new quadruped
reference preserve the gait/contact/anatomy process and the actual downloaded
free Quaternius Fox/Husky/Wolf examples. Their pack-specific supplied license
is CC0. They are reference material; no third-party motion or geometry has
been integrated into the game. Rejected setup captures and wrong-old-model
audits are explicitly excluded from acceptance evidence.

Chris then authorized adding Blender MCP and assessing img2threejs. Community
Blender MCP 1.9.1 is installed in an isolated Python environment and registered
globally in Codex. Blender 4.5.3 runs a local workbench on 127.0.0.1:9876;
real MCP stdio scene inspection, viewport captures and frame edit/restore pass.
Telemetry and external generation integrations are disabled. The current
task may require tool-list refresh before the named MCP tools are exposed;
configuration and independent protocol verification are distinct claims.

img2threejs's own-GLB rig reader passed both shipping characters. Its anatomy,
skin-order and deformation evidence rules are useful; its procedural
TypeScript reconstruction and custom-JSON geodesic binder do not solve the
current Blender locomotion problem. The main skill is not installed wholesale.
Use the live workbench for compact loaded body poses, coherent foliage
attachment and motion-reference comparison, then export and independently
review before ordinary wild/companion travel. The wider asset pass remains open.

## Earlier replacement checkpoint

September 10, 2026. Chris tested the local build on his phone, liked the model appearance, and reported a constantly sideways Mossling head/sideways running plus a stiff, wide-striding Explorer. This is a failure of the previous character acceptance process, not a reason to abandon the approved visual style. The current outcomes below supersede the initial investigation status.

**Explorer repair admitted:** The approved free Mixamo trial uploaded the original Explorer bind surface, completed a 25-bone No Fingers rig, and supplied compatible motion for all eleven existing states. The exact export `8b266042d39e55eda223c3974b6d2f6af46b724938629969ada29420fdcefdf4` passed independent likeness at 8.4/10, full exported cycles, ordinary travel, corrected tool grip and active-game attack/dodge/jump-pad transitions. It is live as `explorer-v2`: 19,998 triangles, 25 bones, eleven clips and the exact original 1024 PNG. Native clip speeds calibrate animation cadence while gameplay remains 1.6/3.3/6 m/s. No paid service was used. Owner phone acceptance remains pending.

**Mossling repair admitted:** The new neutral reference generated locally in 304.5 seconds. Its 19,999-triangle derivative uses a fresh anatomical rig, modest torso/muzzle refinement, explicit vertical pelvis lift and five clips. The exact v3 export (f8043f46ef7d871a82a31a1271f9ea6feda145109a495f2e2a6a2846d7e58736) passed independent target likeness at 8.1/10, exported walk/run cycle review and actual wild/companion travel. It is packaged as mossling-v2 while retaining the stable world asset ID. The live development check confirms wild Walk/Run, independent companion skeletons and offline operation. Owner phone acceptance remains pending.

## Findings

**Mossling:** the exact shipping GLB's +Z view shows the face toward the camera but the long torso/flank running across the view, with forefeet on one side and hindfeet/tail on the other. The +X view shows the rear end. The face and body axes disagree by roughly a quarter turn. The first audit incorrectly equated face-forward with whole-animal-forward; explicit head/torso/paw comparison corrected that conclusion. The profile's front/rear limb coordinates assume one shared axis, so the attractive static model was not a sound input for this rig. A global yaw adjustment would merely swap which part faces incorrectly. Correct the rest surface or regenerate from a neutral reference and fit fresh landmarks; do not treat the old profile as a reusable animal rig.

Evidence: `.dream-loop/workflow-proof/mossling-final-axis-audit/front.png` and `game-plus-x/front.png`, rendered from `assets/models/mossling-v1/model.glb`; parent and independent axis reviewer inspected both. The wild and companion paths use heading derived from motion; both remain required end-to-end review cases after repair.

**Explorer:** `tools/art/rig-humanoid.py` drives forward/backward limb rotation while Hips has no rotational motion and Spine/Chest/Head mainly retain constant crouch angles. The small vertical bob does not provide natural weight transfer or torso counter-rotation. Its short leg chain also receives large planted-foot excursions; the IK clamps reach. The phone's stiff upper body and broad leg swing are consistent with that authored motion. Retain the liked mesh/texture and gameplay movement speeds; replace/refit locomotion rather than attempting to hide it with playback speed alone.

## Revised production sequence

1. Keep the approved identity, matte faceted style and colors. Generate a neutral Mossling reference with head, torso, front/rear paw pairs aligned. The actual mesh must pass front, both-side and rear anatomy review before rigging.
2. Use the tested same-skeleton Mixamo workflow for suitable humanoids, fitted and normalized in Blender. Preserve the original surface/UVs, tool grip, root/pivot and existing state mapping; remove root travel and review transitions. The old procedural gait remains a repairable fallback. Do not transfer its bone rotations blindly to the 25-bone rig.
3. Review complete exported clips and straight travel at actual speed in the game, front/side and at landscape phone size. Check body versus travel direction, contact, torso/hip response, stride and held tools. Wild and scaled companion must be checked separately. Owner phone observations can reject an earlier agent pass.
4. Use Dream Loop for generated targets and independent comparison, with Asset Forge for local TRELLIS/Blender/optimization/admission. Visual score >=8 is necessary for an art pass and cannot override failed anatomy or motion. Retain separate image author, implementer and judge roles.
5. Continue the existing 58-asset library plus runtime-family inventory in `DREAM_LOOP_REVIEW.md`, by class: common vegetation/resources and Camp props, remaining structures/landmarks, buildables/tools/drops, then distinct animated creatures using corrected anatomy-specific workflows. Static production can progress separately; do not batch a known-bad rig. Preserve stable asset IDs, collision, Author and offline behavior. No 35 MB package cap applies.

## Mixamo trial boundary and prepared input

[Adobe's FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) says Mixamo is free with an Adobe ID, permits use in games, and only supports bipedal humanoids. Its automatic rigging favors clean centered neutral characters. [Adobe's upload guide](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html) supports FBX, OBJ or ZIP, including embedded textures in FBX. This is a plausible animation source for the Explorer, not a quadruped solution or a proven project dependency.

`tools/art/prepare-mixamo-character.py` prepared the unrigged bind-surface FBX without altering the shipping character. Trial input: `.dream-loop/workflow-proof/mixamo-explorer-trial/prepared-v1/explorer-rest.fbx`, 2,811,004 bytes, 23,958 vertices, embedded original 1024px color texture. Blender export/reimport preserved the mesh vertex count and textured material. Chris authorized the free upload and signed in; upload, automatic rigging and compatible animation downloads are complete. Retained inputs and the standalone rebuild command are in `art/source/explorer-v2/rig-profile.zip`.

## Current delivery status

The neutral Mossling reference author rejected an upright V1 and another sideways-head V2. V3 uses a side profile with head, body and paw pairs aligned. Local TRELLIS generation, texture-aware reduction, fresh landmarks and a refined gait produced the admitted revision. A shared keyframing helper initially erased pelvis lift; the corrected neutral builder retains vertical motion while removing horizontal root drift. Reference and reviewed source packages remain separate from shipping GLBs.

For the Explorer, naive 25-to-16-bone retargeting and transfer of old action rotations visibly damaged the character. Those approaches were rejected. The production helper now defaults to the actual Mixamo skin and same-rig clips, restores the original PNG, normalizes centimeter rig internals to meter units, preserves cyclic pelvis bob and pins physics-owned action root travel. Full exported GLB review caught stale Blender preview poses. Runtime review caught the sanitized hand-bone name, wrong authored-speed metadata and an axe angled into the backpack; the persisted palm attachment fixes the latter without a gameplay change.

The final ordinary-input capture explicitly exercises F attacks during an active expedition, Space dodge, and W movement onto the first authored jump pad. Earlier all-idle captures used Camp, where attacks are disabled, and mislabeled Space as Jump; those are failed review setups, not passing action evidence. The new capture asserts state entry/exit and the independent judge inspected the actual images. Phone/desktop candidate checks also pass. All eleven clips have full-cycle visual evidence; this is not a claim that every climb/mantle location or combat encounter has been manually replayed.

Both corrected revisions are in the canonical world and generated data. Stable player/creature IDs, wild and companion instances, collision, gameplay speeds, saves and the single frame loop remain intact. `art/source/mossling-v2/` and `art/source/explorer-v2/` retain exact reviewed exports' sources and receipts; the Explorer additionally retains a self-contained FBX/texture/builder replay archive and runtime review evidence. Required aggregate build/package checks are recorded in the current build-log entry. Physical-phone acceptance and the wider 58-asset plus runtime-family pass remain pending.
