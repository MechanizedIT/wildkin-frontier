# Thornprowler rotation 1 — code-native candidate receipt

## Status

Candidate R1 is frozen for root capture and independent visual review. This receipt does not admit a model, bake a recipe, regenerate world data, add a spawn, or alter gameplay/collision.

## Frozen input and source

- Approved anatomy input: docs/species/thornprowler/anatomy-plan-v1.json
- Input SHA-256: $(@{schema=thornprowler-candidate-audit/v1; status=candidate ready for independent visual review; no bake/world generated/runtime admission performed; input=; source=; expected=; actual=; preserved=; proof=}.input.sha256)
- Source: src/world/wildkinMeshKit.js
- Source SHA-256 at candidate freeze: $(@{schema=thornprowler-candidate-audit/v1; status=candidate ready for independent visual review; no bake/world generated/runtime admission performed; input=; source=; expected=; actual=; preserved=; proof=}.source.sha256)

The implementation literalizes the approved four 32-vertex four-ring rticulated_leg meshes and seven 7-vertex staggered_dorsal_thorn pyramids. It reuses the unchanged Cinderjaw closed-ring limb helper and adds a Thornprowler-local closed-pyramid helper that rejects non-opposite shared-edge traversal before correcting whole-shell winding.

## Focused proof

- 23 meshes and 770 triangles, as planned.
- Four limbs: 32 vertices / 60 triangles each; each has directed shared edges and positive signed volume.
- Seven thorns: 7 vertices / 10 triangles each; each has directed shared edges and positive signed volume.
- The four paw caps and four torso caps use their recorded shell contacts; all 42 thorn-base probes remain inside the actual torso shell in the focused test.
- The 12 protected Thornprowler components match the frozen snapshot exactly in order, transform, and geometry. The six sibling code-native species retain their frozen mesh orders.
- isualFactory's generic itBuiltinModel rusher route is untouched. Root must later verify direct factory and generic builtin-rusher geometry after any approved bake.

## Validation


ode --test tests/thornprowlerAnatomyMesh.test.js passed: 4 tests, 0 failures.

The separate root capture and independent review determine visual retention. The focused asset bake, world-data generation, source-to-recipe-to-factory parity, and ordinary encounter proof remain outside this candidate.
