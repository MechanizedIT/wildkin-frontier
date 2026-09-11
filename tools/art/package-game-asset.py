"""Admit one reviewed GLB and retain its reproducible sources outside the game ZIP.

Input is a project-relative JSON manifest; see the project asset-forge skill.
This command validates first and refuses to overwrite an existing asset package.
Review declarations must be written by the actual reviewer, not inferred from
structural checks. This helper never evaluates visual quality or modifies meshes.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ALLOWED_ROLES = {"reference", "raw", "blend", "rig-profile", "generation", "optimization", "normalization", "builder", "rig-report", "reference-prompt", "reference-review", "model-review", "motion-review", "review-front", "review-rear", "review-motion"}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def resolve_input(value):
    path = Path(value)
    return (ROOT / path).resolve() if not path.is_absolute() else path.resolve()


def package(manifest_path):
    spec = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    asset_id = spec["assetId"]
    if not re.fullmatch(r"[a-z][a-z0-9-]{1,63}", asset_id):
        raise ValueError("assetId must be 2–64 lowercase letters/digits/hyphens")
    profile = spec["profile"]
    animated = profile in ("player", "creature")
    model = resolve_input(spec["model"])
    source_dir = ROOT / "art" / "source" / asset_id
    game_dir = ROOT / "assets" / "models" / asset_id
    if source_dir.exists() or game_dir.exists():
        raise ValueError("Refusing to overwrite an existing source or runtime package; use a new asset revision ID")
    files, roles = [], set()
    for entry in spec["sourceFiles"]:
        role, path = entry["role"], resolve_input(entry["path"])
        if role not in ALLOWED_ROLES or role in roles:
            raise ValueError(f"Unknown or duplicate source role: {role}")
        if not path.is_file():
            raise ValueError(f"Missing source file: {path}")
        roles.add(role)
        files.append((role, path))
    required = {"reference", "raw", "generation", "optimization", "reference-review", "model-review"}
    if animated:
        required |= {"blend", "rig-profile", "rig-report", "motion-review"}
    if required - roles:
        raise ValueError(f"Missing source roles: {sorted(required - roles)}")
    role_paths = dict(files)
    for gate in ("reference", "model", "motion") if animated else ("reference", "model"):
        review = spec["reviews"][gate]
        if review.get("status") != "pass" or not review.get("reviewer"):
            raise ValueError(f"{gate} review must explicitly pass and identify its reviewer")
        reviewed_file = role_paths["reference"] if gate == "reference" else model
        if review.get("sha256") != digest(reviewed_file):
            raise ValueError(f"{gate} review must identify the SHA256 of the exact reviewed file")
    scale = spec.get("scale", 1)
    pivot = spec.get("pivot", {"x": 0, "y": 0, "z": 0})
    if not isinstance(scale, (int, float)) or not math.isfinite(scale) or scale <= 0:
        raise ValueError("scale must be finite and positive")
    if not isinstance(pivot, dict) or any(not isinstance(pivot.get(axis), (int, float)) or not math.isfinite(pivot[axis]) for axis in ("x", "y", "z")):
        raise ValueError("pivot must contain finite x, y and z values")
    clips = list(spec.get("clips", {}).values())
    if animated and not clips:
        raise ValueError("Animated assets need an explicit runtime state-to-clip mapping")
    for state, speed in spec.get("locomotion", {}).items():
        if state not in ("walk", "run", "sneak") or state not in spec.get("clips", {}) or not isinstance(speed, (int, float)) or not math.isfinite(speed) or speed <= 0:
            raise ValueError("Locomotion speeds require a mapped movement clip and positive finite meters per second")
    module_spec = importlib.util.spec_from_file_location("game_glb_check", ROOT / "tools/art/check-game-glb.py")
    checker = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(checker)
    report = checker.check(model, profile, {}, clips)
    if not report["ok"]:
        raise ValueError("GLB admission failed: " + "; ".join(report["failures"]))
    # All inputs, gates, and destinations are checked before any package writes.
    source_dir.mkdir(parents=True)
    game_dir.mkdir(parents=True)
    recorded = []
    for role, path in files:
        target = source_dir / (role + path.suffix.lower())
        shutil.copyfile(path, target)
        recorded.append({"role": role, "path": target.relative_to(ROOT).as_posix(), "bytes": target.stat().st_size, "sha256": digest(target)})
    output_model = game_dir / "model.glb"
    shutil.copyfile(model, output_model)
    descriptor = {"path": output_model.relative_to(ROOT).as_posix(), "scale": scale, "pivot": pivot}
    if clips:
        descriptor["clips"] = spec["clips"]
    if "locomotion" in spec:
        descriptor["locomotion"] = spec["locomotion"]
    receipt = {"assetId": asset_id, "profile": profile, "createdUtc": datetime.now(timezone.utc).isoformat(), "model": descriptor, "modelSHA256": digest(output_model), "modelBytes": output_model.stat().st_size, "sources": recorded, "reviews": spec["reviews"], "provenance": spec.get("provenance", {}), "admission": report, "note": "Admission does not establish physical-phone performance or owner art acceptance."}
    (source_dir / "asset.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    (source_dir / "admission-request.json").write_text(json.dumps(spec, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"source": str(source_dir), "model": descriptor, "counts": report["counts"], "bytes": output_model.stat().st_size}, indent=2))
    return receipt


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    package(args.manifest.resolve())
