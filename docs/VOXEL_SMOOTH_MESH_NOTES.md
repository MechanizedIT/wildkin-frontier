# Smooth voxel meshing Phase 0 note

The owner requested Space Engineers-like smoothing at sub-metre detail.  This
lab therefore compares two project-owned, dependency-free smooth-density
candidates before any shipping-world decision: Surface Nets and marching
tetrahedra. Both take signed scalar samples: 0.5 m gives two sampling intervals
per metre along each axis, while 0.25 m gives four. Surface vertices interpolate
between these values. This is geometric smoothing, not only softened normals.

`meshSurfaceNets` is the preferred candidate. It emits one vertex per crossing
cell, averages the actual density crossings, and uses trilinear density
gradients for normals. Its padded sample contract lets each chunk calculate
ghost vertices, while a crossing edge is emitted only by the chunk owning its
lower sample coordinate. That gives exact seam vertices/normals and one owner
for every surface face.

The selected lab default is provisionally 16³ chunks with 0.5 m sample spacing.
The finer 0.25 m profile is retained for comparison. Both smooth candidates
have bounded local occupancy AO from the eight scalar corners and their
quarter-cell footprints; this is a cheap local approximation, not traced or
propagated lighting. Surface Nets ghost vertices include identical colors in
the seam regression. The state, target ray, renderer, static Rapier collision,
debris snapshot and save format all use the same physical sample spacing.

`meshMarchingTetrahedra` is a deliberately simple comparator. It preserves
interpolated crossings and deterministic winding, but makes more triangles and
duplicates vertices. It establishes that smoothness is coming from the scalar
field rather than normal smoothing over cubes.

Surface Nets follows the ideas in Mikola Lysenko's [Smooth Voxel Terrain part
2](https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/).  The code is
project-authored; no upstream source or runtime dependency was copied.
