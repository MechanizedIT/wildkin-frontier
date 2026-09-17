# Lantern Log R5 topology audit

**Scope.** Read-only CPU audit of `raw-geometry.ply`. It does not modify the PLY, create a model, use Blender/GPU, weld vertices, calculate normals, or test self-intersections. The raw master remains `e25bdd049cf9a7d8d4e1a7df9e4193e9840b0b550c6052b134d3d88cd6276120` (41,776,379 bytes), matching `geometry-ply-receipt.json`.

## Result

The mesh has no non-finite position scalar, repeated-index triangle, or zero-area triangle. It has 67,425 one-sided boundary edges and 99,060 non-manifold edges: 83,003 with incidence three and 16,057 with incidence four. The raw is therefore not a closed manifold. Normal winding consistency was not tested.

There are four face-bearing components under **vertex-edge adjacency**: triangle edges union their endpoint vertices, so shells touching at only one vertex are joined. The main component has 2,169,924 faces, 1,052,031 vertices, area 2.9471108363, and bounds `[-0.5003723,-0.2924528,-0.2969053]` to `[0.4995916,0.1002825,0.2909446]`. A detached substantial component has 48,862 faces, 24,443 vertices, area 0.0643595968, and bounds `[0.1402457,0.1353446,-0.2885652]` to `[0.3443667,0.2899187,-0.1826695]`. Two additional separate six-face fragments exist. 1,145 vertices are unused, producing 1,149 all-vertex components when isolated unused vertices are included.

This proves detached pieces and open/non-manifold topology are present in the raw data. It does **not** identify which boundary is a visual underside or test intersections; those remain for visual cleanup review.

## Exact receipt and reproduction

`topology-audit.json` SHA-256 `0aa2f3cc3be4a59d390b8ea1f2c84c65899040bac652f6a0c8ff0a5ec5700f4e` contains source hash/counts, edge-incidence counts, components, bounds, and method. The exact executed commands were:

```powershell
python art/source/lantern-log-v1/geometry-ply-r5/topology-audit.py art/source/lantern-log-v1/geometry-ply-r5/raw-geometry.ply --out art/source/lantern-log-v1/geometry-ply-r5/topology-audit.json
& 'C:\Program Files\LLVM\bin\clang++.exe' -O3 -std=c++17 art/source/lantern-log-v1/geometry-ply-r5/topology-components.cpp -o $env:TEMP\lantern_r5_components.exe
& $env:TEMP\lantern_r5_components.exe art/source/lantern-log-v1/geometry-ply-r5/raw-geometry.ply 397 1077634 2218798
python art/source/lantern-log-v1/geometry-ply-r5/topology-component-summary.py
```

The read-only NumPy program memmaps little-endian float32 positions and fixed-width faces (`uchar` count plus three little-endian `uint32` indices), tests float64 cross-product areas in 200,000-face chunks, and packs each undirected edge as `(low << 32) | high` for `numpy.unique` incidence counting. The local SciPy 1.10 binary cannot load with NumPy 2.2.6, so the checked-in C++ source performs union-find over triangle vertex edges and the checked-in NumPy summary records face/vertex counts, bounds, and areas. No dependency was added.

The retained label cache is `raw-geometry.ply.labels.bin`, 4,310,536 bytes, SHA-256 `1e810f70152b60a04dd4bf4eb05966106b1b7a4dddf0b99eed1d1bfe94586071`. It is one little-endian `uint32` union-root label for each of the 1,077,634 source vertex indices, in source-index order. It is a derived audit aid, never a model input.

Checked-in source hashes: `topology-audit.py` `5ec58dbd8395b47366f9a84cab68db2bd38209d3822f2624e24c1512f21eb691`; `topology-components.cpp` `772f893b1bf717ad499a3063ae4281c44f195aa7dcb0047afea5ece5b0f029c9`; `topology-component-summary.py` `c8a7be980c2d56b00c451b9ecda3f1446e79905127a0b989009febe343955d29`.

Peak arrays were the 6,656,394 packed edge keys plus chunk-local float64 triangles, below the 2 GiB additional-memory limit. No self-intersection structure was constructed.
