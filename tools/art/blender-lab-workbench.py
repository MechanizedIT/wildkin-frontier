"""Isolated bpy-dev live review bridge; never modifies user preferences or GLBs.

Launch via start-blender-lab.ps1. Uses the pinned addon's actual socket/timer
implementation on loopback, without installing it into existing Blender profiles.
"""
import json
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector

project = Path(os.environ['WILDKIN_PROJECT_ROOT']).resolve()
work = Path(os.environ['WILDKIN_BLENDER_LAB_WORK']).resolve()
source = project / 'assets/models/mossling-v3/model.glb'
addon = Path(os.environ['WILDKIN_BLENDER_LAB_ADDON']).resolve()
work.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.view.show_splash = False
scene_file = work / 'mossling-review.blend'
if scene_file.exists():
    bpy.ops.wm.open_mainfile(filepath=str(scene_file))
else:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            # Neutral mesh review; preserve source clips in their imported data.
            if obj.animation_data:
                obj.animation_data.action = None
                for track in obj.animation_data.nla_tracks:
                    track.mute = True
            obj.data.pose_position = 'REST'
        obj.select_set(obj.type == 'MESH')
    bpy.context.view_layer.objects.active = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    scene = bpy.context.scene
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 2
    scene['wildkin_workbench'] = 'Isolated Mossling-v3 review; no shipping edits'
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.shading.type = 'SOLID'
                space.shading.color_type = 'TEXTURE'
                space.shading.light = 'STUDIO'
                space.overlay.show_overlays = False
                space.region_3d.view_distance = 3.5
                space.region_3d.view_location = Vector((0, 0, .55))
                space.region_3d.view_rotation = Vector((3, -4, 2)).to_track_quat('Z', 'Y')
    bpy.ops.wm.save_as_mainfile(filepath=str(scene_file))

sys.path.insert(0, str(addon))
from blender_mcp_addon import execute_interactive, mcp_to_blender_server

assert bpy.app.version >= (5, 1, 0), 'This bridge requires Blender 5.1+'
mcp_to_blender_server.start('127.0.0.1', 19877)
bpy.app.timers.register(execute_interactive.run, first_interval=.25, persistent=True)
(work / 'startup.json').write_text(json.dumps({
    'blender': bpy.app.version_string, 'file': str(scene_file),
    'host': '127.0.0.1', 'port': 19877, 'serverRunning': mcp_to_blender_server.is_running(),
    'preferencesModified': False, 'source': str(source)
}, indent=2), encoding='utf-8')
