# Wildkin Frontier — Phase 4B.0: Primitive Kitbash / Visual Asset Authoring

**Status:** READY TO IMPLEMENT  
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