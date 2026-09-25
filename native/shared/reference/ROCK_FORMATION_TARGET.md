# Procedural rock formation visual target

This is the native-engine art-direction reference for the first procedural SDF/stamp family.

## Desired read

The rock should look closer to a deliberately modeled stylized game asset than to a raw voxel blob.

Target characteristics:

- compact coherent formation;
- several interlocking/stacked stone masses;
- broad planar or gently curved faces;
- rounded/beveled corners rather than razor edges;
- clear large/medium/small shape hierarchy;
- strong asymmetrical silhouette;
- occasional shelf/recess/negative space;
- low-poly character without looking extremely coarse;
- surface texture/detail that supports the geometry rather than hiding it.

Avoid:

- obvious cubes;
- near-spheres;
- noisy marching-surface lumps;
- needle spikes;
- paper-thin fins;
- uniform random noise;
- every rock sharing the same silhouette with only rotation/scale changes.

## Procedural family goal

A single rock profile should generate many seeds that clearly belong to the same art family but are not recognizable copies.

A useful generator may combine:

- rounded boxes/slabs;
- ellipsoids;
- wedges;
- controlled rotations;
- stacking biases;
- flattening;
- soft SDF unions/intersections;
- low-frequency deformation/erosion.

Prefer a small number of understandable shape rules over many opaque noise layers.

## Matter requirement

The procedural construction is **generation input only**.

After placement/resolution:

- the rock is ordinary authoritative matter;
- mining does not target source primitives;
- detached pieces own local matter;
- destruction can cut through any generated shape;
- persistence does not require reconstructing the source primitive hierarchy.

## Rendering requirement

Surface materials should provide:

- stable rock albedo/detail projection;
- normal/roughness variation;
- broad macro color variation;
- no obvious texture swimming on detached/moving matter;
- visual continuity across chunk/brick boundaries.

Microdetail may be render-only. Silhouette, holes, large cuts and gameplay-relevant shape remain authoritative matter.
