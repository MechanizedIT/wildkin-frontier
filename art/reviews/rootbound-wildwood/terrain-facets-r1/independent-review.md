# Independent terrain-facets R1 feasibility review

**Decision: HOLD the proposed native A/B until the numerical receipt is corrected.** A tiny shared-query/mesh height term can be a reasonable, bounded A/B for Rootbound; it should not be implemented from this receipt.

## Concrete evidence faults

1. The written and coded support disagree. With `dx = (x + 456) / 5`, the term is nonzero at `x = -460` for interior Z values, while the plan declares the patch only `x in [-460, -450]` and says it is zero at its connected boundary. Its actual continuous X support is `[-461, -451]`; either declare and audit that support, or change the formula/clamp so the claimed boundary is zero.
2. `createFrontierChunk(-9,13)` is assigned but never inspected. The calculation instead invents a 2 m grid using `sampleFrontier`. It therefore does not prove that the exact existing chunk mesh vertices, triangulation, or world chunk are the affected native mesh. Generate the candidate from the same actual chunk vertex/index data used by the preview.
3. The camera receipt uses a `6.55 m` horizontal offset plus `5 m` height. That is not the recorded destination portrait displacement of about `11.591 m`, and its own projections place many sampled points far outside the NDC frame. The stated ~6.3-pixel visibility estimate is consequently not evidence that the player will see the shoulder.

## Narrow correction and next gate

Keep this as one prospective low shoulder, not a procedural terrain system. Correct the support, load the actual destination chunk mesh, and use the recorded camera transform/FOV to find a visibly central affected area. Then run one reversible native before/after preview with the same shared height term feeding query and mesh. It must show a perceptible plane change while preserving final full-hull support for the protected resources, homes, curated scenery, and the destination lane.

No source, collider, travel, ecology, or habitat-completion claim is justified yet.
