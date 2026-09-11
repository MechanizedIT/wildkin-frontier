# Field chest — retained reviewed source

Independent game prop reconstruction of the parent-authored target `../../targets/field-chest-v1/reference.png` (SHA256 `b5338f6cf8a569a79f8eadfe483623adfadf5221a918601ccfd281d76d1c42fe`). The implementer and UI reviewer both inspected the actual reference: plausible overall; the absent fixed latch keepers were an AI ambiguity corrected explicitly here. No paid generator or imported third-party mesh. This exact model is integrated as `assets/models/field-chest-v1/model.glb`; static independent review passes8.1 and native opening/readability8.2. See `docs/FIELD_CHEST_REVIEW.md` for runtime proof and limits.

`field-chest.glb` is the candidate; `manifest.json` and `export-check.json` identify its exact bytes. `field-chest-editable.blend` retains named individual construction pieces and meaningful moving pivots, with the palette packed. Reproducible builder: `tools/art/build-field-chest.py`. Export merges only within the four rigid batches: body, lid, left catch, right catch. One rough, nonmetallic, nonreflective material and one embedded 256px palette; 3436 triangles. This exceeds the preferred 1500–2500 range but is below the authorized 5000 maximum. No modifiers or external texture fetches remain in the GLB.

## Coordinates and opening contract

Meters; glTF Y up, +Z front, base at Y=0. Actual closed bounds are approximately 1.43 wide × 1.02 tall × .924 deep; the small width/depth excess over 1.42×1.02×.9 is the feet and forward catch clearance. See the exact buffer-derived bounds.

- `ChestBody` remains fixed.
- `ChestLidPivot` local position `[0,.783,-.416]`, rotation X 0 to -100 degrees.
- `ChestLatchLeft` / `ChestLatchRight` are lid children at local `[±.447,.124,.853]`; rotation X 0 to -.8 radians releases each lower tongue outward. Their upper pin is at the upper end, attached to the lid band. Both fold back to 0 after the lid clears the body.
- Child geometry nodes are `ChestLid`, `ChestLatchLeftGeometry`, and `ChestLatchRightGeometry`. No animations are baked; the runtime owns this rigid opening cycle.

Root's exact .95s amount curve is used in the final views: `s(t)=t*t*(3-2*t)` after clamping t to [0,1]; lidX = -100°×s((amount-.2)/.8), latchX = -.8×s(amount/.2)×(1-s((amount-.7)/.3)). Closed=0; released=.2; half=.5 (31.640625°); catch-refold=.85 (90.771484375°, catch -.4rad); fully open=1. Reverse the same path to close.

## Construction and clearance

The body has an actual thick floor and four continuous walls, an open octagonal rim, and dark inner liners. The cavity floor is approximately Y=.228; the rim is Y=.766, giving ~.538m clear depth. The mouth is ~1.12×.56m. The lid has a recessed underside with a real backing roof and structural perimeter. These are visible in `interior-open.png`; no solid fake cavity or floating floor.

Fixed hinge outer knuckles and moving center knuckles share an X axis with 2mm axial gaps. The closed lid structural rim begins at Y=.795, 29mm above the body rim; hinge leaves/barrels intentionally meet at their articulated joint. Fixed front keeper plates and catches remain on the body. The final catch assembly is 24mm forward of the first candidate: lower shoe back is front-Z .4365, keeper front is .433, leaving 3.5mm clearance; housing back is .440 versus tan strap front .4275, leaving 12.5mm. The upper pin contacts the front of the lid band at Z=.419. Releasing the lower tongues increases frontward separation before lifting. Refolding happens only above ~68° lid elevation. Internal overlaps between fixed joined armor pieces are intentional seams, not moving-part clearance.

This is a measured construction check plus bounded rendered phase inspection, not an exhaustive triangle collision proof. Native continuous opening/refill, instance persistence, touch readability, and owner phone review are root-owned gates.

## Evidence and review limits

All final PNGs are 512px actual fresh-GLB imports, Cycles CPU, four threads, 16 samples: closed, released, half, catch-refold, open, rear-closed, rear-open, and interior-open. The helper switches imported pivots to XYZ Euler mode before applying the runtime X rotations. Intermediate diagnostic archives are explicitly invalid/superseded; their hashes must not be used for admission.

UI reviewer positively reviewed the prior identical main body/hinge shape at 8.1/10, but required the catches to fold flush when open. That correction is included. A subsequent numeric audit caught a closed catch/strap overlap; the final 24mm offset resolves it and requires final exact-hash review. Slightly lighter feet/corner chamfers and simpler strap end profiles remain nonblocking fidelity limitations in that review. The implementer does not self-admit the candidate.

Final V2 exact SHA256: `36f19f19badbe2dd61b4fcd0c12363d8ee1473374d01b937a2530cd9336cbc41`. This folder freezes the final 24mm clearance revision; earlier d0a779 candidate and its judged images remain together under `../v1/pre-clearance-d0a779/`. All V2 images correspond to the V2 hash. No canonical model copy or runtime edit was made.

Independent UI reviewer subsequently verified the final disk SHA and all eight V2 views: PASS8.1/10 for limited static/phase admission. No obvious rim/catch clipping in released/half/refold images; supported hinge and flush open catches. Native continuous runtime review remains separate and pending.
