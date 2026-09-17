# Mossling V4 eye-overlay candidate receipt

This isolated candidate was built from `assets/models/mossling-v3/model.glb` (SHA-256 `ca044bb9321423c8d4e83aedce7697d98109eafbeeafbefbdf3d0e13a58e9cf9`) using `tools/art/mossling-v4-build-eyes.py`.

It preserves the V3 textured body mesh, armature, packed base-color texture, and the five source clips (`Idle`, `Walk`, `Run`, `Attack`, and `Hurt`). The original body material is named `wildkin_body`. A single, head-bound `mossling_v4_iris_overlay` mesh adds both teal iris rings and black vertex-colour pupils using `wildkin_iris`; it adds 48 export triangles.

`structural-report.json` records the source clips, 23-bone armature, two materials, and unchanged packed texture. The game GLB checker rejects this candidate solely because the result is 20,047 triangles, 47 above the existing 20,000 creature cap. The apparent 20,127 triangle count in the Blender inspection includes an existing 80-triangle V3 Icosphere helper that the game GLB checker does not count.

Visual evidence:

- `review/front.png` and `review/three-quarter.png` are close review renders.
- `game-sized/front.png` and `game-sized/three-quarter.png` are 256px review renders.
- `motion-contact/` contains three-quarter renders at the start, midpoint, and end of every preserved source clip.

No shipping asset, runtime, or world-data file is changed by this candidate. `mossling-v4-eyes.blend` remains the editable source.
