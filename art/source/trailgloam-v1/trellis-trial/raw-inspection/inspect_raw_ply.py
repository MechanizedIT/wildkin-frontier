"""Exact neutral inspection of a Trailgloam geometry-only raw PLY.

This is deliberately an inspection, not cleanup. It validates the binary PLY
against its generation receipt, imports it without merging or transforms,
compares every float32 XYZ and triangle loop order, renders seven neutral
orthographic directions at 512/96/48, and saves an editable review blend.

Run only after the serial TRELLIS parent and children have exited:
  blender -b --factory-startup --python-exit-code 1 --python inspect_raw_ply.py -- \
    --input C:\\absolute\\raw-geometry.ply \
    --receipt C:\\absolute\\geometry-ply-receipt.json \
    --output-dir C:\\absolute\\fresh-inspection
"""
from __future__ import annotations

import argparse
import ctypes
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import threading
import time

import bpy
from mathutils import Matrix, Vector
import numpy as np

MINIMUM_FREE_GIB = 8.0
RESERVE_FREE_GIB = 6.0
TRAILGLOAM_PROFILE = "fresh-process-per-stage-512-trailgloam-geometry-ply-v1"
TRAILGLOAM_MODE = "trailgloam-geometry-ply-v1"
TRAILGLOAM_INPUT_SHA256 = "417daef7277d21dd3c5f53abc92fe4e63f11f575cf04a7e9cca7bae3d2afc2ff"
TRAILGLOAM_FACE_LIMIT = 1_900_000
COMPONENT_FACE_THRESHOLD = 250_000
RENDER_SIZES = (512, 96, 48)
VIEW_DIRECTIONS = (
    ("front", Vector((0.0, -1.0, 0.16))),
    ("rear", Vector((0.0, 1.0, 0.16))),
    ("left", Vector((-1.0, 0.0, 0.16))),
    ("right", Vector((1.0, 0.0, 0.16))),
    ("top", Vector((0.0, 0.0, 1.0))),
    ("underside", Vector((0.0, 0.0, -1.0))),
    ("three-quarter", Vector((0.78, -0.78, 0.42))),
)

HERE = Path(__file__).resolve().parent


def repository_root() -> Path:
    for candidate in HERE.parents:
        if (candidate / "tools" / "art" / "trellis_geometry_ply.py").is_file():
            return candidate
    raise RuntimeError("Unable to locate repository helper directory")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def free_gib() -> float:
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


