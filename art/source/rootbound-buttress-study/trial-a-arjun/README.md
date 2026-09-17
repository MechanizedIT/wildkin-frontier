# Rootbound buttress study — Trial A (Arjun-guided)

**Final status: HOLD — not admitted.** This is nonshipping study evidence only. It creates no runtime asset, collider, registry entry, placement, or gameplay change.

## Outcome

| Pass | Scope | Independent decision |
| --- | --- | --- |
| 1 | Fresh untextured massing | Gate A HOLD: 15 separate components, thin roots and canopy wafers. |
| 2 | Fresh thicker root/fork inputs, voxel-unioned wood, deep canopy hulls, one opaque palette/export | Gate A PASS; final likeness HOLD **7.1/10**. |
| 3 | Focused canopy-vertex and palette-plane repair only | Final HOLD **7.4/10**. |

The final review preserves the pass-3 tree as useful evidence but holds its stiff near-straight shaft, under-layered fork gesture, and broad shallow canopy caps against the approved target. Trial A's three-pass allowance is exhausted. See `pass-3/independent-final-review.md`.

## Retained final evidence

- Editable source: `pass-3/rootbound-buttress-trial-a-final-repair.blend`.
- Exact GLB: `pass-3/rootbound-buttress-trial-a-repair.glb`.
- GLB SHA-256: `08a17ed82f79320f6c8bf919675ff53412a81e254a6bc15c29d12db080865b06`.
- Structural check: `pass-3/glb-check.json` — PASS, 4,542 triangles, 10,073 vertices, one material, no textures/bones/animations. This does not waive visual review.
- Final actual images: `pass-3/final-renders/{front,rear,left,right,source_three_quarter,game_48,game_96}.png`.
- Pass-2 exact frozen-mesh reconstruction: `pass-2/rebuild_current_massing.py`; it reproduces the saved post-repair mesh data in a clean Blender scene.

## Guidance actually applied

- `blender-modeler`: separate blockout/render collections, named meshes, meter-scale source, retained source checkpoints, closed-manifold audit, and non-destructive input backup before voxel union.
- `vegetation-artist`: trunk → branch → canopy hierarchy and canopy silhouette consideration.
- `reference-image-match`: source-facing camera, untextured all-angle comparison before palette/export, then actual comparison renders.
- Project `wildkin-asset-forge` and modeling-director plan: independent Gate A/final reviewers, changed geometry method after failure, one material/5k prop budget, all-angle + 48/96 evidence, and no self-admission.

The current tree contract excluded alpha leaf cards, wind, LOD/impostors, extra materials, provider generation, and runtime integration. Dense-looking opaque foliage within the 5,000-triangle budget was not prohibited: the builder's simplified canopy and heavy allocation to wood are implementation choices, not a requirement to miss the target. No old tree geometry was reused.

## Reproducibility record

`pass-1/mcp-journal.md` and `pass-2/mcp-journal.md` record the executed live MCP sequence, measurements, audits, and the syntax-only failed rerender call. They are operational journals, **not literal transcripts of every executed Python chunk**. The exact post-repair mesh is retained through the editable Blend and `pass-2/rebuild_current_massing.py`; this is the reliable reconstruction artifact. The original live MCP construction-call payloads are not separately recoverable after the session, so no reconstructed prose or new script is represented as the exact historical construction code.
