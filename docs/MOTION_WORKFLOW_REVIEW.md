# Character motion workflow correction

September 10, 2026. Chris tested the local build on his phone, liked the model appearance, and reported a constantly sideways Mossling head/sideways running plus a stiff, wide-striding Explorer. This is a failure of the previous character acceptance process, not a reason to abandon the approved visual style. No replacement character is admitted by this investigation.

**Latest trial status:** Chris explicitly approved the prepared Explorer's free Mixamo upload/rigging/jog/run trial after the approval prompt was not visible. This supersedes the pending-permission text in the earlier preparation record below; do not request the same approval again. Mixamo opened successfully after one reload and is now at Adobe's password sign-in screen. The browser tab is retained for the owner to finish sign-in. No credentials were accessed and no character has been uploaded yet. Once signed in, continue the already-authorized trial; no paid services are authorized.

## Findings

**Mossling:** the exact shipping GLB's +Z view shows the face toward the camera but the long torso/flank running across the view, with forefeet on one side and hindfeet/tail on the other. The +X view shows the rear end. The face and body axes disagree by roughly a quarter turn. The first audit incorrectly equated face-forward with whole-animal-forward; explicit head/torso/paw comparison corrected that conclusion. The profile's front/rear limb coordinates assume one shared axis, so the attractive static model was not a sound input for this rig. A global yaw adjustment would merely swap which part faces incorrectly. Correct the rest surface or regenerate from a neutral reference and fit fresh landmarks; do not treat the old profile as a reusable animal rig.

Evidence: `.dream-loop/workflow-proof/mossling-final-axis-audit/front.png` and `game-plus-x/front.png`, rendered from `assets/models/mossling-v1/model.glb`; parent and independent axis reviewer inspected both. The wild and companion paths use heading derived from motion; both remain required end-to-end review cases after repair.

**Explorer:** `tools/art/rig-humanoid.py` drives forward/backward limb rotation while Hips has no rotational motion and Spine/Chest/Head mainly retain constant crouch angles. The small vertical bob does not provide natural weight transfer or torso counter-rotation. Its short leg chain also receives large planted-foot excursions; the IK clamps reach. The phone's stiff upper body and broad leg swing are consistent with that authored motion. Retain the liked mesh/texture and gameplay movement speeds; replace/refit locomotion rather than attempting to hide it with playback speed alone.

## Revised production sequence

1. Keep the approved identity, matte faceted style and colors. Generate a neutral Mossling reference with head, torso, front/rear paw pairs aligned. The actual mesh must pass front, both-side and rear anatomy review before rigging.
2. Trial one player jog and sprint from an appropriate humanoid animation source, fitted in Blender. The proposed first trial is Mixamo. Preserve the mesh/UVs, tool grip, root/pivot and existing eleven-state mapping; remove animation root travel and review transitions. The local procedural gait remains a repairable fallback, not the polished default.
3. Review complete exported clips and straight travel at actual speed in the game, front/side and at landscape phone size. Check body versus travel direction, contact, torso/hip response, stride and held tools. Wild and scaled companion must be checked separately. Owner phone observations can reject an earlier agent pass.
4. Use Dream Loop for generated targets and independent comparison, with Asset Forge for local TRELLIS/Blender/optimization/admission. Visual score >=8 is necessary for an art pass and cannot override failed anatomy or motion. Retain separate image author, implementer and judge roles.
5. Continue the existing 58-asset library plus runtime-family inventory in `DREAM_LOOP_REVIEW.md`, by class: common vegetation/resources and Camp props, remaining structures/landmarks, buildables/tools/drops, then distinct animated creatures using corrected anatomy-specific workflows. Static production can progress separately; do not batch a known-bad rig. Preserve stable asset IDs, collision, Author and offline behavior. No 35 MB package cap applies.

## Mixamo trial boundary and prepared input

[Adobe's FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) says Mixamo is free with an Adobe ID, permits use in games, and only supports bipedal humanoids. Its automatic rigging favors clean centered neutral characters. [Adobe's upload guide](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html) supports FBX, OBJ or ZIP, including embedded textures in FBX. This is a plausible animation source for the Explorer, not a quadruped solution or a proven project dependency.

`tools/art/prepare-mixamo-character.py` prepares a local unrigged bind-surface FBX without altering the shipping character or contacting Adobe. Trial output: `.dream-loop/workflow-proof/mixamo-explorer-trial/prepared-v1/explorer-rest.fbx`, 2,811,004 bytes, 23,958 vertices, embedded original 1024px color texture. Blender export/reimport preserved the mesh vertex count and textured material. `preparation.json` records the source/output hashes. Source rest pose and future downloaded motion still require visual review. Mixamo upload/rigging/retargeting has not yet been performed; owner authorization and an Adobe session are needed for that external step.

## Current delivery status

The independent image author produced three new Mossling targets. V1 was rejected as upright; V2 repeated the face-toward-viewer/body-broadside pose. V3 switches to a clear side profile, with one visible eye and head/body/paws aligned left. Parent visual review passes it for a local 3D trial only. Target and review: `.dream-loop/workflow-proof/mossling-neutral-reference/mossling-neutral-v3.png` and `reference-review.md`. No new TRELLIS run or rig has been made from it yet. Generated far-side leg separation must be checked again in the mesh.

Local FBX front/rear/three-quarter renders also preserve the Explorer's upright bind silhouette, separate limbs and texture. These verify preparation only, not auto-rigging or motion. The full verification passes 645 tests plus world/campaign/build checks, and ZIP remains 12,450.7 KB. The rAF ownership test now scans the actual runtime `src` tree; its earlier root-wide scan incorrectly counted an archived review checkout under `.dream-loop` as a second running game.

The live game still contains the previously admitted model revisions so it remains playable while replacements are evaluated. The workflow has been corrected; the visible defects are not yet fixed in the live build. Do not label the wider asset pass finished. Historical generated targets and reviews remain evidence of earlier iterations only.

The selected new target, generation prompt/provenance and independent reference review are retained in `art/targets/mossling-neutral-v3/`. Rejected generations remain in the ignored trial directory. This archive is an approved trial input, not an admitted game asset.
