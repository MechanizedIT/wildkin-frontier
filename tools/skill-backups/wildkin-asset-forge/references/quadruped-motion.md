# Quadruped motion: neutral pose, contacts and proof

Use this reference for a four-legged character after its model/texture likeness has independently passed the image review. It is a class-specific recipe, not a promise that arbitrary image-to-3D topology can be auto-rigged. The current Mossling analytic IK candidate is **experimental** and is not admitted until the exported GLB, ordinary AI travel and independent Dream Loop review pass.

**September 11 result:** analytic candidates v3 and v4 passed exported sole
measurements but failed independent motion review (v4 walk 6.9, run 6.4,
deformation 7.2; likeness 8.3). Do not rerun the same recipe and treat it as a
production solution. Keep its contact measurement and coherent-shell weighting
lessons, then use the [live Blender workbench](blender-mcp.md) and the actual
free animal motion reference to review loaded body poses and rig attachments
before another bake. The current shipping Mossling remains v2, with motion
acceptance reopened by the owner.

Read [rigging.md](rigging.md), [admission.md](admission.md) and the project’s `docs/QUADRUPED_RESEARCH.md` first.

For the later authored Wolf transfer's torso/flower rejection and the next three-pose fitting study, read `docs/RIGGING_RESEARCH.md` and [anatomy-and-export.md](anatomy-and-export.md). Keep the useful donor rhythm, but do not repeat full gait bakes until the loaded torso and attachment silhouette pass.

## Neutral anatomy gate

1. Render actual orthographic front, both sides and rear views before placing bones. Confirm separately that head, chest/spine, tail, forepaws and hindpaws all point along one travel axis. A three-quarter beauty render, a profile label or a skeleton hierarchy is not proof.
2. Use a relaxed four-paw neutral stance: all paws distinct, feet/soles visible, head aligned to spine, tail separated, shoulders and haunches readable. Regenerate or repair a source that has a turned head on a broadside body; yawing the whole mesh cannot solve that defect.
3. Set the runtime contract explicitly: glTF Y-up, model feet at Y=0, model forward +Z, with position/yaw/physics owned by gameplay. The animation itself remains in-place horizontally.
4. Measure and record actual landmark centers for chest, pelvis, shoulder, hip, elbow, stifle/hock, wrist/ankle and sole. Show each armature bone axis. Fore and hind chains must use their real bend directions; do not copy the same Euler sign to every lower limb.

For foliage, flowers, horns or equipment, choose their intended attachment bone before weighting. Small disconnected shells are usually rigidly weighted to head, spine or tail; blending them across a leg or body seam causes visible stretching. Test full reach, full collection, both sides and a head turn before authoring clips. Require no unweighted vertices, at most four normalized weights per vertex and no shoulder/haunch collapse.

## Gait specification

Use anatomical right/left, from the animal’s own point of view, throughout plans and evidence. Do not describe contact order as “viewer right” or “screen left”.

### Walk: lateral, four-beat contact

The working default is a lateral-sequence walk. The four distinct touchdown events are:

| Cycle phase | Touchdown |
| --- | --- |
| 0% | right hind (RH) |
| 25% | right fore (RF) |
| 50% | left hind (LH) |
| 75% | left fore (LF) |
| 100% | RH, matching frame 0 exactly |

Give each paw a long stance interval, typically about 60–70% of the cycle, and a short recovery/swing interval. During stance, lock the sole in world space and translate the body through it; do not key a local paw oscillation and call it planted. The walk should normally retain two or more supports, with a small pelvis vertical arc, body pitch, a shoulder/hip response, and a restrained head/neck counter-bob. Do not turn this into a diagonal-pair trot by landing front-left/rear-right together.

### Faster state: validate a gallop from contacts, not labels

For the present Mossling `Run` target, author a compact, asymmetric gallop with a declared contact table. A useful starting order is a hind-led sequence progressing through the forepaws; adapt it to the creature’s actual proportions and the approved reference. Each touchdown, stance interval, lift-off and any aerial interval must be keyed and reported per paw. Hind limbs collect under the pelvis then extend for push-off; forelimbs reach, compress on loading and recover; chest/pelvis pitch, head/neck lag and tail follow-through must make the speed legible.

A diagonal trot is a safer intermediate gait when an authored speed does not need a gallop: left-fore/right-hind contact together, then right-fore/left-hind at 50%. Do not call a left/right synchronized “both fore, then both hind” shuffle a gallop. An aerial interval is optional; it must be deliberate, brief and visibly clear of the ground rather than a floating error.

