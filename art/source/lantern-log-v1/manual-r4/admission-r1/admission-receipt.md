# Lantern R4 runtime admission — R1

**Status:** READY FOR NATIVE PREVIEW. This records a packaging admission, not a visual acceptance of the assembled Grove.

- Source master: `../candidate-r4/lantern-log-manual-r4.blend`, SHA-256 `07CF98ED1DAE48B5164B76F892A86CC29F6D98437DF428586C7987ADCE119004`; it was opened for export only and not saved.
- Art artifact: `assets/models/lantern-log-manual-r4-v1/model.glb`, SHA-256 `D5037FD475DD5EAF78DBC22E595679AE4CD3E68DB81D568B1888D5A97B1053F6`, 118,984 bytes. The low-scenery runtime uses the supported baked mesh recipe in `world.json`, not generic external-low rendering.
- Exact retained source collection: 16 meshes, 1,390 triangles. The exported prop has no collision, no animation, and no gameplay role beyond `prop`.
- Export optimization: the source’s 11 visible material colors are retained per corner in glTF `COLOR_0`; the art export uses one white vertex-color material. The supported runtime recipe partitions that same palette into ten flat-shaded mesh parts, using linear-to-sRGB conversion for Three.js hex colors, with all 1,390 source triangles retained.
- `check-game-glb.py --profile prop`: PASS (`glb-check.json`). `audit-r4-runtime-glb.mjs`: PASS; all exported primitives expose `POSITION` and `COLOR_0` and share the one art material (`runtime-color-audit.json`). `bake-r4-runtime-parts.mjs`: PASS; the existing low-scenery parts path receives ten palette partitions / 1,390 triangles (`runtime-parts-audit.json`).
- The earlier two-material extraction is retained as historical export source (`export-r4-runtime-derivative.py`); it is superseded because it reduced the source palette. The reviewed R4 Blender master and all prior R3/R4 artifacts remain unchanged.

The default-world Lantern Grove record uses the supported baked parts recipe only after the four curated records select together. Native portrait capture must still judge whether the packed R4 colony reads as a useful clustered deadwood/fungal edge without obscuring the normal HUD or central apron.