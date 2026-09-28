# Unity U4D — local high-resolution MatterDomain

**Status: `LOCAL_DOMAIN_0_125_PASS` within the documented U4D qualification scope.** Independent read-only review found no technical blockers. U4C3 topology limits remain unchanged; U4E and later work remain stopped for owner review. See [independent review](review.md).

## Qualification question

Can a self-contained 0.125 m matter volume coexist with 0.50 m terrain and a 0.25 m local rock without refining the terrain, sharing sample ownership, or stitching the resolutions?

The tech scene uses one unchanged `MatterWorld` at 0.50 m, a 0.25 m CapstoneSlab domain, and a 0.125 m ChunkyBoulder domain. The terrain is rendered from a bounded read-only snapshot. Each rock owns a separate dense density/material array, stable ID, integer sample bounds, spacing, local pose, content revision, and mesh product. The initial rocks are placed with 2 cm measured surface clearance and zero sampled solid overlap.

## Results before independent review

- **World:** 0.50 m; 25,344 sampled cells in the qualification render bounds; unchanged hash `0x05C65AED7C03E19D`, revision 0.
- **Domain A:** 0.25 m; 3,696 samples, 18,480 raw density/material bytes, 8 logical regions. Initial mesh is a closed connected manifold within U4C3’s stated scope.
- **Domain B:** 0.125 m; 12,650 samples, 63,250 raw density/material bytes, 12 logical regions. Initial and edited meshes are closed connected manifolds within U4C3’s stated scope.
- **Local carve:** 291 samples changed; 2 directly affected regions rebuilt, 4 rebuilt including halo-neighbor impact, and 8 reused.
- **Moved-pose world carve:** 174 samples changed at local address `(4,2,4)`; 1 direct region, 4 rebuilt, 8 reused. The previous world-space location was a no-op. Translation and rotation preserve the matter hash and do not remesh.
- **Rest-space pose A/B:** the 0.125 m domain is rotated to a total 45° yaw for pose B; content and mesh hashes remain unchanged across the transform-only move (`captures/editor/04b-rest-space-pose-b.png`).
- **Isolation:** edits to the 0.125 m domain leave Domain A and the 0.50 m world unchanged.
- **Save/reload:** a JSON/Base64 density-and-material snapshot is saved after both edits; the runtime object is removed; the domain is reconstructed and remeshed without source geometry or saved mesh data. Content hash, pose, edited air, and deterministic mesh hash survive.
- **Bounds diagnostic:** the padded transformed AABBs contain 32 occupied 0.50 m world sample centers for the 0.125 m domain and 33 for the 0.25 m domain, counted inside a 5 cm-eroded envelope. This is broad-phase placement evidence, not solid overlap. Direct evaluation of positive local-domain samples finds zero world-solid overlap for both domains; their initial measured surface clearances are approximately 2 cm. This scene records a diagnostic query policy only and does not qualify shared cross-domain queries.
- **No adaptive stitching:** all three surfaces remain separate meshes and authorities.
- **Optional 0.0625 m tier:** not tested (`optionalSpacing0625Tested: false` in the machine receipt).

The final U4C3 topology boundary is preserved verbatim in the receipt: the recorded genus-zero family, 256 sign masks/orientations, face-saddle decider, and deterministic stress are qualified; arbitrary trilinear interior connectivity and higher-genus surfaces remain unqualified. U4D makes no broader topology claim.

## Performance and memory

Editor observations are in `metrics/editor-domain-025.json` and `metrics/editor-domain-0125.json`; the Windows Development Player observations are in the corresponding `domain-*.json` files. They report source SDF sampling, domain copy, mesher CPU and wall time, region combine, Unity mesh fill/apply/upload, edit-to-visible time, region count, and raw payload bytes. Raw bytes exclude managed array/object and Unity mesh overhead; total resident memory was not measured. These are qualification observations, not production budgets.

## Validation

- Focused MatterDomain EditMode: **11/11** (`tests/focused.json`).
- Full EditMode: **153/153** (`tests/editmode.json`).
- PlayMode: **2/2** (`tests/playmode.json`).
- Windows x64 Development Player: Unity 6000.3.25f1 build succeeded with 0 errors and 4 warnings; standalone process exited 0 and wrote a capture and full receipt (`player/build-provenance.json`, `player/receipt.json`, `player/capture.png`).

## Captures

Editor captures are in `captures/editor/`; the root `captures/` folder contains the latest automated sequence output. `01-overview.png` shows the initial world and both domains. `02-025-domain.png` and `03-0125-domain.png` show each spacing tier. `04-debug-domains.png` shows separate domain bounds and 16-cell regions. `04b-rest-space-pose-b.png` records the transform-only pose proof. `05-edited-domain.png`, `06-moved-domain.png`, and `07-reloaded-domain.png` preserve the carve, moved-pose edit, and source-free reload. The standalone Player overview is recorded separately under `player/`; its terrain and object layout are readable, but its surface detail is softer than the Editor closeups, which carry the detail proof.

For a human visual check, open the saved U4D tech scene in the Unity Editor and enter Play Mode. At the overview, the brown terrain should remain continuous behind a grounded low rock on the left and the detailed upright rock on the right. Toggle **Domain bounds** and **16-cell region overlay** in the upper-left: expect independent colored local bounds and 16-cell boxes around the rocks. A gap, visible overlap, terrain resolution change, shared cross-resolution surface, or missing rock is a failure sign. The machine-driven edit/move/reload proof is captured in steps 05–07.

## Scope limits

This is a bounded local-domain architecture qualification. It does not add rigidbody physics, support/collapse, MatterActor transfer, fracture, streaming, U4E/U5, Unreal, production migration, or 0.50↔0.125 terrain stitching. The optional 0.0625 m domain was not tested. The diagnostic AABB intersections are retained as conservative coexistence data; positive local-domain sample checks report zero solid overlap. The domain storage is dense and capped; world-scale local-domain residency is not claimed.