The anatomy and contact references are [the measured canine gait study](https://pmc.ncbi.nlm.nih.gov/articles/PMC4517757/), which reports a lateral walking sequence, and [the locomotion review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7805771/), which describes roughly quarter-cycle hind/ipsilateral-fore/contralateral-hind/contralateral-fore contacts. Use these to design original motion; do not extract their images or data into the game.

## Current analytic IK experiment

`tools/art/animate-quadruped-ik.py` is the current Mossling-specific authoring method. It is not Rigify and must not be presented as a general auto-rigger. It:

- takes an exact reviewed Mossling candidate GLB into a fresh output directory; source-model acceptance does not admit its motion;
- retains its accepted surface, UVs, bind skeleton and non-locomotion actions;
- solves each upper/lower chain analytically at fixed bone length to a sole target, preserves bind-sole orientation, and keys baked transforms at 120 fps;
- makes dominant paw vertices in the bottom 5 cm rigid to the paw, with a 5 cm weight transition above, so lower-leg bending cannot drag the sole through the floor; this preserves rest geometry and UVs but requires fresh deformation review;
- attaches an entire disconnected flower/leaf component to one fitted body bone; assigning each vertex independently to its nearest bone does not make a component rigid;
- keys in-place horizontal animation while allowing bounded body compression/pitch; and
- records authoring target, joint, loop and computed stance-slip gates in `motion-provenance.json`.

The helper’s internal checks are only an authoring gate. They cannot prove exact exported-GLB sole contact, gameplay terrain contact, visual anatomy, cadence or target likeness. Its output must remain in a fresh evidence directory until all gates below pass. Keep no Blender constraints, drivers or control objects in the shipping GLB: bake only portable transforms on the required deform skeleton.

### Reproduce the fitted Mossling experiment

Run from the repository root, using a fresh revision folder each time. The input
is specifically the accepted Mossling-v2 bind surface and 19-bone skeleton;
this command is not suitable for an unrelated quadruped.

```powershell
$candidate = '.dream-loop/workflow-proof/mossling-motion-v3/candidates/new-review'
& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' --background --python tools/art/animate-quadruped-ik.py -- --input assets/models/mossling-v2/model.glb --output-dir $candidate
C:/Python310/python.exe tools/art/check-game-glb.py --input "$candidate/model.glb" --profile creature --required-clips Idle Walk Run Attack Hurt --output "$candidate/structural-report.json"
$env:MODEL_URL = "/$candidate/model.glb"
$env:PROFILE_PATH = "$candidate/motion-provenance.json"
$env:OUTPUT_PATH = "$candidate/export-contact-check.json"
node tools/check-quadruped-motion.mjs
$env:OUTPUT_DIR = "$candidate/runtime-motion"
$env:CLIPS = 'Idle,Walk,Run,Attack,Hurt'
$env:HEIGHT_METERS = '1.2'
$env:SPEEDS = 'Walk:0.98,Run:4'
node tools/capture-character-motion.mjs
$env:MOSS_MODEL = "$candidate/model.glb"
$env:OUTPUT_DIR = "$candidate/game-travel"
node tools/review-model-travel.mjs
```

The existing travel helper supplies diagnostic wild roaming and ordinary
companion following; it does not automatically certify two unobstructed cycles
or FLEE coverage. Capture those additional views explicitly and reject an
occluded camera setup. Never infer successful coverage from a frame count or
from labels such as `wild-flee` without checking actual state and images.

The local game server must be running on port 8080 for browser checks. The
sole checker rejects a profile whose output SHA-256 differs from the actual
loaded GLB. It measures deformed sole vertices and checks clip duration, stance
slip, height variation, penetration, root drift and the loop endpoint. Inspect
actual images even when every numeric gate passes. A source control target can
be perfect while mixed skin weights still make the visible foot slide.

## Export and review gates

1. Export a fresh GLB with actual zero-start clips. Verify the exported bytes, clip names/durations, scale, triangle count, texture hash, bone count and in-place root X/Z horizontal motion. A Blender Action list is not export proof.
2. Use the standalone Three.js cycle capture to inspect every phase plus the wrap frame from front, side and three-quarter views. Render with the real texture, matte materials and a floor/grid.
3. Measure contiguous sole-contact intervals from actual exported GLB sole points, not only bone heads or a low-paw proxy. Check contact world position, penetration, hover, foot crossing, joint continuity and a visible loop seam. For a planted stance, report slip against gameplay travel; do not infer it from a low paw sample.
4. Capture ordinary runtime travel on level ground using both wild-creature AI and companion AI where the asset serves both roles. Inspect front, side and three-quarter views at actual gameplay speed. Verify forward alignment, no sideways crabbing, no floor plank/hover, no skating and a visibly distinct walk/run.
5. A separate Dream Loop judge reviews the actual reference, static export, full exported cycles and ordinary travel. A score below **8/10** for target likeness is a revision, not admission. A conditional score, a static-only review, a structural pass or a self-authored report does not pass motion.
6. Keep the exact source/reference, profile or script revision, editable Blender file, raw/reduced model, output GLB SHA-256, capture paths and reviewer decision. A later phone observation reopens admission even if these gates previously passed.

## Free reference assets

The [Quaternius Ultimate Animated Animal Pack](https://quaternius.com/packs/ultimateanimatedanimals.html) has a public anonymous download containing animated Fox, Husky and Wolf in Blender and glTF. The downloaded pack’s supplied `License.txt` states CC0 1.0 Universal; retain it, its SHA-256 and the pack page with every reference acquisition. It is reference-only by default: do not integrate, retarget or redistribute external art merely because it is available. Inspect the real file’s clip list and licenses again before any approved reuse.

The project’s September 11, 2026 acquisition and exact clip inventory live under `.dream-loop/workflow-proof/quadruped-references/`; they show 12 actual named clips on each selected model, including `Walk` and `Gallop`. This supports gait observation, not a claim of Mossling compatibility or admission.

## Failure responses

| Visible defect | Repair the relevant stage |
| --- | --- |
| Turned head, sideways torso or paws | Return to the neutral-anatomy gate; correct source axes/landmarks before animating. |
| Leg reaches but sole skates | Fix contact target/stance timing and body travel; do not increase paw local translation. |
| Elbow/stifle bends the wrong way | Reinspect local axes and pole direction, then refit the limb plane. |
| Leaves, flowers or fur stretch | Correct attachment weights before changing gait values. |
| Run reads as a shuffle | Declare/author contacts and body response; use a trot until a contact-proven gallop is ready. |
| Good viewport but bad export/game travel | Treat export/runtime evidence as authoritative and revise the bake/export/integration path. |

Never scale a rejected quadruped workflow to other creature assets. Record the exact defect, alter the failed stage and obtain a new independent review.