def module_from(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load helper {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--receipt", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    return parser.parse_args(values)


def require_absolute_existing(path: Path, label: str) -> Path:
    if not path.is_absolute() or not path.is_file():
        raise ValueError(f"{label} must be an existing absolute file: {path}")
    return path.resolve()


def read_receipt(path: Path, source: Path) -> dict:
    receipt = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(receipt, dict):
        raise ValueError("generation receipt must be a JSON object")
    for key in ("sha256", "vertex_count", "face_count", "scalar", "profile", "mode", "input_sha256_verified", "face_limit"):
        if key not in receipt:
            raise ValueError(f"generation receipt lacks {key}")
    if receipt["profile"] != TRAILGLOAM_PROFILE or receipt["mode"] != TRAILGLOAM_MODE:
        raise ValueError("generation receipt is not the Trailgloam geometry-only profile")
    if receipt["input_sha256_verified"] != TRAILGLOAM_INPUT_SHA256:
        raise ValueError("generation receipt input does not match the reviewed Trailgloam target")
    if receipt["face_limit"] != TRAILGLOAM_FACE_LIMIT:
        raise ValueError("generation receipt face limit differs from the fixed Trailgloam profile")
    if receipt["scalar"] != "float32":
        raise ValueError("raw inspection accepts float32 XYZ only; it will not make a float64-preservation claim")
    if not isinstance(receipt["vertex_count"], int) or receipt["vertex_count"] <= 0:
        raise ValueError("generation receipt has no positive vertex count")
    if not isinstance(receipt["face_count"], int) or not 0 < receipt["face_count"] <= TRAILGLOAM_FACE_LIMIT:
        raise ValueError("generation receipt face count is outside the fixed Trailgloam profile cap")
    if receipt.get("decoded_vertices") != receipt["vertex_count"] or receipt.get("decoded_faces") != receipt["face_count"]:
        raise ValueError("generation receipt decoded and written geometry counts disagree")
    actual = sha256_file(source)
    if receipt["sha256"] != actual:
        raise ValueError("raw PLY hash differs from the supplied generation receipt")
    return receipt


def exact_import(source: Path, receipt: dict, ply_format):
    checked = ply_format.validate_binary_ply(
        source,
        expected_vertex_count=receipt["vertex_count"],
        expected_face_count=receipt["face_count"],
        expected_scalar=receipt["scalar"],
    )
    if checked["sha256"] != receipt["sha256"]:
        raise RuntimeError("binary PLY validator hash differs from generation receipt")
    bpy.ops.wm.ply_import(
        filepath=str(source), forward_axis="Y", up_axis="Z", global_scale=1.0,
        merge_verts=False, import_attributes=False,
    )
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError("exact raw PLY inspection requires one imported mesh")
    obj = meshes[0]
    if obj.matrix_world != Matrix.Identity(4):
        raise RuntimeError("PLY importer changed raw object transform")
    mesh = obj.data
    if len(mesh.vertices) != receipt["vertex_count"] or len(mesh.polygons) != receipt["face_count"]:
        raise RuntimeError("Blender PLY import changed raw counts")
    loop_totals = np.empty(len(mesh.polygons), dtype=np.int32)
    mesh.polygons.foreach_get("loop_total", loop_totals)
    if not np.all(loop_totals == 3):
        raise RuntimeError("raw PLY imported a non-triangle")
    positions = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    mesh.vertices.foreach_get("co", positions)
    if not np.isfinite(positions).all():
        raise RuntimeError("raw PLY has nonfinite imported XYZ")
    with source.open("rb") as stream:
        stream.seek(checked["header_bytes"])
        raw_positions = np.frombuffer(stream.read(receipt["vertex_count"] * 12), dtype="<f4")
        face_dtype = np.dtype([("arity", "u1"), ("indices", "<u4", (3,))])
        raw_faces = np.frombuffer(stream.read(receipt["face_count"] * face_dtype.itemsize), dtype=face_dtype)
    if not np.array_equal(positions, raw_positions):
        raise RuntimeError("Blender import changed raw float32 XYZ")
    loops = np.empty(len(mesh.loops), dtype=np.uint32)
    mesh.loops.foreach_get("vertex_index", loops)
    raw_indices = raw_faces["indices"].reshape(-1)
    if not np.array_equal(loops, raw_indices):
        raise RuntimeError("Blender import changed raw triangle indices/order")
    return obj, positions, raw_faces["indices"].copy(), checked


def raw_diagnostics(indices: np.ndarray, vertex_count: int) -> dict:
    """Vectorized raw edge facts; component count is deliberately bounded."""
    edges = np.concatenate((indices[:, (0, 1)], indices[:, (1, 2)], indices[:, (2, 0)]), axis=0)
    low = np.minimum(edges[:, 0], edges[:, 1]).astype(np.uint64)
    high = np.maximum(edges[:, 0], edges[:, 1]).astype(np.uint64)
    keys = np.sort(low | (high << np.uint64(32)))
    starts = np.r_[True, keys[1:] != keys[:-1]]
    offsets = np.flatnonzero(starts)
    counts = np.diff(np.r_[offsets, len(keys)])
    diagnostic = {
        "method": "vectorized exact imported triangle-index edge counts",
        "unique_undirected_edges": int(len(counts)),
        "boundary_edges": int(np.count_nonzero(counts == 1)),
        "two_use_edges": int(np.count_nonzero(counts == 2)),
        "nonmanifold_edges": int(np.count_nonzero(counts > 2)),
        "component_face_threshold": COMPONENT_FACE_THRESHOLD,
        "note": "Raw topology facts are diagnostic only. They neither discard this retained master nor authorize cleanup.",
    }
    if len(indices) > COMPONENT_FACE_THRESHOLD:
        diagnostic.update({
            "connected_components": "not_computed",
            "component_status": "bounded: exact Python union-find is intentionally skipped above the face threshold",
        })
        return diagnostic
    parent = np.arange(vertex_count, dtype=np.int32)

    def find(value: int) -> int:
        while parent[value] != value:
            parent[value] = parent[parent[value]]
            value = int(parent[value])
        return value

    for a, b, c in indices:
        root_a, root_b, root_c = find(int(a)), find(int(b)), find(int(c))
        if root_a != root_b:
            parent[root_b] = root_a
        root_a, root_c = find(root_a), find(int(c))
        if root_a != root_c:
            parent[root_c] = root_a
    roots = np.fromiter((find(index) for index in range(vertex_count)), dtype=np.int32, count=vertex_count)
    diagnostic.update({"connected_components": int(len(np.unique(roots))), "component_status": "exact below bounded face threshold"})
    return diagnostic


def add_teal_clay(obj) -> None:
    material = bpy.data.materials.new("Trailgloam raw inspection teal clay")
    material.use_nodes = True
    material.diffuse_color = (0.10, 0.31, 0.32, 1.0)
    node = material.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (0.055, 0.16, 0.17, 1.0)
    node.inputs["Roughness"].default_value = 0.93
    node.inputs["Metallic"].default_value = 0.0
    obj.data.materials.append(material)
    flat = np.zeros(len(obj.data.polygons), dtype=np.bool_)
    obj.data.polygons.foreach_set("use_smooth", flat)


def render_views(output: Path, review, obj) -> tuple[dict, list[str]]:
    minimum, maximum = review.scene_bounds([obj])
    camera, target, largest = review.configure_studio(minimum, maximum, 512)
    floor = bpy.data.objects.get("Matte Studio Floor")
    if floor is None:
        raise RuntimeError("neutral studio floor was not created")
    scene = bpy.context.scene
    rendered = []
    for size in RENDER_SIZES:
        scene.render.resolution_x = size
        scene.render.resolution_y = size
        scene.render.resolution_percentage = 100
        for label, direction in VIEW_DIRECTIONS:
            floor.hide_render = label == "underside"
            camera.location = target + direction.normalized() * largest * 2.8
            camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
            destination = (output / f"{label}-{size}.png").resolve()
            scene.render.filepath = str(destination)
            bpy.ops.render.render(write_still=True)
            if not destination.is_file() or destination.stat().st_size == 0:
                raise RuntimeError(f"missing required render {destination}")
            rendered.append(destination.name)
    floor.hide_render = False
    return {"min": list(minimum), "max": list(maximum)}, rendered


def main() -> None:
    args = parse_args()
    source = require_absolute_existing(args.input, "input")
    receipt_path = require_absolute_existing(args.receipt, "receipt")
    if source.suffix.lower() != ".ply":
        raise ValueError("--input must be a .ply")
    if not args.output_dir.is_absolute() or args.output_dir.exists():
        raise ValueError("--output-dir must be an absolute, fresh nonexistent directory")
    output = args.output_dir.resolve()
    if free_gib() < MINIMUM_FREE_GIB:
        raise RuntimeError(f"requires {MINIMUM_FREE_GIB:g}GiB host RAM before raw import")
    receipt = read_receipt(receipt_path, source)
    root = repository_root()
    ply_format = module_from(root / "tools" / "art" / "trellis_geometry_ply.py", "trailgloam_ply_format")
    review = module_from(root / "tools" / "art" / "inspect-generated-glb.py", "trailgloam_review_studio")
    output.mkdir(parents=True, exist_ok=False)
    stop = threading.Event()
    samples: list[float] = []

    def watchdog() -> None:
        while not stop.is_set():
            available = free_gib()
            samples.append(available)
            if available < RESERVE_FREE_GIB:
                (output / "reserve-breach.json").write_text(json.dumps({"free_gib": available, "reserve_gib": RESERVE_FREE_GIB, "pid": os.getpid()}, indent=2) + "\n", encoding="utf-8")
                os._exit(77)
            stop.wait(0.5)

    threading.Thread(target=watchdog, daemon=True).start()
    started = time.monotonic()
    try:
        review.clear_scene()
        obj, positions, indices, checked = exact_import(source, receipt, ply_format)
        diagnostics = raw_diagnostics(indices, len(obj.data.vertices))
        add_teal_clay(obj)
        bounds, renders = render_views(output, review, obj)
        blend = (output / "trailgloam-raw-inspection.blend").resolve()
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        record = {
            "status": "neutral exact raw Trailgloam geometry-only inspection; retained master, not runtime asset or derivative",
            "source": str(source),
            "source_sha256": sha256_file(source),
            "profile": TRAILGLOAM_PROFILE,
            "mode": TRAILGLOAM_MODE,
            "pinned_input_sha256": TRAILGLOAM_INPUT_SHA256,
            "face_limit": TRAILGLOAM_FACE_LIMIT,
            "generation_receipt": str(receipt_path),
            "generation_receipt_sha256": sha256_file(receipt_path),
            "vertices": len(obj.data.vertices),
            "triangles": len(obj.data.polygons),
            "bounds": bounds,
            "raw_mesh_diagnostics": diagnostics,
            "exact_import": {
                "float32_xyz_exact": True,
                "triangle_indices_and_order_exact": True,
                "object_transform_identity": True,
                "normal_recalculation": False,
                "welding": False,
                "normalization": False,
                "reduction": False,
                "export": False,
                "imported_xyz_sha256": hashlib.sha256(positions.tobytes()).hexdigest(),
                "validated_binary_bytes": checked["bytes"],
            },
            "presentation": "display-only neutral teal clay; raw coordinates and indices unchanged; underside hides studio floor only",
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