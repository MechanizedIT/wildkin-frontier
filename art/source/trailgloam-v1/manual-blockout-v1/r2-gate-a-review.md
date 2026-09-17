# Trailgloam Gate A R2 — independent review

**Decision: HOLD — visual identity 4.2/10; topology 0/10.** R2 improves the low, faceted saucer and makes six separated leg directions easier to count in top/three-quarter views. It remains a generic mechanical spider at 48/96 pixels: it has no forward wedge head, its two dorsal forms are uniform capped tubes rather than thick folded amber blades on dark sockets, and the legs/feet are overly rectilinear. Those visual results do not substitute for the required construction topology.

## Exact implementation divergence

The built script does not execute the reviewed R2 method:

- It caps the section-loft shell with intact `rings[0]` and `rings[-1]` faces and creates **no** `S*`, `H*`, `FL*`, or `FR*` apertures. Each leg's `tube()` first loop merely enters the closed shell volume; no shell-to-cuff bridge is ever created.
- Each leg's terminal loop is bridged only to the hoof tube. Its first six-edge loop stays open, accounting for `6 × 6 = 36` boundary edges.
- The two fronds are standalone uniform-radius `tube()` calls. They have no collars, folds, shell apertures, bridges, or closures; their two open ends contribute `2 × 2 × 6 = 24` further boundary edges. Together these exactly explain the reported **60** non-two-face edges and **9** components (closed shell + six leg tubes + two frond tubes).
- The five-loop head wedge is absent. Hoof endpoints use `h` at `Z=.06`, and the tube's capped/uncapped geometry does not establish a sole at `Z=0`. The required normals and triangle-BVH self-overlap results are absent.

## One final credible R3 repair

This is an implementation-parity repair, not another plan rewrite: build the already reviewed aperture/loop recipe and assert it *before rendering*. Generate the shell with the named head, six leg, and two frond boundary cycles omitted from its faces; bridge the reversed equal-count loops; use the five-loop head wedge; make two collar-bridged, tapered folded blades with an uncapped base and closed outer tip; and construct six-point flattened hoof wedges with actual sole vertices at `Z=0`. Fail the build before rendering unless it records one vertex component, zero non-two-face edges, valid mesh/no repair, outward normals, and zero non-adjacent triangle-BVH overlaps.

The final render suite must then establish the low beetle silhouette, visibly separate dark frond sockets, folded-blade thickness, forward head, six socket-to-sole paths, and 48/96 read. This is the last Gate-A repair allowance. It admits no export, collider, rig, motion, material pass, or runtime asset.

## Workflow correction

For future counted builds, inspect the generated source against the frozen construction table before launch and enforce the table as pre-render assertions. A written method is not evidence that its Blender script used its apertures, bridges, caps, contacts, or audits.
