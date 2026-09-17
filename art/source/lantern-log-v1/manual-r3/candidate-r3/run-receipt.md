# Lantern log manual R3 — executed build receipt

- **Status:** `BUILT_PENDING_VISUAL_REVIEW`; this is a model-study result, with no GLB, collision, placement, harvesting, or runtime admission.
- **Input:** `parameters.json` SHA-256 `7d04105d455170836a2d3056f654f03a4603b58af6ad818114852e452c06e7e3`; builder SHA-256 `9e5fb4ba82b86640188ef8679c09663591af74140008057a35744d835c42c94b` at GO.
- **Execution:** one authorized Blender 4.5.3 LTS background run, terminal receipt timestamp `2026-09-14T20:37:51Z`. The 8 GiB start and 6 GiB reserve guards did not HOLD.
- **Geometry evidence:** 22 closed audited components; 1,452 triangles; all component directed-edge failures `0`; positive signed volumes; 16 grounded log triangles covering `0.3416987572m²` with XY bounds `[-0.8,0.813] × [-0.125,0.1375]`; six measured literal stem/log and local underside-axis cap contacts are in `candidate-audit.json`.
- **Renders:** all seven named directions at 512, 96, and 48 pixels: 21 PNGs. Blender interpreted the relative `scene.render.filepath` against `C:\`, placing the originals under `C:\art\source\lantern-log-v1\manual-r3\candidate-r3\renders`. Those originals remain preserved. The exact 21 PNGs were copied, never moved, into this candidate's repository `renders/` folder; SHA-256 equality was checked per matching filename. Future execution should pass/render to absolute paths.
- **Limits:** terminal completion and numeric audits do not self-pass visual fidelity. Independent visual review remains required.
