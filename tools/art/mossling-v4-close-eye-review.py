"""Render a close front and three-quarter Mossling face review from a GLB."""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True); parser.add_argument('--output-dir', required=True)
    values = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    return parser.parse_args(values)


def look_at(item, target): item.rotation_euler = (target - item.location).to_track_quat('-Z', 'Y').to_euler()


def main():
    opt = parse(); out = Path(opt.output_dir).resolve(); out.mkdir(parents=True, exist_ok=False)
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False); bpy.ops.import_scene.gltf(filepath=str(Path(opt.input).resolve()))
    scene = bpy.context.scene; scene.render.engine = 'BLENDER_EEVEE_NEXT'; scene.render.resolution_x = scene.render.resolution_y = 512; scene.render.resolution_percentage = 100; scene.render.image_settings.file_format = 'PNG'; scene.world.color = (.035, .04, .05)
    target = Vector((0, -.64, .72)); radius, elevation = .62, .07
    camera_data = bpy.data.cameras.new('V4 close eye review camera'); camera_data.lens = 72; camera = bpy.data.objects.new('V4 close eye review camera', camera_data); bpy.context.collection.objects.link(camera); scene.camera = camera
    light_data = bpy.data.lights.new('V4 close eye review key', 'AREA'); light_data.energy = 400; light_data.shape = 'DISK'; light_data.size = 1.2; light = bpy.data.objects.new('V4 close eye review key', light_data); bpy.context.collection.objects.link(light); light.location = target + Vector((.55, -.8, .75)); look_at(light, target)
    for name, yaw in (('front', 0), ('three-quarter', math.radians(35))):
        camera.location = target + Vector((math.sin(yaw) * radius, -math.cos(yaw) * radius, elevation)); look_at(camera, target); scene.render.filepath = str(out / f'{name}.png'); bpy.ops.render.render(write_still=True)


if __name__ == '__main__': main()
