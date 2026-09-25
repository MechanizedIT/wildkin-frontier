# Unity local start checklist

Use this when you are back at the development PC.

This is deliberately short. The detailed agent task is in:

`docs/prompts/UNITY_00_BOOTSTRAP_AGENT_SMOKE.md`

## 1. Pull current main

```powershell
git checkout main
git pull origin main
git status
```

Do not start from an older Codex worktree.

## 2. Confirm the prepared transition docs

Read:

- `AGENTS.md`
- `docs/CURRENT_SLICE.md`
- `docs/UNITY_FIRST_TRANSITION_PLAN.md`
- `native/unity/README.md`

## 3. Unity installation target

Preferred first candidate:

- Unity 6.3 LTS
- latest available 6.3 patch
- HDRP
- Windows x64 build support

If Unity Hub/Unity account licensing requires a normal interactive sign-in, complete that yourself. Do not place credentials or tokens in the repository or prompts.

## 4. Verify official Codex Unity plugin

Current official installation commands are:

```powershell
codex plugin marketplace add Unity-Technologies/unity-agent-plugin
codex plugin add unity@unity-agent-plugin
```

If it is already installed, do not reinstall blindly.

## 5. Verify Unity CLI

```powershell
unity --version
unity status
unity projects --help
unity mcp configure --help
```

The current Unity CLI is experimental/beta, so use the installed CLI's help as the authority for exact flags.

## 6. Start the first fresh Codex session

Open the repository in Codex.

Recommended:

- **GPT-6 Luna**
- **High reasoning**
- fresh session

Paste/use:

`docs/prompts/UNITY_00_BOOTSTRAP_AGENT_SMOKE.md`

That session owns project creation and should create the Unity project at:

`native/unity/WildkinUnity/`

Do not create the Unity project by hand before the agent has inspected the available Unity CLI/Hub state unless normal Unity account/license setup requires you to.

## 7. Expected first stop

The first session should stop after proving:

- Unity Editor connection
- official Codex plugin
- Unity CLI/MCP
- simple HDRP scene
- EditMode tests
- PlayMode tests
- agent-generated Scene/Game captures
- Windows development build
- intentional compile/test failure and autonomous repair
- clean Git state without Library/cache pollution

Do not let the first session continue into voxel meshing.

## 8. If Unity setup becomes troublesome

Do not immediately switch to Unreal.

Record the exact failure first:

- account/license only
- Unity CLI issue
- MCP/Editor connection issue
- Codex plugin issue
- project creation/import issue
- build/test issue

Normal one-time account authentication is not an engine failure.

The Unreal challenger should only be activated for a material workflow/engine problem or a later owner decision.
