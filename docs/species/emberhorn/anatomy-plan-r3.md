# Emberhorn final R3 — crest height from the actual torso

Proposed final mane-only repair. R2 removed the prism bars but buried most of
the crest. Forty-five downward rays against the actual retained torso triangles
now measure the skin under every proposed section apex. The evidence is
`art/reviews/emberhorn/rotation-1/r2-torso-skin-probes.json`.

Keep R2's fifteen tapered three-section meshes, widths, depths, positions,
materials and buried bases. Only section heights change. Set each end apex
0.025 m above its measured skin and each middle apex 0.175–0.21 m above it,
with the central columns slightly stronger than the outer columns. The JSON
stores the actual skin values, offsets and resulting literal vertices; this
avoids inferring the torso surface from its bounding box or a nominal body Y.

The existing closed convex-profile operation remains unchanged. Preserve R1
legs and every other component and species exactly. Compute bounds from all
vertices, prove closure/volume, then compare the actual side, front and
three-quarter silhouette plus phone-size renders. Correct skin clearance alone
cannot pass the visible mane requirement. This is the final counted candidate;
retain a HOLD if it still misses, without another regeneration or scope change.

Independent plan review must precede the separate builder. Root owns native
renders and ordinary portrait charge/recovery evidence; no new gameplay or rig
is authorized.
