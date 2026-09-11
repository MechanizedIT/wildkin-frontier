# Mossling quadruped motion research

**Purpose.** The current neutral Mossling model is liked by Chris, but its locomotion is not accepted. This note records verified, no-cost reference options and the repair method for this specific compact, leaf-mantled quadruped. It does not authorize reusing an external model or changing the runtime.

## Findings from primary sources

### Rigify is a usable authoring rig, not a ready-made Mossling animation

[Blender's Rigify manual](https://docs.blender.org/manual/en/latest/addons/rigging/rigify/basics.html) lists Basic Quadruped, Cat, Wolf and Horse metarigs. Its documented flow is to place the metarig's bones on the character, generate the control rig, then bind the mesh to the generated deform bones. The same manual warns that automatic weights only work well when bone placement and mesh topology are suitable. The Mossling's generated, foliage-heavy surface therefore needs deliberate landmark placement and checked weights; automatic weighting alone is not a completion gate.

Rigify is bundled with Blender and its add-on is GPL, while Blender itself is free to use commercially ([Blender's official license summary](https://www.blender.org/about/)). Use it as an offline authoring tool. Do not copy its source into the game. The shipped GLB contains only our baked mesh, skeleton and animation data, so using the tool does not make the game a Blender derivative.

### A walk is four separately timed contacts

The canine locomotion study [*Planar Covariation of Hindlimb and Forelimb Elevation Angles during Terrestrial and Aquatic Locomotion of Dogs*](https://pmc.ncbi.nlm.nih.gov/articles/PMC4517757/) measured six dogs and reports a lateral sequence in walking. The broader locomotion review [*Linking Gait Dynamics to Mechanical Cost of Legged Locomotion*](https://pmc.ncbi.nlm.nih.gov/articles/PMC7805771/) describes the common terrestrial pattern as a hind foot, ipsilateral forefoot, contralateral hind foot and contralateral forefoot, roughly one quarter of a cycle apart. The review also distinguishes walk by long stance and says quadruped running does not inherently require an aerial frame.

For the Mossling, use this explicit lateral four-beat timing using the animal's anatomical right and left sides:

| Contact phase | Paw landing | Expected support |
| --- | --- | --- |
| 0% | right hind | three or more paws near ground |
| 25% | right fore | hind is loading/pushing |
| 50% | left hind | right-side pair is passing support |
| 75% | left fore | left-side pair completes the cycle |
| 100% | right hind again | exact pose match at loop seam |

Give each walking paw a stance interval around 60–70% of the cycle and a recovery/swing interval around 30–40%. During stance its world-space contact must remain fixed; the body travels past it. This is more important than copying a particular dog’s proportions. The cited work also reports that body and head angles change across a stride, and the passive-dynamics study [*Passive Dynamics Explain Quadrupedal Walking, Trotting, and Tölting*](https://pmc.ncbi.nlm.nih.gov/articles/PMC4844082/) shows body pitch during walk and a head/torso counter-motion. For this stylized 1.2 m creature, keep that response readable but restrained: a small pelvis/root vertical arc, a subtle pitch, and a head counter-bob rather than a rigid body sliding over cycling legs.

### Use a diagonal trot for the faster state first

The practical faster gait for this compact companion is a **diagonal trot**, not a synthetic gallop. Pair left-fore with right-hind at phase 0%, then right-fore with left-hind at 50%. Let a paw remain planted for its full stance window; add only a short, verified aerial gap if the desired game speed makes it necessary. This gives a visibly different cadence and longer reach while preserving stability and making planted-paw validation tractable.

At each trot contact, load the corresponding diagonal pair: lower the chest slightly under forefoot loading, drive the pelvis forward from the hind leg, then let neck/head and tail lag the body by a small amount. Forelimbs should show shoulder/scapular reach, elbow flexion in swing and extension while bearing weight. Hind limbs should collect at hip/stifle/hock during recovery, then extend through stance and push-off. The exact local rotation signs must be set from the Mossling armature's displayed axes, not copied from a dog or from the opposite pair.

Only promote the state to a bound/gallop after it has a filmed reference, per-paw contact schedule and a separate proof. A symmetric "both fore, then both hind" pose cycle is not sufficient evidence of a believable gallop.

## Verified free reference and reuse options

| Option | What is directly available | Commercial-use status and restriction | Recommended use |
| --- | --- | --- | --- |
| [Quaternius Ultimate Animated Animal Pack](https://quaternius.com/packs/ultimateanimatedanimals.html) | The publisher states that it has 12 animals, each with more than 12 animations including walk and gallop, in FBX, Blend and glTF, and exposes a free download. Its catalogue identifies wolf, husky, fox, horse, deer and other suitable quadruped examples. | The pack page and the downloaded pack's `License.txt` identify this acquisition as CC0 1.0. Quaternius's current [site license](https://quaternius.com/license.html) grants free commercial use and modification but forbids redistribution of assets themselves. Preserve the downloaded pack's license/readme and acquisition date; do not redistribute its source files as an asset pack. | Best no-cost source for inspecting a working low-poly quadruped timing in Blender. It may be used only after independently checking its actual exported clips and the supplied license. Retarget/bake onto Mossling only after the control rig and paws are verified; do not replace Mossling art with an example animal. |
| [Blender Studio Dog character rig](https://studio.blender.org/characters/dog/v1/) | A free downloadable Blender 3.6 dog character rig with instructions; the page identifies it as an editable production rig. | CC-BY. The page requires the credit `Dog Rig (CC-BY) Blender Foundation | studio.blender.org`. It also warns that the asset requires Blender 3.6 and may break in other versions. The page describes poses/expressions, not a packaged walk/run library. | Technical control-rig and deformation reference only. It is not the preferred animation donor, because compatible walk/run clips are not verified on its page and its version requirement is narrow. |
| [Blender Rigify metarigs](https://docs.blender.org/manual/en/latest/addons/rigging/rigify/basics.html) | Bundled Basic Quadruped, Cat, Wolf and Horse templates; generated control rigs and DEF bones. No extra download or account is required. | Blender is GPL software, usable commercially. Do not bundle copied Blender/Rigify code in the game; bake our own animation into the GLB. | Preferred Mossling authoring base: begin from Wolf or Basic Quadruped, fit it to the actual neutral model, then bake to the small runtime deform skeleton. |

The research papers above are references for observing gait, not asset licenses. Do not extract their figures, video, meshes or data into the game. Likewise, no unverified YouTube or marketplace animation should enter the pipeline merely because it looks useful.

### Local provenance check — September 11, 2026

The publisher's public download control resolves to [this anonymous Google Drive folder](https://drive.google.com/drive/folders/1uJ3N5HfB7jKTseJUNQr3N4YaN0UuEtHk?usp=sharing). It was acquired without an account, payment, upload, retarget or runtime integration into the ignored proof folder:

`.dream-loop/workflow-proof/quadruped-references/quaternius-ultimate-animated-animals-2026-09-11/`

The acquisition record is `acquisition.json`; it stores source URLs, timestamp, file counts and SHA-256 values. The supplied `License.txt` is 364 bytes, states **CC0 1.0 Universal**, and has SHA-256 `83d8959f9fc56353ed571fbe2dc52e4bcd64508e2399501cd45ac2ce3df0bf8c`. The captured pack page, publisher license page and CC0 legal text are retained beside it. This is a reference-only acquisition and is excluded from source control by `.dream-loop/`.

Actual inspection, rather than the pack-page claim, found 12 named actions in each of `Fox`, `Husky` and `Wolf`: `Attack`, `Death`, `Eating`, `Gallop`, `Gallop_Jump`, `Idle`, `Idle_2`, `Idle_2_HeadLow`, two hit reactions, `Jump_ToIdle`, and `Walk`. The glTF exports hold embedded buffers; `Walk` is 1.067 seconds and `Gallop` 0.567 seconds in all three. The Blender files carry the same 12 action names; their `Walk` spans frames 0–32 and `Gallop` frames 0–17. Exact clip counts, channel counts and durations are in `gltf-animation-inventory.json` and `*-blend-actions.json` in that proof folder. The selected glTF SHA-256 values are Fox `2f36e3c9c75ecddda85c5f9944e98ee1e88e7c679a546534aff1cea8ecde64c7`, Husky `0cfd85ddfcc5c07caf1bdeb296b21017b0da4c8558a92086daf4a172e0bf8d97`, and Wolf `cc02e9d128b5715f352ee8bea086f97a35f1d875d240de99b0f9f2775c37d415`.

## Diagnosis of the current Mossling script

`tools/art/rig-neutral-mossling.py` correctly preserves the neutral model’s travel axis and keeps root X/Y in-place, which fixed the earlier sideways-facing problem. Its current locomotion construction still explains the owner-visible result:

1. **The action named `Walk` is a diagonal-pair cycle, not a four-beat walk.** `diagonal_a` keys front-left with rear-right together and `diagonal_b` keys front-right with rear-left together. Each pair is driven by the same phase value, so there are two primary contact groups rather than four independently timed landings.
2. **Paws are offset locally rather than planted globally.** The script keys each paw's local Y translation (`0.145 * phase * sign` for walk and `0.20 * fore/rear` for run) but has no contact locator, IK target, floor ray or world-space hold. When the game translates the root, a stance paw can visibly slide even if the in-place render looks acceptable.
3. **The `Run` is symmetric left-to-right.** `bound_values` assigns the same `fore` value to both front limbs and the same `rear` value to both hind limbs. Its six poses therefore read as a pair-synchronous bound/shuffle, with two root-Z flight frames, rather than a diagonal trot or a proven gallop.
4. **Joint behavior is encoded with generic signs.** Both fore and hind lower bones use a similar negative `abs(...)` rule. It does not establish which direction is elbow versus stifle/hock flexion for this armature's local axes, and it cannot create the different fore/hind collection-and-push response described above.
5. **There are no contact controls for shoulder, hip or paw.** The exported skeleton has direct limb chains, but the script offers no non-deforming IK targets, pole controls, scapula/hip controls, stance lock, pelvis side shift or weight-paint correction pass. The foliage mantle also hides small motion, so the remaining body response needs to be intentionally staged rather than left to leg rotation alone.

These are method failures, not a reason to replace the approved model or texture.

## Practical repair workflow

1. **Freeze the accepted source.** Keep the current textured neutral GLB and its UVs. Work in a new editable Blender scene; do not overwrite the admitted candidate during experimentation.
2. **Fit a control rig to the actual anatomy.** In Blender, start with Rigify Wolf or Basic Quadruped. Place pelvis, chest, neck/head and tail on the checked Mossling body axis. Place each shoulder/hip, elbow/stifle, wrist/hock and paw at the mesh’s real joint centers. Apply scale, show bone axes, give every knee/elbow a deliberate bend direction, then generate the control rig. Add four paw contact empties, pole controls and a ground plane.
3. **Weight and deformation gate before animation.** Bind the body manually where automatic weights fail. Keep leaves and flowers rigidly assigned to their nearest intended body/head/tail segment; do not let them blend across limbs. Pose every leg at full reach, full collect, left/right side, and head turn before animating. Repair any collapsing shoulder, haunch or leaf stretch here.
4. **Author the four-beat walk with contact keys.** Place the four contact empties with the table above. During each stance, lock its paw target in world space. Move root/pelvis forward through the locked feet; use a small vertical root arc and body pitch. Key one full cycle plus an exact frame-0/frame-end duplicate. Make an untextured contact pass first, then check it with the real texture and leaf silhouette.
5. **Author the diagonal trot separately.** Start from two diagonal contact targets, not the walk keys. Use a clearly larger reach, hind push, chest/pelvis response and a light tail/head lag. Keep the initial version grounded; only introduce a short suspension after ordinary translated travel shows no skating or floor clipping.
6. **Bake a small runtime skeleton.** Bake only the required deform bones to a clean 19-bone-style GLB, with controls/constraints removed. Preserve root horizontal in-place motion, retain any deliberate root-Z arc, and export separate zero-start Idle, Walk, Run, Attack and Hurt clips. Validate clip seam, bone count, texture hash and triangle count.
7. **Judge the exported result, not the Blender viewport.** Use full-cycle front, side and three-quarter captures at 12 phases including the wrap frame, then an ordinary translated in-game traversal over level ground. Mark each paw's stance interval and report paw sliding, penetration, hover and whether walk/run remain distinct at phone scale. A new animation passes only when the independent reviewer and Chris both find it readable.

This workflow is intentionally more manual than the former procedural rotation pass. It isolates the durable reusable method: a generated image-to-3D mesh can supply form and texture, but a believable quadruped needs anatomy-fitted controls, contacts, weights and exported motion evidence.
