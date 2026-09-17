# Emberhorn measured anatomy plan — independent review

**Status: PASS to a separate bounded builder, pending the required visual
Gate A.** I verified plan JSON SHA-256
`b77727baa84d80965672703a012c4f7bd789c48435ed2e9f5dd374e77bb6af7f` and the
current Emberhorn constructor. The proposal confines itself to the four
`heavy_leg` meshes and fifteen `layered_mane` meshes; the body, head, horns,
hooves, materials, gameplay and sibling constructors remain outside scope.

The vertical eight-point limb rings correct the current 0.05m-depth failure:
the proposed local limb extents are 0.60m high and at least 0.42m deep, with
closed convex end caps. Their lower rings overlap the retained hoof volumes
and their upper rings overlap the torso volume; front and rear offsets retain
the intended opposing knee set. The widest new limb position is x = +/-0.73,
inside the existing horn/body envelope (the retained horn reaches roughly
+/-0.75); its front/rear limits remain inside retained head/torso/hoof extent.

Each mane wedge supplies two 0.26m-separated five-point profiles with closed
side bridges and convex caps. The three rows overlap in X/Z and begin within
the torso band, so the plan has a credible compact, volumetric crest rather
than fifteen floating leaf planes. It remains below the preserved horn tips.

Builder gate requirements: derive faces from the explicit UTF-8 coordinates;
audit every limb/wedge for finite vertices, positive signed volume, two-face
indexed edges and outward normals; record actual torso/hoof joint overlap per
view rather than only AABBs; compare all non-Emberhorn species buffers and
unchanged Emberhorn component transforms; then render neutral front/rear/sides/
three-quarter plus 48/96px before any portrait or charge proof. The visual
review must still reject detached joints, changed horn identity, or an
unreadable crest.
