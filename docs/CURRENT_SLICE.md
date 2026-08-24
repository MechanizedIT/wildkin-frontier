# Wildkin Frontier — Phase 4A.2.2: Author Object Contract & Parity Foundation

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4A.2.2  
**Canonical spec:** `docs/Specs/Phase_4A.2.2.md`

**Purpose:** Replace the remaining object-family-specific Author Mode seams with one small data-driven Author Object contract so existing world objects can be edited consistently and the later primitive kitbash / visual asset system can plug into a stable authoring foundation.

Phase 4A.2.1 materially improved Ground/Boundary placement, spawn Y/facing, cross-region movement, fast-click input and undo/redo, but human playtesting exposed a deeper remaining problem: Author Mode still knows concrete gameplay/storage schemas and still creates placeholder previews for several families. A read-only Codex audit reproduced Platform shadow-`pos` writes, custom inspector write failures, placeholder Tree/Ladder previews, duplicate capability truth, and incomplete collider/proxy sharing.

This phase is therefore **Author Object Contract / parity repair before kitbash**.

## Required end state

```text
canonical world object + storage location
                │
                ▼
       AuthorTypeRegistry.resolve()
                │
                ▼
       AuthorObjectSnapshot
       ├─ normalized transform
       ├─ capabilities
       ├─ inspector fields
       ├─ ownership policy
       ├─ VisualRef
       └─ ColliderDescriptor
          │                │
          ▼                ▼
 common Author Mode     Author Draft
 preview / drag / UI    transactional adapter write
          │
          ▼
      VisualFactory
       ↙       ↘
 Author Edit   Runtime Play
```

Author Mode must not need to know that Platform uses `x/z/y/w/h/height`, Ladder uses `bottomY/topY`, Tree is a resource, or Spawn uses `facingYaw`. Resolved adapters translate between a normalized editor-facing view and existing canonical gameplay schemas.

## Hard scope

- central Author type registry / definitions for every current authorable family,
- normalized Author transform + transactional storage adapters,
- registry-owned transform/presentation capabilities,
- small declarative custom-inspector schema,
- `VisualRef` + deterministic pure visual-construction seam shared by Edit and Play,
- collider descriptor + live hidden-collider proxy lifecycle,
- proof objects: **Box, Tree, Ladder**,
- sibling sweep: Platform/Obstacle, Rock/Fiber, current statics, anchors/POIs, Wildkin metadata, spawns,
- remove placeholder preview behavior for supported migrated families,
- repair existing Boundary parity through the shared contract,
- contract + Three.js integration + real browser-path verification where feasible,
- preserve all accepted 4A/4A.2.1 gameplay and hackathon constraints.

## Explicit non-goals

Do **not** implement:

- kitbash primitive-part editing or reusable asset persistence,
- GLB import/loading,
- prefab inheritance,
- region CRUD,
- terrain tools,
- generic gizmos/multi-select,
- generic material/shader/animation editors,
- ECS or engine rewrite,
- Phase 4B expedition layout/pacing,
- Wildkin bonding/companions,
- Resonator progression,
- second-area content.

The future kitbash phase should consume the `VisualRef`/VisualFactory seam created here; it must not be implemented here.

## Architecture decisions locked for this slice

1. **Keep existing canonical gameplay schemas.** Do not migrate all `world.json` objects to one universal transform schema.
2. **Normalize only the Author view.** Adapters read/write canonical schemas atomically.
3. **Author Mode never constructs raw family-specific transform patches.** It submits normalized candidate transforms to adapters.
4. **Capabilities come from resolved type definitions.** Remove production dependence on hard-coded `supportsRot`, `supportsSize`, `supportsY`, local capability maps, and equivalents.
5. **Edit and Play share visual construction.** New Tree/Ladder/etc. must immediately use their real deterministic visual rather than a placeholder Box.
6. **Detailed visuals remain separate from simple collision descriptors.**
7. **Every appropriate world object supports position/elevation/rotation/meaningful resize unless a concrete gameplay reason says otherwise.** Exceptions must be explicit in type capabilities.
8. **Box + Tree + Ladder are proof objects** before claiming sibling parity.

## Human acceptance anchors

Human must verify after implementation:

- existing Platform/Obstacle drag/rotate/resize persists and Play matches,
- existing/new Ladder immediately shows and edits the real Ladder visual and traversal behavior,
- new Tree/Rock/Fiber immediately show real visuals; Tree/Rock rotation/uniform scale are coherent,
- visible collidable Box → hidden creates wireframe proxy immediately without Play → Edit,
- pre-existing Boundary edits behave exactly like newly placed Boundary edits,
- inspector controls are registry-driven for Box/Platform/Ladder/Tree/Wildkin/Waypoint/Beacon/POI/Spawn,
- Wildkin custom metadata and POI requirements persist through selection/export/reload,
- mixed undo/redo/cross-region operations remain synchronized,
- Camp → expedition → harvest/combat → extract/return and elevated spawn remain regression-free.

## Stop condition

When this slice is human-accepted, **freeze generic Author infrastructure** and proceed to a separate `Phase 4B.0 — Primitive Kitbash / Visual Asset Authoring`, then return to Phase 4B expedition content/pacing.

Read and implement the full requirements in `docs/Specs/Phase_4A.2.2.md`. Do not begin 4B.0.