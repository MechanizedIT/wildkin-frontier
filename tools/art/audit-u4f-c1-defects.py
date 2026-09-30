"""Read-only edge-defect localization for the immutable U4F-G1 raw PLY.

This audit reads binary positions and triangle indices only. It never imports,
repairs, normalizes, or writes the source mesh. Edge height is the normalized
Z coordinate of the edge midpoint; Z-up follows the G1 capture convention.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import struct

import numpy as np


EXPECTED_SHA256 = "4cc76dc0608ed0e3575e25718c3b606561aa7925c4cd5d46350c4576d5958c5d"
EXPECTED_VERTICES = 796_082
EXPECTED_TRIANGLES = 1_594_784
Z_MIN = -0.26899635791778564
Z_MAX = 0.268713116645813
BANDS = ((0.0, 0.15, "bottom_0_15"), (0.15, 0.30, "lower_15_30"),
         (0.30, 0.70, "middle_30_70"), (0.70, 1.0, "upper_70_100"))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_header(stream) -> tuple[int, int, int]:
    header = bytearray()
    while True:
        line = stream.readline()
        if not line:
            raise ValueError("truncated PLY header")
        header.extend(line)
        if line.strip() == b"end_header":
            break
    text = header.decode("ascii")
    if "format binary_little_endian 1.0" not in text:
        raise ValueError("raw PLY is not binary little-endian 1.0")
    vertex_count = face_count = None
    scalar = None
    section = None
    for line in text.splitlines():
        tokens = line.split()
        if len(tokens) == 3 and tokens[0] == "element":
            section = tokens[1]
            if section == "vertex":
                vertex_count = int(tokens[2])
            elif section == "face":
                face_count = int(tokens[2])
        elif len(tokens) == 3 and tokens[0] == "property" and section == "vertex" and tokens[2] in {"x", "y", "z"}:
            if tokens[1] == "float":
                scalar = 4
            elif tokens[1] == "double":
                scalar = 8
    if vertex_count != EXPECTED_VERTICES or face_count != EXPECTED_TRIANGLES or scalar != 4:
        raise ValueError(f"unexpected PLY schema: vertices={vertex_count}, faces={face_count}, scalarBytes={scalar}")
    return len(header), vertex_count, face_count


def edge_components(boundary_edges: np.ndarray, normalized_z: np.ndarray) -> dict:
    adjacency: dict[int, list[tuple[int, int]]] = {}
    for edge_index, (left, right) in enumerate(boundary_edges.tolist()):
        adjacency.setdefault(left, []).append((right, edge_index))
        adjacency.setdefault(right, []).append((left, edge_index))
    unseen = set(adjacency)
    component_sizes: list[dict] = []
    degree_counts: dict[str, int] = {}
    for neighbors in adjacency.values():
        key = str(len(neighbors))
        degree_counts[key] = degree_counts.get(key, 0) + 1
    while unseen:
        start = unseen.pop()
        stack = [start]
        vertices = [start]
        while stack:
            current = stack.pop()
            for neighbor, _ in adjacency[current]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    stack.append(neighbor)
                    vertices.append(neighbor)
        edge_indices: set[int] = set()
        for vertex in vertices:
            edge_indices.update(edge_index for _, edge_index in adjacency[vertex])
        edge_count = len(edge_indices)
        degrees = [len(adjacency[v]) for v in vertices]
        simple_loop = bool(vertices) and all(degree == 2 for degree in degrees)
        cycle_rank = edge_count - len(vertices) + 1
        component_heights = normalized_z[list(edge_indices)]
        band_counts = [
            int(np.count_nonzero(component_heights < 0.15)),
            int(np.count_nonzero((component_heights >= 0.15) & (component_heights < 0.30))),
            int(np.count_nonzero((component_heights >= 0.30) & (component_heights < 0.70))),
            int(np.count_nonzero(component_heights >= 0.70)),
        ]
        component_sizes.append({
            "vertices": len(vertices),
            "edges": edge_count,
            "simpleClosedLoop": simple_loop,
            "cycleRank": cycle_rank,
            "normalizedHeightMin": float(component_heights.min()) if len(component_heights) else None,
            "normalizedHeightMax": float(component_heights.max()) if len(component_heights) else None,
            "edgesByBand": band_counts,
        })
    component_sizes.sort(key=lambda item: item["edges"], reverse=True)
    return {
        "connectedComponents": len(component_sizes),
        "simpleClosedLoops": sum(item["simpleClosedLoop"] for item in component_sizes),
        "branchOrOpenComponents": sum(not item["simpleClosedLoop"] for item in component_sizes),
        "largestSimpleClosedLoopEdges": max((item["edges"] for item in component_sizes if item["simpleClosedLoop"]), default=0),
        "largestComponentEdges": component_sizes[0]["edges"] if component_sizes else 0,
        "largestComponents": component_sizes[:12],
        "vertexDegreeCounts": degree_counts,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    source = args.input.resolve()
    output = args.output.resolve()
    if not source.is_absolute() or not output.is_absolute():
        raise ValueError("absolute paths required")
    if not source.is_file() or output.exists():
        raise ValueError("source must exist and output must be a new file")
    actual_hash = sha256(source)
    if actual_hash != EXPECTED_SHA256:
        raise ValueError(f"raw master hash mismatch: {actual_hash}")

    with source.open("rb") as stream:
        header_bytes, vertex_count, face_count = read_header(stream)
        position_payload = np.fromfile(stream, dtype="<f4", count=vertex_count * 3)
        if position_payload.size != vertex_count * 3:
            raise ValueError("truncated position payload")
        positions = position_payload.reshape((-1, 3))
        face_dtype = np.dtype([("arity", "u1"), ("indices", "<u4", (3,))])
        records = np.fromfile(stream, dtype=face_dtype, count=face_count)
        if len(records) != face_count or not np.all(records["arity"] == 3):
            raise ValueError("invalid triangle records")
        if stream.read(1):
            raise ValueError("unexpected bytes after declared faces")
    triangles = records["indices"]
    del records
    if not np.isfinite(positions).all() or int(triangles.max()) >= vertex_count:
        raise ValueError("raw source contains nonfinite points or invalid indices")

    edge_rows = np.concatenate((triangles[:, (0, 1)], triangles[:, (1, 2)], triangles[:, (2, 0)]), axis=0)
    edge_rows.sort(axis=1)
    keys = edge_rows[:, 0].astype(np.uint64) * np.uint64(vertex_count) + edge_rows[:, 1]
    del edge_rows
    keys.sort()
    unique_keys, counts = np.unique(keys, return_counts=True)
    del keys
    edge_a = (unique_keys // np.uint64(vertex_count)).astype(np.int32)
    edge_b = (unique_keys % np.uint64(vertex_count)).astype(np.int32)
    midpoint_z = (positions[edge_a, 2].astype(np.float64) + positions[edge_b, 2].astype(np.float64)) * 0.5
    normalized_z = (midpoint_z - Z_MIN) / (Z_MAX - Z_MIN)
    band_index = np.select(
        [normalized_z < 0.15, normalized_z < 0.30, normalized_z < 0.70],
        [0, 1, 2], default=3,
    ).astype(np.int8)
    defects = {}
    for kind, mask in (("boundary", counts == 1), ("nonmanifold", counts > 2)):
        values = []
        for index, (lo, hi, label) in enumerate(BANDS):
            selected = mask & (band_index == index)
            values.append({"band": label, "normalizedRange": [lo, hi], "edges": int(selected.sum())})
        defects[kind] = {
            "total": int(mask.sum()),
            "byNormalizedHeightBand": values,
            "below30Percent": int(np.count_nonzero(mask & (normalized_z < 0.30))),
            "above30Percent": int(np.count_nonzero(mask & (normalized_z >= 0.30))),
        }
    boundary_rows = np.column_stack((edge_a[counts == 1], edge_b[counts == 1])).astype(np.int32, copy=False)
    boundary_normalized_z = normalized_z[counts == 1]
    loops = edge_components(boundary_rows, boundary_normalized_z)
    profiles = []
    vertex_normalized_z = (positions[:, 2].astype(np.float64) - Z_MIN) / (Z_MAX - Z_MIN)
    for band_begin in np.arange(0.0, 1.0, 0.05):
        band_end = min(float(band_begin + 0.05), 1.0)
        selected = (vertex_normalized_z >= band_begin) & (vertex_normalized_z < band_end)
        band_positions = positions[selected]
        if len(band_positions):
            profiles.append({
                "normalizedRange": [float(band_begin), band_end],
                "vertices": int(len(band_positions)),
                "xyBounds": {
                    "min": band_positions[:, :2].min(axis=0).astype(float).tolist(),
                    "max": band_positions[:, :2].max(axis=0).astype(float).tolist(),
                },
                "xyMedian": np.median(band_positions[:, :2], axis=0).astype(float).tolist(),
            })

    result = {
        "status": "read-only raw PLY defect localization; no Blender repair or mesh mutation",
        "source": str(source),
        "sha256": actual_hash,
        "headerBytes": header_bytes,
        "vertices": vertex_count,
        "triangles": face_count,
        "coordinateType": "float32",
        "upAxis": "+Z (verified from U4F-G1 view convention: top=(0,0,+1), underside=(0,0,-1))",
        "heightDefinition": "edge midpoint Z normalized over exact raw source Z bounds",
        "normalizedZBounds": [float(Z_MIN), float(Z_MAX)],
        "defects": defects,
        "boundaryGraph": loops,
        "outerBoundsByHeight": profiles,
        "limitations": [
            "boundary graph components are not automatically assumed to be simple loops",
            "triangle self-intersection was not tested in this numeric edge audit",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
