# Wildkin Unity native lab

This is the U0/U1 tooling and agent-autonomy smoke plus U2 matter-kernel qualification project for Wildkin Frontier. It is a qualification project, not a gameplay port. The active target is Unity 6.3 LTS + HDRP for Windows PC.

## Open and run

- Open this folder with Unity `6000.3.25f1` (Unity 6.3 LTS).
- The smoke scene is `Assets/Wildkin/Scenes/Tech/AgentSmoke.unity`.
- `unity test native/unity/WildkinUnity --mode EditMode` and `--mode PlayMode` run the test suites.
- The project-local `wildkin_agent_smoke_inspect` Editor command reports scene, marker, transform, component, editor version, and active render pipeline as JSON.
- `inspect_matter_region` reports resolved bounds, material counts, sparse edit revision, raw brick bytes and benchmark checksums from the same `MatterWorld` used by tests.
- The U2 Tech scene is `Assets/Wildkin/Scenes/Tech/MatterKernelDebug.unity`; it is intentionally not enabled in the player build settings.
- The Windows x64 Development Build is produced through `Wildkin.AgentTools.WildkinWindowsDevelopmentBuild.Build`; the generated player is ignored under `Builds/`.

See [the U0/U1 evidence receipt](../../evidence/unity/u0-agent-smoke/README.md) and [the U2 evidence receipt](../../evidence/unity/u2-matter-kernel/README.md) for exact versions, commands, test/build results, limitations, and captures. Unity-generated cache and local editor state remain excluded by the repository ignore rules.

U2 passed implementation, validation and independent review; stop before U3. Do not add meshing/destruction behavior until the owner reviews this qualification checkpoint.
