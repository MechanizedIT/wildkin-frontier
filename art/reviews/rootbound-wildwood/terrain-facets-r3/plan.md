# Rootbound terrain facets R3 — irregular triangle method

**Status:** one private renderer-only candidate for independent visual review. R1's
sinusoidal shoulder and R2's side fan remain preserved evidence; neither source
nor physics changes here.

R3 uses the same retained destination camera and current two-metre terrain
grid, but moves the visual emphasis into the lower-center negative space:
x[-458,-436], z[666,688]. It is a literal 12×12 authored vertex lattice,
not a sine field, random normal perturbation, or extra mesh resolution. The
outer vertex ring is zero, including the shared x=-450 chunk edge.

The lattice makes an irregular sequence of broad low crests, troughs and
diagonal joins. Adjacent triangles share the same modified vertex positions,
so actual flat-shaded face normals read the shape. It spans both ordinary
Rootbound chunks (-10,13) and (-9,13) without changing their index order.

## Measured preview envelope

The CPU receipt reads actual current Float32 chunk data:

| measure | result |
| --- | --- |
| lattice vertices / terrain triangles | 144 / 242 |
| nonzero vertices | 100; outer ring exactly zero |
| relief range | -0.320 to +0.360 m |
| added face-normal rotation | 0 to 9.22°, mean 3.97° |
| centroid faces in 412×915 camera | 76 |
| useful lower/mid-frame faces | 32, inside x[35,377], y[230,600] |
| baseline query-to-mesh difference | max 4.71e-7 m |

The current absolute triangle slope can reach 46.44° inside this field. That
is why R3 is a render method proof, never a route/support claim.

## Modest correlated face color

The private harness keeps the current baked terrain map. It converts only the
two affected visible chunks to non-indexed cloned preview geometry, so each
actual triangle can receive one shared RGB multiplier. Its three duplicated
vertices receive the same relief-correlated multiplier, currently
0.922..1.089 in the executed CPU receipt. The geometry outside the rectangle
uses [1,1,1]. This is deliberately a broad light/dark cue for the existing
map, not a checkerboard palette or new texture.

The cloned material retains its map, enables vertex colors, and keeps flat
shading. The original indexed geometry and material stay in a restore map.
The harness never changes source chunk data, terrain queries, Rapier surfaces,
resource/home admission, save state, or runtime residents.

Run a future private A/B only through preview-harness.html after root takes
browser ownership. Restore baseline before closing the tab. If the actual
frame is still not clearly improved, preserve R3 as HOLD instead of adding
another subtle terrain variation.

## Files

- parameters.json: literal shared-edge lattice and multiplier constants.
- feasibility.mjs / feasibility.json: CPU proof using actual current chunks
  and calibrated camera; no runtime imports beyond normal terrain sampling.
- preview-harness.html: self-contained cloned-buffer rendering preview.

A later authoritative pass, if R3 earns retention, follows the existing R2
integration notes: one protected Rootbound height/color term in the shared
profile chain, complete resource/home/hull and .32 m route proof, and native
lifecycle testing. R3 itself makes none of those changes.
