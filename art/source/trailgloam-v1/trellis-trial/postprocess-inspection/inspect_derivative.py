"""Read-only GLB comparison using the retained raw Trailgloam camera rig.

Run after TRELLIS exits. Source GLB and raw master are never rewritten.
Two display treatments: generated base color with matte lighting, and neutral
clay for shape comparison. Neither treatment changes the source material.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import threading
import time

import bpy
import numpy as np
from mathutils import Vector


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source, output = args.input, args.output_dir
    assert source.is_absolute() and source.is_file() and source.suffix == '.glb'
    assert output.is_absolute() and not output.exists()
    trial = Path(__file__).resolve().parents[1]
    raw = load(trial / 'raw-inspection/inspect_raw_ply.py', 'raw_inspector')
    assert raw.sha256_file(source) == args.sha256
    assert raw.free_gib() >= 8.0
    review = load(raw.repository_root() / 'tools/art/inspect-generated-glb.py', 'studio')
    frame = json.loads((trial / 'geometry-ply-v1/inspection/inspection.json').read_text(encoding='utf8'))['bounds']
    output.mkdir(parents=True)
    stop = threading.Event()
    samples = []

    def watch():
        while not stop.wait(.5):
            free = raw.free_gib()
            samples.append(free)
            if free < 6.0:
                (output / 'resource-stop.json').write_text(json.dumps({'free_gib': free}), encoding='utf8')
                os._exit(3)

    threading.Thread(target=watch, daemon=True).start()
    started = time.monotonic()
    review.clear_scene()
    imported = review.import_glb(source)
    meshes = [obj for obj in imported if obj.type == 'MESH']
    assert meshes

    def fingerprint():
        digest = hashlib.sha256()
        for obj in meshes:
            vertices = np.empty(len(obj.data.vertices) * 3, dtype=np.float32)
            obj.data.vertices.foreach_get('co', vertices)
            assert np.isfinite(vertices).all()
            obj.data.calc_loop_triangles()
            indices = np.empty(len(obj.data.loop_triangles) * 3, dtype=np.int32)
            obj.data.loop_triangles.foreach_get('vertices', indices)
            digest.update(vertices.tobytes())
            digest.update(indices.tobytes())
            digest.update(np.asarray(obj.matrix_world, dtype=np.float32).tobytes())
        return digest.hexdigest()

    before = fingerprint()
    minimum, maximum = review.scene_bounds(imported)
    # TRELLIS writes glTF (x,z,-y); Blender's glTF import restores (x,y,z).
    # A remesh may shift its surface slightly, so compare all six extrema with
    # a declared 5% raw-span allowance, not exact source vertex equality.
    frame_delta = np.abs(np.asarray([list(minimum), list(maximum)]) - np.asarray([frame['min'], frame['max']]))
    frame_tolerance = max(np.asarray(frame['max']) - np.asarray(frame['min'])) * .05
    assert np.all(frame_delta <= frame_tolerance), 'GLB bounds/axes differ from raw framing; inspect transform before matched views'
    facts = review.inventory(imported, minimum, maximum)
    assert 0 < facts['triangles'] <= 150000, 'unexpected derivative size; inspect before rendering'
    assert facts['textures'], 'no generated textures imported'
    original_materials = {obj.name: list(obj.data.materials) for obj in meshes}
    surface = {}
    for obj in meshes:
        smooth = np.empty(len(obj.data.polygons), dtype=np.bool_)
        slots = np.empty(len(obj.data.polygons), dtype=np.int32)
        obj.data.polygons.foreach_get('use_smooth', smooth)
        obj.data.polygons.foreach_get('material_index', slots)
        surface[obj.name] = (smooth, slots)
    review.assign_matte_material_copies(imported, 'matte')
    camera, target, largest = review.configure_studio(Vector(frame['min']), Vector(frame['max']), 512)
    floor = bpy.data.objects.get('Matte Studio Floor')
    assert floor is not None
    rendered = []
    for treatment in ('textured', 'neutral'):
        if treatment == 'neutral':
            for obj in meshes:
                obj.data.materials.clear()
                raw.add_teal_clay(obj)
                # One neutral material covers every original material index.
                obj.data.polygons.foreach_set('material_index', np.zeros(len(obj.data.polygons), dtype=np.int32))
        for size in raw.RENDER_SIZES:
            bpy.context.scene.render.resolution_x = size
            bpy.context.scene.render.resolution_y = size
            for label, direction in raw.VIEW_DIRECTIONS:
                floor.hide_render = label == 'underside'
                camera.location = target + direction.normalized() * largest * 2.8
                camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
                name = f'{treatment}-{label}-{size}.png'
                bpy.context.scene.render.filepath = str(output / name)
                bpy.ops.render.render(write_still=True)
                assert (output / name).stat().st_size > 0
                rendered.append(name)
    for obj in meshes:
        obj.data.materials.clear()
        for material in original_materials[obj.name]:
            obj.data.materials.append(material)
        smooth, slots = surface[obj.name]
        obj.data.polygons.foreach_set('use_smooth', smooth)
        obj.data.polygons.foreach_set('material_index', slots)
        assert list(obj.data.materials) == original_materials[obj.name]
        restored_smooth = np.empty_like(smooth)
        restored_slots = np.empty_like(slots)
        obj.data.polygons.foreach_get('use_smooth', restored_smooth)
        obj.data.polygons.foreach_get('material_index', restored_slots)
        assert np.array_equal(restored_smooth, smooth) and np.array_equal(restored_slots, slots)
    floor.hide_render = False
    assert fingerprint() == before
    assert raw.sha256_file(source) == args.sha256
    bpy.ops.wm.save_as_mainfile(filepath=str(output / 'inspection.blend'))
    stop.set()
    facts.update({'source': str(source), 'source_sha256': args.sha256,
                  'geometry_transform_preserved': True, 'framing_bounds': frame,
                  'raw_frame_max_axis_delta': float(frame_delta.max()),
                  'raw_frame_axis_tolerance': float(frame_tolerance),
                  'original_materials_slots_smoothing_restored_in_blend': True,
                  'imported_world_transforms': {obj.name: [list(row) for row in obj.matrix_world] for obj in meshes},
                  'renders': rendered, 'elapsed_seconds': time.monotonic() - started,
                  'min_sampled_host_free_gib': min(samples, default=raw.free_gib()),
                  'presentation': 'Copied matte generated materials; neutral shape comparison. No runtime admission.'})
    (output / 'inspection.json').write_text(json.dumps(facts, indent=2), encoding='utf8')
    print(json.dumps({'status': 'complete', 'triangles': facts['triangles'], 'renders': len(rendered)}), flush=True)


if __name__ == '__main__':
    main()
