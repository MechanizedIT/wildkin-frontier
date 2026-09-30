"""Read-only vertical-ray probe of the underside opening in the raw U4F PLY."""
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
from pathlib import Path
import sys

from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np

EXPECTED_SHA256 = "4cc76dc0608ed0e3575e25718c3b606561aa7925c4cd5d46350c4576d5958c5d"
Z_MIN = -0.26899635791778564
Z_MAX = 0.268713116645813


def free_gib() -> float:
    class Status(ctypes.Structure):
        _fields_ = [("length", ctypes.c_ulong), ("load", ctypes.c_ulong)] + [
            (name, ctypes.c_ulonglong) for name in ("total", "available", "page_total", "page_available", "virtual_total", "virtual_available", "extended")
        ]
    status = Status()
    status.length = ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise RuntimeError("host memory reading unavailable")
    return status.available / 2**30


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--samples-per-axis", type=int, default=81)
    args = parser.parse_args(values)
    source = args.input.resolve()
    output = args.output.resolve()
    if not source.is_file() or output.exists():
        raise ValueError("input must exist and output must be new")
    source_hash = sha256(source)
    if source_hash != EXPECTED_SHA256:
        raise ValueError("raw source hash changed")
    initial_free = free_gib()
    if initial_free < 8.0:
        raise RuntimeError(f"underside ray probe requires 8 GiB free, found {initial_free:.2f} GiB")
    with source.open("rb") as stream:
        header = bytearray()
        while True:
            line = stream.readline()
            if not line:
                raise ValueError("truncated PLY header")
            header.extend(line)
            if line.strip() == b"end_header":
                break
        header_text = header.decode("ascii")
        vertex_count = int(next(line.split()[2] for line in header_text.splitlines() if line.startswith("element vertex ")))
        face_count = int(next(line.split()[2] for line in header_text.splitlines() if line.startswith("element face ")))
        positions = np.fromfile(stream, dtype="<f4", count=vertex_count * 3).reshape((-1, 3))
        face_dtype = np.dtype([("arity", "u1"), ("indices", "<u4", (3,))])
        faces = np.fromfile(stream, dtype=face_dtype, count=face_count)["indices"]
    bounds_xy = np.percentile(positions[:, :2], [0.1, 99.9], axis=0)
    # A slightly expanded square avoids sampling only the central footprint.
    radius = float(max(np.abs(bounds_xy).max(), 0.01)) * 1.05
    grid = np.linspace(-radius, radius, args.samples_per_axis)
    origin_z = Z_MIN - 0.05
    maximum_distance = (Z_MAX - Z_MIN) + 0.15
    points = [tuple(map(float, point)) for point in positions]
    polygons = faces.tolist()
    bvh = BVHTree.FromPolygons(points, polygons, all_triangles=True, epsilon=1e-7)
    del points, polygons, positions, faces
    if bvh is None:
        raise RuntimeError("Blender failed to build the raw PLY BVH")
    hit_heights: list[float] = []
    hit_normals: list[float] = []
    hit_map: list[list[float | None]] = []
    for y in grid:
        row: list[float | None] = []
        for x in grid:
            hit = bvh.ray_cast(Vector((float(x), float(y), origin_z)), Vector((0.0, 0.0, 1.0)), maximum_distance)
            location, normal, face_index, distance = hit
            if location is None:
                row.append(None)
                continue
            normalized = (float(location.z) - Z_MIN) / (Z_MAX - Z_MIN)
            row.append(normalized)
            hit_heights.append(normalized)
            hit_normals.append(float(normal.z))
        hit_map.append(row)
    hit_values = np.asarray(hit_heights, dtype=np.float64)
    result = {
        "status": "read-only raw underside first-hit ray probe",
        "sourceSha256": source_hash,
        "upAxis": "+Z per U4F-G1 capture convention",
        "rayOriginZ": origin_z,
        "direction": [0, 0, 1],
        "sampleGrid": {"samplesPerAxis": args.samples_per_axis, "xyBounds": [-radius, radius]},
        "sampleCount": args.samples_per_axis * args.samples_per_axis,
        "hitCount": int(hit_values.size),
        "missCount": int(args.samples_per_axis * args.samples_per_axis - hit_values.size),
        "hitHeightNormalized": {
            "p10": float(np.percentile(hit_values, 10)) if hit_values.size else None,
            "p50": float(np.percentile(hit_values, 50)) if hit_values.size else None,
            "p90": float(np.percentile(hit_values, 90)) if hit_values.size else None,
            "max": float(hit_values.max()) if hit_values.size else None,
            "fractionAbove30Percent": float(np.mean(hit_values >= 0.30)) if hit_values.size else None,
            "fractionAbove50Percent": float(np.mean(hit_values >= 0.50)) if hit_values.size else None,
        },
        "firstHitNormalZ": {
            "fractionFacingDown": float(np.mean(np.asarray(hit_normals) < -0.15)) if hit_normals else None,
            "fractionNearVertical": float(np.mean(np.abs(np.asarray(hit_normals)) <= 0.15)) if hit_normals else None,
            "fractionFacingUp": float(np.mean(np.asarray(hit_normals) > 0.15)) if hit_normals else None,
        },
        "rawFirstHitGridNormalizedZ": hit_map,
        "interpretationLimit": "ray samples diagnose opening depth and underside surfaces, not a complete topological closure proof",
        "initialFreeGiB": initial_free,
        "finalFreeGiB": free_gib(),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in result.items() if key != "rawFirstHitGridNormalizedZ"}), flush=True)


if __name__ == "__main__":
    main()
