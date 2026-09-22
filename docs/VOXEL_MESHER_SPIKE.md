# Phase 0 mesher candidate spike

This is isolated lab evidence only. It does not select a shipping mesher.

## Inputs held constant

Both probes receive the lab contract: `mesh({ size, voxels })`, where `size`
is 16 or 32 and `voxels` is a one-cell-padded `Uint8Array` of `(size + 2)^3`
material ids. Storage is x-fast, then y, then z. `0` is air; `1`, `2`, and
`3` are stone, clay, and wood. Outputs are local-coordinate `Float32Array`
positions/normals/colors and `Uint32Array` indices. The padded shell is
required input, never output geometry.

## Candidate A — @voxelize/wasm-mesher

- Published package: `@voxelize/wasm-mesher@3.0.0`, MIT.
- Registry tarball SHA-512 integrity:
  `sha512-jNH4LRIQyzkwjFXBgZDtbRDTX1jCbo6SI9KEmLHXi63joaT6eg6RT0VmLblI5BOFemNpHgPBzIGGF4KzEnoOHA==`.
- NPM tarball SHA-1: `4f6c62d2eb27aa3cf2c3912bdfd5d7bcb679e56b`.
- Vendored published JS/WASM/LICENSE: `lab/voxel/vendor/voxelize-wasm-mesher-3.0.0/`.
- Published WASM payload: 264,372 bytes.

The candidate is exercised through
`lab/voxel/candidates/voxelize-wasm-adapter.js`. Its upstream API requires a
full Voxelize block registry, `Uint32Array` voxels and lights, a nine-column
neighborhood, and x-major/z-fast storage. The adapter fabricates only four
full-cube lab blocks, converts the padded array, uses the center of that
nine-entry neighborhood, and merges its material geometries. It therefore
has conversion allocation/copy cost. The adapter decodes the package's
per-vertex AO from packed output lights; its input RGB/sunlight lights are
all zero in this probe. This is an API-fit risk, not a
claim that Voxelize lacks ambient occlusion in its native ecosystem.

## Candidate B — block-mesh local WASM wrapper

- Crate: `block-mesh@0.2.0`, `MIT OR Apache-2.0`.
- Crate SHA-256: `3c0345520b5aa77d7d154bd578a18e7a974350931b5f41f641a7844e951b978f`.
- Source: <https://github.com/bonsairobo/block-mesh-rs>.
- Vendored crate, original Cargo manifest, source, and both licenses:
  `lab/voxel/vendor/block-mesh-0.2.0/`.
- Wrapper source and lockfile:
  `lab/voxel/candidates/block-mesh-wasm/`.
- Release `wasm32-unknown-unknown` payload:
  `lab/voxel/candidates/block-mesh-wasm.wasm`, 27,146 bytes, SHA-256
  `c1965b04a8c8cc7bc4fbfc4b5d33c15327fe54a2a41c55881f3003e39e04ed11`.

The wrapper has an async browser initialization and synchronous `mesh` call.
It uses `ConstShape3u32<18,18,18>` and `<34,34,34>`, maps lab x-fast input via
the library's own `linearize` function, and meshes the interior `[1,size]`.
It provides exactly six cardinal unit normals and keeps all vertex positions
in the chunk-local `0..size` range. It merges only equal material ids, then
samples each greedy quad's material at its minimum voxel for the lab RGB
output. The upstream crate explicitly has no AO merge strategy; this wrapper
also has no AO channel. That is a material limitation for the Phase 0 gate.

Node execution against generated chunk `[0,0,0]`, seed `9212026`, proved
non-empty geometry and all six normal directions before timing:

| size | vertices | triangles | coordinate bounds |
| --- | ---: | ---: | --- |
| 16 | 540 | 270 | x 0..16; y 0..8; z 0..16 |
| 32 | 19,768 | 9,884 | x/y/z 0..32 |

These counts are geometry evidence, not performance measurements. Timed
desktop/mobile comparisons are recorded only by the serialized Phase 0
benchmark run.

