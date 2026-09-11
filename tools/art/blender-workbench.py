"""Start an isolated Blender MCP review scene without editing shipping models.

Run with start-blender-workbench.ps1. The upstream addon must be installed.
Preferences persist addon enablement; the review file is project-local/ignored.
"""
import json
import os
from pathlib import Path

import addon_utils
import bpy
from mathutils import Vector

project = Path(os.environ['WILDKIN_PROJECT_ROOT']).resolve()
work = project / '.dream-loop/blender-workbench'
work.mkdir(parents=True, exist_ok=True)
scene_file = work / 'mossling-review.blend'

# This script runs only in the new process launched by our PowerShell helper.
# Reopen the workbench when it exists, retaining any subsequent review edits.
if scene_file.exists():
    bpy.ops.wm.open_mainfile(filepath=str(scene_file))
else:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(project / 'assets/models/mossling-v2/model.glb'))
    rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    for track in list(rig.animation_data.nla_tracks):
        rig.animation_data.nla_tracks.remove(track)
    rig.animation_data.action = bpy.data.actions.get('Idle')
    bpy.context.scene.frame_set(0)
    rig.show_in_front = True
    rig.display_type = 'WIRE'
    for obj in bpy.context.scene.objects:
        obj.select_set(obj.type == 'MESH')
    bpy.context.view_layer.objects.active = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.shading.type = 'SOLID'
                space.shading.color_type = 'TEXTURE'
                space.shading.light = 'STUDIO'
                space.overlay.show_overlays = False
                space.region_3d.view_distance = 3.0
                space.region_3d.view_location = Vector((0, 0, .58))
                space.region_3d.view_rotation = Vector((3, -4, 2)).to_track_quat('Z', 'Y')
    bpy.context.scene['wildkin_workbench'] = 'Review only; original Mossling-v2 surface; no shipping replacement'

addon_utils.enable('blender_mcp', default_set=True, persistent=True)
prefs = bpy.context.preferences.addons['blender_mcp'].preferences
prefs.telemetry_consent = False
scene = bpy.context.scene
scene.blendermcp_auto_start_server = True
for flag in ('blendermcp_use_polyhaven', 'blendermcp_use_sketchfab', 'blendermcp_use_polypizza', 'blendermcp_use_hyper3d', 'blendermcp_use_hunyuan3d'):
    if hasattr(scene, flag):
        setattr(scene, flag, False)
if not getattr(scene, 'blendermcp_server_running', False):
    bpy.ops.blendermcp.start_server()
bpy.ops.wm.save_userpref()
bpy.ops.wm.save_as_mainfile(filepath=str(scene_file))
(work / 'startup.json').write_text(json.dumps({'blender': bpy.app.version_string, 'file': str(scene_file), 'port': scene.blendermcp_port, 'server_running': scene.blendermcp_server_running, 'telemetry': prefs.telemetry_consent}, indent=2))
