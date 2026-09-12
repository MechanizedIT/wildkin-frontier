# Living Frontier F1 — foundation checkpoint

2026-09-12 14:15 UTC. Producer-selected third pass; **technical foundation usable, visual target not admitted**. Chris authorized advancing after about three passes. This is not his personal art/playtest acceptance.

Camp's former exterior wall is open. Deterministic 50 m terrain chunks share border samples, support heights and Rapier triangles. A hysteresis-controlled 5×5 window excludes four reserved Camp chunks. Removed terrain, colliders, materials, textures and foliage instance buffers are released. Existing Camp color sampling and local detail painting are reused. Main wires the existing loop; there is no additional frame loop.

## Evidence

- `baseline-edge.png`: actual old north Camp wall; player fixture x0/z−44, yaw0, pitch25°, 1280×720.
- `target.png`: generated concept from baseline; target fitness 8.6/10. This overestimated attainable horizon/composition at the fixed camera and first bounded window.
- Independent runtime comparisons: R1 3/10, R2 3.5/10, R3 4.4/10. `actual-r3.png` is the selected implementation. The straight paint/mesh boundary, sparse scenery and absent layered horizon remain. Companion motion differs between captures and was not changed by this slice.
- Real controller/Rapier test walks from the Camp edge through multiple generated chunk boundaries, remains supported within 0.22 m tolerance and never exceeds 25 residents. The fixture supplies movement intent; this is not an earned keyboard journey.
- `outside-r3.png`: browser position fixture x0/z−114, sampler height6.1934, capsule center6.7345, grounded,23 residents. Confirms displayed support at an outer location; not ordinary travel evidence.
- `package-ground.png`: fresh packaged build at a position fixture x0/z−70. Native Jump button recorded IDLE→JUMP→IDLE through an observer on the existing update call, then grounded. Observer restored. No warning/error logs.
- Packaged section activation fixture retires residents to0 and restores21 on Camp return. Camp position restored after probes. Literal packaged reload reaches Continue. Author retirement has focused automated proof, not a fresh native Author session.
- Aggregate `npm run verify`:998/998 tests, world/campaign consistency, build and validation PASS. `npm run zip` PASS:43.87 MB unpacked,20.47 MB ZIP. No physical-phone performance claim.

## Exact checkpoint hashes

| Artifact | SHA256 |
| --- | --- |
| frontierTerrain.js | e046bfe04b44fa593686716d49c3346b6b37ddab5632799c178415ebee7b32a4 |
| frontierChunkRuntime.js | 2fcb661814bc582b7e222017401e0ae35ed0bf76b5b1646d6e4dfe6e0009970d |
| packaged index.html | ae7e91a9de100922ee9718761dbfe3274528007ba35817825522707047d94e8a |
| submission.zip | cdcde7e4122dda06014295a78f64d9b3f16f4de85699ef01b1e3b4e43f0a1e12 |

The same checkpoint includes tested, not-yet-wired F2A finite resource residents/save records and a Mossling genome helper. They are preparation, not a playable population or breeding feature. Outside-Camp resume, floating-origin travel, distant terrain coverage, atlas, ecosystem content and individual capture remain later work. New forage must receive persistence callbacks before admission. Old finite sections remain temporary source content during the in-place cutover.

## Lessons carried forward

Match the actual renderer's color space and compositing, not just palette hex values. Baked textures need UVs and isolated materials; a bounded material count is preferable to unproven shared-uniform swapping. Release per-instance GPU buffers as well as shared resource owners. Judge targets against actual camera geometry and draw distance. Do not let a generated target imply unavailable water mechanics. Search selected source/evidence directories, never the entire historical `.dream-loop` tree.
