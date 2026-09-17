# Fungal Hollow structural plan v1 — HOLD

## Decision

No terrain or scenery source change is proposed. The one bounded candidate that preserves the certified route, identities, and fixed destination camera produces only one useful 2 m terrain vertex. It cannot read as a continuous right-to-rear dry bank or unequal shoulder.

## Fixed evidence

The destination capture is player `(-2826, 14.146509, -1298)`, yaw `2.432966`, pitch `0.628319`, 52° FOV, 412 × 915 viewport. The reconstructed eye is `(-2819.897279, 21.859575, -1305.119836)`. The proof applies the existing Fungal profile, max-unions the three dry-bank lobes below, then multiplies their result by the combined protection mask at the normal 2 m terrain mesh vertices.

| lobe | center | radii m | requested peak m | post-mask center m | projected center px |
| --- | --- | --- | --- | --- | --- |
| rear shoulder | (-2842, -1287) | (8.5, 6.5) | 0.88 | 0.310 | (372.77, 148.29) |
| right mid-bank | (-2843, -1294) | (9.5, 10.5) | 1.16 | 1.160 | (608.03, 190.14) |
| right near runout | (-2840, -1300) | (6.5, 7.0) | 0.62 | 0.620 | (789.87, 335.72) |

The merged candidate affects 53 prospective 2 m vertices, with final heights 12.248957–14.129492 m. One vertex falls in the useful frame (`x=10..402`, `y=165..640`): `(-2840, -1288)`, projected `(352.30, 173.63)`, with 0.022754 m added after masking. Other substantial terrain is beyond the right edge or at the top/HUD edge. Limited existing dressing cannot make that one vertex a continuous landform. The existing 23 fixed Fungal dressing records and their caps remain unchanged.

## Retained protections

The proof retains the complete certified capsule centerlines: approach `(-2848,-1216) → (-2850,-1232) → (-2849,-1248) → (-2854,-1258)` and return `(-2854,-1258) → (-2846,-1270) → (-2838,-1284) → (-2826,-1298)`, with 3 m half-width, 0.8 m mesh margin, and 3 m feather. It retains four 0.9 m resource disks at `(-2847,-1241)`, `(-2855.8,-1240.5)`, `(-2843.5,-1255)`, and `(-2860,-1255)`; solid stones at `(-2853,-1247.75)`, `(-2846.75,-1252)`, and `(-2858.25,-1249)` with 1.14 m disks including the 0.32 m player footprint; and the full Thorn home `(-2868,-1260)` with its 10 m radius and feather. Direct samples at every protected identity have zero height delta.

Outer terrain was allowed to be steep. This HOLD comes from the protected footprint and exact camera projection, not from an all-terrain slope restriction.

## Next decision

Keep source, sampler order, stable IDs, resource/home records, fitted stones, and caps frozen. A later visit may only reopen this direction with a changed approved staging or target that admits a material visible bank, then repeat this post-mask 2 m mesh and full-camera proof. This plan needs independent review before implementation authorization.
