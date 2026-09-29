"""Read-only Blender inspection of the exact U4F-G1 candidate-04 raw PLY.

Requires Blender 4.5 and absolute paths. Reuses the project's exact PLY import,
neutral-view, and topology helpers; it does not clean or export the raw mesh.
"""
from __future__ import annotations

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
from mathutils import Vector
import numpy as np


PROFILE = "fresh-process-per-stage-512-u4f-rock004-geometry-ply-v1"
MODE = "u4f-rock004-geometry-ply-v1"
INPUT_SHA256 = "6b0d4606568158de586f488bb0cafe7b17e04c26b6c47f5528cee6209043b0bc"
FACE_LIMIT = 2_500_000
RESERVE_FREE_GIB = 6.0
MINIMUM_START_FREE_GIB = 8.0
FORBIDDEN = [
    "texture-flow sampling", "texture SLat decoding", "o_voxel", "CuMesh",
    "BVH", "UV", "bake", "simplification", "textured GLB export",
]
PLY_SCHEMA = "binary_little_endian; float32/float64 XYZ; uchar-3 uint32[3] triangles"
VIEW_DIRECTIONS = (
    ("front", Vector((0.0, -1.0, 0.18))),
    ("back", Vector((0.0, 1.0, 0.18))),
    ("left", Vector((-1.0, 0.0, 0.18))),
    ("right", Vector((1.0, 0.0, 0.18))),
    ("top", Vector((0.0, 0.0, 1.0))),
    ("underside", Vector((0.0, 0.0, -1.0))),
    ("primary", Vector((0.78, -0.78, 0.48))),
    ("opposite", Vector((-0.78, 0.78, 0.48))),
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_module(filename: str, name: str):
    source = Path(__file__).with_name(filename)
    spec = importlib.util.spec_from_file_location(name, source)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load project helper {source}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def validate_source_contract(source: Path) -> tuple[dict, dict]:
    receipt_path = source.with_name("geometry-ply-receipt.json")
    plan_path = source.with_name("plan.json")
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    requested = plan.get("requested_run")
    contract = plan.get("geometry_only_contract")
    if not isinstance(requested, dict) or not isinstance(contract, dict):
        raise ValueError("Raw source is missing its guarded plan contract")
    if plan.get("profile") != PROFILE:
        raise ValueError("Raw source plan is not pinned to the U4F-G1 profile")
    expected_run = {
        "mode": MODE,
        "input_sha256": INPUT_SHA256,
        "max_decoded_faces": FACE_LIMIT,
        "seed": 1234,
        "steps": 12,
        "pipeline_type": "512",
        "num_samples": 1,
        "low_vram": True,
        "decode_strategy": "shape-only",
        "texture_size": None,
        "faces": None,
        "stage_sequence": ["background", "conditioning", "sparse", "shape-flow", "decode"],
    }
    for key, expected in expected_run.items():
        if requested.get(key) != expected:
            raise ValueError(f"Raw source plan is not pinned for {key}")
    expected_contract = {
        "version": "trellis-" + MODE,
        "allowed_input_sha256": INPUT_SHA256,
        "forbidden_operations": FORBIDDEN,
        "texture_sampling": False,
        "ply_schema": PLY_SCHEMA,
    }
    for key, expected in expected_contract.items():
        if contract.get(key) != expected:
            raise ValueError(f"Raw source geometry contract differs at {key}")
    input_path = Path(requested["input"])
    if not input_path.is_file() or sha256_file(input_path).lower() != INPUT_SHA256:
        raise ValueError("Approved candidate-04 source is missing or has changed")
    if receipt.get("profile") != PROFILE or receipt.get("mode") != MODE:
        raise ValueError("Raw PLY receipt is not pinned to the U4F-G1 profile")
    if receipt.get("input_sha256_verified", "").lower() != INPUT_SHA256:
        raise ValueError("Raw PLY receipt does not verify candidate-04")
    if receipt.get("face_limit") != FACE_LIMIT:
        raise ValueError("Raw PLY receipt uses an unexpected decoded-face ceiling")
    if receipt.get("sha256") != sha256_file(source).lower():
        raise ValueError("Raw PLY hash differs from its preserved receipt")
    if receipt.get("scalar") != "float32":
        raise ValueError("This Blender import proof requires exact float32 positions")
    if not set(FORBIDDEN).issubset(set(receipt.get("operations_not_invoked", []))):
        raise ValueError("Raw PLY receipt does not prove the geometry-only boundary")
    return receipt, plan


def numeric_topology_audit(source: Path, checked: dict, positions: np.ndarray) -> dict:
    vertex_count = checked["vertex_count"]
    face_count = checked["face_count"]
    scalar = "<f4" if checked["scalar"] == "float32" else "<f8"
    face_dtype = np.dtype([("arity", "u1"), ("indices", "<u4", (3,))])
    with source.open("rb") as stream:
        stream.seek(checked["header_bytes"] + vertex_count * 3 * np.dtype(scalar).itemsize)
        records = np.fromfile(stream, dtype=face_dtype, count=face_count)
    if len(records) != face_count or not np.all(records["arity"] == 3):
        raise RuntimeError("Raw PLY triangle records failed the nonmutating audit")
    triangles = records["indices"]
    repeated = (triangles[:, 0] == triangles[:, 1]) | (triangles[:, 1] == triangles[:, 2]) | (triangles[:, 2] == triangles[:, 0])
    xyz = positions.reshape((-1, 3)).astype(np.float64, copy=False)
    zero_area = 0
    chunk_size = 200_000
    for begin in range(0, face_count, chunk_size):
        rows = triangles[begin:begin + chunk_size]
        first = xyz[rows[:, 0]]
        second = xyz[rows[:, 1]]
        third = xyz[rows[:, 2]]
        cross = np.cross(second - first, third - first)
        zero_area += int(np.count_nonzero(np.all(cross == 0.0, axis=1)))
    finite = np.isfinite(xyz)
    return {
        "nonfinitePositionScalars": int(finite.size - np.count_nonzero(finite)),
        "repeatedIndexFaces": int(np.count_nonzero(repeated)),
        "zeroAreaTriangles": zero_area,
        "bounds": {
            "min": xyz.min(axis=0).tolist(),
            "max": xyz.max(axis=0).tolist(),
        },
        "unusedVerticesFromTriangleIndices": int(vertex_count - np.unique(triangles).size),
        "auditMethod": "raw binary PLY indices and exact imported float32 positions; chunked numeric checks; no repair or evaluated mesh",
    }


def wireframe_material():
    material = bpy.data.materials.new("U4F-G1 neutral raw wireframe inspection")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    wire = nodes.new("ShaderNodeWireframe")
    wire.use_pixel_size = True
    wire.inputs["Size"].default_value = 0.8
    mix = nodes.new("ShaderNodeMixRGB")
    mix.blend_type = "MIX"
    mix.inputs[1].default_value = (0.075, 0.075, 0.075, 1.0)
    mix.inputs[2].default_value = (0.72, 0.72, 0.72, 1.0)
    material.node_tree.links.new(wire.outputs["Fac"], mix.inputs[0])
    material.node_tree.links.new(mix.outputs["Color"], emission.inputs["Color"])
    material.node_tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return material


def main() -> None:
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args(values)
    if not args.input.is_absolute() or not args.output_dir.is_absolute():
        raise ValueError("Absolute input and output paths are required")
    source = args.input.resolve()
    output = args.output_dir.resolve()
    if source.suffix.lower() != ".ply" or not source.is_file():
        raise ValueError("--input must be an existing raw PLY")
    if output.exists():
        raise ValueError(f"--output-dir must be fresh and nonexistent: {output}")
    receipt, _ = validate_source_contract(source)
    inspector = load_module("inspect-lantern-geometry.py", "u4f_g1_raw_inspector_helpers")
    review = load_module("inspect-generated-glb.py", "u4f_g1_review_helpers")
    ply_format = load_module("trellis_geometry_ply.py", "u4f_g1_ply_helpers")
    initial_free = inspector.free_gib()
    if initial_free < MINIMUM_START_FREE_GIB:
        raise RuntimeError(f"Blender raw inspection requires {MINIMUM_START_FREE_GIB:g}GiB free; have {initial_free:.2f}GiB")
    checked = ply_format.validate_binary_ply(
        source,
        expected_vertex_count=receipt["vertex_count"],
        expected_face_count=receipt["face_count"],
        expected_scalar="float32",
    )
    output.mkdir(parents=True, exist_ok=False)
    stop = threading.Event()
    samples: list[float] = []

    def watchdog() -> None:
        while not stop.is_set():
            available = inspector.free_gib()
            samples.append(available)
            if available < RESERVE_FREE_GIB:
                (output / "reserve-breach.json").write_text(json.dumps({
                    "free_gib": available, "pid": os.getpid(), "reserve_gib": RESERVE_FREE_GIB,
                }, indent=2) + "\n", encoding="utf-8")
                os._exit(77)
            stop.wait(0.5)

    threading.Thread(target=watchdog, daemon=True).start()
    started = time.monotonic()
    try:
        review.clear_scene()
        obj, positions, checked = inspector.assert_exact_import(source, receipt, ply_format)
        topology = review.topology_facts(obj.data)
        numeric = numeric_topology_audit(source, checked, positions)
        inspector.add_neutral_material(obj)
        matte = obj.data.materials[-1]
        minimum, maximum, camera, target, largest, floor = inspector.configure_scene(review, [obj], 512)
        inspector.VIEW_DIRECTIONS = VIEW_DIRECTIONS
        inspector.RENDER_SIZES = (512,)
        rendered = inspector.render_all_views(output, camera, target, largest, floor)
        capture_names = {
            "front-512.png": "raw-front.png",
            "back-512.png": "raw-back.png",
            "left-512.png": "raw-left.png",
            "right-512.png": "raw-right.png",
            "top-512.png": "raw-top.png",
            "underside-512.png": "raw-underside.png",
            "primary-512.png": "raw-primary.png",
            "opposite-512.png": "raw-opposite.png",
        }
        for original, renamed in capture_names.items():
            (output / original).replace(output / renamed)

        scene = bpy.context.scene
        wire = wireframe_material()
        obj.data.materials.clear()
        obj.data.materials.append(wire)
        direction = dict(VIEW_DIRECTIONS)["primary"].normalized()
        camera.location = target + direction * largest * 2.8
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.resolution_x = 512
        scene.render.resolution_y = 512
        wire_path = output / "raw-wireframe.png"
        scene.render.filepath = str(wire_path.resolve())
        bpy.ops.render.render(write_still=True)
        if not wire_path.is_file() or wire_path.stat().st_size == 0:
            raise RuntimeError("Blender did not write the neutral wireframe view")
        obj.data.materials.clear()
        obj.data.materials.append(matte)
        floor.hide_render = False
        scene.render.filepath = str((output / "inspection.png").resolve())
        bpy.ops.wm.save_as_mainfile(filepath=str((output / "inspection.blend").resolve()))
        record = {
            "status": "neutral, exact raw PLY import and visual inspection; no cleanup or export",
            "source": str(source),
            "sourceSha256": checked["sha256"],
            "sourceReceiptSha256": sha256_file(source.with_name("geometry-ply-receipt.json")),
            "sourcePlanSha256": sha256_file(source.with_name("plan.json")),
            "profile": PROFILE,
            "mode": MODE,
            "pinnedInputSha256": INPUT_SHA256,
            "faceLimit": FACE_LIMIT,
            "vertices": len(obj.data.vertices),
            "triangles": len(obj.data.polygons),
            "scalar": checked["scalar"],
            "binaryBytes": checked["bytes"],
            "bounds": {"min": numeric["bounds"]["min"], "max": numeric["bounds"]["max"]},
            "sourceSchemaCountsIndicesVerified": True,
            "importedPositionSha256": hashlib.sha256(positions.tobytes()).hexdigest(),
            "maxPositionImportPrecisionError": 0.0,
            "topology": topology,
            "numericTopology": numeric,
            "views": list(capture_names.values()) + ["raw-wireframe.png"],
            "viewDirections": [name for name, _ in VIEW_DIRECTIONS],
            "neutralMaterial": "matte grayscale; roughness 0.92; metallic 0",
            "undersideFloorPolicy": "neutral floor hidden only for underside render",
            "noSourceMutation": True,
            "minSampledHostFreeGiB": min(samples) if samples else initial_free,
            "initialFreeGiB": initial_free,
            "elapsedSeconds": time.monotonic() - started,
        }
        (output / "inspection.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(record), flush=True)
    finally:
        stop.set()


if __name__ == "__main__":
    main()
