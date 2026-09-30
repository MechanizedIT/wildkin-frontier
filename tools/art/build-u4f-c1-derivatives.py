"""Build the two bounded U4F-C1 mesh derivatives in Blender 4.5.3.

Stages are intentionally separated. ``construct`` creates a fresh cleaned
working solid and matched pre-reduction evidence. Review that solid before
running ``derive``. Neither stage writes the raw PLY or reference.
"""
from __future__ import annotations

import argparse
import bmesh
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
from mathutils.bvhtree import BVHTree
import numpy as np


REPO = Path(__file__).resolve().parents[2]
CONFIG_PATH = REPO / "art/source/u4f-rock-002/cleanup/c1/cleanup-config.json"
RAW_PATH = REPO / "art/source/u4f-rock-002/raw/staged512-geometry-r1/raw-geometry.ply"
REFERENCE_PATH = REPO / "art/source/u4f-rock-002/reference/candidate-04.png"
WORK_BLEND = REPO / "art/source/u4f-rock-002/cleanup/c1/working/c1-working-solid.blend"
FINAL_BLEND = REPO / "art/source/u4f-rock-002/cleanup/c1/u4f-c1-derivatives.blend"
EVIDENCE = REPO / "native/evidence/unity/u4f-c1-cleanup"
EXPECTED_VERSION = "4.5.3 LTS"
RESERVE_GIB = 6.0
MIN_START_GIB = 8.0
SAMPLE_COUNT = 8192
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


def free_gib() -> float:
    class Status(ctypes.Structure):
        _fields_ = [("length", ctypes.c_ulong), ("load", ctypes.c_ulong)] + [
            (name, ctypes.c_ulonglong) for name in ("total", "available", "page_total", "page_available", "virtual_total", "virtual_available", "extended")
        ]
    status = Status()
    status.length = ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise RuntimeError("host memory measurement is unavailable")
    return status.available / 2**30


def load_module(filename: str, name: str):
    path = Path(__file__).with_name(filename)
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import helper: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def load_config() -> tuple[dict, str]:
    config_bytes = CONFIG_PATH.read_bytes()
    config = json.loads(config_bytes.decode("utf-8"))
    if config.get("schema") != "wildkin-u4f-c1-cleanup-v1":
        raise ValueError("unexpected cleanup config schema")
    if bpy.app.version_string != EXPECTED_VERSION:
        raise ValueError(f"Blender {EXPECTED_VERSION} required, got {bpy.app.version_string}")
    if sha256_file(RAW_PATH) != config["inputs"]["rawMaster"]["sha256"]:
        raise ValueError("immutable raw PLY hash differs from cleanup config")
    if sha256_file(REFERENCE_PATH) != config["inputs"]["reference"]["sha256"]:
        raise ValueError("owner-approved reference hash differs from cleanup config")
    return config, hashlib.sha256(config_bytes).hexdigest()


def configure_reserve_watch(output_dir: Path):
    stop = threading.Event()
    samples = [free_gib()]
    if samples[0] < MIN_START_GIB:
        raise RuntimeError(f"cleanup requires {MIN_START_GIB:g} GiB free RAM, found {samples[0]:.2f}")

    def watchdog() -> None:
        while not stop.is_set():
            available = free_gib()
            samples.append(available)
            if available < RESERVE_GIB:
                output_dir.mkdir(parents=True, exist_ok=True)
                (output_dir / "reserve-breach.json").write_text(json.dumps({
                    "freeGiB": available, "reserveGiB": RESERVE_GIB, "pid": os.getpid(),
                }, indent=2) + "\n", encoding="utf-8")
                os._exit(77)
            stop.wait(0.5)

    threading.Thread(target=watchdog, daemon=True).start()
    return stop, samples


def add_review_material(obj: bpy.types.Object, name: str = "U4F-C1 neutral matte") -> bpy.types.Material:
    material = bpy.data.materials.get(name)
    if material is None:
        material = bpy.data.materials.new(name)
        material.diffuse_color = (0.58, 0.57, 0.53, 1.0)
        material.use_nodes = True
        node = material.node_tree.nodes.get("Principled BSDF")
        if node:
            node.inputs["Base Color"].default_value = (0.34, 0.33, 0.30, 1.0)
            node.inputs["Roughness"].default_value = 0.92
            node.inputs["Metallic"].default_value = 0.0
            specular = node.inputs.get("Specular IOR Level")
            if specular:
                specular.default_value = 0.08
    obj.data.materials.clear()
    obj.data.materials.append(material)
    return material


