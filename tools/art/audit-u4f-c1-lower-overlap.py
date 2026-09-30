"""Read-only BVH self-overlap probe for the lower 35% of the raw U4F shell."""
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
UPPER_NORMALIZED_HEIGHT = 0.35


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
    args_list = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(args_list)
    source = args.input.resolve()
    output = args.output.resolve()
    if not source.is_file() or output.exists():
        raise ValueError("input must exist and output must be new")
    source_hash = sha256(source)
    if source_hash != EXPECTED_SHA256:
        raise ValueError("raw source hash changed")
    initial_free = free_gib()
    if initial_free < 8.0:
        raise RuntimeError(f"BVH probe requires 8 GiB free, found {initial_free:.2f} GiB")

    with source.open("rb") as stream:
        header = bytearray()
        while True:
            line = stream.readline()
            if not line:
                raise ValueError("truncated PLY header")
            header.extend(line)
            if line.strip() == b"end_header":
                break
        text = header.decode("ascii")
        vertex_count = int(next(line.split()[2] for line in text.splitlines() if line.startswith("element vertex ")))
        face_count = int(next(line.split()[2] for line in text.splitlines() if line.startswith("element face ")))
        positions = np.fromfile(stream, dtype="<f4", count=vertex_count * 3).reshape((-1, 3))
        face_dtype = np.dtype([("arity", "u1"), ("indices", "<u4", (3,))])
        faces = np.fromfile(stream, dtype=face_dtype, count=face_count)["indices"]
    normalized_vertex_z = (positions[:, 2] - Z_MIN) / (Z_MAX - Z_MIN)
    centroid_z = normalized_vertex_z[faces].mean(axis=1)
    selected_faces = faces[centroid_z <= UPPER_NORMALIZED_HEIGHT]
    used_vertices, inverse = np.unique(selected_faces, return_inverse=True)
    local_faces = inverse.reshape((-1, 3))
    local_positions = positions[used_vertices]
    points = [tuple(map(float, point)) for point in local_positions]
    polygons = local_faces.tolist()
    bvh = BVHTree.FromPolygons(points, polygons, all_triangles=True, epsilon=1e-7)
    del points, polygons, positions, normalized_vertex_z, centroid_z, inverse, local_faces, local_positions
    if bvh is None:
        raise RuntimeError("Blender did not build the lower-shell BVH")
    pairs = np.asarray(bvh.overlap(bvh), dtype=np.int32).reshape((-1, 2))
    candidate_pairs = pairs[pairs[:, 0] < pairs[:, 1]]
    del pairs
    overlap_left = selected_faces[candidate_pairs[:, 0]] if len(candidate_pairs) else np.empty((0, 3), dtype=np.uint32)
    overlap_right = selected_faces[candidate_pairs[:, 1]] if len(candidate_pairs) else np.empty((0, 3), dtype=np.uint32)
    shares_vertex = (overlap_left[:, :, None] == overlap_right[:, None, :]).any(axis=(1, 2)) if len(candidate_pairs) else np.zeros(0, dtype=bool)
    disjoint = candidate_pairs[~shares_vertex]
    result = {
        "status": "read-only Blender BVHTree self-overlap probe; source PLY not modified",
        "sourceSha256": source_hash,
        "zUpConvention": "U4F-G1 top=(0,0,+1), underside=(0,0,-1)",
        "faceSelection": f"triangle centroid normalized Z <= {UPPER_NORMALIZED_HEIGHT}",
        "selectedTriangles": int(len(selected_faces)),
        "selectedVertices": int(len(used_vertices)),
        "rawBvhOverlapPairsIncludingAdjacency": int(len(candidate_pairs)),
        "overlapPairsWithNoSharedTriangleIndex": int(len(disjoint)),
        "lowerProbeRange": [0.0, UPPER_NORMALIZED_HEIGHT],
        "interpretationLimit": "BVHTree overlap candidates are local geometric overlap evidence; no global all-mesh triangle-intersection claim is made",
        "initialFreeGiB": initial_free,
        "finalFreeGiB": free_gib(),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
