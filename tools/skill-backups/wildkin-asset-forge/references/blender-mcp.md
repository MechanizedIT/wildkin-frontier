# Live Blender workbench

Chris explicitly authorized adding a Blender MCP on September 11, 2026. The
installed community server is [ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp),
version 1.9.1, source commit `5f8ddaf6e987c4aa0c3467fcc548838b28f64477`.
It is a live inspection/edit connection, not an automatic artist or rigger.

## Local installation and startup

- Source and isolated Python environment: `C:/Users/cwood/Tools/blender-mcp/`.
- Codex global MCP name: `blender`; command
  `C:/Users/cwood/Tools/blender-mcp/.venv/Scripts/blender-mcp.exe`.
- User addon: `C:/Users/cwood/AppData/Roaming/Blender Foundation/Blender/4.5/scripts/addons/blender_mcp.py`.
- Blender 4.5.3 listens on **127.0.0.1:9876**. The MCP wrapper speaks stdio.
- Telemetry is disabled through `BLENDER_MCP_DISABLE_TELEMETRY=1` and addon
  preferences. Paid generation and external asset integrations are disabled.
  No external API account is required for local inspection or editing.

From this repository, `tools/art/start-blender-workbench.ps1` starts an isolated
Blender UI process with a usable offscreen viewport. It reopens the ignored
`.dream-loop/blender-workbench/mossling-review.blend`; the first run copies the
current accepted Mossling-v2 into that workbench. It never overwrites a shipping
model or an existing artist's open session. An existing listener is reported
rather than starting a competing process. Inspect its scene before using it.

Codex may need a task/tool-list refresh or app restart after MCP registration.
Do not confuse configuration with current-session tool availability. Prefer
the named MCP tools once exposed. While they are not exposed, the real protocol
smoke check can run through the isolated environment:

```powershell
& C:/Users/cwood/Tools/blender-mcp/.venv/Scripts/python.exe tools/art/check-blender-mcp.py
```

This initializes MCP, lists tools, inspects the scene, takes a viewport image,
scrubs one frame, takes another image and restores the prior frame. It does not
save model edits. The September 11 check passed with 28 advertised tools and
the actual 19-bone/five-clip Mossling; image/report evidence is under the ignored
workbench's `mcp-proof/` directory.

## Edit and inspect in short steps

1. `get_scene_info` and `get_viewport_screenshot` establish which file, object,
   action and frame are actually open. Inspect the returned image.
2. Use `get_object_info` or a short `execute_blender_code` query to inspect the
   relevant bones, matrices, weights or connected shell. Do not reconstruct
   scene state from a previous screenshot or stale report.
3. Make one scoped change on the workbench copy: a pole direction, weight
   assignment, contact key or body pose. Use named objects and frame ranges.
4. Capture the exact affected frame, the opposite extreme, and adjacent frames
   immediately. Undo/refine a visible failure before layering other changes.
5. Save an explicit new source revision and export a new GLB. Live viewport
   quality never waives exact exported-cycle and ordinary-game travel gates.

MCP code execution still uses Blender's Python API. The improvement over batch
scripts is the persistent scene and immediate viewport feedback. Use scripts
for a reproducible bake/export only after live pose and deformation review.

## img2threejs assessment

[img2threejs](https://github.com/img2threejs/img2threejs) was inspected at commit
`6e60b5e` and retained at `C:/Users/cwood/Tools/img2threejs` for optional offline
diagnostics. The full skill is not installed as a project-wide router: it builds
procedural TypeScript geometry and its optional GLB reconstruction pipeline
targets a separate showcase. That is not a replacement for our textured GLBs.

Useful adopted review rules: an explicit anatomy/detail inventory, joint order
from `skin.joints`, inverse-bind validation, independent checks for disconnected
attachments, and separate structural/deformation/motion verdicts. They reinforce
Asset Forge and Dream Loop rather than replacing their actual-image judges.

Its [GLB rig reader](https://github.com/img2threejs/img2threejs/blob/main/forge/stage5_rig/glb_rig_reference.py)
successfully inspected current Mossling-v2 (19 joints, 5 clips) and Explorer-v2
(25 joints, 11 clips). It is a stdlib read-only audit/sampler, not a retargeter;
sampling requires explicit landmark mappings and cannot prove sole contact.
Its voxel/geodesic binder takes a custom JSON solid mesh and skeleton, has no
Blender bridge, and does not supply locomotion. Do not replace accepted skin
weights with it merely because its name sounds appropriate.
