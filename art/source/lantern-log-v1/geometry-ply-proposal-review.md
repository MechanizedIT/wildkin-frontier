# Independent feasibility review — Lantern geometry-only PLY proposal

**Verdict: conditional GO to implement and independently review one new, input-pinned profile; no run is approved by this document.**

The proposal is a valid changed-method response to the retained 2,218,798-face Lantern V2 decode and the two held manual studies. It does not relabel the historical 14.2509 GiB event sample as a memory guarantee. A geometry-only PLY branch avoids the known `o_voxel`/CuMesh/BVH/UV/bake peak, and its estimated 39.84 MiB output payload is correctly limited to file-size arithmetic rather than a process-memory claim. The ordinary 750k full exporter and buttress-specific 1.1M geometry profile must remain unchanged.

The proposed 2,300,000 ceiling is narrowly above the observed V2 result and is appropriate only as a fixed Lantern-V2 experiment, bound to SHA-256 `85bd175a6b102cf183b50ff5ca45a1afd6847a6920a28b0039bd8e1e98d6b2ac`. It must be enforced from immutable code-level profile constants, not mutable plan fields, and rehash the input before each child import. A face count above that ceiling must stop before CPU PLY serialization. The existing one-job mutex, fresh-empty output requirement, offline model restriction, child process boundary, 6 GiB reserve watchdog, coordinate bound, and stage floors remain mandatory. No handoff resume or repurposed failed directory is supported.

Required implementation evidence before any GPU slot:

- focused tests prove full-export stays 750k and buttress geometry-only stays 1.1M/input-pinned;
- the Lantern profile rejects every other input, plan/profile/output-name/cap mutation, and counts at 2,300,001 while accepting the boundary contract at 2,300,000;
- static or focused behavioral proof shows Lantern geometry-only never reaches `o_voxel`, CuMesh, BVH, UV, bake, simplification, or GLB export;
- exact binary PLY re-read verifies declared counts, finite scalar positions, triangle arity/index range, byte size, and hash; record source tensor dtypes/devices/copy sizes and actual min/max indices;
- the decode receipt records all guard events and terminal child/parent outcome. A later serialized Blender import is a distinct, fresh-resource-gated inspection job.

Any PLY is an untextured raw geometry master and still needs neutral visual, topology, and derivative review. It is not model, collision, placement, harvesting, or runtime admission.