def exact_raw_import():
    g1 = load_module("inspect-u4f-g1-geometry.py", "u4f_c1_g1_contract")
    receipt, _ = g1.validate_source_contract(RAW_PATH)
    importer = load_module("inspect-lantern-geometry.py", "u4f_c1_ply_import")
    ply_format = load_module("trellis_geometry_ply.py", "u4f_c1_ply_schema")
    checked = ply_format.validate_binary_ply(
        RAW_PATH,
        expected_vertex_count=receipt["vertex_count"],
        expected_face_count=receipt["face_count"],
        expected_scalar="float32",
    )
    if checked["sha256"] != receipt["sha256"] or checked["bytes"] != receipt["bytes"]:
        raise RuntimeError("raw PLY does not match its immutable G1 receipt")
    before = set(bpy.context.scene.objects)
    bpy.ops.wm.ply_import(
        filepath=str(RAW_PATH.resolve()), forward_axis="Y", up_axis="Z", global_scale=1.0,
        merge_verts=False, import_attributes=False,
    )
    imported = [obj for obj in bpy.context.scene.objects if obj not in before and obj.type == "MESH"]
    if len(imported) != 1:
        raise RuntimeError("raw PLY import did not create exactly one new mesh object")
    obj = imported[0]
    if obj.matrix_world != Matrix.Identity(4):
        raise RuntimeError("Blender changed raw source object transform")
    if len(obj.data.vertices) != checked["vertex_count"] or len(obj.data.polygons) != checked["face_count"]:
        raise RuntimeError("Blender changed raw source mesh counts")
    positions = np.empty(len(obj.data.vertices) * 3, dtype=np.float32)
    obj.data.vertices.foreach_get("co", positions)
    scalar = "<f4"
    face_dtype = np.dtype([("arity", "u1"), ("indices", "<u4", (3,))])
    with RAW_PATH.open("rb") as stream:
        stream.seek(checked["header_bytes"])
        source_positions = np.frombuffer(stream.read(checked["vertex_count"] * 3 * 4), dtype=scalar)
        face_records = np.frombuffer(stream.read(checked["face_count"] * face_dtype.itemsize), dtype=face_dtype)
    if not np.array_equal(positions, source_positions):
        raise RuntimeError("Blender changed exact float32 source positions")
    imported_indices = np.empty(len(obj.data.loops), dtype=np.uint32)
    obj.data.loops.foreach_get("vertex_index", imported_indices)
    if not np.array_equal(imported_indices, face_records["indices"].reshape(-1)):
        raise RuntimeError("Blender changed raw triangle indices or ordering")
    if len(obj.data.vertices) != 796_082 or len(obj.data.polygons) != 1_594_784:
        raise RuntimeError("exact raw PLY import counts differ from the frozen geometry contract")
    return obj, positions.reshape((-1, 3)), checked, importer


