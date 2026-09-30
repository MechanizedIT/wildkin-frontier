"""Read-only reopen/topology check for the focused-repair Blender derivative."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys

import bpy


ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "native/evidence/unity/u4f-c1-cleanup"
RECEIPT_PATH = EVIDENCE / "metrics/working-solid.json"
OUT = EVIDENCE / "metrics/reopen-validation.json"
BUILDER_PATH = Path(__file__).with_name("build-u4f-c1-derivatives.py")


def load_builder():
    spec = importlib.util.spec_from_file_location("u4f_c1_reopen_validation_builder", BUILDER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load the pinned C1 mesh/topology helpers")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main():
    builder = load_builder()
    config, config_hash = builder.load_config()
    expected = json.loads(RECEIPT_PATH.read_text(encoding="utf-8"))
    blend = (ROOT / expected["workingBlendPath"]).resolve()
    if builder.sha256_file(blend) != expected["workingBlendSha256"]:
        raise ValueError("focused-repair Blender file hash differs from its receipt")
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    obj = bpy.data.objects.get("C1 Closed Working Solid")
    if obj is None or obj.type != "MESH":
        raise RuntimeError("focused-repair mesh object did not survive Blender reopen")
    reopened = builder.mesh_metrics(obj, include_components=True)
    reopened["bounds"] = builder.world_bounds(obj)
    if reopened != expected["workingSolid"]:
        raise ValueError("reopened Blender mesh metrics differ from the recorded repair metrics")
    raw_hash = builder.sha256_file(builder.RAW_PATH)
    reference_hash = builder.sha256_file(builder.REFERENCE_PATH)
    passed = (
        bpy.app.version_string == builder.EXPECTED_VERSION
        and expected.get("configSha256") == config_hash
        and expected.get("rawSha256") == config["inputs"]["rawMaster"]["sha256"] == raw_hash
        and expected.get("referenceSha256") == config["inputs"]["reference"]["sha256"] == reference_hash
        and expected.get("topologyGate") == "PASS"
        and reopened["boundaryEdges"] == 0
        and reopened["nonmanifoldEdges"] == 0
        and reopened["faceBearingComponents"] == 1
        and reopened["unusedVertices"] == 0
        and reopened["repeatedIndexFaces"] == 0
        and reopened["zeroAreaTriangles"] == 0
        and reopened["nonfinitePositionScalars"] == 0
        and reopened["orientationConflictEdges"] == 0
        and reopened["signedVolume"] > 0.0
    )
    result = {
        "status": "PASS" if passed else "FAIL",
        "readOnly": True,
        "blenderVersion": bpy.app.version_string,
        "blendPath": expected["workingBlendPath"],
        "blendSha256": builder.sha256_file(blend),
        "rawSha256": raw_hash,
        "rawUnchanged": raw_hash == config["inputs"]["rawMaster"]["sha256"],
        "referenceSha256": reference_hash,
        "configSha256": config_hash,
        "reopenedTopology": reopened,
    }
    OUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result), flush=True)
    if not passed:
        raise RuntimeError("focused-repair reopen validation failed")


if __name__ == "__main__":
    main()
