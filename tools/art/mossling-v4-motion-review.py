"""Render bounded V4 eye-attachment evidence across every exported V3 clip."""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', required=True); parser.add_argument('--output-dir', required=True)
    values = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    return parser.parse_args(values)


def look_at(camera, point):
    camera.rotation_euler = (point - camera.location).to_track_quat('-Z', 'Y').to_euler()


def main():
    opt = parse(); source, out = Path(opt.blend).resolve(), Path(opt.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=False); bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene; scene.render.engine = 'BLENDER_EEVEE_NEXT'; scene.render.resolution_x = 512; scene.render.resolution_y = 512; scene.render.resolution_percentage = 100; scene.render.image_settings.file_format = 'PNG'; scene.world.color = (.035, .04, .05)
    armature = next(obj for obj in scene.objects if obj.type == 'ARMATURE')
    mesh_objects = [obj for obj in scene.objects if obj.type == 'MESH' and obj.name != 'Icosphere']
    points = [obj.matrix_world @ Vector(corner) for obj in mesh_objects for corner in obj.bound_box]
    minimum = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points))); maximum = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    target = (minimum + maximum) * .5; target.z = minimum.z + (maximum.z - minimum.z) * .58
    largest = max(maximum - minimum)
    cam_data = bpy.data.cameras.new('V4 Motion Review Camera'); camera = bpy.data.objects.new('V4 Motion Review Camera', cam_data); scene.collection.objects.link(camera); scene.camera = camera
    camera.location = target + Vector((largest * 1.75, -largest * 3.1, largest * 1.12)); look_at(camera, target)
    key_data = bpy.data.lights.new('V4 Motion Key', 'AREA'); key_data.energy = 900; key_data.shape = 'DISK'; key_data.size = largest * 2; key = bpy.data.objects.new('V4 Motion Key', key_data); scene.collection.objects.link(key); key.location = target + Vector((largest * 1.8, -largest * 2.5, largest * 2)); look_at(key, target)
    phases, captures = (0, .5, 1), []
    for action in sorted(bpy.data.actions, key=lambda item: item.name):
        armature.animation_data_create(); armature.animation_data.action = action
        start, end = action.frame_range
        for phase in phases:
            frame = round(start + (end - start) * phase); scene.frame_set(frame)
            filename = f'{action.name.lower()}-three-quarter-{int(phase * 100):03}.png'; scene.render.filepath = str(out / filename); bpy.ops.render.render(write_still=True)
            captures.append({'clip': action.name, 'phase': phase, 'frame': frame, 'file': filename})
    (out / 'motion-contact-review.json').write_text(json.dumps({'blend': str(source), 'clips': sorted(action.name for action in bpy.data.actions), 'phases': phases, 'view': 'three-quarter face/eye attachment review', 'captures': captures, 'limitation': 'Static sampled frames prove overlay attachment only; an independent reviewer must still judge motion.'}, indent=2), encoding='utf-8')


if __name__ == '__main__': main()
