"""Rig only the independently reviewed mossling-neutral-v1 generated mesh.

This wrapper keeps the proven UV-preserving import/export and four-weight
checks in ``rig-character.py`` but supplies its own measured landmarks and
gait.  It deliberately does not claim arbitrary-quadruped auto-rigging.
"""

from __future__ import annotations

import importlib.util
import json
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parent
BASE_PATH = ROOT / "rig-character.py"
SPEC = importlib.util.spec_from_file_location("_mossling_rig_base", BASE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Unable to load shared rig helper: {BASE_PATH}")
base = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = base
SPEC.loader.exec_module(base)


def _pose(phase: float, sign: float) -> tuple[float, float, float]:
    """A compact diagonal walk for the actual -Y-facing neutral source.

    X rotation swings the vertically oriented limbs fore/aft in the neutral
    Blender pose.  The retained paw translation is deliberately short: it
    provides a readable planted/recovery distinction without asking short
    limbs to imitate the previous wide, long-stride gait.
    """
    swing = phase * sign
    stance = max(swing, 0.0)
    recovery = max(-swing, 0.0)
    return (
        0.42 * swing + 0.10 * recovery,
        -0.49 * stance - 0.50 * recovery,
        0.24 * recovery,
    )


def key_pose(rig: bpy.types.Object, frame: int, values: dict[str, tuple[float, float, float]], locations: dict[str, tuple[float, float, float]] | None = None) -> None:
    """Local keying with a vertical-only root bob for quadruped flight.

    The shared helper deliberately zeros its root after applying locations.
    That is right for its original no-bob test, but would silently erase the
    visible run flight required here. Root X/Y stay exactly zero: motion in the
    real game remains authoritative and the clip cannot accumulate horizontal
    travel.
    """
    bpy.context.scene.frame_set(frame)
    for bone in rig.pose.bones:
        base.set_rotation(bone)
        bone.location = (0.0, 0.0, 0.0)
    for name, rotation in values.items():
        base.set_rotation(rig.pose.bones[name], *rotation)
    for name, location in (locations or {}).items():
        rig.pose.bones[name].location = location
    root = rig.pose.bones["root"]
    root.location.x = 0.0
    root.location.y = 0.0
    for bone in rig.pose.bones:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
        if locations and bone.name in locations:
            bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
    root.keyframe_insert(data_path="location", frame=frame, group="root")


def _smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


_shared_prepare_material = base.prepare_material


def prepare_material(mesh_object: bpy.types.Object) -> list[dict]:
    """Optionally make a small, texture/UV-preserving silhouette refinement.

    It is intentionally local to the neutral Mossling experiment: a little
    more body length and haunch width, plus a tapered muzzle. It never changes
    UVs, topology, materials or limb lengths. The source master remains intact.
    """
    if os.environ.get("MOSS_NEUTRAL_SCULPT") == "v2":
        for vertex in mesh_object.data.vertices:
            point = vertex.co
            # Taper/extend only the facial front, keeping eye/ear territory
            # outside the strongest taper to retain the approved identity.
            muzzle = _smoothstep((-point.y - 0.28) / 0.16) * _smoothstep((point.z + 0.12) / 0.16) * _smoothstep((0.34 - point.z) / 0.16)
            point.x *= 1.0 - 0.14 * muzzle
            point.y -= 0.045 * muzzle
            # Lengthen only the torso-to-haunch volume. The falloff protects
            # the forelimbs, paws and high leaf tail from a global stretch.
            haunch = _smoothstep((point.y + 0.02) / 0.20) * (1.0 - _smoothstep((point.y - 0.39) / 0.10))
            body_band = _smoothstep((point.z + 0.27) / 0.12) * (1.0 - _smoothstep((point.z - 0.22) / 0.12))
            point.y += 0.090 * haunch * body_band
            point.x *= 1.0 + 0.075 * haunch * body_band
        mesh_object.data.update()
    return _shared_prepare_material(mesh_object)


def make_actions(rig: bpy.types.Object) -> dict[str, list[int]]:
    created: dict[str, list[int]] = {}

    idle = base.new_action(rig, "Idle")
    for frame, phase in ((1, 1.0), (13, -1.0), (25, 1.0)):
        base.key_pose(rig, frame, {
            "spine": (0.014 * phase, 0, 0),
            "neck": (-0.022 * phase, 0, 0),
            "head": (-0.012 * phase, 0, 0),
            "tail_01": (0, 0, 0.030 * phase),
            "tail_02": (0, 0, 0.052 * phase),
            "tail_03": (0, 0, 0.075 * phase),
        })
    created[idle.name] = [1, 25]

    walk = base.new_action(rig, "Walk")
    diagonal_a = (("front_upper.L", "front_lower.L", "front_paw.L"), ("rear_upper.R", "rear_lower.R", "rear_paw.R"))
    diagonal_b = (("front_upper.R", "front_lower.R", "front_paw.R"), ("rear_upper.L", "rear_lower.L", "rear_paw.L"))
    for frame, phase in ((1, 1.0), (3, 0.5), (5, 0.0), (7, -1.0), (9, -0.5), (11, 0.0), (13, 1.0)):
        values: dict[str, tuple[float, float, float]] = {
            "spine": (0.016 * phase, 0, 0),
            "neck": (-0.020 * phase, 0, 0),
            "head": (-0.012 * phase, 0, 0),
            "tail_01": (0, 0, 0.034 * phase),
            "tail_02": (0, 0, 0.056 * phase),
            "tail_03": (0, 0, 0.080 * phase),
        }
        locations: dict[str, tuple[float, float, float]] = {}
        for group, sign in ((diagonal_a, 1.0), (diagonal_b, -1.0)):
            for upper, lower, paw in group:
                upper_x, lower_x, paw_x = _pose(phase, sign)
                values[upper] = (upper_x, 0, 0)
                values[lower] = (lower_x, 0, 0)
                values[paw] = (paw_x, 0, 0)
                # The source faces Blender -Y (glTF runtime +Z).  During the
                # planted half the foot moves a modest distance back (+Y),
                # then returns forward (-Y) while lifted.
                locations[paw] = (0.0, 0.145 * phase * sign, 0.0)
        key_pose(rig, frame, values, locations)
    created[walk.name] = [1, 13]

    run = base.new_action(rig, "Run")
    def bound_values(frame_phase: float, fore: float, rear: float, crouch: float) -> dict[str, tuple[float, float, float]]:
        values: dict[str, tuple[float, float, float]] = {
            "spine": (0.095 * crouch, 0, 0),
            "neck": (-0.125 * crouch, 0, 0),
            "head": (-0.075 * crouch, 0, 0),
            "tail_01": (0, 0, -0.13 * crouch),
            "tail_02": (0, 0, -0.20 * crouch),
            "tail_03": (0, 0, -0.28 * crouch),
        }
        for side in ("L", "R"):
            values[f"front_upper.{side}"] = (0.82 * fore, 0, 0)
            values[f"front_lower.{side}"] = (-0.85 * abs(fore) - 0.42 * max(-fore, 0), 0, 0)
            values[f"front_paw.{side}"] = (0.47 * max(-fore, 0), 0, 0)
            values[f"rear_upper.{side}"] = (0.84 * rear, 0, 0)
            values[f"rear_lower.{side}"] = (-0.82 * abs(rear) - 0.42 * max(-rear, 0), 0, 0)
            values[f"rear_paw.{side}"] = (0.44 * max(-rear, 0), 0, 0)
        return values

    # A compact two-support bounding loop for the 4 m/s flee state.  Unlike
    # the old animation, it is authored around this mesh's correct head/body
    # direction and modest limb lengths, with a clearly inspectable flight.
    for frame, fore, rear, crouch in (
        (1, 0.78, -0.72, -0.55),   # rear drive / fore reach
        (3, 0.50, -0.12, 0.10),    # rear contact
        (5, -0.34, 0.28, 0.85),    # flight, all paws tucked
        (7, -0.08, 0.76, -0.15),   # fore contact / rear recovers
        (9, 0.30, -0.20, 0.78),    # second compact flight
        (11, 0.78, -0.72, -0.55),
    ):
        values = bound_values(float(frame), fore, rear, crouch)
        locations = {}
        for side in ("L", "R"):
            locations[f"front_paw.{side}"] = (0.0, 0.20 * fore, 0.0)
            locations[f"rear_paw.{side}"] = (0.0, 0.20 * rear, 0.0)
        # A real flight is a vertical root excursion only.  The exact end pose
        # returns to root Z=0, avoiding any accumulated world travel.
        locations["root"] = (0.0, 0.0, 0.105 if frame in (5, 9) else (0.025 if frame in (3, 7) else 0.0))
        key_pose(rig, frame, values, locations)
    created[run.name] = [1, 11]

    attack = base.new_action(rig, "Attack")
    for frame, values in (
        (1, {}),
        (6, {"spine": (-0.055, 0, 0), "neck": (-0.14, 0, 0), "head": (-0.16, 0, 0), "tail_01": (0, 0, -0.06), "tail_02": (0, 0, -0.10), "tail_03": (0, 0, -0.14)}),
        (11, {"spine": (0.12, 0, 0), "neck": (0.25, 0, 0), "head": (0.31, 0, 0), "front_upper.L": (-0.17, 0, 0), "front_upper.R": (-0.17, 0, 0), "front_lower.L": (0.13, 0, 0), "front_lower.R": (0.13, 0, 0), "tail_01": (0, 0, 0.10), "tail_02": (0, 0, 0.15), "tail_03": (0, 0, 0.19)}),
        (18, {}),
    ):
        key_pose(rig, frame, values)
    created[attack.name] = [1, 18]

    hurt = base.new_action(rig, "Hurt")
    for frame, values in (
        (1, {}),
        (5, {"spine": (-0.10, 0, 0), "neck": (-0.18, 0, 0), "head": (-0.22, 0, 0), "tail_01": (0, 0, -0.10), "tail_02": (0, 0, -0.15), "tail_03": (0, 0, -0.20)}),
        (12, {}),
    ):
        key_pose(rig, frame, values)
    created[hurt.name] = [1, 12]
    return created


def render_proof(rig: bpy.types.Object, output: Path) -> list[str]:
    """Write complete Walk/Run cycles from front, side and three-quarter."""
    scene = bpy.context.scene
    camera = scene.camera
    if camera is None:
        raise RuntimeError("Missing proof camera")
    mesh = next(item for item in bpy.context.scene.objects if item.type == "MESH")
    minimum, maximum = base.local_bounds(mesh.data)
    extent = maximum - minimum
    largest = max(extent.x, extent.y, extent.z, 0.01)
    target = Vector(((minimum.x + maximum.x) * 0.5, (minimum.y + maximum.y) * 0.5, minimum.z + extent.z * 0.50))
    radius = largest * 2.45
    elevation = largest * 0.68
    views = (
        ("front", Vector((0.0, -radius, elevation))),
        ("three-quarter", Vector((radius * 0.72, -radius * 0.72, elevation))),
        ("side", Vector((radius, 0.0, elevation))),
    )
    output_motion = output / "motion-frames"
    output_motion.mkdir(exist_ok=True)
    renders: list[str] = []
    # Preserve readable key stills for action review.
    key_stills = (("idle", "Idle", 13), ("attack-peak", "Attack", 11), ("hurt-peak", "Hurt", 5))
    for label, action, frame in key_stills:
        rig.animation_data.action = bpy.data.actions[action]
        scene.frame_set(frame)
        camera.location = target + views[1][1]
        base.look_at(camera, target)
        destination = output / f"{label}.png"
        scene.render.filepath = str(destination)
        bpy.ops.render.render(write_still=True)
        renders.append(destination.name)
    for action, last_frame in (("Walk", 13), ("Run", 11)):
        rig.animation_data.action = bpy.data.actions[action]
        for label, offset in views:
            camera.location = target + offset
            base.look_at(camera, target)
            for frame in range(1, last_frame + 1):
                scene.frame_set(frame)
                destination = output_motion / f"{action.lower()}-{label}-{frame:02d}.png"
                scene.render.filepath = str(destination)
                bpy.ops.render.render(write_still=True)
                renders.append(str(destination.relative_to(output)))
    return renders


def output_directory() -> Path:
    supplied = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return Path(supplied[supplied.index("--output-dir") + 1]).resolve()


if __name__ == "__main__":
    base.key_pose = key_pose
    base.prepare_material = prepare_material
    base.make_actions = make_actions
    base.render_proof = render_proof
    base.main()
    report_path = output_directory() / "rig-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["tool"] = "tools/art/rig-neutral-mossling.py"
    report["neutral_anatomy_gate"] = {
        "source_axes": "head, torso, tail and all paw pairs were independently reviewed as source -Y before normalization; Blender -Y exports as game +Z.",
        "old_profile_reused": False,
        "motion_rendering": "All Walk (1-13) and Run (1-11) frames rendered from front, three-quarter and side views in motion-frames/."
    }
    report["geometry_refinement"] = {
        "enabled": os.environ.get("MOSS_NEUTRAL_SCULPT") == "v2",
        "method": "local source-space torso/haunch lengthening and muzzle taper; vertex positions only, with original UVs/topology/material retained",
        "limb_global_stretch": False,
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
