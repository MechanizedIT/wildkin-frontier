# Trailgloam R3 source-to-plan map — pending independent source review

**Scope:** one final nonshipping Gate-A neutral anatomy repair only. `build_r3_massing.py` has been written but has **not** been run in Blender. This map is the requested source-to-plan review handoff, not proof of a mesh, audit, render, export, or admission.

## Reference reading retained

The inspected six-view sheet remains `../multiview/trailgloam-orthographic-v1.png` (the frozen complementary construction reference). Its readable landmarks are a low, broad teal saucer; restrained forward head; three visibly separated chains per side; broad dark planted hooves; and exactly two thick, folded amber dorsal blades on visibly separate dark sockets. R2 renders instead showed a closed shell with disconnected tubes, no head, uniform rods, and soles above `Z=0`; R3 changes only those named construction failures.

## Reviewed contract to source ownership

| Reviewed contract | R3 source ownership | Pre-render proof / failure |
| --- | --- | --- |
| Frozen axes and reconciled envelope `1.88 X × 1.89 Y × 1.70 Z` | `LEG_PATHS`, `FRONDS`, and `audit()` | Fails if bounds exceed any reconciled maximum or any vertex is below ground. |
| Low faceted shell with genuine 5/6-loop apertures | `build_ported_shell()` uses the independently accepted scaled faceted icosphere amendment (`.58 × .50 × .295 m` half-extents). | Each named fan is omitted, its isolated pivot is deleted, and the surviving neighbour cycle must contain one-face boundary edges before child construction. |
| Genuine five-loop head aperture / wedge bridge | `ports['H']`, `build_head()`, `bridge_open_loops(..., 'H_to_N')` | Equal 5-loop bridge is explicit; no capped neck loop. |
| Six genuine six-loop shell→cuff→upper→lower→ankle→hoof paths, including RR | `ports['S_'+name]`, `build_leg()` creates `S,C,D,U,V,W,X,A,P,Q` for every `LEG_PATHS` entry | Paths are constructed through one BMesh; audit requires exactly one vertex component and no non-two-face edge. |
| Real sole contact | `Q` is built by copying the hoof perimeter at `Z=0`; only `Q` is hoof-capped | `audit()` rejects a nonzero sole or geometry below ground. |
| Two distinct socket holes, dark collars, folded prism blades | `ports['F_L/R']`, `build_frond()` and `F*_to_collar` bridges | Six-loop bridges are explicit; base/mid/tip sections change width and shift the inward half to form a ridge; only outer tip is capped. |
| Named pre-bridge cycle/count/no-duplicate checks and reversed bridge ordering | `assert_open_cycle()` and `bridge_open_loops()` | Build aborts on count/duplicate/invalid-vertex/duplicate-face conditions; bridge uses `second[(n-(i+1)) % n]`, `second[(n-i) % n]`. |
| Actual selected shell ports remain local to planned anchors | `ordered_boundary()` and `port_selection` metrics record request/selected coordinate, distance, valence, and boundary count for H, every S, and both F ports. | Build aborts when a selected pivot is more than `.22 m` from its requested centre, does not have its required 5/6 valence, survives deletion, or leaves a non-boundary cycle edge. |
| Valid, manifold, outward, nonintersecting mesh before any render | `bmesh.ops.recalc_face_normals()` and `audit()` | Build aborts unless all edges have two faces, component count is one, and BVH reports zero nonidentical/nonadjacent overlaps. |
| Neutral-only restriction | header, `main()`, metrics limits | Script contains no renderer invocation, GLB exporter, rig, animation, texture, collider, or runtime path. |

## Required reviewer decision

The independent R3 source review accepted the disclosed faceted-shell amendment and required the exact pivot-deletion correction above. This map now records that correction. Source has not been run in Blender; root must obtain the final source recheck before scheduling the sole GPU slot.
