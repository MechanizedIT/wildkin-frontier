"""Neutral Blender inspection of an exact TRELLIS geometry-only PLY.

No source writes, reduction, welding, texture work or GLB export. Run with
Blender --background --factory-startup --python-exit-code 1 --python this.py
-- --input ABSOLUTE.ply --output-dir NEW_ABSOLUTE_DIRECTORY.
"""
import argparse
import ctypes
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import sys
import threading
import time
import bpy
import numpy as np


def free_gib():
    class Status(ctypes.Structure):
        _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [
            (key, ctypes.c_ulonglong) for key in ('total', 'available', 'page_total',
            'page_available', 'virtual_total', 'virtual_available', 'extended')]
    status = Status(); status.length = ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise RuntimeError('RAM measurement unavailable')
    return status.available / 2**30


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--output-dir', required=True, type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    if not args.input.is_absolute() or not args.output_dir.is_absolute():
        raise ValueError('Absolute input and output required')
    source, output = args.input.resolve(), args.output_dir.resolve()
    if source.suffix != '.ply' or not source.is_file(): raise ValueError('Existing PLY required')
    if output.exists() and any(output.iterdir()): raise ValueError('Fresh output required')
    if free_gib() < 8: raise RuntimeError('Inspection requires 8GiB free before import')
    receipt_path = source.with_name('geometry-ply-receipt.json')
    receipt = json.loads(receipt_path.read_text())
    spec = importlib.util.spec_from_file_location('ply_format', Path(__file__).with_name('trellis_geometry_ply.py'))
    ply_format = importlib.util.module_from_spec(spec); spec.loader.exec_module(ply_format)
    checked = ply_format.validate_binary_ply(source,
        expected_vertex_count=receipt['vertex_count'], expected_face_count=receipt['face_count'],
        expected_scalar=receipt['scalar'])
    if checked['sha256'] != receipt['sha256'] or checked['bytes'] != receipt['bytes']:
        raise ValueError('PLY does not match its guarded generation receipt')
    if checked['face_count'] > 1100000 or receipt.get('mode') != 'geometry-ply-v1':
        raise ValueError('PLY is not the bounded geometry-only profile result')
    output.mkdir(parents=True, exist_ok=True)
    stop = threading.Event(); samples = []
    def watch():
        while not stop.is_set():
            value = free_gib(); samples.append(value)
            if value < 6:
                (output/'reserve-breach.json').write_text(json.dumps({'free_gib':value,'pid':os.getpid()}))
                os._exit(77)
            stop.wait(.5)
    threading.Thread(target=watch, daemon=True).start()
    started = time.monotonic()
    try:
        spec = importlib.util.spec_from_file_location('review', Path(__file__).with_name('inspect-generated-glb.py'))
        review = importlib.util.module_from_spec(spec); spec.loader.exec_module(review)
        review.clear_scene()
        bpy.ops.wm.ply_import(filepath=str(source), forward_axis='Y', up_axis='Z',
                              global_scale=1, merge_verts=False, import_attributes=False)
        objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        if len(objects) != 1: raise RuntimeError('Expected exactly one imported geometry mesh')
        obj = objects[0]; mesh = obj.data
        if len(mesh.vertices) != checked['vertex_count'] or len(mesh.polygons) != checked['face_count']:
            raise RuntimeError('Blender import changed recorded geometry counts')
        if len(mesh.polygons) > 1100000: raise RuntimeError('Geometry inspection ceiling exceeded')
        if any(len(p.vertices) != 3 for p in mesh.polygons): raise RuntimeError('Nontriangle PLY import')
        positions = np.empty(len(mesh.vertices)*3, dtype=np.float32)
        mesh.vertices.foreach_get('co', positions)
        if not np.isfinite(positions).all(): raise RuntimeError('Nonfinite imported position')
        scalar = '<f4' if checked['scalar'] == 'float32' else '<f8'
        with source.open('rb') as stream:
            stream.seek(checked['header_bytes'])
            source_positions = np.frombuffer(stream.read(checked['vertex_count']*3*np.dtype(scalar).itemsize), dtype=scalar)
            face_records = np.frombuffer(stream.read(checked['face_count']*13), dtype=np.dtype([('arity','u1'),('indices','<u4',(3,))]))
        if not np.array_equal(positions, source_positions.astype(np.float32)):
            raise RuntimeError('Blender imported positions differ from source at float32 precision')
        imported_indices = np.empty(len(mesh.loops), dtype=np.uint32)
        mesh.loops.foreach_get('vertex_index', imported_indices)
        if not np.array_equal(imported_indices, face_records['indices'].reshape(-1)):
            raise RuntimeError('Blender import changed triangle indices/order')
        precision_error = float(np.max(np.abs(positions.astype(np.float64)-source_positions.astype(np.float64))))
        # No repair or normals operation: these are the raw imported triangles.
        mesh.polygons.foreach_set('use_smooth', np.zeros(len(mesh.polygons), dtype=np.bool_))
        minimum, maximum = review.scene_bounds(objects)
        review.assign_matte_material_copies(objects, 'matte')
        camera, target, largest = review.configure_studio(minimum, maximum, 640)
        bpy.context.scene.eevee.taa_render_samples = 24
        review.VIEW_DEFINITIONS = (('front',0),('three-quarter',math.radians(35)),('side',math.pi/2),('rear',math.pi))
        rendered = review.render_views(output,camera,target,largest,0)
        # Separate genuinely small renders, not an altered source image.
        bpy.context.scene.render.resolution_x = 96; bpy.context.scene.render.resolution_y = 96
        review.VIEW_DEFINITIONS = (('three-quarter-96',math.radians(35)),)
        rendered += review.render_views(output,camera,target,largest,0)
        bpy.context.scene.render.resolution_x = 48; bpy.context.scene.render.resolution_y = 48
        review.VIEW_DEFINITIONS = (('three-quarter-48',math.radians(35)),)
        rendered += review.render_views(output,camera,target,largest,0)
        bpy.ops.wm.save_as_mainfile(filepath=str(output/'inspection.blend'))
        record={'source':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                'vertices':len(mesh.vertices),'triangles':len(mesh.polygons),
                'bounds':{'min':list(minimum),'max':list(maximum)},'renders':rendered,
                'axes':'Untransformed TRELLIS geometry; Blender Z up, Y forward; no welding',
                'status':'neutral raw geometry inspection, not textured master or runtime asset',
                'guarded_receipt_sha256':hashlib.sha256(receipt_path.read_bytes()).hexdigest(),
                'source_schema_counts_indices_verified':True,
                'imported_triangle_indices_exact':True,
                'max_position_import_precision_error':precision_error,
                'imported_position_sha256':hashlib.sha256(positions.tobytes()).hexdigest(),
                'min_sampled_host_free_gib':min(samples),'elapsed_seconds':time.monotonic()-started}
        (output/'inspection.json').write_text(json.dumps(record,indent=2)+'\n')
        print(json.dumps(record),flush=True)
    finally:
        stop.set()


if __name__ == '__main__': main()
