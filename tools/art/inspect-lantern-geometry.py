"""Inspect an exact Lantern geometry-only TRELLIS PLY without changing it.

Run only after the Lantern geometry-only runner has produced its guarded raw
PLY.  This script requires absolute paths and a directory that does not yet
exist.  It never writes the source PLY, normalizes geometry, welds vertices,
recalculates normals, or exports a derivative.

Example (Blender 4.5 background mode)::

  blender -b --factory-startup --python-exit-code 1 --python \
    tools/art/inspect-lantern-geometry.py -- \
    --input C:\\absolute\\raw-geometry.ply --output-dir C:\\absolute\\inspection
"""

from __future__ import annotations

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
from mathutils import Matrix, Vector
import numpy as np


LANTERN_PROFILE = "fresh-process-per-stage-512-lantern-geometry-ply-v1"
LANTERN_MODE = "lantern-geometry-ply-v1"
LANTERN_INPUT_SHA256 = "85bd175a6b102cf183b50ff5ca45a1afd6847a6920a28b0039bd8e1e98d6b2ac"
LANTERN_FACE_LIMIT = 2_300_000
MINIMUM_FREE_GIB = 8.0
RESERVE_FREE_GIB = 6.0
RENDER_SIZES = (512, 96, 48)

# Local Blender-axis viewing directions.  They deliberately include both end
# directions, both broad sides, and vertical checks rather than selecting a
# flattering hero view.
VIEW_DIRECTIONS = (
    ("end-positive-y", Vector((0.0, 1.0, 0.16))),
    ("end-negative-y", Vector((0.0, -1.0, 0.16))),
    ("side-positive-x", Vector((1.0, 0.0, 0.16))),
    ("side-negative-x", Vector((-1.0, 0.0, 0.16))),
    ("top", Vector((0.0, 0.0, 1.0))),
    ("underside", Vector((0.0, 0.0, -1.0))),
    ("three-quarter", Vector((0.82, -0.82, 0.48))),
)


def free_gib() -> float:
    """Read host-available RAM without loading the source mesh."""
    class Status(ctypes.Structure):
        _fields_ = [("length", ctypes.c_ulong), ("load", ctypes.c_ulong)] + [
            (name, ctypes.c_ulonglong)
            for name in ("total", "available", "page_total", "page_available", "virtual_total", "virtual_available", "extended")
        ]

    status = Status()
    status.length = ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise RuntimeError("RAM measurement unavailable")
    return status.available / 2**30


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def require_absolute(path: Path, label: str) -> Path:
    if not path.is_absolute():
        raise ValueError(f"{label} must be absolute: {path}")
    return path.resolve()


def load_json(path: Path, label: str) -> dict:
    if not path.is_file():
        raise ValueError(f"Missing Lantern {label}: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Lantern {label} must be a JSON object")
    return payload


def assert_lantern_contract(source: Path) -> tuple[dict, dict]:
    """Pin the PLY to its one approved Lantern run before importing Blender."""
    receipt_path = source.with_name("geometry-ply-receipt.json")
    plan_path = source.with_name("plan.json")
    receipt = load_json(receipt_path, "geometry receipt")
    plan = load_json(plan_path, "run plan")
    requested = plan.get("requested_run")
    contract = plan.get("geometry_only_contract")
    if not isinstance(requested, dict) or not isinstance(contract, dict):
        raise ValueError("Lantern plan lacks requested_run or geometry_only_contract")
    expected_plan = {
        "profile": LANTERN_PROFILE,
    }
    for key, expected in expected_plan.items():
        if plan.get(key) != expected:
            raise ValueError(f"Lantern plan {key} is not pinned to the approved profile")
    for key, expected in {
        "mode": LANTERN_MODE,
        "input_sha256": LANTERN_INPUT_SHA256,
        "max_decoded_faces": LANTERN_FACE_LIMIT,
    }.items():
        if requested.get(key) != expected:
            raise ValueError(f"Lantern requested_run {key} is not pinned")
    if contract.get("allowed_input_sha256") != LANTERN_INPUT_SHA256:
        raise ValueError("Lantern geometry contract input hash differs from the approved reference")
    for key, expected in {
        "profile": LANTERN_PROFILE,
        "mode": LANTERN_MODE,
        "face_limit": LANTERN_FACE_LIMIT,
    }.items():
        if receipt.get(key) != expected:
            raise ValueError(f"Lantern receipt {key} is not pinned")
    if receipt.get("input_sha256_verified") != LANTERN_INPUT_SHA256:
        raise ValueError("Lantern receipt does not retain the reverified approved input hash")
    # Blender mesh coordinates are float32.  Treating an accepted float64 PLY
    # as exact would silently narrow it during import, so reject it before a
    # scene exists instead of making an unsupported precision claim.
    if receipt.get("scalar") != "float32":
        raise ValueError("Lantern inspector accepts float32 XYZ only; float64 PLY is rejected before Blender import")
    if receipt.get("sha256") != sha256_file(source):
        raise ValueError("Raw Lantern PLY hash differs from its generation receipt")
    if not isinstance(receipt.get("vertex_count"), int) or receipt["vertex_count"] <= 0:
        raise ValueError("Lantern receipt has no positive vertex count")
    if not isinstance(receipt.get("face_count"), int) or not 0 < receipt["face_count"] <= LANTERN_FACE_LIMIT:
        raise ValueError("Lantern receipt face count exceeds its approved cap")
    if receipt.get("decoded_vertices") != receipt["vertex_count"] or receipt.get("decoded_faces") != receipt["face_count"]:
        raise ValueError("Lantern decoded and written counts disagree")
    required_forbidden = {"o_voxel", "CuMesh", "BVH", "UV", "bake", "simplification", "GLB export"}
    if not required_forbidden.issubset(set(receipt.get("operations_not_invoked", []))):
        raise ValueError("Lantern receipt does not prove its geometry-only boundary")
    return receipt, plan


