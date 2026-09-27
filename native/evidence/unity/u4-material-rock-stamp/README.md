# U4 — Stylized Materials and Procedural Rock Stamp

**Disposition: `HOLD_PENDING_INDEPENDENT_ROOT_VISUAL_REVIEW`.** The bounded same-phase remediation and final evidence are assembled; this is not a self-awarded perceptual PASS. Root must judge whether the formations now read as distinct interlocking masses. U5 is not started.

## Result at a glance

- Locked mesher/resolution: `SURFACE_NETS`, 0.50 m. A single seed-3 hero was also compared at 0.25 m; this is a bounded comparison, not a mixed-resolution/stitching claim.
- `WildkinClast-v1` generated seeds 1–20 without per-seed tuning or rejection. All 20 resolved to one connected component and ordinary rock/dirt `MatterWorld` samples. Families are Leaning Ridge (6), Split Shoulders (5), Bent Buttress (5), and Crown Shelf (4); each retains 6–7 explainable primitive placements.
- At 0.50 m, occupied-sample volume estimates span 18.25–30.625 m³; width/height 0.761–1.477 and depth/height 0.632–1.387. These describe bounds, not perceptual quality; the images remain the review authority.
- Final Unity EditMode: 75/75 passed. PlayMode: 1/1 passed. XML is in [`all-editmode.xml`](all-editmode.xml) and [`all-playmode.xml`](all-playmode.xml).
- Final Windows x64 Development Build succeeded in 35.84 s, 230,107,437 bytes, 0 errors / 4 warnings. Build details are in [`build-provenance.json`](build-provenance.json). The visible player exited normally and rendered the labeled 20-seed gallery; see [`windows-player-observation-remediation.png`](windows-player-observation-remediation.png). Its one-frame startup capture is presentation evidence only, not a performance sample.

## Same-phase visual remediation — September 27, 2026

The first independent review held the family: many seeds looked like fused, noisy monoliths with a broad dirt pedestal, and seeds 19/20 were weak. One bounded construction repair tightened joins (smooth union 0.18→0.075 m), reduced broad warp (0.055→0.012 m), and reworked the layouts around offset shoulders, overhangs, capstones and a lower embedded foot. A shallow shelf/recess is present in representative seeds. Dirt is now a lower material-classification band on the existing rock formation (`y < 0.28 m`), not skirt geometry; the focused test verifies that material classification does not change solid occupancy. Surface textures and material values were regenerated to reduce high-frequency relief and separate cooler slate-gray rock from warmer brown dirt while keeping large faces readable. No authority, mesher, resolution default, projection rule, shared-surface/seam contract, or runtime path changed.

The final contact-sheet sidecar records 20/20 seeds, zero rejects, one resolved component per seed and deterministic field/mesh hashes. The bounded hierarchy contract and runtime field/material behavior are covered by focused EditMode tests; full U4 EditMode/PlayMode results are listed above. The contact sheet, hero captures and sidecars remain evidence for root's visual decision, not an automated aesthetic score.

## Material and projection path

Dynamic MatterWorld samples are resolved first and meshed through the locked Surface Nets path. `MatterMeshPublisher` publishes one shared surface/submesh with rest/source positions, tangents, stable UV0, and authoritative per-vertex material weights (`Color.r` is dirt weight). It does not build triangle-majority material teeth or coplanar duplicate rock/dirt surfaces.

The first-party HDRP `Wildkin/MatterRockDirt` ForwardOnly shader samples generated 128×128 rock and dirt albedo, tangent-normal, and mask textures from UVs projected from each triangle's stored rest/source coordinates. Triangle projection axis is selected from the mesher normals; the resulting UVs are baked into the mesh, so object translation/rotation does not reproject against world position. The vertex dirt weight blends both materials across the same surface. Rock and dirt have separate scale/normal character, tint, AO and smoothness response; macro contrast is restrained. All texture pixels are generated locally from fixed seeds by `MatterRockMaterialFactory`; there are no paid, external or vendored texture inputs.

[`dynamic-projection-remediation-seed-3-before.png`](dynamic-projection-remediation-seed-3-before.png) and [`dynamic-projection-remediation-seed-3-after.png`](dynamic-projection-remediation-seed-3-after.png) show the same runtime matter object before/after translation and rotation from matched object-relative framing. Directional lighting remains world-fixed, so illumination changes; the texture pattern remains attached to the object. `RestProjection_IsInvariantUnderObjectTranslationAndRotationWhileWorldPointChanges` numerically verifies invariant reference/sample coordinates while the world-space point changes.

## Stamp generator and authority

`RockFormationStamp` is engine-light generation input only. A stable seed/profile selects one of four asymmetric silhouette families, then places 6–7 rounded boxes, slabs and slope wedges with bounded scaling, rotation and 0.075 m smooth union. A 0.012 m broad warp is subordinate to deliberate offsets, overhangs, shelves and capstones; some seeds contain a readable recess/groove. The lower dirt identity is embedded in the existing formation and does not add an outward skirt. The resolved field is ordinary air-backed `MatterWorld` authority; no primitive recipe survives in meshing, editing or persistence.

