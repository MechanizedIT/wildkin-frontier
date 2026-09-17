# One-port BMesh anatomy method diagnostic — plan

**Status: source and plan only; pending independent review.** This is a reusable enabling diagnostic, separate from the closed Trailgloam visit. It makes one abstract hexagonal shell and one collar bridge. It is not a creature model, visual repair, asset export, runtime artifact, rig, motion, or a budget reset.

## Failure analysis

The terminal Trailgloam R3 audit stopped at `S0..S5 LF: neighbour cycle is not a one-face shell boundary`. R3 selected a valence-six icosphere pivot, deleted its fan faces with `bmesh.ops.delete(..., context='FACES_ONLY')`, deleted the pivot with `context='VERTS'`, then treated a polar-angle sort of the pivot neighbours as the port cycle.

Blender BMesh deletion has two relevant semantics to isolate:

1. `FACES_ONLY` removes faces but preserves their vertices and edges; the former fan pivot and spokes can remain as wire geometry. Deleting the exact pivot with `VERTS` is required to remove those spokes.
2. Removing the pivot does not prove that a geometric polar-angle sort of its neighbours reconstructs the topology cycle. On a curved triangular shell, especially after a previous port changes nearby face incidence, a sorted neighbour pair can be nonadjacent or have zero/two shell faces. R3's error establishes the assertion caught such a case; it does not by itself distinguish wire-edge residue from incorrect cycle ordering.

The probe records both `FACES_ONLY` and subsequent `VERTS` behaviour in a deliberately isolated six-triangle fan. Its actual reusable construction does not depend on either deletion or a sorted inferred cycle.

## Construction method

`build_one_port_probe.py` explicitly creates four ordered six-vertex loops:

| Loop | Z / radius | Purpose |
| --- | ---: | --- |
| `bottom` | `0.00 / .50` | shell ground-facing perimeter, capped |
| `outer` | `.32 / .50` | shell top perimeter |
| `aperture` | `.32 / .16` | real top hole boundary, uncapped until collar bridge |
| `collar_top` | `.52 / .12` | short collar outer termination, capped |

Three reversed six-loop bridges construct shell sides, the shell-top annulus, and the aperture-to-collar connection. The aperture is an intrinsic annular boundary: no post-hoc face deletion, Boolean, voxel remesh, overlapping closed solids, or inferred neighbour order is used. The shell bottom and collar outer termination are the only caps.

## Gates for a later approved execution

Before any render, the script must record:

- `mesh.validate()` makes no repair;
- all edges have exactly two incident faces;
- exactly one vertex-connected component;
- no non-adjacent triangle-BVH overlap, excluding only triangles sharing a vertex;
- at most 1,000 faces; and
- the fan-deletion semantic record described above.

If all checks pass, an eventual approved execution may save only the diagnostic `.blend` and one neutral render under `.dream-loop/anatomy-port-method/`. It must not create creature geometry or modify Trailgloam. If a gate fails, preserve the metrics/failure and stop; do not adjust the method within this diagnostic without a new reviewed plan.

## Review question

Does this explicit annular-six-loop method provide a safe, reusable one-port shell/collar primitive under Blender 4.5 BMesh semantics, and should its single later execution be authorized? The review should assess the actual metrics and one neutral render, not this plan alone.
