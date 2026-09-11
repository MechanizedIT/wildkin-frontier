# Wildkin Frontier local asset pipeline



Status, September 11: the local game now contains provisional Mossling V3, exact SHA256 `ca044bb9321423c8d4e83aedce7697d98109eafbeeafbefbdf3d0e13a58e9cf9`, at `assets/models/mossling-v3/model.glb`. Editable source and concise provenance are in `art/source/mossling-v3/`. Bounded pose and full-cycle sampled-frame review are positive; continuous-motion review and Chris's phone acceptance are still pending. Earlier PASS entries below are historical and do not override owner feedback or establish final acceptance. Explorer travel/cadence remain provisionally 35% slower together; the wider art pass remains open.

The V3 repair uses a separate coarse closed anatomical proxy, Blender bone-heat weights and nearest-polygon interpolated transfer onto the unchanged liked render mesh. Semantic flower attachment and a localized head/neck constraint with geodesic nape feather prevent the prior cheek/foreleg weight leakage; no whole-body height mask is reused. The editable blend retains the proxy, fitted rig, final weights and all five clips, with the exact original 1024 PNG packed inside. There is no redundant render collection or raw generation master in the new source package.

The shipped candidate has 19,999 triangles, 23,678 split vertices, 23 deform bones, one material and five clips. Measured CC0 Wolf contact/rhythm references were adapted to the fitted anatomy. Walk remains exactly preserved at raw .65 m/s; Run is raw 1.9 m/s. Moss-specific runtime calibration covers both wild instance sizes and the .7-scale companion without changing sibling speeds or globally clamping animation.

Canonical native captures exercise follow/stop/orbit/wander/flee/solid-obstacle movement with zero page errors. Source receipts point to `.dream-loop/overnight-mossling-anatomy-repair/v1/NATIVE-HANDOFF.md` and the exact exported phase/contact/video records. Root's bounded pose/full-candidate frame reviews were positive; the implementer's additional twelve-phase Run sequence review is explicitly not author-independent admission. Natural cadence, weight transfer, continuous transitions, combat timing and physical-phone performance remain perceptual gates. See `MOTION_WORKFLOW_REVIEW.md` for current status and excluded failed review setups.



Owner objective: a reliable project-specific workflow and skill for making characters and world assets from approved reference images using local image-to-3D generation, preserving their appearance while producing suitable meshes, textures, rigs and animations for the mobile/web game.



## Completion evidence



- Independent reference-image review before 3D generation: reject unexplained fittings, impossible construction, inconsistent repeated parts, fused anatomy, asymmetry that conflicts with the intended design, or contaminated silhouettes. Owner specifically called out an unexplained gold fitting on the initial crate; it must be resolved before generation.

- Repeatable local generation with input/model/tool provenance and immutable high-resolution masters.

- Texture-preserving optimization verified by actual matching renders and measured geometry/texture budgets.

- A quadruped and humanoid rig with in-place clips, bounded skin influences and visible deformation/loop checks.

- A separate static prop showing that the process is not a single-creature recipe.

- Local Three.js import, independent animated instances, correct gameplay events, Author/Play visual parity, descriptor-based collision, unchanged save ownership and offline packaging.

- A discoverable project skill with executable helpers and an independent replay using only its documented inputs.



Real-device sustained performance and subjective owner acceptance remain distinct from browser viewport evidence.



## Working decisions



The original owner-liked Mossling establishes style, but its mismatched head/body pose is not a valid rigging master. V2 uses the reviewed neutral V3 reference, a fresh 1024 local generation and fresh anatomy landmarks. PyMeshLab's texture-aware filter preserves its appearance at 19,999 triangles with the original generated 1024 PNG. Previous ordinary-decimation and fresh-UV-bake derivatives are rejected diagnostics, recorded in `TRELLIS_LOCAL_TRIAL.md`. The same initial reduction settings visibly damage the crate at 2,497 and 4,997 triangles; those copies are rejected despite passing structural checks. A valid GLB, a lower polygon count or an unchanged texture hash does not override visible loss of eyes, flowers, silhouette or intended facets.



Reference imagery currently uses OpenAI's built-in `image_gen` tool. Its interface does not expose the backend model version; record it as undisclosed rather than claiming GPT Image 2.5 or any other exact version. A reference-review agent must be independent of the prompt/image author. Fix a rejected image before using it as a generation target; preserve rejected versions and the reason.



