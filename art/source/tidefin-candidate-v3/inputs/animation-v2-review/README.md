# Tidefin animation V2 — independent review candidate

Exact exported GLB SHA256: `2aaeaec0b5bddaf1edc3169c8efa06d5353a910a3621ee6f0be1c913ebac661d`.

**Independent full-cycle review PENDING. Native game motion, game speed calibration and owner phone review PENDING. No shipping integration.** Neutral V5 passed 8.0; the prior rig V2 passed 8.0 for five diagnostic poses only. These are narrower historical gates, not admission of this animation set.

Preserved the admitted V5 surface/UV/palette and fitted 19-bone deform rig. V2 addresses the residual head-turn cheek speck: exactly 50 outer cheek vertices now use their paired embedded-root weights, so the shallow plate thickness deforms compatibly. The body, eyes, crest, soles and all other weights remain unchanged. `cheek-weight-closure.json` contains each changed vertex and before/after weights. `motion-provenance.json` records the unchanged geometry/UV fingerprint and matching pre/post-export-join weighted fingerprint. V1 evidence remains in its own directory.

The editable Blend retains named anatomical source parts; GLB joins them into one mesh, one primitive, one material and one 256px base-color atlas. Cost: 7,832 triangles, 15,108 exported vertices, 19 deform bones, five clips, 996,932 bytes. No remesh, subdivision, simulation, constraints or runtime bone drivers are required. Procedurally authored Blender surface/rig; no image-to-3D provenance claim.

| Clip | Duration | Raw model speed | Contact and motion |
| --- | ---: | ---: | --- |
| Idle | 3.0 s | 0 | Up to 5 mm breathing, ±12° head yaw and small tail response |
| Walk | .75 s | .9 m/s | Four-beat touchdown order, 56% stance, .378 m stance stroke, .075 m swing clearance |
| Run | .50 s | 3.0 m/s | Gallop-derived touchdown order, 25% stance, .375 m stance stroke, .12 m swing clearance |
| Attack | .75 s | 0 | Short preload and forward head/body impulse appropriate to a spitter; planted feet |
| Hurt | .50 s | 0 | Restrained backward recoil and return; planted feet |

Walk/Run retain fixed fitted bone lengths and ±.189/.1875 m fore/aft stance reach. Body drop is 24–28 mm with under 1° pitch; no deep gathered torso compression. Source game coordinates are +Z forward/Y up; Blender coordinates are -Y forward/Z up. Source Root translation is explicit armature-space translation; the nondeform Root is folded into the actual exported Pelvis joint. The exported locomotion Pelvis has zero longitudinal range and negligible numerical lateral range; Attack/Hurt have intentional local impulses that return to rest.

Touchdown phases derive from the retained Quaternius CC0 Wolf Walk/Gallop timing study (Wolf Blend SHA `fe31c3829dd2a8b9dfedb2e5cb656939a1d525ebd535a62434d2d25a4399cb9e`). The Tidefin uses its own anatomical fixed-length solve, constant-speed stance and Hermite recovery; this is not copied donor Euler animation. `donor-license.txt` retains the original license. Source paths/hashes and per-frame authored targets are in `motion-provenance.json`.

Actual fresh-import GLB skin measurements sampled 241 times across two translated cycles, including interpolation. Maximum stance movement in XZ: Walk 5.81 mm, Run 14.33 mm; maximum planted sole deviation from ground: 3.42/4.53 mm; lowest sampled surface: -.16/-1.23 mm. Lateral stance range: .030/.329 mm. These finite sampling results disclose interpolation drift; they do not prove every instant or native collision behavior. All track endpoint deltas are below 1.8e-7. `check-export.py` reproduces track/range and contact summaries without Blender; `actual-export-contact.json` retains samples.

Twenty-nine actual fresh-GLB CPU renders retain side phases 0–1 at eighth-cycle intervals for Walk/Run, opposing support views, Attack/Hurt phases and both ±12° front head turns. The author inspected representative transitions, opposing views and both head turns: the former cheek speck is no longer visible, and chest/hips retain volume. Independent reviewer owns perceptual acceptance. Cycle renders are 384px/12 samples, head checks 512px/20 samples, four CPU threads; owned process completed and closed. Stills cannot establish continuous cadence, paw skating perception or action readability by themselves.

`viewer.html` is an isolated local Three.js playback helper, not an ordinary-game proof. Serve the repository with its existing dev server and open this directory's viewer. Select Walk/Run, translate at calibrated speed, inspect side/opposite/three-quarter views, then pause/scrub support transitions. Idle front at phases .25/.75 exposes the ±12° far-cheek attachment. It uses the exact GLB and local vendored dependencies, one RAF and DPR1. No browser was launched for its creation; its browser behavior remains unverified. The studio lighting is explicitly distinct from game lighting.

At a .7 companion scale, authored world speeds are Walk .63 m/s and Run 2.1 m/s. Existing generic companion speeds 1.45/4.15/6.2 m/s would drive Run up to about 1.98×/2.95× for catch-up/recovery. The values 3.55/6.1 are follow radii, not speeds. Later integration needs Tidefin-specific native cadence review and a sensible bounded catch-up envelope; no global animation clamp or sibling speed changes were made here. This candidate's Run speed is honest calibration, not a claim that a 3× playback looks good.

Preserve the admitted neutral silhouette/body/palette. Remaining neutral-art limitations include horizontal flank facets and a fairly flat tail end. Continuous exported playback, native wander/flee/follow/stop and ordinary action timing remain separate review work before shipping.
