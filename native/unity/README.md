# Unity candidate

**Active candidate:** Unity 6.3 LTS + HDRP, Windows x64.

The actual Unity project should be created locally at:

`native/unity/WildkinUnity/`

Do not create placeholder `Assets/`, `Packages/` or `ProjectSettings/` trees by hand in GitHub. Let Unity 6.3 LTS create the project so editor/package metadata is valid, then commit the resulting source-controlled project files.

## First session

Use:

`docs/prompts/UNITY_00_BOOTSTRAP_AGENT_SMOKE.md`

The first session is deliberately about **tooling and Codex autonomy**, not voxels. It should prove Unity Editor + official Unity Codex plugin + Unity CLI/MCP + tests + screenshots + Windows build before we invest in the native matter kernel.

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
