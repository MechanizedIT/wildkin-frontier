# Wildkin Frontier — Phase 4B.0: Primitive Kitbash / Visual Asset Authoring

**Status:** IMPLEMENTED — AUTOMATED GATES PASS; HUMAN ACCEPTANCE PENDING
**Active slice:** Phase 4B.0  
**Canonical spec:** `docs/Specs/Phase_4B.0.md`

**Previous slice:** Phase 4A.2.2 — **OWNER ACCEPTED 2026-08-25** after Codex stabilization and owner playtesting. Freeze generic Author Object infrastructure unless Phase 4B.0 exposes a true contract regression.

## Goal

Add a deliberately small reusable primitive Visual Asset workflow to the accepted Author Mode so the owner can build recognizable low-poly props quickly and reuse them across Camp/Area 1 without external modeling or duplicated geometry data.

The existing architecture is the locked base:

```text
world object
→ AuthorTypeRegistry / normalized Author transform
→ VisualRef
→ deterministic VisualFactory
→ Author Edit + Runtime Play
→ separate simple ColliderDescriptor
```

Phase 4B.0 adds:

```text
VisualRef
├ builtin
└ asset → canonical primitive recipe in world.json.visualAssets
```

## Hard scope

- top-level canonical `visualAssets` recipes in `world.json`,
- primitive recipe v1: Box, Cylinder, Cone, Sphere, Capsule, Icosahedron,
- flat asset-part hierarchy only,
- local part position/rotation/scale/color editing,
- dynamic Visual Assets palette: New / Place / Edit,
- bounded Asset Edit mode inside current Author Mode,
- reusable world instances referencing one asset recipe,
- ordinary instance position/elevation/rotation/uniform scale through existing Author Object contract,
- zero/one simple native Box collider per asset + Fit To Visual Bounds,
- shared-instance reconciliation and undo/redo,
- deterministic export/generated-world/runtime support,
- migrate current Camp Drop Pod as the required proof asset,
- production-path tests + real browser verification,
- preserve all accepted expedition/gameplay behavior and hackathon constraints.

## Explicit non-goals

Do not add:

- GLB/glTF/OBJ/FBX import,
- texture/UV tools,
- CSG/boolean modeling,
- vertex/face editing,
- nested part groups,
- bones/animation editor,
- material/shader editor,
- prefab inheritance or “make unique”,
- multi-select/generic gizmos,
- terrain/region tooling,
- Phase 4B expedition layout/pacing changes,
- Wildkin bonding,
- Resonator progression.

## Required proof

```text
New Asset
→ add/edit several primitives
→ place two independent instances
→ edit shared recipe
→ both instances update
→ Play matches Edit
→ collision remains simple/independent
→ export/reload reproduces result
```

The existing Camp Drop Pod must become a shared primitive Visual Asset instance and retain recognizable Camp placement/collision.

## Stop condition

When the Phase 4B.0 human acceptance tests pass, **freeze editor/asset infrastructure** and proceed directly to:

**Phase 4B — First Expedition Experience & Pacing**

Use the accepted tools to build/tune the actual first 5–10 minute expedition rather than continuing to expand the modeling system.

Read and implement the complete requirements in `docs/Specs/Phase_4B.0.md`.

## Implementation checkpoint — 2026-08-25

Phase 4B.0 is implemented without beginning Phase 4B expedition layout or pacing work.

- `world.json.visualAssets` is the canonical flat primitive-recipe store. Version 1 supports Box, Cylinder, Cone, Sphere, Capsule, and Icosahedron parts with local position/rotation/scale/color plus zero or one independent simple Box collider.
- Author Mode now exposes a dynamic Visual Assets palette and bounded Asset Edit context. New/rename/delete asset, add/edit/duplicate/delete part, selected-part canvas drag, Fit To Visual Bounds, place, ordinary instance transforms, undo/redo, export, and reload all use the transactional draft path.
- World instances store `subtype: "visualAsset"`, `visualAssetId`, and their own position/rotation/uniform scale. Recipe edits reconcile every matching preview while instance transforms remain independent.
- Edit and Runtime Play share `VisualFactory` primitive construction. Runtime collision remains descriptor-derived native Rapier Box collision and is not inferred from rendered meshes.
- The Camp Drop Pod is migrated to the canonical `asset_drop_pod` recipe and remains a single positioned world instance with a simple independent Box collider.
- Production-path automated coverage and real `?author=1` browser verification pass. Automated browser evidence is not human perceptual acceptance.

### Human acceptance still required

Perform the player-facing tests in `docs/Specs/Phase_4B.0.md`: build a recognizable multi-part asset, place two instances, independently transform them, edit the shared recipe and see both update, verify Play matches Edit, check simple collision behavior, and export/reload. Also confirm the migrated Camp Drop Pod is recognizable and behaves correctly on desktop and a portrait phone viewport.

Do not start Phase 4B until Chris accepts this slice. On acceptance, freeze Visual Asset/editor infrastructure and use it for the first expedition experience and pacing slice.