def remove_unused_vertices_from_copy(mesh: bpy.types.Mesh) -> int:
    before = len(mesh.vertices)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    loose = [vertex for vertex in bm.verts if not vertex.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    removed = before - len(mesh.vertices)
    if removed != 53 or len(mesh.polygons) != 1_594_784:
        raise RuntimeError(f"working-copy cleanup expected 53 loose points, removed {removed}")
    return removed


def radial_outline(positions: np.ndarray, config: dict) -> tuple[np.ndarray, tuple[float, float]]:
    settings = config["supportCore"]
    z_min = float(positions[:, 2].min())
    z_max = float(positions[:, 2].max())
    normalized = (positions[:, 2] - z_min) / (z_max - z_min)
    lo, hi = settings["outlineSampleNormalizedHeight"]
    sampled = positions[(normalized >= lo) & (normalized <= hi), :2].astype(np.float64)
    center = np.median(sampled, axis=0)
    delta = sampled - center
    angle = np.mod(np.arctan2(delta[:, 1], delta[:, 0]), math.tau)
    radius = np.hypot(delta[:, 0], delta[:, 1])
    sectors = int(settings["outlineSectors"])
    sector_id = np.floor(angle / math.tau * sectors).astype(np.int32) % sectors
    values = np.full(sectors, np.nan, dtype=np.float64)
    for sector in range(sectors):
        values_in_sector = radius[sector_id == sector]
        if len(values_in_sector):
            values[sector] = np.percentile(values_in_sector, 99.5)
    valid = np.flatnonzero(np.isfinite(values))
    if len(valid) < sectors // 2:
        raise RuntimeError("lower outline angular samples are too sparse for the support core")
    extended_x = np.r_[valid - sectors, valid, valid + sectors]
    extended_y = np.r_[values[valid], values[valid], values[valid]]
    values = np.interp(np.arange(sectors), extended_x, extended_y)
    values *= float(settings["outlineScaleMargin"])
    return values, (float(center[0]), float(center[1]))


def create_support_core(positions: np.ndarray, config: dict) -> bpy.types.Object:
    settings = config["supportCore"]
    source_z_min = float(positions[:, 2].min())
    source_z_max = float(positions[:, 2].max())
    source_height = source_z_max - source_z_min
    outline, center = radial_outline(positions, config)
    sectors = int(settings["meshSegments"])
    source_sectors = len(outline)
    sample_indices = (np.arange(sectors) * source_sectors // sectors).astype(np.int32)
    sector_radii = outline[sample_indices]
    amplitude = float(settings["angularRadiusVariationAmplitude"])
    height_amplitude = float(settings["angularHeightVariationNormalizedAmplitude"])
    seed = int(settings["deterministicSeed"])
    phase = (seed % 100_003) * 0.000127
    vertices: list[tuple[float, float, float]] = []
    ring_data = settings["ringsNormalizedHeightAndRadiusScale"]
    for ring_index, (height_norm, scale) in enumerate(ring_data):
        for i in range(sectors):
            theta = math.tau * i / sectors
            irregularity = (
                0.55 * math.sin(3.0 * theta + phase)
                + 0.30 * math.sin(7.0 * theta - 0.71 + phase * 0.37)
                + 0.15 * math.sin(11.0 * theta + 1.19 - phase * 0.21)
            )
            ring_phase = ring_index * 0.43
            r = sector_radii[i] * float(scale) * (1.0 + amplitude * irregularity)
            cx = center[0] + 0.009 * math.sin(ring_phase + 0.6)
            cy = center[1] + 0.008 * math.cos(ring_phase - 0.2)
            z_jitter = height_amplitude * (
                0.65 * math.sin(5.0 * theta + phase + ring_phase)
                + 0.35 * math.sin(9.0 * theta - phase * 0.4 - ring_phase)
            )
            z = source_z_min + (float(height_norm) + z_jitter) * source_height
            vertices.append((cx + r * math.cos(theta), cy + r * math.sin(theta), z))

    faces: list[tuple[int, ...]] = []
    ring_count = len(ring_data)
    bottom_pole = len(vertices)
    vertices.append((center[0] - 0.006, center[1] + 0.004,
                     source_z_min + (float(ring_data[0][0]) + 0.025) * source_height))
    top_pole = len(vertices)
    vertices.append((center[0] + 0.004, center[1] - 0.006,
                     source_z_min + (float(ring_data[-1][0]) + 0.025) * source_height))
    for i in range(sectors):
        nxt = (i + 1) % sectors
        # Reverse the bottom fan so its outside normal faces downward.
        faces.append((bottom_pole, nxt, i))
        last_start = (ring_count - 1) * sectors
        faces.append((last_start + i, last_start + nxt, top_pole))
    for ring_index in range(ring_count - 1):
        lower = ring_index * sectors
        upper = (ring_index + 1) * sectors
        for i in range(sectors):
            nxt = (i + 1) % sectors
            faces.append((lower + i, lower + nxt, upper + nxt, upper + i))

    mesh = bpy.data.meshes.new("C1 authored irregular support core")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("C1 authored irregular support core", mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def recalculate_outward_normals(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.data.update()


def triangles_and_positions(mesh: bpy.types.Mesh) -> tuple[np.ndarray, np.ndarray]:
    mesh.calc_loop_triangles()
    positions = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    mesh.vertices.foreach_get("co", positions)
    positions = positions.reshape((-1, 3))
    triangles = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int32)
    mesh.loop_triangles.foreach_get("vertices", triangles)
    return positions, triangles.reshape((-1, 3))


def edge_topology(triangles: np.ndarray, vertex_count: int) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    face_count = len(triangles)
    directed_edges = np.concatenate((triangles[:, (0, 1)], triangles[:, (1, 2)], triangles[:, (2, 0)]), axis=0)
    is_canonical_direction = directed_edges[:, 0] < directed_edges[:, 1]
    directed_edges.sort(axis=1)
    keys = directed_edges[:, 0].astype(np.uint64) * np.uint64(vertex_count) + directed_edges[:, 1].astype(np.uint64)
    del directed_edges
    order = np.argsort(keys)
    sorted_keys = keys[order]
    unique_keys, starts, counts = np.unique(sorted_keys, return_index=True, return_counts=True)
    del sorted_keys, keys
    direction_sorted = is_canonical_direction[order]
    base_face_ids = np.arange(face_count, dtype=np.int32)
    face_ids = np.concatenate((base_face_ids, base_face_ids, base_face_ids))[order]
    return unique_keys, starts, counts, np.column_stack((face_ids, direction_sorted.astype(np.int8)))


def count_face_components(face_count: int, starts: np.ndarray, counts: np.ndarray, edge_face_direction: np.ndarray) -> int:
    parent = list(range(face_count))
    rank = [0] * face_count

    def find(node: int) -> int:
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def union(left: int, right: int) -> None:
        a, b = find(left), find(right)
        if a == b:
            return
        if rank[a] < rank[b]:
            a, b = b, a
        parent[b] = a
        if rank[a] == rank[b]:
            rank[a] += 1

    for start, count in zip(starts, counts):
        if count > 1:
            first = int(edge_face_direction[start, 0])
            for offset in range(1, int(count)):
                union(first, int(edge_face_direction[start + offset, 0]))
    return len({find(face) for face in range(face_count)})


def mesh_metrics(obj: bpy.types.Object, *, include_components: bool = True) -> dict:
    positions, triangles = triangles_and_positions(obj.data)
    vertex_count = len(positions)
    face_count = len(triangles)
    repeated = (triangles[:, 0] == triangles[:, 1]) | (triangles[:, 1] == triangles[:, 2]) | (triangles[:, 2] == triangles[:, 0])
    finite_count = int(np.isfinite(positions).sum())
    areas_zero = 0
    signed_volume6 = 0.0
    for begin in range(0, face_count, 100_000):
        tri = triangles[begin:begin + 100_000]
        first = positions[tri[:, 0]].astype(np.float64)
        second = positions[tri[:, 1]].astype(np.float64)
        third = positions[tri[:, 2]].astype(np.float64)
        crosses = np.cross(second - first, third - first)
        areas_zero += int(np.count_nonzero(np.all(crosses == 0.0, axis=1)))
        signed_volume6 += float(np.einsum("ij,ij->i", first, np.cross(second, third)).sum())
    centroid = positions.mean(axis=0).astype(float).tolist()
    unique_keys, starts, counts, edge_face_direction = edge_topology(triangles, vertex_count)
    boundary = int(np.count_nonzero(counts == 1))
    nonmanifold = int(np.count_nonzero(counts > 2))
    orientation_conflicts = 0
    for start, count in zip(starts[counts == 2], counts[counts == 2]):
        directions = edge_face_direction[start:start + count, 1]
        if int(directions.sum()) != 1:
            orientation_conflicts += 1
    used_vertices = int(np.unique(triangles).size)
    components = count_face_components(face_count, starts, counts, edge_face_direction) if include_components else None
    del positions, triangles, unique_keys, edge_face_direction
    return {
        "vertices": vertex_count,
        "triangles": face_count,
        "bounds": None,
        "centroid": centroid,
        "boundaryEdges": boundary,
        "nonmanifoldEdges": nonmanifold,
        "faceBearingComponents": components,
        "unusedVertices": vertex_count - used_vertices,
        "repeatedIndexFaces": int(np.count_nonzero(repeated)),
        "zeroAreaTriangles": areas_zero,
        "nonfinitePositionScalars": int(vertex_count * 3 - finite_count),
        "signedVolume": signed_volume6 / 6.0,
        "orientationConflictEdges": orientation_conflicts,
        "orientedConsistently": orientation_conflicts == 0,
    }


def world_bounds(obj: bpy.types.Object) -> dict:
    coords = np.empty(len(obj.data.vertices) * 3, dtype=np.float32)
    obj.data.vertices.foreach_get("co", coords)
    coords = coords.reshape((-1, 3))
    return {"min": coords.min(axis=0).astype(float).tolist(), "max": coords.max(axis=0).astype(float).tolist()}


def decimate_to_guidance(obj: bpy.types.Object, ceiling: int) -> dict:
    before = len(obj.data.polygons)
    if before <= ceiling:
        return {"used": False, "beforeTriangles": before, "afterTriangles": before, "ratio": 1.0}
    ratio = min(1.0, ceiling / float(before))
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new("C1 silhouette-preserving collapse reduction", "DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.update()
    after = len(obj.data.polygons)
    return {"used": True, "beforeTriangles": before, "afterTriangles": after, "ratio": ratio, "mode": "collapse"}


def duplicate_mesh_object(source: bpy.types.Object, name: str) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, source.data.copy())
    obj.matrix_world = source.matrix_world.copy()
    bpy.context.collection.objects.link(obj)
    return obj


def remesh_voxel(obj: bpy.types.Object, voxel_size: float) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    obj.data.remesh_mode = "VOXEL"
    obj.data.remesh_voxel_size = voxel_size
    obj.data.remesh_voxel_adaptivity = 0.0
    obj.data.use_remesh_fix_poles = False
    obj.data.use_remesh_preserve_volume = True
    obj.data.use_remesh_preserve_attributes = False
    bpy.ops.object.voxel_remesh()
    obj.data.update()


def neutral_scene_and_camera(raw_obj: bpy.types.Object, objects: list[bpy.types.Object], resolution: int):
    render = load_module("inspect-generated-glb.py", "u4f_c1_studio_helpers")
    minimum, maximum = render.scene_bounds([raw_obj])
    camera, target, largest = render.configure_studio(minimum, maximum, resolution)
    camera.data.clip_end = 100.0
    for obj in objects:
        add_review_material(obj)
    floor = bpy.data.objects.get("Matte Studio Floor")
    scene = bpy.context.scene
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.view_settings.look = "AgX - Medium High Contrast"
    return camera, target, largest, floor, scene


def render_objects(objects_by_label: dict[str, bpy.types.Object], capture_dir: Path, *, pre_reduction: bool) -> list[str]:
    capture_dir.mkdir(parents=True, exist_ok=True)
    raw_obj = objects_by_label["raw"]
    included = set(objects_by_label.values())
    for obj in bpy.context.scene.objects:
        if obj not in included:
            obj.hide_render = True
    camera, target, largest, floor, scene = neutral_scene_and_camera(raw_obj, list(objects_by_label.values()), 512)
    capture_names: list[str] = []
    for view, direction in VIEW_DIRECTIONS:
        floor.hide_render = True
        camera.location = target + direction.normalized() * largest * 2.8
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        for label, obj in objects_by_label.items():
            obj.hide_render = False
            for other_label, other in objects_by_label.items():
                if other_label != label:
                    other.hide_render = True
            scene.render.filepath = str((capture_dir / f"{label}-{view}.png").resolve())
            bpy.ops.render.render(write_still=True)
            capture_names.append(f"{label}-{view}.png")
    for obj in objects_by_label.values():
        obj.hide_render = False
    floor.hide_render = False
    return capture_names


def ensure_open_mainfile(path: Path) -> None:
    if not path.is_file():
        raise ValueError(f"missing reviewed working-solid Blender file: {path}")


def construct(config: dict, config_hash: str, free_samples: list[float]) -> None:
    capture_dir = EVIDENCE / "captures/pre-reduction"
    metrics_path = EVIDENCE / "metrics/working-solid.json"
    if WORK_BLEND.exists() or metrics_path.exists() or capture_dir.exists():
        raise ValueError("construct stage outputs already exist; refusing to overwrite")
    WORK_BLEND.parent.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    load_module("inspect-generated-glb.py", "u4f_c1_construct_scene_cleanup").clear_scene()
    raw_obj, positions, checked, _ = exact_raw_import()
    raw_obj.name = "C1 raw source for matched review"
    working = duplicate_mesh_object(raw_obj, "C1 Working Copy Before Closure")
    removed_loose = remove_unused_vertices_from_copy(working.data)
    core = create_support_core(positions, config)
    bpy.ops.object.select_all(action="DESELECT")
    working.select_set(True)
    core.select_set(True)
    bpy.context.view_layer.objects.active = working
    bpy.ops.object.join()
    working.name = "C1 Closed Working Solid"
    voxel_size = float(config["pristineRender"]["voxelRemeshSize"])
    remesh_voxel(working, voxel_size)
    recalculate_outward_normals(working)
    working_metrics = mesh_metrics(working, include_components=True)
    working_metrics["bounds"] = world_bounds(working)
    topology_pass = (
        working_metrics["boundaryEdges"] == 0
        and working_metrics["nonmanifoldEdges"] == 0
        and working_metrics["faceBearingComponents"] == 1
        and working_metrics["unusedVertices"] == 0
        and working_metrics["repeatedIndexFaces"] == 0
        and working_metrics["zeroAreaTriangles"] == 0
        and working_metrics["nonfinitePositionScalars"] == 0
        and working_metrics["orientationConflictEdges"] == 0
        and abs(working_metrics["signedVolume"]) > 1e-9
    )
    capture_names = render_objects({"raw": raw_obj, "working": working}, capture_dir, pre_reduction=True)
    bpy.data.objects.remove(raw_obj, do_unlink=True)
    bpy.context.scene.camera = None
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or obj != working:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT")
    working.select_set(True)
    bpy.context.view_layer.objects.active = working
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK_BLEND.resolve()))
    metrics = {
        "status": "high-resolution working solid built; awaiting pre-reduction independent visual review",
        "blenderVersion": bpy.app.version_string,
        "rawSha256": config["inputs"]["rawMaster"]["sha256"],
        "referenceSha256": config["inputs"]["reference"]["sha256"],
        "configSha256": config_hash,
        "workingBlendPath": str(WORK_BLEND.relative_to(REPO)).replace("\\", "/"),
        "workingBlendSha256": sha256_file(WORK_BLEND),
        "rawVertices": 796082,
        "rawTriangles": 1594784,
        "unusedVerticesRemovedFromCopy": removed_loose,
        "copyAfterLooseRemovalVertices": 796029,
        "coordinateFrame": {"upAxis": "+Z", "sourceTransform": "identity", "scale": "source units unchanged"},
        "supportCore": config["supportCore"],
        "voxelRemeshSize": voxel_size,
        "workingSolid": working_metrics,
        "topologyGate": "PASS" if topology_pass else "FAIL",
        "matchedPreReductionCaptures": capture_names,
        "rawHashAfterBuild": sha256_file(RAW_PATH),
        "rawUnchanged": sha256_file(RAW_PATH) == config["inputs"]["rawMaster"]["sha256"],
        "referenceHashAfterBuild": sha256_file(REFERENCE_PATH),
        "minimumFreeGiB": min(free_samples) if free_samples else None,
        "elapsedSeconds": time.monotonic() - started,
    }
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics), flush=True)