The local-coordinate oracle used one solid voxel at local `[0,0,0]`: both
shapes produced 24 vertices, 12 triangles, bounds exactly `0..1` on all axes,
and six distinct cardinal normals. This caught and corrected an earlier
padding-coordinate off-by-one before any benchmark result was recorded.

## Build provenance and limitation

The wrapper was built with project-local Rust `1.90.0` and the local
`wasm32-unknown-unknown` target under ignored `dist/voxel-tools/`; it adds no
global toolchain or runtime dependency. The initial toolchain attempt was
interrupted by concurrent installers; a later single local installation built
the listed payload. Cargo emitted `static_mut_refs` warnings for the
single-threaded WASM output buffers. Phase 0 may use this probe for comparison,
but that implementation detail should be replaced with a safer output owner
before any adoption.

## Provisional compatibility finding

`block-mesh` is the closer data-model fit: it was designed for one-voxel
padding and supports fixed cubic shapes directly. It still needs an explicit
AO policy. `@voxelize/wasm-mesher` can be adapted for this bounded test, but
brings Voxelize registry, light, column-neighborhood, coordinate-order, and
multi-geometry conventions into a lab whose contract deliberately avoids
those owners. Under the accepted smooth target, neither block candidate is
eligible for the shipping mesher; their measured role is comparison only.

## Actual published-WASM probe

The Voxelize adapter was loaded in local Chromium through the lab static
server. The final full-adapter receipt supersedes the earlier cold probe:
size 16 returns 820 vertices / 410 triangles, area 414 m², no degenerate
triangles; size 32 returns 34,904 vertices / 17,452 triangles, area 10,278 m².
All three candidates match exposed surface area on the same generated inputs
and pass the one-voxel oracle (area 6 m², 12 nondegenerate triangles).
See [actual browser receipt](evidence/voxel-phase0/candidate-browser.json)
and `tools/voxel-candidate-browser.mjs`.

Five warmups and 25 measured full-adapter calls include input/output copying:

| candidate | 16³ median / p95 ms | 32³ median / p95 ms |
| --- | ---: | ---: |
| JS greedy with AO | 2.6 / 4.5 | 26.9 / 31.2 |
| block-mesh without AO | 0.3 / 0.5 | 2.1 / 2.3 |
| Voxelize with AO | 4.9 / 5.5 | 67.2 / 72.5 |

Different AO/merge policies mean these timings cannot rank equivalent visual
outputs. Each size compares the exact same padded field across candidates;
16³ versus 32³ here still represents different physical volume.

The upstream light word stores AO in bits 16–17; source inspection verifies
zero is fully lit and three is most occluded. The adapter applies the lab
`1 - ao * 0.18` shading convention. A four-voxel concave probe returned stone
red values 0.307 and 0.221, compared with the unoccluded 0.480, proving AO
survived the adaptation. It does not preserve Voxelize RGB/sunlight lighting
as a lab output attribute.

## Raw baseline and current direction

`tools/voxel-candidate-bench.mjs` used 15 warmups and 75 Node 22.17.1
Windows-x64 samples on the same generated chunk `[0,0,0]`. block-mesh timing
includes input copying into WASM but excludes output typed-array copies, so it
is a lower bound. A standalone 32³ chunk has eight times 16³'s voxel volume;
these are not equal-world-volume proof.

| candidate | size | median ms | p95 ms | triangles | AO |
| --- | ---: | ---: | ---: | ---: | --- |
| JS greedy | 16 | 1.890 | 3.054 | 438 | lab AO |
| block-mesh WASM | 16 | 0.169 | 0.303 | 270 | none; lower-bound only |
| JS greedy | 32 | 37.075 | 44.709 | 18,108 | lab AO |
| block-mesh WASM | 32 | 1.824 | 1.897 | 9,884 | none; lower-bound only |

The active target is smooth sub-metre scalar terrain. These block candidates
are retained only as measured Phase 0 baselines for cubic addressing, padding,
materials, and collision; neither is eligible to select the smooth mesher.
