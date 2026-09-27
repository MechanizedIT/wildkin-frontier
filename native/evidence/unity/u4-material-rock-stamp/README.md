# U4 — Stylized Materials and Procedural Rock Stamp

**Disposition: HOLD pending independent root visual review.** The implementation, test suite, clean serialized scene, agent-tool gallery reproduction, and Windows x64 Development Player evidence are assembled. This is not a self-awarded perceptual PASS; root must inspect the gallery and close-ups, especially whether the 20 forms are sufficiently distinct and authored-looking. U5 is not started.

## Result at a glance

- Locked mesher/resolution: `SURFACE_NETS`, 0.50 m. A single seed-3 hero was also compared at 0.25 m; this is a bounded comparison, not a mixed-resolution/stitching claim.
- `WildkinClast-v1` generated seeds 1–20 without per-seed tuning or rejection. All 20 resolved to one connected component and ordinary rock/dirt `MatterWorld` samples. Silhouette families are Leaning Ridge (6), Split Shoulders (5), Bent Buttress (5), and Crown Stack (4); each has 6–7 explainable primitive placements.
- At 0.50 m the family spans about 12.875–25.5 m³ occupied-sample estimates, width/height 1.13–2.22, and depth/height 0.99–1.76. Metrics diagnose the family; the images remain the review authority.
- Final Unity EditMode: 73/73 passed. PlayMode: 1/1 passed. XML is in [`all-editmode.xml`](all-editmode.xml) and [`all-playmode.xml`](all-playmode.xml).
- Clean-scene Windows x64 Development Build succeeded in 31.05 s, 230,108,081 bytes, 0 errors / 4 warnings. Build details and the warning list are in [`build-provenance.json`](build-provenance.json). The player exited normally and rendered the same 20-seed gallery; see [`windows-player-observation-clean.png`](windows-player-observation-clean.png) and [`windows-player-metrics-clean.json`](windows-player-metrics-clean.json).

## Material and projection path

Dynamic MatterWorld samples are resolved first and meshed through the locked Surface Nets path. `MatterMeshPublisher` publishes one shared surface/submesh with rest/source positions, tangents, stable UV0, and authoritative per-vertex material weights (`Color.r` is dirt weight). It does not build triangle-majority material teeth or coplanar duplicate rock/dirt surfaces.

The first-party HDRP `Wildkin/MatterRockDirt` ForwardOnly shader samples generated 128×128 rock and dirt albedo, tangent-normal, and mask textures from UVs projected from each triangle's stored rest/source coordinates. Triangle projection axis is selected from the mesher normals; the resulting UVs are baked into the mesh, so object translation/rotation does not reproject against world position. The vertex dirt weight blends both materials across the same surface. Rock and dirt have separate scale/normal character, tint, AO and smoothness response; macro contrast is restrained. All texture pixels are generated locally from fixed seeds by `MatterRockMaterialFactory`; there are no paid, external or vendored texture inputs.

[`dynamic-projection-before-seed-3.png`](dynamic-projection-before-seed-3.png) and [`dynamic-projection-after-seed-3.png`](dynamic-projection-after-seed-3.png) show the same runtime matter object before/after translation and rotation from matched object-relative framing. Directional lighting remains world-fixed, so illumination changes; the texture pattern remains attached to the object. `RestProjection_IsInvariantUnderObjectTranslationAndRotationWhileWorldPointChanges` numerically verifies invariant reference/sample coordinates while the world-space point changes.

## Stamp generator and authority

`RockFormationStamp` is engine-light generation input only. A stable seed/profile selects one of four stacked/asymmetric silhouette families, then places 6–7 rounded boxes, slabs and slope wedges with bounded scaling, rotation and 0.18 m smooth union. A low-amplitude 0.055 m broad warp breaks uniformity; some seeds receive a bounded pocket/recess. It does not make a sphere pile or noise-only blob. The resolved field writes rock above a warm dirt skirt into an air-backed ordinary `MatterWorld`; no primitive recipe survives in meshing, editing or persistence authority.

The same-profile 20-seed results (bounds, volume estimate, aspect ratios, primitive distribution, connected components, mesh counts, hashes, generation/resolution/snapshot/meshing/publication timings, raw payload estimate and rejection reason) are in [`u4-rock-gallery-contact-sheet-final-metrics.json`](u4-rock-gallery-contact-sheet-final-metrics.json) and player-observed form in [`windows-player-metrics-clean.json`](windows-player-metrics-clean.json).

## Review images