def nearest_distance_stats(tree: BVHTree, points: np.ndarray) -> dict:
    distances = np.empty(len(points), dtype=np.float64)
    for index, point in enumerate(points):
        nearest = tree.find_nearest(Vector((float(point[0]), float(point[1]), float(point[2]))))
        distances[index] = float(nearest[3]) if nearest and nearest[0] is not None else float("inf")
    finite = distances[np.isfinite(distances)]
    return {
        "samples": int(len(distances)),
        "mean": float(finite.mean()) if len(finite) else None,
        "median": float(np.median(finite)) if len(finite) else None,
        "p95": float(np.percentile(finite, 95)) if len(finite) else None,
        "max": float(finite.max()) if len(finite) else None,
        "unboundedSamples": int(len(distances) - len(finite)),
    }


def build_bvh(mesh: bpy.types.Mesh) -> tuple[BVHTree, np.ndarray, np.ndarray]:
    positions, triangles = triangles_and_positions(mesh)
    tree = BVHTree.FromPolygons([tuple(map(float, p)) for p in positions], triangles.tolist(), all_triangles=True, epsilon=1e-7)
    if tree is None:
        raise RuntimeError("could not build geometry comparison BVH")
    return tree, positions, triangles


def self_overlap_probe(mesh: bpy.types.Mesh) -> dict:
    positions, triangles = triangles_and_positions(mesh)
    tree = BVHTree.FromPolygons([tuple(map(float, p)) for p in positions], triangles.tolist(), all_triangles=True, epsilon=1e-7)
    if tree is None:
        raise RuntimeError("could not build self-overlap BVH")
    pairs = np.asarray(tree.overlap(tree), dtype=np.int32).reshape((-1, 2))
    pairs = pairs[pairs[:, 0] < pairs[:, 1]]
    if len(pairs):
        left = triangles[pairs[:, 0]]
        right = triangles[pairs[:, 1]]
        shared_index = (left[:, :, None] == right[:, None, :]).any(axis=(1, 2))
        disjoint_candidates = int(np.count_nonzero(~shared_index))
    else:
        disjoint_candidates = 0
    return {
        "bvhOverlapPairsIncludingAdjacent": int(len(pairs)),
        "pairsWithoutSharedTriangleVertexIndices": disjoint_candidates,
        "method": "Blender BVHTree self-overlap; pair hits sharing any source vertex excluded",
    }


