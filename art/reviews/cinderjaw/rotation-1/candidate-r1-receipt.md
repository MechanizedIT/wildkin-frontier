# Cinderjaw R1 candidate

Status: **READY FOR INDEPENDENT REVIEW**. This is an unshipped code-native mesh candidate, not a species or habitat admission.

The candidate consumes the frozen V2 literal limb and plate coordinates. It replaces only Cinderjaw’s four low legs and twelve carapace tiles; torso, skull, jaw, claws, eyes, glints, tail, materials, and child ordering remain in their established roles.

- Frozen inputs: `anatomy-plan-v2.md` `d59cb6248e8eba32c4ad9838c86d5f14ac4f79f4bfce661e2a4f816b186a8f6c`; `anatomy-plan-v2.json` `fc4dfd2af4903d4511fdf19807764fa8892ecda3302c7ab5a399dd3055fac218`.
- Candidate source: `31a3d4613c1f31872d1cf8e1c8d95173e60c81718571a922aac55121510f3ecc`.
- Geometry: 28 child meshes, 768 triangles; local bounds 1.543098 × 1.104818 × 3.288071 m.
- Topology: four indexed 24-vertex/44-triangle closed limbs and twelve indexed 6-vertex/8-triangle closed pentagonal plates. Every audited undirected edge has two incident triangles; all audited signed volumes are positive.
- Focused proof: `node --test tests/cinderjawAnatomyMesh.test.js` passed. It checks literal coordinate consumption, closure, outward winding, child order, and the six sibling component orders.

Root must next perform isolated-fixture captures and exact browser snapshot parity, then independently review the actual images. The runtime factory currently relies on baked author data, so the authorized bake/recipe parity seam remains a root-owned follow-up after neutral visual review.
