# Unity candidate

**Active candidate:** Unity 6.3 LTS + HDRP, Windows x64.

## U0/U1 tooling qualification — September 26, 2026

**PASS.** The Unity `6000.3.25f1` (Unity 6.3 LTS)-created project is at `native/unity/WildkinUnity/`. Codex can reach the live Editor through Unity CLI/Pipeline commands, inspect the HDRP smoke scene, invoke a project-local Wildkin JSON inspection command, run EditMode/PlayMode tests, recover an intentional test assertion failure, and capture Scene/Game views. A Windows x64 Development Build succeeded after one cold HDRP shader-compilation timeout; the player launched and its Player.log had no error-like lines. Full versions, commands, owner interventions, limitations, and test/build reports are in [the U0/U1 evidence receipt](../evidence/unity/u0-agent-smoke/README.md).

## U2 Native Matter Reference Kernel — September 27, 2026

**PASS for the bounded reference kernel; stop for owner review.** Independent read-only review passed. U2 adds the shared deterministic C# matter authority, sparse edits, bounded snapshots, provisional save/restore, a Tech debug view, and the `inspect_matter_region` Editor command. See [U2 evidence](../evidence/unity/u2-matter-kernel/README.md) and its receipt for exact layout, results and limits. Do not start U3 before owner review.

The actual Unity project should be created locally at:

`native/unity/WildkinUnity/`

Do not create placeholder `Assets/`, `Packages/` or `ProjectSettings/` trees by hand in GitHub. Let Unity 6.3 LTS create the project so editor/package metadata is valid, then commit the resulting source-controlled project files.

## First session

Use:

`docs/prompts/UNITY_00_BOOTSTRAP_AGENT_SMOKE.md`

The first session prompt completed the tooling and Codex autonomy qualification. The U2 prompt completed and independently passed review for the bounded native matter reference kernel. Wait for owner review before continuing into U3.

## Intended project areas after bootstrap

```
Assets/Wildkin/
  Core/
  Matter/
  Procedural/
  World/
  AgentTools/
  Tests/
  Scenes/
```

The exact assembly layout should be created from evidence during the Unity sessions rather than pre-generated here.
