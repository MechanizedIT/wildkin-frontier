# Mossling V3 — editable provisional candidate

Current local game model: `assets/models/mossling-v3/model.glb`, SHA256 `ca044bb9321423c8d4e83aedce7697d98109eafbeeafbefbdf3d0e13a58e9cf9`. This is provisionally integrated for review; **continuous-motion and owner phone acceptance remain pending**. Positive bounded pose and full-cycle sampled-frame reviews do not establish final motion acceptance.

Open `blend.blend` in Blender 4.5. The scene retains the liked render mesh, fitted deform rig, final weights, hidden coarse proxy and all five actions: Idle, Walk, Run, Attack, Hurt. The original 1024 color PNG is already packed: its complete byte-identical payload was found inside this blend, without opening Blender during packaging. No raw master or duplicate render/video collection is included.

The final GLB has 19,999 triangles, 23,678 split vertices, 23 deform joints, one material and one original color texture. Native forward is +Z. The unchanged neutral corner position/UV hash is `3f23b3e7d7f8dcd19f5e3945c32db49d75850ff1f41cd37c68f18b0331c98f83`; original texture SHA256 is `14d44a3a6e33a1af39aa8c01f42831018ada71e5f252ba57c77a345ce04ce7ad`.

## Repair and motion provenance

An explicit chest/pelvis/short spine and hip–stifle–hock–paw anatomy replaced the unsuitable earlier chain assumptions. Direct heat weighting on the render mesh failed. A separate closed capsule proxy was voxel-remeshed once at .045 m, heat-weighted, then transferred onto the unchanged render mesh with nearest-polygon interpolated vertex groups. The proxy was a weighting aid, not replacement render geometry. Final flowers retain semantic attachments. A narrowly identified head/neck core with a .075 m surface-distance feather removes cheek-to-foreleg leakage; its exact predicate and counts are in `head-constraint.json`. No whole-body height mask was reapplied after transfer.

Retained Quaternius Wolf actions supplied measured rhythm/contact and recovery references, adapted to the fitted Mossling rather than copied as incompatible bone rotations. Source Wolf blend SHA256: `fe31c3829dd2a8b9dfedb2e5cb656939a1d525ebd535a62434d2d25a4399cb9e`; supplied CC0 license is included. The original source pack and evaluated donor samples remain in the raw study.

Walk is .75 s at raw .65 m/s; Run is .50 s at raw 1.9 m/s. Run uses 28–30% stance duty and .266–.285 m stance strokes, with measured shoulder drop 2.408 cm and no reach clamp. Idle is 2.4 s, Attack .7 s and Hurt .45 s. Walk's 27,830 evaluated transform components are unchanged against the previously reviewed Walk-only export (`walk-preservation.json`).

`builder.py` is an exact archival copy of the asset-specific study helper. Its introductory comments predate the later authorized full-clip stages. It refers to retained study inputs and is **not** advertised as a standalone rebuild bundle. The editable blend is self-contained for continued rig/mesh/action editing; rebuilding the study uses the original repository helper and retained inputs.

## Evidence and remaining gates

Raw study: `.dream-loop/overnight-mossling-anatomy-repair/v1/`; complete export and phase evidence: `full-candidate/actual-export-review/`. Native evidence, video paths and runtime tuning are summarized in `NATIVE-HANDOFF.md` there. Root's bounded pose scores were approximately 8.2 after proxy repair and 8.1 for the complete candidate. Root viewed selected native follow/stop/flee/obstacle frames positively. `motion-review.md` records this worker's additional complete side-sequence inspection and its reviewer-role limitation.

Actual canonical native captures exercise follow, stop, camera orbit, both wild sizes wandering, fleeing and solid obstacle steering with zero page errors. Moss-specific follower speeds are .455 m/s near settling, 1.33 travel, 1.995 catch-up and 2.261 recovery at .7 scale. Other species keep their original 1.45/4.15/6.2 m/s defaults. Wild movement respects instance size and custom Author speed. These are provisional calibration choices.

Independent continuous video review at normal speed, gait-transition/weight-transfer judgment, combat timing and Chris's physical-phone test remain open. No source packaging action or structural/contact metric closes those gates. Source files were copied without Blender/GPU activity; the raw study is preserved.