The same-profile 20-seed results (bounds, volume estimate, aspect ratios, primitive distribution, connected components, mesh counts, hashes, generation/resolution/snapshot/meshing/publication timings, raw payload estimate and rejection reason) are in [`u4-rock-gallery-contact-sheet-remediation-final-metrics.json`](u4-rock-gallery-contact-sheet-remediation-final-metrics.json). The final Windows player sidecar is a one-frame capture record, not a benchmark.

## Review images

- Main labeled 20-seed contact sheet: [`u4-rock-gallery-contact-sheet-remediation-final.png`](u4-rock-gallery-contact-sheet-remediation-final.png) and its metrics sidecar.
- Four close-ups spanning all layout families: [`hero-remediation-bent-buttress-seed-3.png`](hero-remediation-bent-buttress-seed-3.png), [`hero-remediation-crown-shelf-seed-12.png`](hero-remediation-crown-shelf-seed-12.png), [`hero-remediation-split-shoulders-seed-14.png`](hero-remediation-split-shoulders-seed-14.png), and [`hero-remediation-leaning-ridge-seed-20.png`](hero-remediation-leaning-ridge-seed-20.png). These are candidate examples only; root decides whether the result clears the bar.
- Weak example retained: [`weak-example-remediation-seed-19-split-shoulders.png`](weak-example-remediation-seed-19-split-shoulders.png). Seed 19 remains a quality risk; it is not hidden by the hero selection.
- Bounded 0.25 m hero: [`hero-remediation-bent-buttress-seed-3-025m.png`](hero-remediation-bent-buttress-seed-3-025m.png) and its isolated metrics; this is not transition stitching.
- Material boundary and topology: [`rock-dirt-seam-remediation-seed-14.png`](rock-dirt-seam-remediation-seed-14.png) and [`wireframe-remediation-seed-14.png`](wireframe-remediation-seed-14.png), with sidecars.
- Runtime transform proof: [`dynamic-projection-remediation-seed-3-before.png`](dynamic-projection-remediation-seed-3-before.png) and [`dynamic-projection-remediation-seed-3-after.png`](dynamic-projection-remediation-seed-3-after.png).
- Visible Windows Player: [`windows-player-observation-remediation.png`](windows-player-observation-remediation.png) with [`windows-player-metrics-remediation.json`](windows-player-metrics-remediation.json).

The earlier baseline's seeds 19/20 and their initial captures remain in the folder as historical evidence. After remediation, seed 19 remains the clearest weak example; seed 20 is included among the family-spanning close-ups but still awaits root's judgment. This is a quality risk, not an acceptance decision.

## Tooling, interventions, and failures

The supported CLI/Pipeline commands are `generate_rock_stamp(seed, profile)`, `generate_rock_gallery(seedStart, count)`, `capture_rock_gallery`, `inspect_rock_stamp(seed)`, and `set_surface_material_debug(mode)`. The final gallery was regenerated through `generate_rock_gallery` and captured with `capture_rock_gallery`; `inspect_rock_stamp(seed: 3)` reported 204 resolved sparse samples, 4 crossing bricks, one component, 370 vertices / 486 triangles, and the same deterministic field hash as the gallery. The material-debug command returned to `off` after its smoke check. The saved gallery scene now stores only its five camera/light/volume/configuration roots; preview children are regenerated at runtime. A scene-inspection regression fix clears orphaned serialized preview children when the runtime-only ownership lists are empty after reopening a scene.

Two LayeredLit presentation attempts failed to give stable, readable output; after the second failure the material path was structurally changed to the bounded first-party HDRP ForwardOnly shader described above. Early all-white captures were not treated as material evidence: an explicit single-scene camera, teal clear, exposure, culling and capture target were verified with an unlit probe before the authored material was recaptured. One first Development Build serialized transient generated seed roots with missing script references; that scene was treated as a closure defect, fixed, reopened/saved clean, and rebuilt. The final serialized scene has no seed/label preview objects or null script references. The first stable contact/player captures are 1920×1080; a higher-resolution capture request was rejected by the tool. A PlayMode invocation once returned HTTP 400 while its asynchronous run continued; final status and XML both report 1/1 passed. No package/tool upgrade, paid dependency, manual Inspector operation, or owner action was needed.

The final build's four warnings are: no Pipeline Runtime config for the agent-command service in Player, two `DestroyObject` method-hiding compiler warnings (U3 preview and U4 gallery view), and an unrecognized `d3d12` token in the shader's renderer pragma. The visible Windows x64 Development Player rendered the labeled gallery; the warning is retained, not concealed. The gallery/player capture path provides no GPU frame-timing API.

## Performance limits

The earlier implementation build's PlayerLoop statistics remain in `windows-player-metrics-clean.json` as historical diagnostics, not proof for the remediated build. The final remediation Player proof deliberately records the visible capture but only one observed frame (startup-dominated, about 2,959 ms); it cannot support an average, p95, steady-state, or production performance claim. Current gallery stage timings and raw payload estimates are in its 20-seed metrics sidecar and exclude managed/container/native/GPU overhead. No GPU timing is available.

Do not extrapolate these prototype observations to production-world budgets, chunk streaming, physics, actor transfer, destruction, or solved mixed-resolution transitions. U5 and full migration remain out of scope.
