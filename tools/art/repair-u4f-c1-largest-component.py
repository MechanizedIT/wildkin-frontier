"""Apply the single reviewer-authorized C1 disconnected-component repair."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
import time

import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
INPUT_BLEND = ROOT / "art/source/u4f-rock-002/cleanup/c1/working/c1-working-solid.blend"
OUTPUT_BLEND = ROOT / "art/source/u4f-rock-002/cleanup/c1/working/c1-working-solid-focused-repair.blend"
EVIDENCE = ROOT / "native/evidence/unity/u4f-c1-cleanup"
WORKING_RECEIPT = EVIDENCE / "metrics/working-solid.json"
BEFORE_RECEIPT = EVIDENCE / "metrics/working-solid-before-focused-repair.json"
REPAIR_RECEIPT = EVIDENCE / "metrics/focused-component-repair.json"
POST_CAPTURE_DIR = EVIDENCE / "captures/post-repair"
BUILDER_PATH = Path(__file__).with_name("build-u4f-c1-derivatives.py")
AUDIT_PATH = Path(__file__).with_name("audit-u4f-c1-islands.py")


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not load helper: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
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
    return np.fromiter((find(i) for i in range(face_count)), dtype=np.int32, count=face_count)


def new_mesh_from_triangles(name: str, positions: np.ndarray, triangles: np.ndarray) -> bpy.types.Mesh:
    used = np.unique(triangles.reshape(-1))
    remap = np.full(len(positions), -1, dtype=np.int32)
    remap[used] = np.arange(len(used), dtype=np.int32)
    compact_faces = remap[triangles]
    compact_positions = np.ascontiguousarray(positions[used], dtype=np.float32)
    compact_faces = np.ascontiguousarray(compact_faces, dtype=np.int32)

    mesh = bpy.data.meshes.new(name)
    mesh.vertices.add(len(compact_positions))
    mesh.vertices.foreach_set("co", compact_positions.reshape(-1))
    mesh.loops.add(compact_faces.size)
    mesh.loops.foreach_set("vertex_index", compact_faces.reshape(-1))
    mesh.polygons.add(len(compact_faces))
    mesh.polygons.foreach_set("loop_start", np.arange(len(compact_faces), dtype=np.int32) * 3)
    mesh.polygons.foreach_set("loop_total", np.full(len(compact_faces), 3, dtype=np.int32))
    mesh.update(calc_edges=True)
    return mesh


def main():
    started = time.monotonic()
    if OUTPUT_BLEND.exists() or BEFORE_RECEIPT.exists() or REPAIR_RECEIPT.exists() or POST_CAPTURE_DIR.exists():
        raise FileExistsError("focused-repair outputs already exist; refusing to overwrite")
    if not INPUT_BLEND.is_file() or not WORKING_RECEIPT.is_file():
        raise FileNotFoundError("C1 pre-repair blend or receipt is missing")

    builder = load_module(BUILDER_PATH, "u4f_c1_focused_repair_builder")
    audit = load_module(AUDIT_PATH, "u4f_c1_focused_repair_audit")
    config, config_hash = builder.load_config()
    before = json.loads(WORKING_RECEIPT.read_text(encoding="utf-8"))
    before_blend_hash = builder.sha256_file(INPUT_BLEND)
    if before.get("topologyGate") != "FAIL" or before.get("workingBlendSha256") != before_blend_hash:
        raise ValueError("pre-repair receipt/hash do not match the reviewed working-solid candidate")
    if before.get("workingSolid", {}).get("faceBearingComponents") != 13166:
        raise ValueError("pre-repair topology differs from the exact reviewer-reviewed 13,166-component candidate")
    if before.get("rawSha256") != config["inputs"]["rawMaster"]["sha256"] or before.get("configSha256") != config_hash:
        raise ValueError("pre-repair receipt does not match the frozen raw/config inputs")

    bpy.ops.wm.open_mainfile(filepath=str(INPUT_BLEND.resolve()))
    working = bpy.data.objects.get("C1 Closed Working Solid")
    if working is None or working.type != "MESH":
        raise RuntimeError("expected C1 working mesh is missing")

    positions, triangles = builder.triangles_and_positions(working.data)
    _, starts, counts, edge_faces = builder.edge_topology(triangles, len(positions))
    labels = audit.component_labels(len(triangles), starts, counts, edge_faces)
    sizes = np.bincount(labels, minlength=len(triangles))
    components = np.flatnonzero(sizes)
    ranked = components[np.argsort(sizes[components])[::-1]]
    if len(components) != 13166:
        raise ValueError("component distribution changed after the independent review")
    largest_root = int(ranked[0])
    largest_faces = int(sizes[largest_root])
    largest_fraction = largest_faces / len(triangles)
    largest_other = int(ranked[1]) if len(ranked) > 1 else None
    largest_other_fraction = float(sizes[largest_other] / len(triangles)) if largest_other is not None else 0.0
    if largest_fraction < 0.85 or largest_other_fraction >= 0.005:
        raise ValueError("conservative component-size guard failed; refusing this repair")

    keep = labels == largest_root
    kept_faces = np.ascontiguousarray(triangles[keep], dtype=np.int32)
    largest_signed_volume = float(np.einsum(
        "ij,ij->i",
        positions[kept_faces[:, 0]].astype(np.float64),
        np.cross(positions[kept_faces[:, 1]].astype(np.float64), positions[kept_faces[:, 2]].astype(np.float64)),
    ).sum() / 6.0)
    reversed_winding = largest_signed_volume < 0.0
    if reversed_winding:
        kept_faces[:, [1, 2]] = kept_faces[:, [2, 1]]

    old_mesh = working.data
    working.data = new_mesh_from_triangles("C1 Largest Closed Component After Focused Repair", positions, kept_faces)
    if old_mesh.users == 0:
        bpy.data.meshes.remove(old_mesh)
    working.name = "C1 Closed Working Solid"

    repaired_metrics = builder.mesh_metrics(working, include_components=True)
    repaired_metrics["bounds"] = builder.world_bounds(working)
    topology_pass = (
        repaired_metrics["boundaryEdges"] == 0
        and repaired_metrics["nonmanifoldEdges"] == 0
        and repaired_metrics["faceBearingComponents"] == 1
        and repaired_metrics["unusedVertices"] == 0
        and repaired_metrics["repeatedIndexFaces"] == 0
        and repaired_metrics["zeroAreaTriangles"] == 0
        and repaired_metrics["nonfinitePositionScalars"] == 0
        and repaired_metrics["orientationConflictEdges"] == 0
        and repaired_metrics["signedVolume"] > 1e-9
    )

    raw_obj, _, _, _ = builder.exact_raw_import()
    raw_obj.name = "C1 raw source for post-repair matched review"
    builder.render_objects({"raw": raw_obj, "working": working}, POST_CAPTURE_DIR, pre_reduction=True)
    bpy.data.objects.remove(raw_obj, do_unlink=True)
    bpy.context.scene.camera = None
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or obj != working:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT")
    working.select_set(True)
    bpy.context.view_layer.objects.active = working
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND.resolve()))

    prior_copy = dict(before)
    prior_copy["status"] = "pre-focused-repair checkpoint preserved for comparison"
    BEFORE_RECEIPT.write_text(json.dumps(prior_copy, indent=2) + "\n", encoding="utf-8")

    receipt = dict(before)
    receipt["status"] = "one focused disconnected-component repair complete; awaiting independent visual review"
    receipt["workingBlendPath"] = str(OUTPUT_BLEND.relative_to(ROOT)).replace("\\", "/")
    receipt["workingBlendSha256"] = builder.sha256_file(OUTPUT_BLEND)
    receipt["workingSolid"] = repaired_metrics
    receipt["topologyGate"] = "PASS" if topology_pass else "FAIL"
    receipt["focusedRepair"] = {
        "operation": "retain the largest shared-edge-connected face component; discard every other disconnected component",
        "reviewBasis": "independent reviewer identified isolated remesh debris and authorized exactly this bounded repair",
        "componentCountBefore": int(len(components)),
        "largestRootFaceId": largest_root,
        "largestTrianglesBefore": largest_faces,
        "largestFractionBefore": largest_fraction,
        "largestOtherComponentTriangles": int(sizes[largest_other]) if largest_other is not None else 0,
        "discardedComponents": int(len(components) - 1),
        "discardedTriangles": int(len(triangles) - largest_faces),
        "explicitWindingReversal": reversed_winding,
        "largestComponentSignedVolumeBeforeRepair": largest_signed_volume,
        "preRepairBlendSha256": before_blend_hash,
        "postRepairBlendSha256": receipt["workingBlendSha256"],
        "method": "face adjacency through shared edges; keep largest root; compact referenced vertices; reverse all face winding only because the retained closed shell had negative signed volume",
    }
    receipt["matchedPreReductionCaptures"] = sorted(path.name for path in POST_CAPTURE_DIR.glob("*.png"))
    receipt["rawHashAfterBuild"] = builder.sha256_file(builder.RAW_PATH)
    receipt["rawUnchanged"] = receipt["rawHashAfterBuild"] == config["inputs"]["rawMaster"]["sha256"]
    receipt["focusedRepairElapsedSeconds"] = time.monotonic() - started
    WORKING_RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    REPAIR_RECEIPT.write_text(json.dumps(receipt["focusedRepair"], indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "topologyGate": receipt["topologyGate"],
        "workingBlendPath": receipt["workingBlendPath"],
        "workingBlendSha256": receipt["workingBlendSha256"],
        "workingSolid": repaired_metrics,
        "focusedRepair": receipt["focusedRepair"],
        "rawUnchanged": receipt["rawUnchanged"],
    }), flush=True)


if __name__ == "__main__":
    main()
