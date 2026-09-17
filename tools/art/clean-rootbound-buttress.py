"""Review-gated Blender 4.5 cleanup of the Rootbound geometry-only PLY master.

Invoke only after independent plan review:
  blender.exe --background --python tools/art/clean-rootbound-buttress.py -- --execute

The script never writes the raw PLY and intentionally avoids bmesh, remesh,
voxel, Boolean, UV, baking, GLB export, or TRELLIS.  Its default derivative
only normalizes scale/grounding; an explicitly requested preview may apply one
deterministic Decimate modifier on that derivative mesh copy.
"""
import argparse
from array import array
import ctypes
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import sys
import threading
import time

try:
    import bpy
    from mathutils import Vector
except ImportError:  # Allows py_compile and review without Blender.
    bpy = None

RAW_SHA256 = '3005ad1a1f3039a946db633b323ace8bc73856e91f38bfef4fc1faaf59ce223c'
RAW_COUNTS = {'vertices': 514489, 'triangles': 1029792}
RAW_PATH = Path('.dream-loop/rootbound-buttress-trellis/geometry-ply-v1-run/raw-geometry.ply')
OUTPUT_ROOT = Path('art/source/rootbound-buttress-trellis/geometry-ply-v1/cleanup-r1')
START_FREE_GIB = 8.0
RESERVE_GIB = 6.0
DECIMATE_RATIO = 0.15
EPSILON_GROUND_M = 0.001
TINY_DEBRIS_FACE_LIMIT = 64
TINY_DEBRIS_MAX_EXTENT_M = 0.05


def repo_root():
    return Path(__file__).resolve().parents[2]


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def available_gib():
    class Status(ctypes.Structure):
        _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [
            (key, ctypes.c_ulonglong) for key in ('total', 'available', 'page_total',
            'page_available', 'virtual_total', 'virtual_available', 'extended')]
    status = Status(); status.length = ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise OSError('cannot read host physical RAM')
    return status.available / 2**30


def require_free(required, label):
    free = available_gib()
    if free < required:
        raise RuntimeError(f'{label}: {free:.2f}GiB free, {required:.2f}GiB required')
    return free


def start_watchdog(stop):
    def check():
        while not stop.wait(.5):
            if available_gib() < RESERVE_GIB:
                os._exit(77)  # only this Blender process, never another process
    thread = threading.Thread(target=check, daemon=True)
    thread.start()


def parsed_args():
    tail = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true', help='required; otherwise prints review-gate status only')
    parser.add_argument('--preview-decimate', action='store_true', help='optional non-admission facet preview after review')
    return parser.parse_args(tail)


def fresh_output(path):
    return not path.exists() or not any(path.iterdir())


def reset_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablock in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(datablock):
            if item.users == 0: datablock.remove(item)


def import_ply(path):
    before = set(bpy.data.objects)
    if hasattr(bpy.ops.wm, 'ply_import'):
        bpy.ops.wm.ply_import(filepath=str(path), forward_axis='Y', up_axis='Z',
                              global_scale=1.0, merge_verts=False, import_attributes=False)
    else:
        bpy.ops.import_mesh.ply(filepath=str(path))
    imported = [item for item in bpy.data.objects if item not in before and item.type == 'MESH']
    if len(imported) != 1:
        raise RuntimeError(f'expected exactly one imported PLY mesh, found {len(imported)}')
    return imported[0]


def bounds(mesh):
    coords = array('f', [0.0]) * (len(mesh.vertices) * 3)
    mesh.vertices.foreach_get('co', coords)
    mins = [float('inf')] * 3; maxs = [float('-inf')] * 3
    for offset in range(0, len(coords), 3):
        for axis in range(3):
            value = coords[offset + axis]
            mins[axis] = min(mins[axis], value); maxs[axis] = max(maxs[axis], value)
    return {'min': mins, 'max': maxs, 'extent': [maxs[i] - mins[i] for i in range(3)]}


