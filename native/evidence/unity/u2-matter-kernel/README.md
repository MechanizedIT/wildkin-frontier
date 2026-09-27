# U2 Native Matter Reference Kernel

**The bounded U2 matter kernel remains PASS; a U2 revalidation correction is complete and awaiting root review. U3 is not started.** The original checkpoint received an independent read-only PASS. Revalidation corrected two face-order errors in the debug sample mesh and added a regression test; it does not change the matter authority, persistence contract, or production-mesher decision.

## Environment and control path

- Unity `6000.3.25f1`; HDRP `17.3.0`.
- Unity CLI `1.0.0-beta.11`; Unity Pipeline `0.8.0-exp.1`.
- The fresh Codex session did not expose a dedicated Unity MCP tool. The already-qualified Unity CLI/Pipeline bridge handled project inspection, script recompile, scene creation/open/capture, tests, and the Windows build. The toolchain was not upgraded.
- The tech scene is `Assets/Wildkin/Scenes/Tech/MatterKernelDebug.unity`. It visualizes the same `MatterWorld` resolved by tests and the inspector command. It remains out of the enabled player build scenes.

## Kernel layout

- Integer global sample addresses own matter identity. Floor division maps them to 16³ half-open sample bricks and nonnegative local coordinates, including negative space.
- Each brick stores contiguous density and material arrays for 4,096 unique samples: `4,096 × (4-byte float + 1-byte material) = 20,480` raw bytes. This excludes managed array headers, brick/dictionary objects, alignment, and any future read-only neighbor/halo window.
- Brick reads lazily resolve deterministic dirt-plane, rock-inclusion, and air-cut sources. Composition uses explicit precedence and is order independent.
- Sparse overrides/tombstones use global integer addresses. Accepted changes revise the world once; removals remain air over the procedural source. The bounded JSON save format is provisional and stores source seed/version, spacing, revision, and sorted sparse edits.
- Region snapshots copy contiguous densities/materials over min-inclusive/max-exclusive integer bounds and retain origin for global/local mapping. They reject writes outside the captured bounds.
- Rendering and physics remain separate future consumers. The brick is not a physical owner; unknown support is represented as fail-closed data only. No detachment, rewards, meshing, destruction, or actor simulation is implemented.

## Validation

- Baseline before U2: EditMode 3/3 and PlayMode 1/1 passed.
- Revalidated U2: EditMode 43/43 and PlayMode 1/1 passed. The new EditMode check verifies all twelve sample-cube triangles agree with their outward normals. NUnit XML is included as `editmode.xml` and `playmode.xml`.
- `inspect_matter_region` ran in the live Editor over `minInclusive=(-8,-4,-8)`, `maxExclusive=(9,5,9)`, seed `20260926`: 2,601 samples, 1,297 solid (17 rock, 1,280 dirt), 0 edits, revision 0. The full machine-readable result is `inspector-result.json`.
- Its fixed sample benchmark covered 4,096 reads/pass × 32 repetitions. The revalidation run measured 46.76 ms direct and 37.5308 ms resolved, with matching checksum `3091936243887374693`. These are one workstation/editor observation, not a performance threshold or player-build result.
- The original U2 Windows x64 Development Build succeeded with the warmed Unity environment. It was not repeated for the debug-mesh winding correction; that change was covered by fresh EditMode and PlayMode runs. Build provenance is `build-provenance.json`; the generated local player output is at workspace-root `Builds/U2MatterKernel/` and is excluded from the source commit.
- The captured visual is `debug-screenshot.png`, refreshed through the live Pipeline after rebuilding the scene mesh. The initial HDRP capture was overexposed; the final capture uses explicit HDRP color clearing and fixed exposure with unlit material colors.
- The original independent read-only review passed before this correction. Root review of the revalidation is pending. The only U3 handoff note is to read a neighboring +1 sample plane for each 16-cell meshing window while keeping global sample ownership unique.

## Limits and next gate

The 16³ unique-sample brick is a qualification default, not the final production brick or streaming contract. A future mesher can read neighboring global samples for the boundary corners without copying halo data into authority. There is no multi-resolution, Burst/Jobs implementation, save compatibility promise, chunk streaming, collider, Surface Nets, Dual Contouring, procedural rock family, or production engine decision here. Review this evidence before authorizing `UNITY U3 — MESHER + RESOLUTION BAKEOFF`.
