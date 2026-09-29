# U4F-G1 staged TRELLIS geometry proof

**Status: `U4FG1_RAW_SOURCE_CANDIDATE`.** One staged geometry-only attempt completed; an independent reviewer says the raw source is worth taking into one bounded cleanup pass. Direct stamp admission is held by the open underside and raw nonmanifold topology.

This bounded follow-up uses the owner-approved `candidate-04.png` reference (SHA-256 `6B0D4606568158DE586F488BB0CAFE7B17E04C26B6C47F5528CEE6209043B0BC`) with the existing process-separated TRELLIS runner. It pins 512 resolution, seed 1234, 12 steps, one sample, `low_vram=True`, a shape-only decoder, and raw binary PLY output. It skips texture-flow sampling and textured export. The 6 GiB reserve, calculated stage gates, process ownership checks, offline model use, and exclusive mutex remain unchanged.

The input-specific decoded-face ceiling is 2,500,000. Prior geometry-only PLY results in the repository reached 1,029,792 faces (Rootbound), 2,218,798 (Lantern), and 1,804,432 (Trailgloam). The new bound is 281,202 faces above the highest successful raw PLY count; the separate 7,057,316-face Heartwood refusal shows why a finite raw-source ceiling is needed. The ceiling applies after decoder output exists, so it bounds the copy/write path and artifact size but is not a decoder peak-memory estimate.

The fresh plan calculated 16.633 GiB bootstrap headroom. The pre-run host snapshot recorded 31.775 GiB total RAM, 18.173 GiB free RAM, and 7,333/8,192 MiB free VRAM at 7% utilization. The five executed children all exited 0; the lowest parent-sampled free RAM was 10.998 GiB during shape-flow, above the unchanged 6 GiB reserve. RAM recovered to at least 17.657 GiB after each child. Texture-flow was skipped. Full per-stage values and handoff hashes are in `metrics/stages.json`; the pre-run snapshot is in `metrics/resources.json`.

The raw master is `art/source/u4f-rock-002/raw/staged512-geometry-r1/raw-geometry.ply`, SHA-256 `4CC76DC0608ED0E3575E25718C3B606561AA7925C4CD5D46350C4576D5958C5D`, 30,285,576 bytes, 796,082 vertices, and 1,594,784 triangles. Blender verified exact position/index import without mutation. The audit found 6,356 boundary edges, 9,864 nonmanifold edges, 53 unused vertices, and 54 vertex-connected components including those unused points. See `metrics/raw-source.json` and `metrics/inspection.json`.

The independent visual review finds a partially preserved broad, faceted silhouette and a large open underside cavity. It recommends one bounded cleanup candidate, with deliberate reconstruction/remesh likely needed for a closed stamp source. See [`review-raw-source.md`](review-raw-source.md) and the nine actual neutral views in `captures/`.

The previous Small512 API HOLD remains historical and unchanged. This result does not authorize Unity voxelization, U4G, or U5. Stop for owner review.
