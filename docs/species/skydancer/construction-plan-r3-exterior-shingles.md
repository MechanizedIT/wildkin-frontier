# Skydancer R3 exterior-shingle plan

R3 is the final focused repair. It freezes R2’s primary wing and all lower anatomy exactly. The only changed arrays are the existing three plates on each side.

Each plate preserves its R2 tested buried four-vertex root. Its four free vertices become an exterior descending shingle body at x `.11`, `.12`, and `.13` beyond the R2 primary-wing outer x `.05`, giving `.06`, `.07`, and `.08 m` clearance while staying inside the `1.133993 m` authoring limit. The plan therefore changes the failed fused-solid method without adding parts.

The JSON fixes FOV-38 side and three-quarter camera positions and records projected tip centers. Its executable prebuild rule is stronger than projected coordinates: depth-rasterize the frozen primary wing, then every plate must have nonzero visible pixels and an exposed edge whose depth is nearer than the wing at that pixel. Failure aborts the build.

## Executed full-model visibility receipt

`art/reviews/skydancer/rotation-1/r3-depth-raster-proof.py` now reproduces the proof from the frozen R2 anatomy source plus only these planned plate replacements. It depth-rasterizes all 18 frozen/proposed model parts at the four named FOV-38 views. The per-view rule tests only the three plates on the camera-facing wing: right in `side` and `threequarter`; left in their mirrored views. Far-side zero counts remain in the stored raw counts but do not make a near-side read fail.

The script writes the proof JSON and derives `occlusion_pass` from all 24 view/resolution/plate checks. At 96 px the camera-facing side counts are 25/15/17 and three-quarter counts 11/9/10; each exceeds the two-pixel floor. At 512 px they are 692/466/482 and 308/277/273; each exceeds the 20-pixel floor. The mirrored left results match.

The reproducible raster now consumes `r2-native-mesh.json`, asserts all 27 native parts, and applies each part's recorded column-major `matrixWorld` before rasterization. It uses pixel centers, `n`-sized image coordinates, a Three-style camera right/up basis, and perspective-correct reciprocal-depth interpolation. The proof receipt lists every transformed native part name and the exact 27-part assertion.