def load_module(filename: str, name: str):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {filename}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def parse_arguments() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    return parser.parse_args(values)


def assert_exact_import(source: Path, receipt: dict, ply_format) -> tuple[bpy.types.Object, np.ndarray, dict]:
    checked = ply_format.validate_binary_ply(
        source,
        expected_vertex_count=receipt["vertex_count"],
        expected_face_count=receipt["face_count"],
        expected_scalar=receipt["scalar"],
    )
    if checked["sha256"] != receipt["sha256"] or checked["bytes"] != receipt["bytes"]:
        raise RuntimeError("PLY validation differs from Lantern receipt")
    if checked["face_count"] != receipt["decoded_faces"] or checked["vertex_count"] != receipt["decoded_vertices"]:
        raise RuntimeError("PLY binary counts differ from decoded Lantern receipt")

    bpy.ops.wm.ply_import(
        filepath=str(source), forward_axis="Y", up_axis="Z", global_scale=1.0,
        merge_verts=False, import_attributes=False,
    )
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(objects) != 1:
        raise RuntimeError("Raw Lantern PLY must import as exactly one mesh")
    obj = objects[0]
    mesh = obj.data
    if obj.matrix_world != Matrix.Identity(4):
        raise RuntimeError("PLY importer changed the source object transform")
    if len(mesh.vertices) != checked["vertex_count"] or len(mesh.polygons) != checked["face_count"]:
        raise RuntimeError("Blender import changed Lantern mesh counts")
    if any(len(polygon.vertices) != 3 for polygon in mesh.polygons):
        raise RuntimeError("Raw Lantern PLY contains a nontriangle after import")
    positions = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    mesh.vertices.foreach_get("co", positions)
    if not np.isfinite(positions).all():
        raise RuntimeError("Raw Lantern PLY imported nonfinite coordinates")
    scalar = "<f4" if checked["scalar"] == "float32" else "<f8"
    with source.open("rb") as stream:
        stream.seek(checked["header_bytes"])
        source_positions = np.frombuffer(
            stream.read(checked["vertex_count"] * 3 * np.dtype(scalar).itemsize), dtype=scalar,
        )
        face_dtype = np.dtype([("arity", "u1"), ("indices", "<u4", (3,))])
        face_records = np.frombuffer(stream.read(checked["face_count"] * face_dtype.itemsize), dtype=face_dtype)
    if not np.array_equal(positions, source_positions.astype(np.float32)):
        raise RuntimeError("Blender import changed raw Lantern XYZ coordinates")
    imported_indices = np.empty(len(mesh.loops), dtype=np.uint32)
    mesh.loops.foreach_get("vertex_index", imported_indices)
    if not np.array_equal(imported_indices, face_records["indices"].reshape(-1)):
        raise RuntimeError("Blender import changed raw Lantern triangle indices or ordering")
    return obj, positions, checked


def add_neutral_material(obj: bpy.types.Object) -> None:
    """A display-only slot; it does not alter mesh coordinates or topology."""
    material = bpy.data.materials.new("Neutral raw PLY inspection")
    material.diffuse_color = (0.46, 0.46, 0.46, 1.0)
    material.use_nodes = True
    node = material.node_tree.nodes.get("Principled BSDF") if material.node_tree else None
    if node:
        node.inputs["Base Color"].default_value = (0.18, 0.18, 0.18, 1.0)
        node.inputs["Roughness"].default_value = 0.92
        node.inputs["Metallic"].default_value = 0.0
    obj.data.materials.append(material)


def configure_scene(review, objects: list[bpy.types.Object], resolution: int):
    minimum, maximum = review.scene_bounds(objects)
    camera, target, largest = review.configure_studio(minimum, maximum, resolution)
    floor = bpy.data.objects.get("Matte Studio Floor")
    if floor is None:
        raise RuntimeError("Neutral studio setup did not create its review floor")
    return minimum, maximum, camera, target, largest, floor


