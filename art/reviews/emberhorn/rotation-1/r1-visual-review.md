# Emberhorn rotation 1 — independent visual Gate A review

**Status: HOLD for one focused R2 repair.** The visual candidate materially
improves the previous blade-thin anatomy. The four legs now have clear volume
and planted hooves in front, side and three-quarter views; their joints read
as overlapping the retained torso/hooves. Head, paired horns, body and hoof
identity are preserved. The closed-mesh audit supports that result: four
positive-volume, two-face-edge legs and fifteen positive-volume closed mane
wedges stay within the old model envelope. Sibling hashes are exact.

Scores: preserved Emberhorn identity **8/10**; leg volume/ground contact
**8/10**; all-angle silhouette **7/10**; target likeness **6/10**; mane
integration **4/10**; 48/96px readability **6/10**; topology/technical
readiness **8/10**. Overall **6.7/10**, below admission.

Three consequential gaps:

1. The mane reads as a rectangular, alternating-color stair stack in rear,
top and side views, rather than the compact irregular brow-to-neck crest of
the target. It competes with the horns and does not visibly enter the torso.
2. Several mane wedge bases are visually exposed as parallel rails from the
side/rear. Closed individual wedges are technically valid but the group does
not yet form one continuous organic mass.
3. At 48px the improved legs read, but the crest collapses into a dark/orange
bar, leaving the animal less distinctive than the target.

**Single R2 repair:** preserve every approved leg, horn, body, hoof, material
and gameplay component. Re-space only the fifteen existing mane wedges into a
lower, tapered, overlapping brow-to-neck ridge: bury each lower profile inside
the torso, stagger the three rows in Z/X, reduce the flat common top line, and
make the centre row highest without exceeding the retained horn/body envelope.
Use the same closed-wedge topology and named pieces; render the same views and
48/96px evidence before another review.

The change from alternating leg/hoof child insertion to four legs followed by
four hooves changes indices, but I found no consumer of Emberhorn
`children[index]`: `createWildkinMeshVisual` returns the group and the visual
factory uses it as a whole. Names and occurrences remain four `heavy_leg` and
four `dark_hoof`; no animation binding impact is established. Future parity
receipts should compare named occurrence/geometry/transform rather than child
index. Browser portrait and charge/recovery evidence remains pending and is
not claimed here.