def component_audit(mesh, raw_bounds):
    """Union-find loose-component audit without a full million-face bmesh edit."""
    vertex_count, polygon_count = len(mesh.vertices), len(mesh.polygons)
    starts = array('i', [0]) * polygon_count; totals = array('i', [0]) * polygon_count
    loops = array('i', [0]) * len(mesh.loops)
    mesh.polygons.foreach_get('loop_start', starts); mesh.polygons.foreach_get('loop_total', totals)
    mesh.loops.foreach_get('vertex_index', loops)
    parent = array('i', range(vertex_count)); size = array('i', [1]) * vertex_count
    def find(value):
        while parent[value] != value:
            parent[value] = parent[parent[value]]; value = parent[value]
        return value
    def union(a, b):
        a, b = find(a), find(b)
        if a != b:
            if size[a] < size[b]: a, b = b, a
            parent[b] = a; size[a] += size[b]
    non_triangles = 0
    for start, total in zip(starts, totals):
        if total != 3:
            non_triangles += 1; continue
        a, b, c = loops[start], loops[start + 1], loops[start + 2]
        union(a, b); union(a, c)
    faces_by_root = {}
    for start, total in zip(starts, totals):
        if total == 3:
            root = find(loops[start]); faces_by_root[root] = faces_by_root.get(root, 0) + 1
    primary = max(faces_by_root, key=faces_by_root.get) if faces_by_root else None
    # Component bounds would require a second full vertex pass per component; record
    # the conservative face candidates only. No component is deleted in this R1.
    return {'components': len(faces_by_root), 'primary_component_faces': faces_by_root.get(primary, 0),
            'non_triangle_faces': non_triangles,
            'tiny_debris_rule': {'max_faces': TINY_DEBRIS_FACE_LIMIT, 'max_scaled_extent_m': TINY_DEBRIS_MAX_EXTENT_M,
                                  'raw_extent_fraction_limit': TINY_DEBRIS_MAX_EXTENT_M / 5.0},
            'candidate_components_by_face_count': sorted((count for root, count in faces_by_root.items() if root != primary and count <= TINY_DEBRIS_FACE_LIMIT)),
            'debris_removal_applied': False,
            'note': 'No loose component removed: connected ragged tips are not debris, and full component extents require later localized review.'}


def normal_audit(mesh):
    """Read Blender's imported/evaluated normals without repairing source mesh data."""
    zero = 0
    for polygon in mesh.polygons:
        if not all(math.isfinite(value) for value in polygon.normal) or polygon.normal.length <= 1e-9:
            zero += 1
    return {'zero_or_nonfinite_polygon_normals': zero}


def duplicate_preview(raw, scale, ground_z):
    preview = raw.copy(); preview.data = raw.data.copy(); bpy.context.collection.objects.link(preview)
    preview.name = 'RAW_PREVIEW_SCALED'; preview.scale = (scale, scale, scale); preview.location.z = ground_z
    preview.hide_viewport = False; preview.hide_render = False
    return preview


def create_derivative(raw, scale, ground_z, preview_decimate):
    derivative = raw.copy(); derivative.data = raw.data.copy(); bpy.context.collection.objects.link(derivative)
    derivative.name = 'BUTTRESS_DERIVATIVE_R1'; derivative.scale = (scale, scale, scale); derivative.location.z = ground_z
    derivative.hide_viewport = False; derivative.hide_render = False
    if preview_decimate:
        modifier = derivative.modifiers.new('controlled_facets_preview_r1', 'DECIMATE')
        modifier.decimate_type = 'COLLAPSE'; modifier.ratio = DECIMATE_RATIO
        modifier.use_collapse_triangulate = True; modifier.use_symmetry = False
        bpy.context.view_layer.objects.active = derivative; derivative.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in derivative.data.polygons: polygon.use_smooth = False
    derivative.data.update()
    return derivative


