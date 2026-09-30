"""Focused smoke checks for deterministic U4F-C1 support-core and topology helpers."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import math
from pathlib import Path

import bmesh
import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "art/source/u4f-rock-002/cleanup/c1/cleanup-config.json"
BUILDER_PATH = Path(__file__).with_name("build-u4f-c1-derivatives.py")
OUTPUT = ROOT / "native/evidence/unity/u4f-c1-cleanup/tests/helper-smoke.json"


def load_builder():
    spec = importlib.util.spec_from_file_location("u4f_c1_builder_test", BUILDER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("unable to load U4F-C1 builder helpers")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def deterministic_core_hash(obj: bpy.types.Object) -> str:
    mesh = obj.data
    coordinates = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    mesh.vertices.foreach_get("co", coordinates)
    digest = hashlib.sha256(coordinates.tobytes())
    for polygon in mesh.polygons:
        digest.update(np.asarray(polygon.vertices, dtype=np.uint32).tobytes())
    return digest.hexdigest()


def main() -> None:
    builder = load_builder()
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    cube_mesh = bpy.data.meshes.new("C1 helper smoke cube")
    bm.to_mesh(cube_mesh)
    bm.free()
    cube_obj = bpy.data.objects.new("C1 helper smoke cube", cube_mesh)
    bpy.context.collection.objects.link(cube_obj)
    builder.recalculate_outward_normals(cube_obj)
    cube_metrics = builder.mesh_metrics(cube_obj, include_components=True)
    topology_helpers_pass = (
        cube_metrics["boundaryEdges"] == 0
        and cube_metrics["nonmanifoldEdges"] == 0
        and cube_metrics["faceBearingComponents"] == 1
        and cube_metrics["unusedVertices"] == 0
        and cube_metrics["orientationConflictEdges"] == 0
        and abs(cube_metrics["signedVolume"] - 8.0) < 1e-5
    )
    bpy.data.objects.remove(cube_obj, do_unlink=True)

    points = []
    for level in (0.0, 0.125, 0.25):
        for index in range(96):
            angle = math.tau * index / 96
            radius = 0.45 + 0.03 * math.sin(3 * angle)
            points.append((radius * math.cos(angle), 0.4 * radius * math.sin(angle), -0.2689963579 + level * 0.53771))
    positions = np.asarray(points, dtype=np.float32)
    first = builder.create_support_core(positions, config)
    second = builder.create_support_core(positions, config)
    first_hash = deterministic_core_hash(first)
    second_hash = deterministic_core_hash(second)
    deterministic_core_pass = first_hash == second_hash
    bpy.data.objects.remove(first, do_unlink=True)
    bpy.data.objects.remove(second, do_unlink=True)

    result = {
        "status": "PASS" if topology_helpers_pass and deterministic_core_pass else "FAIL",
        "blenderVersion": bpy.app.version_string,
        "topologyHelperCube": cube_metrics,
        "topologyHelperPass": topology_helpers_pass,
        "deterministicSupportCoreHashA": first_hash,
        "deterministicSupportCoreHashB": second_hash,
        "deterministicSupportCorePass": deterministic_core_pass,
        "rawInputRead": False,
        "rawInputWritten": False,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result), flush=True)
    if result["status"] != "PASS":
        raise RuntimeError("U4F-C1 helper smoke checks failed")


if __name__ == "__main__":
    main()
