"""Render indexed boundary/nonmanifold edges on the exact U4F-G1 raw PLY."""
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector
import numpy as np

EXPECTED_SHA256 = "4cc76dc0608ed0e3575e25718c3b606561aa7925c4cd5d46350c4576d5958c5d"
VIEW_DIRECTIONS = (
    ("primary", Vector((0.78, -0.78, 0.48))),
    ("underside", Vector((0.0, 0.0, -1.0))),
    ("opposite", Vector((-0.78, 0.78, 0.48))),
)


def load_module(filename: str, name: str):
    path = Path(__file__).with_name(filename)
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import helper {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def emission_material(name: str, color: tuple[float, float, float, float]):
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = color
    emission.inputs["Strength"].default_value = 1.4
    material.node_tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return material


def edge_curve(name: str, positions: np.ndarray, pairs: np.ndarray, material, radius: float):
    data = bpy.data.curves.new(name, type="CURVE")
    data.dimensions = "3D"
    data.resolution_u = 1
    data.bevel_depth = radius
    data.bevel_resolution = 0
    for left, right in pairs.tolist():
        spline = data.splines.new("POLY")
        spline.points.add(1)
        spline.points[0].co = (*positions[left].tolist(), 1.0)
        spline.points[1].co = (*positions[right].tolist(), 1.0)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(material)
    return obj


def main() -> None:
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args(values)
    source = args.input.resolve()
    output = args.output_dir.resolve()
    if not source.is_file() or output.exists():
        raise ValueError("input must exist and output directory must be new")

    raw_audit = load_module("audit-u4f-c1-defects.py", "u4f_c1_raw_audit")
    if raw_audit.sha256(source) != EXPECTED_SHA256:
        raise ValueError("immutable raw PLY hash changed")
    g1_inspector = load_module("inspect-u4f-g1-geometry.py", "u4f_g1_geometry")
    receipt, _ = g1_inspector.validate_source_contract(source)
    inspector = load_module("inspect-lantern-geometry.py", "u4f_c1_inspector")
    ply_format = load_module("trellis_geometry_ply.py", "u4f_c1_ply")
    checked = ply_format.validate_binary_ply(source, expected_vertex_count=receipt["vertex_count"],
                                             expected_face_count=receipt["face_count"], expected_scalar="float32")
    face_dtype = np.dtype([("arity", "u1"), ("indices", "<u4", (3,))])
    with source.open("rb") as stream:
        stream.seek(checked["header_bytes"])
        positions = np.fromfile(stream, dtype="<f4", count=checked["vertex_count"] * 3).reshape((-1, 3))
        faces = np.fromfile(stream, dtype=face_dtype, count=checked["face_count"])["indices"]
    edge_rows = np.concatenate((faces[:, (0, 1)], faces[:, (1, 2)], faces[:, (2, 0)]), axis=0)
    edge_rows.sort(axis=1)
    keys = edge_rows[:, 0].astype(np.uint64) * np.uint64(len(positions)) + edge_rows[:, 1]
    del edge_rows, faces
    keys.sort()
    unique_keys, counts = np.unique(keys, return_counts=True)
    edge_a = (unique_keys // np.uint64(len(positions))).astype(np.int32)
    edge_b = (unique_keys % np.uint64(len(positions))).astype(np.int32)
    del keys, unique_keys
    boundary = np.column_stack((edge_a[counts == 1], edge_b[counts == 1])).astype(np.int32)
    nonmanifold = np.column_stack((edge_a[counts > 2], edge_b[counts > 2])).astype(np.int32)

    output.mkdir(parents=True, exist_ok=False)
    review = load_module("inspect-generated-glb.py", "u4f_c1_render_helpers")
    review.clear_scene()
    obj, imported_positions, checked = inspector.assert_exact_import(source, receipt, ply_format)
    if not np.array_equal(imported_positions.reshape((-1, 3)), positions):
        raise RuntimeError("Blender import changed source coordinates")
    inspector.add_neutral_material(obj)
    minimum, maximum = review.scene_bounds([obj])
    camera, target, largest = review.configure_studio(minimum, maximum, 768)
    boundary_mat = emission_material("Boundary edges | red", (1.0, 0.025, 0.015, 1.0))
    nonmanifold_mat = emission_material("Nonmanifold edges | cyan", (0.0, 0.9, 1.0, 1.0))
    edge_curve("Indexed boundary edges", positions, boundary, boundary_mat, 0.0014)
    edge_curve("Indexed nonmanifold edges", positions, nonmanifold, nonmanifold_mat, 0.0014)

    scene = bpy.context.scene
    floor = bpy.data.objects.get("Matte Studio Floor")
    for label, direction in VIEW_DIRECTIONS:
        floor.hide_render = label == "underside"
        camera.location = target + direction.normalized() * largest * 2.8
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.resolution_x = 768
        scene.render.resolution_y = 768
        scene.render.image_settings.file_format = "PNG"
        scene.render.filepath = str((output / f"defects-{label}.png").resolve())
        bpy.ops.render.render(write_still=True)
    floor.hide_render = False
    bpy.ops.wm.save_as_mainfile(filepath=str((output / "defect-map.blend").resolve()))
    report = {
        "status": "diagnostic visualization only; indexed edges from immutable raw geometry",
        "sourceSha256": EXPECTED_SHA256,
        "boundaryEdges": int(len(boundary)),
        "nonmanifoldEdges": int(len(nonmanifold)),
        "boundaryColor": "red",
        "nonmanifoldColor": "cyan",
        "views": [f"defects-{label}.png" for label, _ in VIEW_DIRECTIONS],
        "viewConvention": "U4F-G1 camera vectors; Z-up",
    }
    (output / "diagnostic.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    main()