def matte_material():
    material = bpy.data.materials.new('inspection_matte_rootwood')
    material.diffuse_color = (.29, .105, .045, 1.0)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (.29, .105, .045, 1.0)
    bsdf.inputs['Roughness'].default_value = .82
    bsdf.inputs['Specular IOR Level'].default_value = .18
    return material


def look_at(camera, point):
    camera.rotation_euler = (Vector(point) - camera.location).to_track_quat('-Z', 'Y').to_euler()


def setup_scene(center, extent):
    scene = bpy.context.scene; scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'; scene.display.shading.studio_light = 'rim.sl'
    scene.display.shading.color_type = 'MATERIAL'; scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True; scene.display.shading.cavity_type = 'WORLD'
    scene.display.shading.background_type = 'WORLD'; scene.display.shading.background_color = (.035, .065, .08)
    scene.render.image_settings.file_format = 'PNG'; scene.render.film_transparent = False
    camera_data = bpy.data.cameras.new('inspection_camera'); camera = bpy.data.objects.new('inspection_camera', camera_data)
    bpy.context.collection.objects.link(camera); scene.camera = camera; camera.data.type = 'ORTHO'
    camera.data.ortho_scale = max(extent) * 1.35
    return scene, camera


def render_set(scene, camera, center, extent, subject, other, folder):
    directions = {'front': (0, -1, .25), 'threequarter': (1, -1, .38), 'side': (1, 0, .25), 'rear': (0, 1, .25)}
    folder.mkdir(parents=True, exist_ok=True); outputs = []
    subject.hide_render = False; other.hide_render = True
    radius = max(extent) * 2.5
    for name, direction in directions.items():
        camera.location = Vector(center) + Vector(direction).normalized() * radius
        look_at(camera, center)
        for pixels in (512, 96, 48):
            scene.render.resolution_x = pixels; scene.render.resolution_y = pixels; scene.render.resolution_percentage = 100
            target = folder / f'{name}-{pixels}.png'; scene.render.filepath = str(target)
            bpy.ops.render.render(write_still=True); outputs.append(str(target))
    return outputs


def transformed_bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    mins = [min(point[i] for point in points) for i in range(3)]; maxs = [max(point[i] for point in points) for i in range(3)]
    return {'min': mins, 'max': maxs, 'extent': [maxs[i] - mins[i] for i in range(3)]}


