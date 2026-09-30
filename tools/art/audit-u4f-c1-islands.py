"""Read-only component distribution audit for the U4F-C1 working solid."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys

import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / "art/source/u4f-rock-002/cleanup/c1/working/c1-working-solid.blend"
OUT = ROOT / "native/evidence/unity/u4f-c1-cleanup/metrics/component-islands-before-repair.json"
BUILDER_PATH = Path(__file__).with_name("build-u4f-c1-derivatives.py")


def load_builder():
    spec = importlib.util.spec_from_file_location("u4f_c1_island_audit_builder", BUILDER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load the pinned C1 topology helpers")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def component_labels(face_count, starts, counts, edge_face_direction):
    parent = list(range(face_count))
    rank = bytearray(face_count)

    def find(node):
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def union(left, right):
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
    labels = np.fromiter((find(i) for i in range(face_count)), dtype=np.int32, count=face_count)
    return labels


def main():
    if not WORK.is_file():
        raise FileNotFoundError(WORK)
    builder = load_builder()
    builder.load_config()
    bpy.ops.wm.open_mainfile(filepath=str(WORK.resolve()))
    obj = bpy.data.objects.get("C1 Closed Working Solid")
    if obj is None or obj.type != "MESH":
        raise RuntimeError("expected C1 working mesh is missing")

    positions, triangles = builder.triangles_and_positions(obj.data)
    _, starts, edge_counts, edge_faces = builder.edge_topology(triangles, len(positions))
    labels = component_labels(len(triangles), starts, edge_counts, edge_faces)
    component_sizes = np.bincount(labels, minlength=len(triangles))
    nonempty = np.flatnonzero(component_sizes)
    ranked = nonempty[np.argsort(component_sizes[nonempty])[::-1]]

    per_face_volume = np.einsum(
        "ij,ij->i", positions[triangles[:, 0]].astype(np.float64),
        np.cross(positions[triangles[:, 1]].astype(np.float64), positions[triangles[:, 2]].astype(np.float64)),
    ) / 6.0
    component_volumes = np.bincount(labels, weights=per_face_volume, minlength=len(triangles))
    largest_root = int(ranked[0])
    largest_face_ids = np.flatnonzero(labels == largest_root)
    largest_vertices = np.unique(triangles[largest_face_ids])

    largest_positions = positions[largest_vertices]
    largest_bounds = {
        "min": largest_positions.min(axis=0).astype(float).tolist(),
        "max": largest_positions.max(axis=0).astype(float).tolist(),
    }
    top = []
    for root in ranked[:20]:
        face_ids = np.flatnonzero(labels == int(root))
        vertex_ids = np.unique(triangles[face_ids])
        coords = positions[vertex_ids]
        top.append({
            "rootFaceId": int(root),
            "triangles": int(component_sizes[root]),
            "fractionOfAllFaces": float(component_sizes[root] / len(triangles)),
            "signedVolume": float(component_volumes[root]),
            "bounds": {
                "min": coords.min(axis=0).astype(float).tolist(),
                "max": coords.max(axis=0).astype(float).tolist(),
            },
        })

    size_cuts = [1, 2, 4, 8, 16, 64, 256, 1024, 10000]
    result = {
        "purpose": "read-only component distribution audit before the reviewer-authorized largest-component repair",
        "workingBlendSha256": builder.sha256_file(WORK),
        "rawSha256": builder.sha256_file(builder.RAW_PATH),
        "componentDefinition": "face components connected through shared mesh edges, matching C1 topology gate",
        "vertices": int(len(positions)),
        "triangles": int(len(triangles)),
        "faceBearingComponents": int(len(nonempty)),
        "largestComponent": top[0],
        "largestComponentVertexCount": int(len(largest_vertices)),
        "componentSizeDistribution": {
            f"triangles<={cut}": int(np.count_nonzero(component_sizes[nonempty] <= cut)) for cut in size_cuts
        },
        "totalTrianglesOutsideLargest": int(len(triangles) - component_sizes[largest_root]),
        "totalSignedVolume": float(per_face_volume.sum()),
        "largestTwentyComponents": top,
        "rawUnchanged": builder.sha256_file(builder.RAW_PATH) == builder.load_config()[0]["inputs"]["rawMaster"]["sha256"],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
