# Ironspine narrow rockbank — independent construction-plan review

## Decision: HOLD pending a focused convention/API correction

The stored literal input is otherwise construction-ready: 63 vertices and 122 triangles fit the declared `3.6 × 2.0 × 1.0 m` complete envelope; the plan proof reports one component, all 183 undirected edges used twice, no zero-area triangles, positive signed volume, and separately enumerated concave end-cap triangles. The seven ordered profiles can make the target's continuous, declining, three-ledge bank without separate masonry blocks. V2's target restrictions remain binding.

Two technical statements must be corrected before a Blender build:

1. The Blender recipe names `MeshStandardMaterial`, which is a Three.js API. Use a Blender material node setup (Principled BSDF or an equivalent opaque Blender material) and require the later glTF/runtime proof to establish the intended Three material flags. Do not present a Three constructor as a Blender operation.
2. The coordinate statement is false as written. Blender's native Z-up local coordinates are not the game data's X/Y-up/Z-depth coordinates. The builder needs one explicit reversible mapping, for example load game-space `(x, y, z)` into Blender `(x, -z, y)`, then export with Blender's Y-up conversion, followed by a source/runtime check that the resulting glTF returns the stored game-space bounds and orientation. An equivalent mapping is acceptable only when documented and proven. The present “same convention/no axis swap” instruction risks an incorrect bank orientation.

The grounding language also needs precision, though it is not a geometry rebuild: with world origin at the minimum sampled terrain height and local base `−0.38`, the base begins 0.38 m below the minimum support, while the 2 m *total* mesh height leaves approximately 1.27–1.62 m exposed across the sampled terrain range. This is intentional burial, not a claim that the full 2 m bank is visible or that `.38 > terrain span` alone establishes contact.

After those prose plus executable mapping corrections, preserve the frozen vertices/faces and re-review only the corrected recipe/input mapping before Blender. No asset pass has been consumed.
