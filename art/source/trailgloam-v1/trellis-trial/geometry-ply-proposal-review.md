# Independent Trailgloam geometry-only PLY proposal review

**Decision: GO for focused helper implementation and its source/test review; not yet for a GPU run.** Reviewed `geometry-ply-proposal.md` SHA-256 `89283734af84ad5911df3be8714c33a133e2557c4dc2b87b930f94bcf1c749d9` against the held exact-input staged receipt.

The proposal is a proportionate changed method. The actual staged run completed numerical stages but correctly stopped at 1,804,432 decoded faces and 889,679 vertices under the ordinary 750,000 full-export refusal. A Trailgloam-only 1.9M raw-PLY ceiling leaves 95,568 faces of bounded input-specific headroom, writes a modest estimated ~34.1 MB direct PLY body, and avoids the expensive/irrelevant CuMesh, `o_voxel`, BVH, UV, texture, GLB, remesh, weld, and repair paths. It gives the team a real raw shape to inspect rather than treating a 30k export request as evidence of geometry.

The profile is sufficiently isolated only if implementation makes the following contract executable:

- Pin `417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff` before every child import and derive mode, output filename, allowed hash, and 1.9M cap from immutable profile constants rather than editable plan fields.
- Preserve ordinary `full-export` at its 750k pre-export refusal and 8 GiB `o_voxel` condition, Rootbound tree PLY at 1.1M, Lantern PLY at 2.3M, and all existing offline/mutex/floor/6 GiB watchdog/coordinate checks byte-for-byte in behavior.
- Keep the new branch strictly before `o_voxel`; write and re-read little-endian float32-position/uint32-index binary PLY, recording source and copied dtypes/devices/byte counts, counts, finite positions, index range, position payload hash, and full-file hash.
- Test exact input acceptance and changed-input refusal, profile/mode/cap/output mutations, 1,900,000 accept versus 1,900,001 refuse at the decoded-count boundary, PLY round-trip/count/index/hash validation, no-Torch parent, and full-export branch isolation.

The proposal correctly says the 30k flag is unused in this route and that current PLY success would still be only an untextured raw master. The line calling the held result a “service quality trial” should be corrected to **staged quality trial**: the service attempt stopped before inference, while the cited 1,804,432-face result is the process-staged run. This is a factual wording correction, not a change to the profile recipe.

After focused implementation and an independent source/test review, one fresh serialized run is reasonable. A cap refusal, guard event, or PLY validation failure ends that run; no export, cleanup, resume, or retry follows automatically.