The existing Author asset library remains the owner of stable references, placements, collision descriptors and export. Complex model construction moves to external source files; primitive recipes remain available for simple editable assets and established content. The additive local GLB source and animation wrapper use the same visual resolver and existing update loops. Detailed geometry will not silently become gameplay collision.



## Historical first-admission ledger



| Fixture | Generation | Optimization | Rig / clips | Game / package |

| --- | --- | --- | --- | --- |

| Mossling quadruped | Existing local 1024 master, owner-liked | 19,999 triangles, original 1K PNG retained, static review passes | V7 19-bone rig; Idle/Walk/Run/Attack/Hurt; zero-based clips | Full-cycle independent PASS; actual ROAM/Walk and FLEE/Run, wild/companion and cloned-skeleton checks pass; admitted mossling-v1 |

| Explorer humanoid | Reviewed white-background input; local 1024 run succeeded in 194.266 s | 19,998 triangles, original 1K PNG retained | V9 original mesh, fitted wrists and rigid distal weights; 16 bones/11 clips; independent model/motion PASS | Phone/desktop movement, attack and held-tool proof PASS; admitted explorer-v1 with grounded capsule offset |

| Static frontier prop | Reviewed crate input; local 512 run succeeded in 183.859 s | Automatic 2.5k/5k copies rejected; editable Blender reconstruction refined to 1,552 triangles, one 256px texture | Not required | Independent PASS; 120,012-byte GLB admitted as frontier-crate-v1 and assigned to existing wooden-crate ID |

| Independent workflow replay | Fresh agent used installed skill, crate reference and raw master only | Completed: identified damaged QEM copies and used documented Blender fallback | Not applicable | Independent visual PASS; replay report retained with crate source |



The source skill is `.agents/skills/wildkin-asset-forge/SKILL.md`, discoverable through a directory junction at `C:/Users/cwood/.codex/skills/wildkin-asset-forge`. Its metadata validator passes; this does not establish visual quality. The independent static replay proved that route; the owner's later phone feedback rejected the V1 character motion. Current character sources are `art/source/mossling-v2/` (neutral generation, fitted 19-bone/five-clip rig) and `art/source/explorer-v2/` (25-bone/eleven-clip Mixamo skin). Both retain their original 1K textures. The Explorer's `rig-profile.zip` contains a self-contained rebuild recipe and exact FBX/texture inputs. These are class-specific supervised recipes, not automatic rigging of arbitrary anatomy.



## Source and reproducibility



The admitted crate package retains the exact reviewed reference, raw TRELLIS master, generation settings, failed-reduction/reconstruction replay, editable Blender source, final builder, normalization report and independent review under `art/source/frontier-crate-v1`. Only its GLB is shipped. The main game and Author share the same model resolver, while the stable `asset_wooden_crate` ID and box collision descriptor remain unchanged. Both primitive-bake entry points preserve external revisions.



## Important validation corrections



- The v4 Mossling moving fixture translated across X despite the model's declared +Z forward, and measured all low paw samples over an inclusive whole cycle. That metric conflates separate support phases and loop travel. V5 evidence corrects the heading and measures contiguous stance windows; judge actual footage alongside the numbers. V5 reads as a coherent trot, with some short 5–11 cm contact creep still awaiting actual terrain review.

- A player attack/hurt event must survive the next locomotion visual update. The adapter now latches the one-shot through its duration, with a regression test proving it actually advances and then returns to locomotion.

- Stable world asset IDs and immutable model package revision IDs are separate. Local paths remain restricted to `assets/models/<revision>/model.glb`; changing a model revision must not change saved placement/species references.



- Explorer hand repairs v1–v3 are rejected. The original had zero physical open edges in its hand region after position welding; indexed boundaries were texture seams. Geometric repair damaged intact fingers. V9 preserves the original mesh and corrects bone placement/weights instead.

- Frame-1 animation exports inserted an unintended lead-in. Both rig helpers now use Blender’s `export_anim_slide_to_zero=True`; the admission checker reads actual GLB timestamps and rejects nonzero clip starts. Mossling Walk is 0.5 s and Run is 0.416667 s; actual movement playback accounts for the creature/companion scale.

