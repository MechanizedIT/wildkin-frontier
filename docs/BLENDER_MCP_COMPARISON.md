# Blender MCP comparison — September 12, 2026

Chris asked whether `bpy-dev/blender-mcp` could improve the current workflow and authorized downloading a newer Blender if needed. This is a side-by-side local trial; it does not replace accepted models or production Blender settings.

## Current workbench

- `ahujasid/blender-mcp` 1.9.1, pinned source `5f8ddaf6e987c4aa0c3467fcc548838b28f64477`, is installed as Codex MCP `blender` under `C:/Users/cwood/Tools/blender-mcp/`.
- It supplies live scene/object inspection, viewport screenshots and Python execution. Telemetry and external generation integrations are disabled. Existing workbench instructions remain in Asset Forge `references/blender-mcp.md`.
- Recent static models primarily used reproducible Blender scripts and independently reviewed exports. An MCP connection alone does not change topology, anatomical fitting or animation quality.

## Candidate and likely value

- [bpy-dev/blender-mcp](https://github.com/bpy-dev/blender-mcp), pinned `e8ac4088d4a3e0469d3eff9f9bb2dd717e899219`, is an independent GPL-3.0-or-later enhancement of Blender Lab MCP, not an official Blender product. It remains a developer preview.
- Its real stdio server advertises30tools, including runtime API lookup, saved-file inspection/execution, structured object summaries and broader live UI capture/navigation. Exact API lookup could reduce version-specific Action-slot/export guesswork; isolated file operations fit the existing source-copy workflow.
- It still executes Python. It supplies no automatic game retopology, anatomy-aware weighting or motion admission. Independent exported/native visual review remains necessary.
- Inspection found its convenience `get_render_as_image_for_cli` hardcodes Cycles/CUDA. Our trial instead uses `execute_blender_code_for_cli` with CPU,2threads,4samples and384×384. Keep the project's one-heavy-job rule; a subprocess timeout is not a RAM/VRAM limiter.

## Actual local evidence

The isolated server is installed in `C:/Users/cwood/Tools/bpy-dev-blender-mcp/.venv/` using Python3.11. It is registered and enabled as the separate global Codex MCP **`blender_lab`**. The existing `blender` MCP is unchanged. The current conversation's native tool catalog still exposes only the old server; use the verified stdio harness now, and refresh/restart Codex's MCP connection for native discovery. Registration alone does not establish a refreshed live tool catalog.

`tools/art/check-bpy-dev-mcp.py` exercises the real protocol on a small accepted V3 rock source, with a distinct output `.blend` and a bounded preview. The first run with Blender4.5.3 completed file inspection, a small copy edit, render and source-hash preservation. However, both `bpy.types.Action.slots` and `bpy.ops.export_scene.gltf` runtime lookups returned `found:false, error:unsupported`. The initial transport-only `pass` in `.dream-loop/bpy-dev-mcp-trial/v1/report.json` is not a compatibility pass; the corrected harness also requires successful API lookup.

The candidate live add-on declares Blender5.1minimum. Official portable Blender5.2.1 was installed separately at `C:/Users/cwood/Tools/blender-5.2.1-windows-x64/`, SHA256 verified against the official release list: `0e631dad7d0cad6d5d18abdd2e2550f6c0213215334eda00ddbd3d22b96ecb2c`,404,851,964archive bytes. The current4.5installation and production sources remain unchanged.

The corrected **5.2.1 saved-file trial passes**: both runtime queries return `found:true`, file inspection works, a separate `.blend` checkpoint is hash-recorded, and a384×384 CPU preview renders with2threads/4samples. The original source SHA remains `2292185eb723043f3bb22d14b66459170c5206a4270fc8dd485d136b7a64e4c6`. Calls took14.91s for first file inspection, about4s per API lookup and4.75s for the copy edit/render. The full report is `.dream-loop/bpy-dev-mcp-trial/v2-blender-5.2.1/report.json`; the preview was visually inspected. This establishes useful file/API operations, not improved modeling or rigging quality.

**Live bridge passes on Windows5.2.1:** real MCP object summary, whole-window capture, viewport-area capture and rig/action inspection all work in an isolated Mossling-v3 review file. The actual images show the textured model; the rig has23bones and five imported clips (Attack/Hurt/Idle/Run/Walk), each with one Action slot. The shipping GLB remains SHA `ca044bb9321423c8d4e83aedce7697d98109eafbeeafbefbdf3d0e13a58e9cf9`. Final receipt/images: `.dream-loop/bpy-dev-mcp-trial/v3-live/proof2/`. The first capture saw the first-run setup overlay, despite successful transport; that is retained in `proof/`, not passed off as a model view. Reopening the saved review checkpoint removed it. No animation-quality claim follows from listing clips.

The isolated launcher uses the pinned addon's own loopback socket/timer implementation on **127.0.0.1:19877**, separate from the old9876 bridge. It does not install the extension into the user's profiles or modify their preferences. It starts a hidden, unfocused review window with2threads, solid-texture preview and local configuration. Final launch uses `--offline-mode` to avoid automatic asset-library downloads; loopback inspection still works. The first online-mode startup attempted an Essentials-library sync; do not retain that mode for local reviews. The owned review process was closed after proof. Starting a stdio MCP alone does not launch Blender or keep a render job running.

## Repeat the useful workflow

1. Serialize with other Blender/TRELLIS/native jobs and check the existing memory guards. Use4.5 for established production export scripts until their specific5.2 exports are checked;5.2 is available for the separate API/live workbench.
2. From the repository root, launch `./tools/art/start-blender-lab.ps1`. It refuses an occupied19877 port and records the exact owned PID in its work directory. To resume the proved scene, pass `-WorkDirectory '.dream-loop/bpy-dev-mcp-trial/v3-live'`. Only close that owned process after saving useful review work.
3. Use `blender_lab` scene/API/screenshot tools when exposed. For a reproducible protocol check, run `C:/Users/cwood/Tools/bpy-dev-blender-mcp/.venv/Scripts/python.exe tools/art/check-blender-lab-live.py --output <fresh-project-evidence-directory>`.
4. Saved-file inspection requires no UI process. Run the same Python against `tools/art/check-bpy-dev-mcp.py --output <fresh-project-evidence-directory>` for the bounded source-copy trial. Both scripts refuse reusing their output directories, preserve source hashes, and record actual tool results. Inspect the images; their presence does not prove useful content.
5. Use small explicit `execute_blender_code_for_cli` CPU renders instead of the CUDA convenience helper. Keep accepted model sources, export budgets and independent deformation/native review gates unchanged. Do not enable inference, remeshing or subdivision merely because the MCP offers Python access.

The registered server's executable/backend paths are local to this host. Reinstall on a replacement PC using the pinned source and official portable Blender above; do not expect a Git clone to restore the external Tools directory or global Codex registration.

Do not install the optional third-party standalone `bpy` wheel merely to test this server. Its executable backend can use the official Blender distribution. Do not switch accepted source/bake versions until the relevant export and motion checks pass.

Evidence: `.dream-loop/bpy-dev-mcp-trial/`; upstream [tool list](https://github.com/bpy-dev/blender-mcp/blob/main/readme_tools.rst), [backend compatibility](https://github.com/bpy-dev/blender-mcp/blob/main/readme_bpy_backend.rst), [provenance](https://github.com/bpy-dev/blender-mcp/blob/main/NOTICE.md).