def export_glb(obj: bpy.types.Object, path: Path) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    result = bpy.ops.export_scene.gltf(filepath=str(path.resolve()), export_format="GLB", use_selection=True,
                                       export_apply=False, export_yup=True, export_normals=True)
    if "FINISHED" not in result or not path.is_file() or path.stat().st_size == 0:
        raise RuntimeError(f"GLB export failed: {path}")


def derive(config: dict, config_hash: str, free_samples: list[float]) -> None:
    working_metrics_path = EVIDENCE / "metrics/working-solid.json"
    if not FINAL_BLEND.exists() and working_metrics_path.is_file():
        working_receipt = json.loads(working_metrics_path.read_text(encoding="utf-8"))
    else:
        raise ValueError("derive stage requires the reviewed working-solid stage and no prior final blend")
    if working_receipt["configSha256"] != config_hash or working_receipt["rawSha256"] != config["inputs"]["rawMaster"]["sha256"]:
        raise ValueError("working-solid receipt does not match the current frozen inputs/config")
    if working_receipt.get("topologyGate") != "PASS":
        raise ValueError("working solid failed its closure gate; derive stage is not authorized")
    pre_review_path = EVIDENCE / "review-pre-reduction.md"
    if not pre_review_path.is_file() or "PRE_REDUCTION_PASS" not in pre_review_path.read_text(encoding="utf-8"):
        raise ValueError("independent PRE_REDUCTION_PASS review is required before decimation or stamp derivation")
    reviewed_work_path = (REPO / working_receipt["workingBlendPath"]).resolve()
    ensure_open_mainfile(reviewed_work_path)
    if sha256_file(reviewed_work_path) != working_receipt["workingBlendSha256"]:
        raise ValueError("working-solid Blender file hash differs from its receipt")
    bpy.ops.wm.open_mainfile(filepath=str(reviewed_work_path))
    working = bpy.data.objects.get("C1 Closed Working Solid")
    if working is None or working.type != "MESH":
        raise RuntimeError("reviewed high-resolution working solid is missing")
    started = time.monotonic()
    raw_obj, raw_positions, _, _ = exact_raw_import()
    raw_obj.name = "C1 raw source for comparison"
    pristine = duplicate_mesh_object(working, "C1 Pristine Render Derivative")
    pristine_reduction = decimate_to_guidance(pristine, int(config["pristineRender"]["initialTriangleCeiling"]))
    recalculate_outward_normals(pristine)
    stamp = duplicate_mesh_object(working, "C1 Closed Stamp Source Derivative")
    stamp_voxel_size = float(config["stampSource"]["voxelRemeshSize"])
    remesh_voxel(stamp, stamp_voxel_size)
    stamp_reduction = decimate_to_guidance(stamp, int(config["stampSource"]["initialTriangleCeiling"]))
    recalculate_outward_normals(stamp)
    pristine_metrics = mesh_metrics(pristine, include_components=True)
    stamp_metrics = mesh_metrics(stamp, include_components=True)
    stamp_metrics["selfOverlapProbe"] = self_overlap_probe(stamp.data)
    pristine_metrics["bounds"] = world_bounds(pristine)
    stamp_metrics["bounds"] = world_bounds(stamp)
    pristine_topology_pass = (
        pristine_metrics["boundaryEdges"] == 0 and pristine_metrics["nonmanifoldEdges"] == 0
        and pristine_metrics["faceBearingComponents"] == 1 and pristine_metrics["unusedVertices"] == 0
        and pristine_metrics["repeatedIndexFaces"] == 0 and pristine_metrics["zeroAreaTriangles"] == 0
        and pristine_metrics["nonfinitePositionScalars"] == 0 and pristine_metrics["orientationConflictEdges"] == 0
        and abs(pristine_metrics["signedVolume"]) > 1e-9
    )
    stamp_topology_pass = (
        stamp_metrics["boundaryEdges"] == 0 and stamp_metrics["nonmanifoldEdges"] == 0
        and stamp_metrics["faceBearingComponents"] == 1 and stamp_metrics["unusedVertices"] == 0
        and stamp_metrics["repeatedIndexFaces"] == 0 and stamp_metrics["zeroAreaTriangles"] == 0
        and stamp_metrics["nonfinitePositionScalars"] == 0 and stamp_metrics["orientationConflictEdges"] == 0
        and abs(stamp_metrics["signedVolume"]) > 1e-9
    )
    captures_dir = EVIDENCE / "captures/final-geometry"
    capture_map = {
        "raw": raw_obj,
        "pristine": pristine,
        "stamp": stamp,
    }
    capture_names = render_objects(capture_map, captures_dir, pre_reduction=False)

    raw_tree, raw_points, _ = build_bvh(raw_obj.data)
    pristine_tree, pristine_points, _ = build_bvh(pristine.data)
    stamp_tree, stamp_points, _ = build_bvh(stamp.data)
    raw_sample = raw_points[np.linspace(0, len(raw_points) - 1, min(SAMPLE_COUNT, len(raw_points)), dtype=np.int64)]
    pristine_sample = pristine_points[np.linspace(0, len(pristine_points) - 1, min(SAMPLE_COUNT, len(pristine_points)), dtype=np.int64)]
    stamp_sample = stamp_points[np.linspace(0, len(stamp_points) - 1, min(SAMPLE_COUNT, len(stamp_points)), dtype=np.int64)]
    distances = {
        "rawToPristine": nearest_distance_stats(pristine_tree, raw_sample),
        "pristineToRaw": nearest_distance_stats(raw_tree, pristine_sample),
        "rawToStamp": nearest_distance_stats(stamp_tree, raw_sample),
        "stampToRaw": nearest_distance_stats(raw_tree, stamp_sample),
        "pristineToStamp": nearest_distance_stats(stamp_tree, pristine_sample),
        "stampToPristine": nearest_distance_stats(pristine_tree, stamp_sample),
        "method": "deterministic evenly spaced source-vertex samples to Blender BVHTree nearest-triangle surface; distances in source units",
    }

    # Wireframes are separate inspection-only renders, not product materials.
    render = load_module("inspect-generated-glb.py", "u4f_c1_wire_helpers")
    camera = bpy.data.objects.get("Inspection Camera")
    floor = bpy.data.objects.get("Matte Studio Floor")
    minimum, maximum = render.scene_bounds([raw_obj])
    center = (minimum + maximum) * 0.5
    target = Vector((center.x, center.y, minimum.z + (maximum.z - minimum.z) * 0.52))
    largest = max(*(maximum - minimum), 0.01)
    scene = bpy.context.scene
    if camera is None or floor is None:
        raise RuntimeError("shared matched-view camera was not preserved for wireframe rendering")
    wire_paths: list[str] = []
    for label, obj in (("pristine", pristine), ("stamp", stamp)):
        for other in (raw_obj, pristine, stamp):
            other.hide_render = other != obj
        wire = bpy.data.materials.new(f"U4F-C1 {label} wireframe diagnostic")
        wire.use_nodes = True
        nodes = wire.node_tree.nodes
        nodes.clear()
        output_node = nodes.new("ShaderNodeOutputMaterial")
        emission = nodes.new("ShaderNodeEmission")
        wire_node = nodes.new("ShaderNodeWireframe")
        wire_node.use_pixel_size = True
        wire_node.inputs["Size"].default_value = 0.8
        mix = nodes.new("ShaderNodeMixRGB")
        mix.inputs[1].default_value = (0.08, 0.08, 0.08, 1.0)
        mix.inputs[2].default_value = (0.72, 0.72, 0.72, 1.0)
        wire.node_tree.links.new(wire_node.outputs["Fac"], mix.inputs[0])
        wire.node_tree.links.new(mix.outputs["Color"], emission.inputs["Color"])
        wire.node_tree.links.new(emission.outputs["Emission"], output_node.inputs["Surface"])
        old_materials = list(obj.data.materials)
        obj.data.materials.clear()
        obj.data.materials.append(wire)
        camera.location = target + dict(VIEW_DIRECTIONS)["primary"].normalized() * largest * 2.8
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        floor.hide_render = True
        scene.render.resolution_x = 768
        scene.render.resolution_y = 768
        path = captures_dir / f"{label}-wireframe.png"
        scene.render.filepath = str(path.resolve())
        bpy.ops.render.render(write_still=True)
        obj.data.materials.clear()
        for material in old_materials:
            obj.data.materials.append(material)
        wire_paths.append(path.name)
    for obj in (raw_obj, pristine, stamp):
        obj.hide_render = False

    # Do not retain or export the raw source object in the editable derivative file.
    bpy.data.objects.remove(raw_obj, do_unlink=True)
    bpy.context.scene.camera = None
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH" and obj.name not in {"Inspection Camera", "Matte Studio Floor"}:
            bpy.data.objects.remove(obj, do_unlink=True)
    if bpy.data.objects.get("Matte Studio Floor"):
        bpy.data.objects.remove(bpy.data.objects["Matte Studio Floor"], do_unlink=True)
    if bpy.data.objects.get("Inspection Camera"):
        bpy.data.objects.remove(bpy.data.objects["Inspection Camera"], do_unlink=True)
    for obj in (working, pristine, stamp):
        obj.hide_render = obj == working
        obj.hide_set(obj == working)
    art_dir = REPO / "art/source/u4f-rock-002/cleanup/c1"
    pristine_path = art_dir / "pristine-render/pristine-render.glb"
    stamp_path = art_dir / "stamp-source/stamp-source.glb"
    if pristine_path.exists() or stamp_path.exists() or FINAL_BLEND.exists():
        raise ValueError("final derivative path already exists; refusing to overwrite")
    pristine_path.parent.mkdir(parents=True, exist_ok=True)
    stamp_path.parent.mkdir(parents=True, exist_ok=True)
    export_glb(pristine, pristine_path)
    export_glb(stamp, stamp_path)
    bpy.ops.wm.save_as_mainfile(filepath=str(FINAL_BLEND.resolve()))
    metrics = {
        "status": "dual derivative construction complete; awaiting independent visual review",
        "blenderVersion": bpy.app.version_string,
        "rawSha256": config["inputs"]["rawMaster"]["sha256"],
        "referenceSha256": config["inputs"]["reference"]["sha256"],
        "configSha256": config_hash,
        "workingBlendSha256": working_receipt["workingBlendSha256"],
        "finalBlendPath": str(FINAL_BLEND.relative_to(REPO)).replace("\\", "/"),
        "finalBlendSha256": sha256_file(FINAL_BLEND),
        "pristine": {
            **pristine_metrics,
            "topologyGate": "PASS" if pristine_topology_pass else "FAIL",
            "derivativePath": str(pristine_path.relative_to(REPO)).replace("\\", "/"),
            "sha256": sha256_file(pristine_path),
            "reduction": pristine_reduction,
            "method": "copy of closed high-resolution working solid; independent collapse reduction only if needed",
        },
        "stamp": {
            **stamp_metrics,
            "topologyGate": "PASS" if stamp_topology_pass else "FAIL",
            "derivativePath": str(stamp_path.relative_to(REPO)).replace("\\", "/"),
            "sha256": sha256_file(stamp_path),
            "voxelRemeshSize": stamp_voxel_size,
            "reduction": stamp_reduction,
            "method": "independent voxel remesh from closed high-resolution working solid; collapse reduction only if needed",
        },
        "surfaceDistance": distances,
        "coordinateFrame": {"upAxis": "+Z", "sourceTransform": "identity", "scale": "source units unchanged"},
        "captures": capture_names + wire_paths,
        "rawHashAfterBuild": sha256_file(RAW_PATH),
        "rawUnchanged": sha256_file(RAW_PATH) == config["inputs"]["rawMaster"]["sha256"],
        "minimumFreeGiB": min(free_samples) if free_samples else None,
        "elapsedSeconds": time.monotonic() - started,
    }
    metrics_path = EVIDENCE / "metrics/comparison.json"
    metrics_path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    (EVIDENCE / "metrics/pristine-render.json").write_text(json.dumps(metrics["pristine"], indent=2) + "\n", encoding="utf-8")
    (EVIDENCE / "metrics/stamp-source.json").write_text(json.dumps(metrics["stamp"], indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics), flush=True)


def main() -> None:
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", choices=("construct", "derive"), required=True)
    args = parser.parse_args(values)
    config, config_hash = load_config()
    output_dir = WORK_BLEND.parent if args.stage == "construct" else FINAL_BLEND.parent
    stop, free_samples = configure_reserve_watch(output_dir)
    try:
        if args.stage == "construct":
            construct(config, config_hash, free_samples)
        else:
            derive(config, config_hash, free_samples)
    finally:
        stop.set()


if __name__ == "__main__":
    main()
