# Emberglass Caldera visual review — R3 final

**Verdict: HOLD — 3.8/10.** The three-round ceiling is reached; this is the final visual judgment for the fixed witness, not a request for a fourth repair. Terrain support, route clearance, resource/life correctness and movement reveals are separate from this in-frame score.

Evidence inspected at full resolution:

- Frozen target: `art/targets/caldera-v1/target.png`, 841×1870, SHA-256 `bf9a40529161cbe2656c8e7c4bf972a8de8088746ecadf5dcdadcb42f7e98d88`.
- Actual R3: `.dream-loop/caldera/r3.png`, 309×686, SHA-256 `e0697747b9fd12f78581e8e02263f39b3c47ccdd8159ab5c72e6f80df933057c`.
- Prior R2 / R1 were also compared at 309×686 using the unchanged portrait witness `(850, -1962)`, yaw 0, pitch 42°, zoom 1.

| Category | Score | Judgment |
| --- | ---: | --- |
| Composition | 1.0 / 3 | A left terrain mass now enters the frame, but it reads as one broad flat polygon tucked under the HUD rather than a grounded inner shoulder. Its spire/bloom kit is cropped at the extreme left, the right shoulder is absent, and the useful middle remains an empty corridor. Offscreen shoulders and later movement reveals receive no credit. |
| Lighting / palette | 1.8 / 3 | Removing the bright green tuft field gives R3 the cleanest charcoal Caldera base so far, with warm orange accents at the left edge. The target's broad rust fields, dark silhouette rhythm, local contrast and atmospheric depth are still largely missing. |
| Materials | 0.7 / 3 | Most visible terrain is a single smooth gray surface. The left mass has little readable rock faceting or layered contact, while rubble, blooms, minerals and rust patches do not create the target's material hierarchy across the frame. |
| Polish | 0.3 / 1 | Player, companion, shadows and HUD remain clean. The cropped edge cluster, tiny clipped life shape at the top and large undressed plane make the scene feel unfinished. |
| **Total** | **3.8 / 10** | **HOLD** (`PASS >= 8`). |

R3 gains palette discipline over R2 but loses enough visible dressing and balance to regress slightly from R2's 4.0. It does not visually establish the asymmetric two-sided breach promised by the target.

## Final visual debt

The fixed portrait view still lacks a readable right-hand landform, a grounded dominant left silhouette below the HUD, rust/charcoal shoulder layering, midframe rubble and material scale changes, and visible mineral/danger landmarks. The playable route is clear, but it reads as an empty gray field rather than volcanic negative space shaped by enclosing terrain.

## Largest structural lesson for future scope

World-space placement was adjusted without first proving the projected screen-space composition. At this camera and HUD footprint, terrain intended to frame the route repeatedly lands offscreen, under the top UI, or as a cropped slab. A separately scoped camera/HUD or scene-design pass should block the breach as a portrait screen composition first—reserve visible left and right silhouette bands below the HUD, then solve terrain topology and prop grounding to those projected bands. Small palette or dressing edits cannot compensate for missing projected structure.
