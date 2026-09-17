# Independent R7 hoof-only plan review

**Decision: GO for a separate, focused R7 builder.** This is an appropriate repair of the one retained R6 visual debt: it changes six hoof meshes only and preserves the body, head, eyes, fronds, leg paths, cuffs, transforms, and source material assignments.

## Evidence checked

I reviewed the retained R6 actual all-angle candidate, the practical Rootbound reuse policy, `construction-plan.md`, `parameters.json`, the executable `cpu-feasibility.py`, and its generated receipt. I also reran the CPU proof from the frozen input: it completed with all six pads closed, socket contacts recorded, soles at Z=0, and replacement bounds of `2.15489 x 2.13997 x 0.37040 m`.

The method is materially better than changing box dimensions in world space. Each pad starts from the matching terminal cuff's measured end ring, creates a widened short socket along that cuff axis, then tapers through waist and sole rings. That gives the builder an actual host relationship to preserve rather than an arbitrary foot box. The six-sided, smaller pads and charcoal-teal palette directly address the black rectangular frame that dominated the R6 small views.

## Required builder invariants

- Consume `build_replacement_hooves(parameters)` directly. Do not reinterpret its output as cubes, generic cylinders, claws, or fused legs.
- Replace only the six named hoof objects in a derived scene. Assert exact vertex/index/material/transform parity for every retained R6 object before and after the replacement.
- Repeat actual Blender audits for each pad: closed directed edges, finite/nondegenerate triangles, outward normals, the complete six-vertex cuff end ring inside its socket, and all sole-ring vertices at Z=0 before rendering.
- Render the unchanged seven-view 512/96/48 set. The visual gate is practical: the feet must remain visibly grounded from the underside but cease to create a black block frame at gameplay scales.

The CPU receipt proves the literal planned socket construction and planar soles, not welded anatomy, animation, collision, persistence, or runtime behavior. Those remain later gates.

## Reuse note

The cuff-derived tapered pad method is a useful reusable part recipe for related low grounded Wildkin. Any later rotation, tint, or small scale variation must rebuild its pad from that creature's own terminal cuff and preserve its own sole/support proof.
