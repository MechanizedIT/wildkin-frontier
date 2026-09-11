# Tidefin action revision V3 — frozen, review pending

Exact GLB SHA256: `5f22dfe31acc9c2b16924d0e662d357c92e17af3518a0c2413ba26440e12eb5f`.

**Unreviewed action candidate. No shipping integration.** Work stopped for the owner's play-session wrap-up after the already-running render finished. No further render, browser, revision or integration was started. V2 remains the historical frame/deformation PASS8.0 and action-readability HOLD7.0; its continuous/native cadence gate remains pending.

Only Attack/Hurt animation keys changed. `preservation.json` proves exact decoded V2/V3 equality of all exported mesh attributes/indices (including positions, UVs, normals, joints and weights) and every Idle/Walk/Run animation input/output/interpolation track. V2 cheek closure and planted paw construction are retained. Neutral geometry, palette, rig, Walk and Run are not newly revised.

- **Attack, .75s:** head lifts/retracts approximately12° with3.5° chest anticipation. Preparation peaks near phase.20; forward/down release reaches approximately12° head/4° chest at.43, holds briefly, then recovers by.84. Source +X rotation tips Blender -Y-facing muzzle downward. Existing small visual-root envelope remains about62mm fore/aft; no gameplay physics or firing time was changed.
- **Hurt, .50s:** quick raised/backward head recoil9°, chest5°, head yaw9° and4° lateral tilt, with gradual return. Existing25mm backward visual-root impulse remains. This contrasts with the attack's downward/forward release.
- Both use the original fixed-length fitted leg solve with zero requested paw lift. All authored reach assertions passed. Actual exported action endpoint tracks return exactly to their starting values. Continuous interpolated action sole-contact measurements and native one-shot/projectile synchronization remain review work; the retained numerical sole receipts cover the unchanged Walk/Run only.

Ten actual fresh-import GLB views: Attack front3q phases0/.20/.43/.70; side.20/.43; Hurt front3q.15/.40/.80 and opposite.15. All512px,20samples,CyclesCPU,4threads. Author inspected the main anticipation/release and both Hurt peak angles: head poses visibly differ and no obvious detached cheek or floating paw appears in those frames. This is not independent admission or proof of companion-size continuous readability.

Owned Blender process34688 completed exit0 and closed; existing user/idle18428 was untouched. RAM before launch was about9.37GiB free; process working set observed about343MiB. No GPU inference, remesh, subdivision or extra renderer was used.

`builder.py` is the retained exact builder; editable source is `tidefin-motion-editable.blend`. `glb-check.json` confirms five clips,7,832triangles,19bones,one material and256px basecolor texture. `check-preservation.py` and `check-export.py` are CPU-only receipts. Exported Walk/Run contacts and loop ranges are unchanged from V2, including5.81/14.33mm stance drift. `motion-provenance.json` retains donor timing provenance; the CC0 donor license remains in V2. `render-evidence.json` enumerates exact frames.

Next bounded handoff, after owner play: independent action frame/playback review at.7 companion scale, then ordinary native movement/actions only if approved. Do not carry generic follower2–3× retiming into shipping unchanged. No source package, runtime registration, campaign changes or commits were made for this candidate.
