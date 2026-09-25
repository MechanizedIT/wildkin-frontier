# Native Wildkin Frontier transition

This directory is reserved for the PC-first native-engine work that follows the completed browser matter R&D through Phase 0.5E.

The historical Three.js/Rapier game and voxel labs remain at repository root as the behavioral reference. Do not move or delete them while the native architecture is still being qualified.

## Active engine order

1. **Unity 6.3 LTS + HDRP** — active first candidate.
2. **Unreal Engine 5.8** — deferred challenger; activate only if Unity exposes a meaningful blocker or the owner requests it.

See:

- `docs/UNITY_FIRST_TRANSITION_PLAN.md`
- `docs/PC_ENGINE_BAKEOFF_PLAN.md`
- `docs/DESTRUCTIBLE_MATTER_ROADMAP.md`
- `native/shared/reference/`

## Important

Do not manually fabricate engine project metadata here.

The Unity project should be created locally by Unity/Unity CLI at:

`native/unity/WildkinUnity/`

Generated caches/build outputs are ignored by repository rules; source assets, C#, project settings, packages and required metadata should be tracked once Unity creates them.

The Unreal directory is intentionally documentation-only until its challenger trigger is reached.