- Main 20-seed contact sheet: [`u4-rock-gallery-contact-sheet-final.png`](u4-rock-gallery-contact-sheet-final.png) (stable camera/light/material, no wireframe, readable seed labels).
- Four stronger close-up candidates: [`hero-seed-3-bent-buttress.png`](hero-seed-3-bent-buttress.png), [`hero-seed-8-crown-stack.png`](hero-seed-8-crown-stack.png), [`hero-seed-11-tall-buttress.png`](hero-seed-11-tall-buttress.png), and [`hero-seed-15-broken-ledge.png`](hero-seed-15-broken-ledge.png). These are candidate examples only; root chooses whether the visual result clears the bar.
- Bounded hero comparison: [`hero-seed-3-bent-buttress-025m.png`](hero-seed-3-bent-buttress-025m.png) and its 0.50 m counterpart/metrics. At 0.25 m seed 3 publishes 1,445 vertices / 2,324 triangles versus 370 / 486 at 0.50 m; it is an isolated uniform-resolution hero, not transition stitching.
- Material boundary and topology: [`rock-dirt-seam-seed-3.png`](rock-dirt-seam-seed-3.png), [`wireframe-seed-3.png`](wireframe-seed-3.png), and separate seam/wireframe metric sidecars.
- Runtime Player: [`windows-player-observation-clean.png`](windows-player-observation-clean.png), [`windows-player-metrics-clean.json`](windows-player-metrics-clean.json).

Initial internal review candidates for strongest shape hierarchy are seeds 3, 8, 11 and 15. Seeds 19 and 20 appear weakest (a broad dirt apron and a squat, simple mound respectively); root should check these against the literal formation target. This is a flagged quality risk, not an acceptance decision.

## Tooling, interventions, and failures

The supported CLI/Pipeline commands are `generate_rock_stamp(seed, profile)`, `generate_rock_gallery(seedStart, count)`, `capture_rock_gallery`, `inspect_rock_stamp(seed)`, and `set_surface_material_debug(mode)`. The final gallery was regenerated through `generate_rock_gallery` and captured with `capture_rock_gallery`; `inspect_rock_stamp(seed: 3)` reported 204 resolved sparse samples, 4 crossing bricks, one component, 370 vertices / 486 triangles, and the same deterministic field hash as the gallery. The material-debug command returned to `off` after its smoke check. The saved gallery scene now stores only its five camera/light/volume/configuration roots; preview children are regenerated at runtime. A scene-inspection regression fix clears orphaned serialized preview children when the runtime-only ownership lists are empty after reopening a scene.

Two LayeredLit presentation attempts failed to give stable, readable output; after the second failure the material path was structurally changed to the bounded first-party HDRP ForwardOnly shader described above. Early all-white captures were not treated as material evidence: an explicit single-scene camera, teal clear, exposure, culling and capture target were verified with an unlit probe before the authored material was recaptured. One first Development Build serialized transient generated seed roots with missing script references; that scene was treated as a closure defect, fixed, reopened/saved clean, and rebuilt. The final serialized scene has no seed/label preview objects or null script references. The first stable contact/player captures are 1920×1080; a higher-resolution capture request was rejected by the tool. A PlayMode invocation once returned HTTP 400 while its asynchronous run continued; final status and XML both report 1/1 passed. No package/tool upgrade, paid dependency, manual Inspector operation, or owner action was needed.

The clean build's four warnings are: no Pipeline Runtime config for the agent-command service in Player, two existing-style `DestroyObject` method-hiding compiler warnings (U3 preview and U4 gallery view), and an unrecognized `d3d12` token in the shader's renderer pragma. The D3D12 RTX 3070 Laptop Player still rendered the custom material; the warning is retained, not concealed. No GPU frame-timing API was available.

## Performance limits

The final Windows Player reports 17,766 `Time.unscaledDeltaTime` samples with a 0.534 ms all-sample mean and 3,581 ms maximum. `Start()` synchronously regenerates the full 20-seed gallery before normal frames, and the maximum is startup-dominated; the all-sample mean includes that hitch. Removing the single maximum leaves a derived 0.332 ms mean for the other samples, but the individual series/p95 is not retained, so this is only a steady-state proxy—not a production target or a formal sustained benchmark. Player per-seed CPU-stage totals were about 6.5 ms stamp parameter generation, 477 ms field resolution, 1,009 ms snapshots, 1,830 ms Surface Nets, 38.8 ms MeshData fill, 1.7 ms apply and 1.7 ms upload for the full 20-seed build. One seed-3 0.50 m matter+mesh raw payload estimate is 111,828 bytes; this excludes managed dictionary/object overhead, native Mesh overhead, textures, renderer/GPU allocations and allocator capacity. The capture includes no GPU timing.

Do not extrapolate these prototype observations to production-world budgets, chunk streaming, physics, actor transfer, destruction, or solved mixed-resolution transitions. U5 and full migration remain out of scope.
