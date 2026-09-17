# Ironspine narrow rockbank — independent construction-plan review V2

## Decision: PASS to builder source preparation

V2 resolves the prior blockers without changing the frozen 63-vertex/122-triangle geometry. The input hash is `0C403C94DC9AFAD763F0761BB95D1744DB8072E15F6C9C4D9C2BEA5E55C94252`; its plan proof retains one closed component, two uses per edge, positive volume, and individually stored concave end caps.

The axis contract is now explicit and reversible: canonical game `(x,y,z)` loads as Blender native Z-up `(x,-z,y)`, then Y-up export returns `(x,y,z)`. The proof reports zero error across all 63 input vertices, and the builder must repeat that check from the exported GLB rather than add a compensating yaw. The material recipe now correctly uses Blender nodes: one Principled BSDF and CORNER-domain `bank_palette` color attribute. For Blender 4.5, use its version-correct opaque material/export settings rather than the retired `Material.blend_method`; Alpha 1 and no transparency remain the required glTF result.

The burial statement is also accurate: the lower ring is intentionally 0.38 m below the minimum sampled terrain, leaving roughly 1.27–1.62 m of crest exposure across the sampled span. That remains a construction assumption, awaiting actual finished-hull, terrain, route, and native projection evidence.

This is approval only for a builder-owned source/massing build. It is not model, support, collision, placement, or runtime admission.
