# Independent review — guarded geometry-only TRELLIS profile

**Pre-run verdict: GO for one fresh, owned `geometry-ply-v1` run.** This receipt records reviewed code and the gate only. It makes no claim about a generated output, its visual quality, or asset admission.

## Reviewed code state

| File | SHA-256 |
| --- | --- |
| `tools/art/trellis-process-staged.py` | `1590692243B77A5E17D17DA3BA21A82F08073CF0E9EF521403B8E4D32947A2B4` |
| `tools/art/trellis_geometry_ply.py` | `CFB4FD7458ECB200AA34506BCAEB32872A16AFD04ADB43BEB2CB7C67EAB03BEF` |
| `tools/art/inspect-trellis-geometry.py` | `E570AFDCF046E92BEBE2C04F22A1F9C76081242803D0C9CE9C32BBD2AE331CFB` |

The ordinary full-export profile remains capped at 750,000 decoded faces. The separate geometry-only profile is capped at 1,100,000 decoded faces and restricted to the reviewed Rootbound buttress input SHA-256 `65d8f8c63be4a3c98738aabe72cad21ce9399f3950914b559f8d1dc80abd457a`.

`profile_contract_from_plan` derives the mode, cap, and output name from immutable profile constants before parent or child stage imports, and rejects mutable-plan conflicts. Each child independently rehashes the pinned input before imports. The profile keeps the offline environment, 32,768-coordinate ceiling, shared generation mutex, stage floors, and both parent and child 6 GiB reserve watchdogs.

The geometry branch returns after writing an exact CPU position/index binary PLY. It does not invoke `o_voxel`, CuMesh, BVH, UV, bake, simplification, or GLB export. The PLY writer rejects nonfinite positions and invalid indices, re-reads the full binary record set, and records counts, byte totals, hashes, source index provenance, copied position bytes, index extrema, and the position payload hash.

The neutral Blender inspector now requires the adjacent guarded receipt and validates the PLY schema, counts, scalar type, hash, and byte count before import. It then checks Blender's imported counts, float32 position equivalence with any float64 precision delta recorded, and exact triangle index ordering. Its 8 GiB start requirement, 6 GiB watchdog, fresh output requirement, and non-mutating scope are appropriate for a raw-geometry inspection only.

The reviewed run is one fresh owned experiment. Any resulting geometry still requires neutral inspection and independent visual judgment before cleanup, runtime use, or admission.


## Post-run reporting correction

The reviewed geometry branch exported and its child exited0. The parent then failed while recording completion because `append_event` received `output` twice. The reporting-only fix uses `append_complete_event` and an `artifact_path` field, with a new no-GPU regression. All12selftests pass. Final runner SHA `3a0f43fc108e588494fc4a7cc41f7b4ec1960b41f94bcbafe20242baba5ce800`; all profile guards unchanged. Preserve the original run's parent exit1 and successful output receipt; no regeneration or retrospective success event was substituted. Actual Blender and independent visual results are in the separate geometry visual review.