def execute(preview_decimate):
    if bpy.app.version[:2] != (4, 5): raise RuntimeError(f'Blender 4.5 required, found {bpy.app.version_string}')
    root = repo_root(); raw_path = root / RAW_PATH; output = root / OUTPUT_ROOT
    if not raw_path.is_file() or sha256(raw_path) != RAW_SHA256: raise RuntimeError('raw PLY receipt mismatch')
    if not fresh_output(output): raise RuntimeError('cleanup output must be a fresh empty directory')
    require_free(START_FREE_GIB, 'cleanup start guard'); output.mkdir(parents=True, exist_ok=True)
    diagnostics = {'raw_path': str(raw_path), 'raw_sha256': RAW_SHA256,
                   'preview_decimate_requested': preview_decimate}
    stop = threading.Event(); start_watchdog(stop)
    try:
        reset_scene(); raw = import_ply(raw_path); raw.name = 'RAW_MASTER_IMMUTABLE'
        mesh = raw.data
        if len(mesh.vertices) != RAW_COUNTS['vertices'] or len(mesh.polygons) != RAW_COUNTS['triangles']:
            raise RuntimeError('imported raw PLY count differs from verified receipt')
        raw_bounds = bounds(mesh); scale = 5.0 / max(raw_bounds['extent'][0], raw_bounds['extent'][1]); ground_z = -raw_bounds['min'][2] * scale
        topology = component_audit(mesh, raw_bounds); normals = normal_audit(mesh)
        diagnostics.update({'raw_bounds': raw_bounds, 'uniform_scale': scale,
                            'topology': topology, 'raw_normals': normals})
        if topology['non_triangle_faces'] or normals['zero_or_nonfinite_polygon_normals']:
            raise RuntimeError('raw audit HOLD before derivative/renders')
        raw.hide_render = True; raw.hide_viewport = True
        preview = duplicate_preview(raw, scale, ground_z); derivative = create_derivative(raw, scale, ground_z, preview_decimate)
        material = matte_material(); preview.data.materials.append(material); derivative.data.materials.append(material)
        bpy.context.view_layer.update()
        scaled = transformed_bounds(preview); derived = transformed_bounds(derivative)
        if abs(scaled['min'][2]) > EPSILON_GROUND_M or abs(derived['min'][2]) > EPSILON_GROUND_M:
            raise RuntimeError('grounding audit failed')
        if abs(scaled['extent'][0] - 5.0) > .002:
            raise RuntimeError('uniform 5m spread audit failed')
        derivative_normals = normal_audit(derivative.data)
        diagnostics.update({'scaled_raw_bounds': scaled, 'derivative_bounds': derived,
                            'derivative_normals': derivative_normals,
                            'derivative_triangles': len(derivative.data.polygons)})
        if derivative_normals['zero_or_nonfinite_polygon_normals']:
            raise RuntimeError('derivative normal audit failed')
        center = [(scaled['min'][i] + scaled['max'][i]) / 2 for i in range(3)]
        scene, camera = setup_scene(center, scaled['extent'])
        renders = {'raw': render_set(scene, camera, center, scaled['extent'], preview, derivative, output / 'renders/raw'),
                   'derivative': render_set(scene, camera, center, scaled['extent'], derivative, preview, output / 'renders/derivative')}
        metrics = {'raw_path': str(raw_path), 'raw_sha256': RAW_SHA256, 'raw_counts': RAW_COUNTS,
                   'raw_bounds': raw_bounds, 'uniform_scale': scale, 'scaled_raw_bounds': scaled,
                   'derivative_bounds': derived, 'topology': topology, 'raw_normals': normals,
                   'derivative_normals': derivative_normals, 'derivative_triangles': len(derivative.data.polygons),
                   'preview_decimate_applied': preview_decimate,
                   'decimate_ratio': DECIMATE_RATIO if preview_decimate else None,
                   'debris_removal_applied': False, 'renders': renders,
                   'material_note': 'neutral inspection clay only; no texture/UV/bake/runtime material authored',
                   'cleanup_blend_contents': 'derivative-only plus studio; raw master is reimported from pinned external PLY'}
        (output / 'cleanup-metrics.json').write_text(json.dumps(metrics, indent=2), encoding='utf8')
        shutil.copy2(Path(__file__), output / 'executed-clean-rootbound-buttress.py')
        # Keep the editable source compact: the immutable pinned PLY and its
        # receipt retain raw geometry; the blend contains only the derivative.
        raw_mesh, preview_mesh = raw.data, preview.data
        bpy.data.objects.remove(preview, do_unlink=True)
        bpy.data.objects.remove(raw, do_unlink=True)
        if raw_mesh.users == 0: bpy.data.meshes.remove(raw_mesh)
        if preview_mesh.users == 0: bpy.data.meshes.remove(preview_mesh)
        bpy.ops.wm.save_as_mainfile(filepath=str(output / 'cleanup-r1.blend'))
    except Exception as error:
        diagnostics.update({'status': 'HOLD', 'error': str(error),
                            'note': 'Raw master was not written or replaced; this HOLD is diagnostic, not a new geometry iteration.'})
        (output / 'cleanup-hold.json').write_text(json.dumps(diagnostics, indent=2), encoding='utf8')
        raise
    finally:
        stop.set()


def main():
    args = parsed_args()
    if not args.execute:
        print(json.dumps({'status': 'PLAN_ONLY', 'required': '--execute after independent review',
                          'raw_sha256': RAW_SHA256, 'output': str(OUTPUT_ROOT)})); return
    if bpy is None: raise RuntimeError('run this script with Blender 4.5, not CPython')
    execute(args.preview_decimate)


if __name__ == '__main__': main()