- Current final regression checkpoint: 645 JavaScript tests and four Python GLB-checker tests pass. World/campaign checks and validated build pass. Unpacked submission is 30,859.6 KB; ZIP is 12,450.7 KB. Packaged shell boots all three local GLBs and remains playable after going offline with no external requests/errors; combined model-specific landscape proof also passes with all three models, independent companion skeleton, preserved crate collision and offline movement/attack/menus.



## Tooling boundary



TRELLIS runs locally from `C:/Users/cwood/Tools/trellis2-stableprojectorz`; separate art-processing packages must not alter that working environment or the game's runtime dependencies. Blender 4.5.3 is available locally. Image references may use the built-in image-generation tool already authorized by the owner; image-to-3D and subsequent processing remain local. No paid API is a fallback without new owner authorization.



The game-asset-production skill's `game-dev` CLI is not exposed on PATH or in its installed skill bundle in this session. Its provenance/inspection/package evidence principles inform the pipeline; do not claim that unavailable CLI commands were run. Project-owned helpers will provide the repeatable checks needed here.



The local-service helper’s Status command was tested. Automatic approval review blocked stopping/restarting the existing owned TRELLIS service without a reason beyond “blocked by policy”; Start/Stop lifecycle remains unverified. The existing service remains available, so this does not block asset work.


## Historical admitted candidate budgets

| Model revision | Triangles | Runtime vertices | Material / color texture | Rig / clips | GLB bytes |
| --- | ---: | ---: | --- | --- | ---: |
| frontier-crate-v1 | 1,552 | 3,264 | 1 / 256 x 256 | static | 120,012 |
| mossling-v1 | 19,999 | 24,305 | 1 / 1024 x 1024 | 19 bones / 5 clips | 3,320,648 |
| explorer-v1 | 19,998 | 23,958 | 1 / 1024 x 1024 | 16 bones / 11 clips | 3,278,000 |

All source receipts and independent reviews are in `art/source/<revision>/asset.json` and adjacent files. Exact animated revisions remain candidates for Chris's playtest. The Explorer has some coarse glove/cuff texture edges at extreme closeup; reviewers found these acceptable at the actual camera scale. Physical-phone thermal behavior, sustained FPS and touch comfort remain unmeasured.

## Reuse on the next asset

Invoke `$wildkin-asset-forge` with the existing asset ID, intended class and approved reference. Use the local-tools instructions to create fresh generation/optimization directories. Fit an anatomy profile to a different character rather than reusing Mossling/Explorer coordinates. Require a new independent image, model and complete-motion review. Admit a new immutable package revision and assign its descriptor to the stable world ID. Keep collision and gameplay metadata deliberately separate.

For the current examples, exact generation inputs are `art/source/<revision>/reference.png`, raw masters are `raw.glb`, generation settings are `generation.json`, and editable final Blender scenes are `blend.blend`. Normalization/rig reports and copied builder sources document the final steps. The humanoid helper also imports the shared `tools/art/rig-character.py`; keep both repository helpers together. Rejected hand-repair scripts are diagnostics and are not part of the supported skill.

## Human spot check

Start at Camp. Inspect the wooden crates near the workshop and walk around them: wood braces and dark corner hardware should stay intact from every side. Enter Verdant Verge, approach a small flower-covered Mossling, and watch it roam then flee; it should face its travel direction without a rapid buzzing walk or detached flowers. With a secured Mossling selected, walk and stop to check the smaller follower independently.

Move the Explorer slowly and at full speed, jump, then swing the Field Tool near a tree. His boots, wrists and backpack should stay attached, and the axe should remain in his right hand. Drag on the right to orbit while idle, then move forward: the camera may rotate independently and movement should follow its horizontal heading. In desktop Author, open Wooden Crate: placement/collision remain editable, primitive part controls are hidden, and switching to a primitive lantern restores those controls. Report obvious foot skating, floating, stretched joints, tool gaps, texture holes or unreadable controls.

## Package policy correction

Chris explicitly retired the old 35 MB Devpost/hackathon limit. The build validator and ZIP tool now report actual size without a hard cap. Earlier measured sizes are historical facts, not acceptance thresholds. Continue optimizing for mobile GPU cost, memory and loading time; the model-class triangle/texture budgets remain provisional performance choices.