def render_all_views(output: Path, camera: bpy.types.Object, target: Vector, largest: float, floor: bpy.types.Object) -> list[str]:
    """Render identical raw geometry from every required neutral direction."""
    scene = bpy.context.scene
    rendered: list[str] = []
    radius = largest * 2.8
    for resolution in RENDER_SIZES:
        scene.render.resolution_x = resolution
        scene.render.resolution_y = resolution
        for label, direction in VIEW_DIRECTIONS:
            # The normal neutral floor is useful for every above/side frame but
            # would physically hide the source mesh in the required underside
            # check.  It is presentation-only and restored immediately.
            floor.hide_render = label == "underside"
            camera.location = target + direction.normalized() * radius
            camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
            destination = output / f"{label}-{resolution}.png"
            scene.render.filepath = str(destination.resolve())
            bpy.ops.render.render(write_still=True)
            if not destination.is_file() or destination.stat().st_size == 0:
                raise RuntimeError(f"Blender did not write required render {destination}")
            rendered.append(destination.name)
    floor.hide_render = False
    return rendered


def main() -> None:
    args = parse_arguments()
    source = require_absolute(args.input, "input")
    output = require_absolute(args.output_dir, "output-dir")
    if source.suffix.lower() != ".ply" or not source.is_file():
        raise ValueError("--input must name an existing raw .ply")
    if output.exists():
        raise ValueError(f"--output-dir must be a fresh, nonexistent directory: {output}")
    if free_gib() < MINIMUM_FREE_GIB:
        raise RuntimeError(f"Lantern inspection requires {MINIMUM_FREE_GIB:g}GiB free before import")
    receipt, plan = assert_lantern_contract(source)
    output.mkdir(parents=True, exist_ok=False)
    stop = threading.Event()
    samples: list[float] = []

    def watchdog() -> None:
        while not stop.is_set():
            available = free_gib()
            samples.append(available)
            if available < RESERVE_FREE_GIB:
                (output / "reserve-breach.json").write_text(
                    json.dumps({"free_gib": available, "pid": os.getpid(), "reserve_gib": RESERVE_FREE_GIB}, indent=2) + "\n",
                    encoding="utf-8",
                )
                os._exit(77)
            stop.wait(0.5)

    threading.Thread(target=watchdog, daemon=True).start()
    started = time.monotonic()
    try:
        review = load_module("inspect-generated-glb.py", "lantern_review")
        ply_format = load_module("trellis_geometry_ply.py", "lantern_ply_format")
        review.clear_scene()
        obj, positions, checked = assert_exact_import(source, receipt, ply_format)
        add_neutral_material(obj)
        minimum, maximum, camera, target, largest, floor = configure_scene(review, [obj], 512)
        renders = render_all_views(output, camera, target, largest, floor)
        bpy.ops.wm.save_as_mainfile(filepath=str((output / "inspection.blend").resolve()))
        record = {
            "status": "neutral exact raw Lantern geometry inspection; not a runtime asset or derivative",
            "source": str(source),
            "source_sha256": sha256_file(source),
            "source_receipt_sha256": sha256_file(source.with_name("geometry-ply-receipt.json")),
            "source_plan_sha256": sha256_file(source.with_name("plan.json")),
            "profile": LANTERN_PROFILE,
            "mode": LANTERN_MODE,
            "pinned_input_sha256": LANTERN_INPUT_SHA256,
            "face_limit": LANTERN_FACE_LIMIT,
            "vertices": len(obj.data.vertices),
            "triangles": len(obj.data.polygons),
            "receipt_vertex_count": receipt["vertex_count"],
            "receipt_face_count": receipt["face_count"],
            "binary_bytes": checked["bytes"],
            "bounds": {"min": list(minimum), "max": list(maximum)},
            "axes": "Imported Blender XYZ and triangle order exactly match raw PLY; no transform, normalization, welding, normal recalculation, reduction, or export.",
            "float64_policy": "Rejected before import because Blender mesh coordinates are float32; this inspection makes no float64-preservation claim.",
            "underside_floor_policy": "The neutral floor is hidden only for underside renders so it cannot occlude raw geometry; it is restored afterward.",
            "source_schema_counts_indices_verified": True,
            "imported_xyz_float32_sha256": hashlib.sha256(positions.tobytes()).hexdigest(),
            "renders": renders,
            "render_directions": [label for label, _ in VIEW_DIRECTIONS],
            "render_sizes": list(RENDER_SIZES),
            "min_sampled_host_free_gib": min(samples) if samples else free_gib(),
            "elapsed_seconds": time.monotonic() - started,
        }
        (output / "inspection.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(record), flush=True)
    finally:
        stop.set()


if __name__ == "__main__":
    main()
