# Cinderjaw / Emberhorn — independent baked-visual integration plan review

## Decision: PASS a focused bake implementation, conditional on its narrow selector and proof

The diagnosis is correct. `createWildkinMeshVisual()` is useful for neutral inspection, but runtime assets go through `createVisualAssetVisual(asset)`, which reconstructs `asset.parts` from `src/world/data/world.generated.js`. A mesh-kit change alone cannot establish shipped creature geometry. `generate-world.mjs` then derives that generated module from `world.json`.

The proposed integration path is appropriate and does not need a visual-factory change:

1. Extend `tools/bake-visual-kits.mjs` with a repeatable `--asset <id>` selector. Validate the entire requested list before loading or writing `world.json`: each ID must be unique, must exist in `VISUAL_KIT_BUILDERS`, and must exist as a non-external-model visual asset. Reject missing, unknown, duplicate, or empty selections without writes. With no selector, retain the current all-registry behavior exactly.
2. Invoke it only with `asset_wildkin_emberhorn` and, only after Cinderjaw neutral PASS, `asset_cinderjaw`. The builder may update those two serialised `parts` collections; it must not change catalog entries, placements, regions, collision, or gameplay metadata.
3. Run `npm run world:generate` after the focused bake. Capture before/after evidence proving every nonselected visual asset, region, catalog/gameplay field, and world object is exact. For each selected asset, compare the direct kit visual after the same flattening operation to the serialized recipe and the `createVisualAssetVisual()` reconstruction: mesh count and order, geometry positions to the documented four-decimal serialization precision, indices exactly, positions/transforms, color, flat-shading, roughness, and side.
4. Re-capture the Emberhorn ordinary encounter from the factory-backed baked asset; the previous encounter is valid old-recipe runtime evidence but cannot admit the newly serialized recipe. Capture Cinderjaw first in an isolated factory-backed fixture after its neutral candidate passes. Neither capture licenses a behavior, collider, taming, utility, or animation change.

`meshRecipePart()` already correctly bakes a mesh’s world linear transform into vertices and preserves the useful pivot, including mirrored winding. The selector must leave that path unchanged. Its four-decimal position serialization is an explicit fidelity limit: comparisons should use an absolute tolerance of `0.0001` for serialized floating coordinates, while index order and material flags remain exact.

Required focused tests/proof: selector argument validation/no-write failures; existing unselected/default behavior; selected-part/factory parity; full world generated check; unaffected-world snapshot; and normal aggregate/verify/ZIP checks after source freeze. This review authorizes no integration until actual Cinderjaw neutral retention and these concrete proofs exist.
