# Unity U0/U1 agent smoke evidence

**Result: PASS — U0/U1 qualification only.** This evidence records that Unity 6.3 LTS + HDRP was created through Unity tooling, the CLI/Pipeline bridge modified scene state and the custom Editor command inspected it, the EditMode and PlayMode tests ran, an intentional test failure was diagnosed and repaired, and a Windows x64 Development Build launched. This is not production migration approval. Stop for owner review; U2 has not started.

## Captures

- [Unity Scene view](agent-smoke-scene.png) — captured through the Unity Editor/Pipeline integration.
- [Unity Game view](agent-smoke-game.png) — captured through the Unity Editor/Pipeline integration during Play Mode.
- [Windows player](agent-smoke-build-player.png) — captured after launching the built player.

## Machine-readable evidence

- [Receipt](receipt.json) records versions, test reports, build provenance, owner interventions, tool failures, and limits.
- `editmode-final.xml`: final EditMode run, 3 passed / 0 failed.
- `playmode-final.xml`: final PlayMode run, 1 passed / 0 failed.
- `intentional-failure.xml`: harmless inverted expected angle, 1 failed / 2 passed; the XML identifies expected 181° versus actual 180°.
- `recovered.xml`: restored source and green rerun, 3 passed / 0 failed.
- `playmode-timing-failure.xml`: an early five-frame timing assertion failed at 0.916°; the test was made time-based and the final PlayMode run passed.
- `windows-dev-build-provenance.json`: successful warm-cache build provenance.

The build itself is generated at `native/unity/WildkinUnity/Builds/U0AgentSmoke/WildkinUnity.exe` and is intentionally ignored. The cold HDRP shader build timed out after 600 seconds; retrying with the warmed cache succeeded in 186.144 seconds. The successful CLI result also included nonfatal licensing-client signature/token warnings; the active Unity Personal entitlement was available and the player build and launch succeeded.

## Integration and limits

Unity CLI `1.0.0-beta.11`, official `unity@unity-agent-plugin` `0.1.6-beta`, Unity Pipeline `0.8.0-exp.1`, and HDRP `17.3.0` were verified. Unity's official CLI configured a project-local MCP server in `.codex/config.toml`. That generated entry uses the resolved absolute Unity CLI and checkout paths on this workstation; rerun the official configuration command for another workstation or clone. In this running Codex session, a dedicated Unity MCP tool was not exposed; Codex did invoke Editor commands through the installed Unity CLI/Pipeline bridge. `unity editors running` detected the Editor and the custom command worked, while `unity status` continued to return `STATUS_NO_INSTANCES`; treat that status response as a tool discrepancy to recheck after restarting Codex.

The smoke uses a deterministic rotating/bobbing marker and a plain HDRP test scene. No Surface Nets, Dual Contouring, voxel meshing, destruction, browser port, or Unreal work was started. Browser validation was not run because no browser/shared implementation files changed.
