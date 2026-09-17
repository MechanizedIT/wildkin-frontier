# Sunscar weathered rib V1 — construction plan V2

**Status: deterministic-detail amendment; independent re-review required.**
V1 files remain frozen. V2 changes only the held detail ambiguity identified in
`construction-plan-review.md`; the accepted seven-station massing envelope,
material, budget, views, and no-placement scope are unchanged.

Use `geometry-plan-v2.json` as the executable input. It defines `R[s][i]` and
`Q[s][i]` exactly, then replaces named host quads in place with a single shared
centre vertex and four triangles. The cap-band, bedding ledge, and two gully
groups are therefore welded to the original shell rather than separate slabs.
End caps are generated **after** all face replacements, in the stated ring
order; final audit must find one component, closed caps, two faces per edge,
and all bottom ring vertices at Z=0.

No offset expands the full envelope: cap and gully centres only move downward
in Z; the front bedding centre moves +Y inward and downward. Thus the 2.10m
depth at station 2 and 1.60m shoulder at station 1 remain real extrema. The
machine table estimates 156 triangles before any optional triangulation, below
the 700 ceiling.

The ordinary closure/component/grounding audit is a known routine loft audit,
not an additional modeling probe. After independent re-review, this contract is
GO only for the initial massing build; export, collider, placement, and runtime
admission are separate gates.
