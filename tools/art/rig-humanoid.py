"""Build an Explorer-specific direct humanoid rig from a reviewed textured GLB.

This does not generalize image-to-3D humanoid rigging: it consumes the explicit
landmarks in tools/art/rigs/explorer.json, preserves the input UV/Base Color,
and exports the runtime's named in-place clips.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


LOCOMOTION_SPECS = {
    "Sneak": {"speed": 1.6, "cycle": .60, "support": .40, "lead": .192, "crouch": -.115, "bob": .006, "arm_swing": .24},
    "Walk": {"speed": 3.3, "cycle": .50, "support": .32, "lead": .264, "crouch": -.112, "bob": .010, "arm_swing": .43},
    "Run": {"speed": 6.0, "cycle": .48, "support": 1.0 / 6.0, "lead": .240, "crouch": -.120, "bob": .012, "arm_swing": .68},
}


def load_base():
    path = Path(__file__).with_name("rig-character.py")
    spec = importlib.util.spec_from_file_location("wildkin_direct_rig", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def args():
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--profile", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--allow-existing", action="store_true")
    parser.add_argument("--resolution", type=int, default=640)
    return parser.parse_args(values)


def key_pose(rig, frame, values):
    bpy.context.scene.frame_set(frame)
    for bone in rig.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0, 0, 0)
        bone.location = (0, 0, 0)
    for name, rotation in values.items():
        rig.pose.bones[name].rotation_euler = rotation
    for bone in rig.pose.bones:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
    hips = rig.pose.bones["Hips"]
    hips.location = (0, 0, 0)
    hips.keyframe_insert(data_path="location", frame=frame, group="Hips")


def action(rig, name, poses):
    if not rig.animation_data:
        rig.animation_data_create()
    created = bpy.data.actions.new(name)
    rig.animation_data.action = created
    for frame, values in poses:
        key_pose(rig, frame, values)
    return created


def smoothstep(value):
    value = min(1.0, max(0.0, value))
    return value * value * (3.0 - 2.0 * value)


def rotate_x(vector, angle):
    """Rotate a rest-space vector about Blender X (runtime forward is +Z)."""
    cosine, sine = math.cos(angle), math.sin(angle)
    return Vector((vector.x, vector.y * cosine - vector.z * sine, vector.y * sine + vector.z * cosine))


def foot_trajectory(phase, speed, cycle, support, lead, rest_tail_y):
    """Return a looping local foot target with an explicit planted interval.

    The character controller supplies world translation.  During stance the
    local target moves backward exactly at controller speed, which makes the
    corresponding world-space foot stay fixed.  Blender +Y becomes glTF / the
    game's +Z on export.
    """
    planted_distance = speed * cycle * support
    if phase <= support:
        return rest_tail_y + lead - speed * cycle * phase, 0.0, True
    swing = (phase - support) / (1.0 - support)
    eased = smoothstep(swing)
    y = rest_tail_y + lead - planted_distance + (planted_distance + speed * cycle * (1.0 - support)) * eased
    # A modest arc remains readable at the small Explorer scale without
    # overextending the knee.  It is zero at both contacts.
    return y, 0.115 * math.sin(math.pi * swing), False


def solve_leg_ik(rig, upper_name, lower_name, foot_name, tail_target, foot_pitch, hips_height):
    """Analytic sagittal two-bone IK, baked as ordinary bone rotations.

    No Blender constraint survives into the GLB: every frame receives direct
    FK rotations.  The target is the sole/tail of the foot bone so contact
    samples land at the original ground height.
    """
    upper = rig.data.bones[upper_name]
    lower = rig.data.bones[lower_name]
    foot = rig.data.bones[foot_name]
    ankle_target = tail_target - rotate_x(foot.tail_local - foot.head_local, foot_pitch)
    hip = upper.head_local + Vector((0.0, 0.0, hips_height))
    delta = ankle_target - hip
    distance = math.sqrt(delta.y * delta.y + delta.z * delta.z)
    first, second = upper.length, lower.length
    distance = min(first + second - 0.002, max(abs(first - second) + 0.002, distance))
    direction = math.atan2(delta.y, -delta.z)
    hip_angle = math.acos(min(1.0, max(-1.0, (first * first + distance * distance - second * second) / (2.0 * first * distance))))
    upper_angle = direction + hip_angle
    knee = Vector((hip.x, hip.y + first * math.sin(upper_angle), hip.z - first * math.cos(upper_angle)))
    lower_delta = ankle_target - knee
    lower_angle = math.atan2(lower_delta.y, -lower_delta.z)
    return upper_angle, lower_angle, foot_pitch, hip, knee, ankle_target


def set_bone_world_x_rotation(pose_bone, rest_bone, head, angle):
    """Set an FK bone from a world-space X angle without rest-axis guessing."""
    rest_orientation = rest_bone.matrix_local.to_3x3().to_4x4()
    pose_bone.matrix = Matrix.Translation(head) @ Matrix.Rotation(angle, 4, "X") @ rest_orientation


def key_locomotion_pose(rig, frame, spec, time_seconds):
    # Blender permits fractional key times but Scene.frame_set itself takes an
    # integer frame.  The pose is assigned immediately before insertion.
    bpy.context.scene.frame_set(int(round(frame)))
    for bone in rig.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0, 0, 0)
        bone.location = (0, 0, 0)
    cycle_phase = (time_seconds / spec["cycle"]) % 1.0
    crouch = spec["crouch"]
    bob = spec["bob"] * math.cos(cycle_phase * math.tau * 2.0)
    hips = rig.pose.bones["Hips"]
    hips.location.z = crouch + bob
    rig.pose.bones["Spine"].rotation_euler.x = crouch * 0.70 + bob * 0.18
    rig.pose.bones["Chest"].rotation_euler.x = -crouch * 0.38 - bob * 0.12
    rig.pose.bones["Head"].rotation_euler.x = -crouch * 0.24

    for side, offset in (("Right", 0.0), ("Left", 0.5)):
        phase = (cycle_phase + offset) % 1.0
        tail_y, lift, planted = foot_trajectory(phase, spec["speed"], spec["cycle"], spec["support"], spec["lead"], rig.data.bones[f"{side}Foot"].tail_local.y)
        foot = rig.data.bones[f"{side}Foot"]
        target = Vector((foot.tail_local.x, tail_y, foot.tail_local.z + lift))
        # A slight toe-up swing makes the airborne phase legible.  Contacts
        # are flat so they do not skate through the ground.
        foot_pitch = 0.0 if planted else -0.32 * math.sin(math.pi * ((phase - spec["support"]) / (1.0 - spec["support"])))
        upper_angle, lower_angle, global_foot_angle, hip, knee, ankle = solve_leg_ik(
            rig, f"{side}UpperLeg", f"{side}LowerLeg", f"{side}Foot", target, foot_pitch, crouch + bob
        )
        # The hierarchy's imported rest axes point consistently down the
        # sagittal plane, so bake the analytic angles directly into portable
        # Euler tracks (rather than leaving Blender IK constraints behind).
        rig.pose.bones[f"{side}UpperLeg"].rotation_euler.x = upper_angle
        rig.pose.bones[f"{side}LowerLeg"].rotation_euler.x = lower_angle - upper_angle
        rig.pose.bones[f"{side}Foot"].rotation_euler.x = global_foot_angle - lower_angle

        arm_phase = math.sin((cycle_phase + offset) * math.tau)
        arm = rig.pose.bones[f"{side}UpperArm"]
        forearm = rig.pose.bones[f"{side}ForeArm"]
        hand = rig.pose.bones[f"{side}Hand"]
        # Oppose the same-side leg, with elbow follow-through rather than
        # frozen arms.  The original distal hands remain rigidly weighted.
        arm.rotation_euler.x = -spec["arm_swing"] * arm_phase + crouch * 0.20
        forearm.rotation_euler.x = -0.22 - 0.16 * max(0.0, -arm_phase)
        hand.rotation_euler.x = 0.08 * arm_phase

    for bone in rig.pose.bones:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
    hips.keyframe_insert(data_path="location", frame=frame, group="Hips")


def locomotion(rig, name, spec):
    if not rig.animation_data:
        rig.animation_data_create()
    created = bpy.data.actions.new(name)
    rig.animation_data.action = created
    # Include exact stance edges and enough swing samples to keep the foot arc
    # smooth after export.  The last sample repeats phase zero for seamless
    # looping; action time is the authored real-world cycle duration.
    phases = sorted(set([0.0, spec["support"], 0.5, 1.0] + [index / 16.0 for index in range(17)]))
    for phase in phases:
        key_locomotion_pose(rig, 1.0 + phase * spec["cycle"] * 25.0, spec, phase * spec["cycle"])
    for curve in created.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"
    return created


def locomotion_metrics(rig):
    """Measure the baked feet at both boundaries of each stance window."""
    measured = {}
    for name, spec in LOCOMOTION_SPECS.items():
        rig.animation_data.action = bpy.data.actions[name]
        contacts = {}
        for side, offset in (("Right", 0.0), ("Left", 0.5)):
            start_phase = (-offset) % 1.0
            end_phase = (start_phase + spec["support"]) % 1.0
            samples = []
            for phase in (start_phase, end_phase):
                frame = 1.0 + phase * spec["cycle"] * 25.0
                bpy.context.scene.frame_set(int(frame), subframe=frame - int(frame))
                tail = rig.pose.bones[f"{side}Foot"].tail.copy()
                samples.append([round(value, 6) for value in tail])
            contacts[side] = {
                "stance_tail_blender_yz": [[item[1], item[2]] for item in samples],
                "local_y_travel_m": round(samples[1][1] - samples[0][1], 6),
                "expected_controller_travel_m": round(spec["speed"] * spec["cycle"] * spec["support"], 6),
                "sole_height_error_m": round(max(abs(item[2]) for item in samples), 6),
            }
        measured[name.lower()] = {"cycle_seconds": spec["cycle"], "support_seconds_per_foot": round(spec["cycle"] * spec["support"], 6), "contacts": contacts}
    return measured


def make_clips(rig):
    clips = {}
    clips["Idle"] = action(rig, "Idle", [(1, {"Chest": (.015,0,0),"Head":(-.02,0,0)}),(13,{"Chest":(-.015,0,0),"Head":(.02,0,0)}),(25,{"Chest":(.015,0,0),"Head":(-.02,0,0)})])
    # The compact legs are about 0.40 m hip-to-ankle after scale.  Lowering
    # the pelvis during locomotion leaves room for the controller-speed stance
    # travel; the lead is centred over each planted distance to avoid an
    # unreachable extreme contact pose.
    clips["Sneak"] = locomotion(rig, "Sneak", LOCOMOTION_SPECS["Sneak"])
    clips["Walk"] = locomotion(rig, "Walk", LOCOMOTION_SPECS["Walk"])
    clips["Run"] = locomotion(rig, "Run", LOCOMOTION_SPECS["Run"])
    clips["Jump"] = action(rig, "Jump", [(1, {}),(6,{"Spine":(.18,0,0),"RightUpperLeg":(.28,0,0),"LeftUpperLeg":(.28,0,0)}),(12,{"Spine":(-.16,0,0),"RightUpperLeg":(-.35,0,0),"LeftUpperLeg":(-.35,0,0),"RightUpperArm":(.18,0,0),"LeftUpperArm":(.18,0,0)}),(18,{})])
    clips["Fall"] = action(rig, "Fall", [(1,{"Spine":(.10,0,0),"RightUpperArm":(.32,0,0),"LeftUpperArm":(.32,0,0),"RightUpperLeg":(-.12,0,0),"LeftUpperLeg":(-.12,0,0)}),(25,{"Spine":(.10,0,0),"RightUpperArm":(.32,0,0),"LeftUpperArm":(.32,0,0),"RightUpperLeg":(-.12,0,0),"LeftUpperLeg":(-.12,0,0)})])
    clips["Dodge"] = action(rig, "Dodge", [(1,{}),(5,{"Spine":(.28,0,0),"Head":(-.18,0,0),"RightUpperLeg":(.35,0,0),"LeftUpperLeg":(.35,0,0),"RightUpperArm":(-.25,0,0),"LeftUpperArm":(-.25,0,0)}),(12,{})])
    clips["Climb"] = action(rig, "Climb", [(1,{"Spine":(.10,0,0),"RightUpperLeg":(.18,0,0),"LeftUpperLeg":(-.12,0,0)}),(13,{"Spine":(.10,0,0),"RightUpperLeg":(-.12,0,0),"LeftUpperLeg":(.18,0,0)}),(25,{"Spine":(.10,0,0),"RightUpperLeg":(.18,0,0),"LeftUpperLeg":(-.12,0,0)})])
    clips["Mantle"] = action(rig, "Mantle", [(1,{"Spine":(.10,0,0),"Chest":(.10,0,0)}),(8,{"Spine":(-.30,0,0),"Chest":(-.16,0,0),"RightUpperLeg":(.32,0,0),"LeftUpperLeg":(.32,0,0)}),(16,{})])
    # The authored strike lands at frame 10 of 1--20 (about 47%), matching
    # the runtime tool-impact window while keeping the clip root in-place.
    # The tool will attach to RightHand at runtime; arm motion remains out of
    # this preliminary clip until the source's thin finger fan has a robust
    # topology repair.
    clips["Attack"] = action(rig, "Attack", [
        (1, {}),
        (7, {"Spine": (.10,0,0), "Chest": (.12,0,0), "Head": (-.06,0,0),
             "RightUpperArm": (-.62,0,0), "RightForeArm": (-.42,0,0), "RightHand": (.12,0,0),
             "LeftUpperArm": (.26,0,0), "LeftForeArm": (-.18,0,0)}),
        (10, {"Spine": (-.18,0,0), "Chest": (-.22,0,0), "Head": (.10,0,0), "RightUpperLeg": (.12,0,0), "LeftUpperLeg": (.12,0,0),
              "RightUpperArm": (.78,0,0), "RightForeArm": (.48,0,0), "RightHand": (-.18,0,0),
              "LeftUpperArm": (-.20,0,0), "LeftForeArm": (-.30,0,0)}),
        (20, {})
    ])
    clips["Hurt"] = action(rig, "Hurt", [(1,{}),(5,{"Spine":(.22,0,0),"Head":(.24,0,0),"RightUpperArm":(.18,0,0),"LeftUpperArm":(.18,0,0)}),(12,{})])
    return clips


def lock_distal_hands(mesh, rig):
    """Keep the small, separate finger geometry rigid with its hand.

    This Explorer's generated topology joins some fingers through UV/seam
    duplicates to broad limb surfaces. A pure distance blend made those thin
    details visibly elongate under arm rotation. The profile is deliberately
    character-specific, so its known distal-hand volumes can use one hand
    influence rather than pretending this is a general humanoid solution.
    """
    assignments = {"RightHand": [], "LeftHand": []}
    right_hand = rig.data.bones["RightHand"]
    left_hand = rig.data.bones["LeftHand"]
    for vertex in mesh.data.vertices:
        point = vertex.co
        if point.x <= right_hand.head_local.x + 0.10 and right_hand.tail_local.z - 0.16 <= point.z <= right_hand.head_local.z + 0.20:
            assignments["RightHand"].append(vertex.index)
        elif point.x >= left_hand.head_local.x - 0.10 and left_hand.tail_local.z - 0.16 <= point.z <= left_hand.head_local.z + 0.20:
            assignments["LeftHand"].append(vertex.index)
    groups = {group.name: group for group in mesh.vertex_groups}
    for hand, indices in assignments.items():
        for group in groups.values():
            group.remove(indices)
        groups[hand].add(indices, 1.0, "REPLACE")
    return {name: len(indices) for name, indices in assignments.items()}


def render_peaks(base, rig, mesh, output, resolution):
    base.setup_review(mesh, resolution)
    evidence = []
    for name, frame in (("Idle",13),("Walk",7),("Run",7),("Sneak",7),("Jump",12),("Fall",1),("Dodge",5),("Climb",13),("Mantle",8),("Attack",10),("Hurt",5)):
        rig.animation_data.action = bpy.data.actions[name]
        bpy.context.scene.frame_set(frame)
        path = output / f"{name.lower()}-peak.png"
        bpy.context.scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        evidence.append(path.name)
    return evidence


def render_locomotion_footage(base, rig, mesh, output):
    """Render complete, in-place cycles from front, side, and 3/4 cameras."""
    scene = bpy.context.scene
    camera = scene.camera
    minimum, maximum = base.local_bounds(mesh.data)
    extent = maximum - minimum
    largest = max(extent.x, extent.y, extent.z, .01)
    target = Vector(((minimum.x + maximum.x) * .5, (minimum.y + maximum.y) * .5, minimum.z + extent.z * .52))
    original_size = (scene.render.resolution_x, scene.render.resolution_y)
    scene.render.resolution_x = scene.render.resolution_y = 360
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    footage = []
    views = {
        "front": Vector((0, -largest * 2.55, largest * .48)),
        "side": Vector((largest * 2.55, 0, largest * .48)),
        "three-quarter": Vector((largest * .75, -largest * 2.4, largest * .72)),
    }
    for clip, spec in LOCOMOTION_SPECS.items():
        rig.animation_data.action = bpy.data.actions[clip]
        scene.frame_start = 1
        scene.frame_end = int(math.floor(1.0 + spec["cycle"] * 25.0 - .001))
        for view, offset in views.items():
            camera.location = target + offset
            base.look_at(camera, target)
            destination = output / f"{clip.lower()}-cycle-{view}.mp4"
            scene.render.filepath = str(destination)
            bpy.ops.render.render(animation=True)
            footage.append(destination.name)
    scene.render.resolution_x, scene.render.resolution_y = original_size
    scene.render.image_settings.file_format = "PNG"
    return footage


def render_deformed_hand_closeups(base, rig, mesh, output, resolution):
    """Proof that the source hands survive actual arm deformation, not rest only."""
    scene = bpy.context.scene
    camera = scene.camera
    scene.render.resolution_x = scene.render.resolution_y = resolution
    proofs = []
    for label, action_name, frame, offset in (
        ("attack-hands-front", "Attack", 10, Vector((0, -.65, .10))),
        ("attack-hands-side", "Attack", 10, Vector((.65, 0, .10))),
        ("run-hands-three-quarter", "Run", 7, Vector((.45, -.55, .22))),
    ):
        rig.animation_data.action = bpy.data.actions[action_name]
        scene.frame_set(frame)
        # Use the evaluated animated wrists, not rest-pose coordinates, so a
        # strike close-up actually follows the moving hands.
        target = (rig.pose.bones["RightHand"].head + rig.pose.bones["LeftHand"].head) * .5
        camera.location = target + offset
        base.look_at(camera, target)
        path = output / f"{label}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        proofs.append(path.name)
    return proofs


def main():
    options = args(); base = load_base()
    source = options.input.resolve(); profile_path = options.profile.resolve(); output = options.output_dir.resolve()
    if not source.is_file() or not profile_path.is_file(): raise ValueError("Input and profile must exist")
    if output.exists() and any(output.iterdir()) and not options.allow_existing: raise ValueError("Output directory must be fresh")
    output.mkdir(parents=True, exist_ok=True); profile = json.loads(profile_path.read_text(encoding="utf-8"))
    base.reset_scene(); mesh = base.import_one_mesh(source)
    mesh.data.transform(mesh.matrix_world); mesh.matrix_world = Matrix.Identity(4)
    raw_min, raw_max = base.local_bounds(mesh.data); materials = base.prepare_material(mesh)
    matrix, scale = base.profile_transform(profile, raw_min, raw_max); mesh.data.transform(matrix); mesh.data.update()
    rig = base.make_armature(profile, matrix)
    weights = base.assign_weights(mesh, rig, profile)
    weights["rigid_distal_hand_vertices"] = lock_distal_hands(mesh, rig)
    if weights["zero_weight_vertices"] or weights["max_influences"] > 4: raise RuntimeError(f"Weight failure: {weights}")
    bpy.context.scene.render.fps = 25
    clips = make_clips(rig)
    evidence = render_peaks(base, rig, mesh, output, options.resolution)
    footage = render_locomotion_footage(base, rig, mesh, output)
    hand_deformation_evidence = render_deformed_hand_closeups(base, rig, mesh, output, options.resolution)
    gait_metrics = locomotion_metrics(rig)
    bpy.ops.wm.save_as_mainfile(filepath=str(output / "explorer-rig.blend"))
    glb = output / "model.glb"; bpy.ops.object.select_all(action="DESELECT"); mesh.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_materials="EXPORT",export_normals=True,export_texcoords=True,export_attributes=True,export_animations=True,export_animation_mode="ACTIONS",export_nla_strips=False,export_anim_slide_to_zero=True)
    roundtrip = base.run_roundtrip_worker(glb, [item["name"] for item in profile["bones"]], output / "roundtrip-import.json")
    if roundtrip["missing_expected_bones"] or roundtrip["zero_weight_vertices"] or roundtrip["max_influences"] > 4:
        raise RuntimeError(f"Round-trip rig failure: {roundtrip}")
    returned_actions = {entry["name"] for entry in roundtrip["actions"]}
    missing_clips = set(profile["clips"]) - returned_actions
    if missing_clips:
        raise RuntimeError(f"Round-trip missing clips: {sorted(missing_clips)}")
    report = {"profile":profile["profile"],"input":str(source),"input_sha256":base.sha256(source),"height_meters":profile["runtime_height_meters"],"source_face_axis":profile["source_axes"]["face"],"runtime_forward":"+Z","feet":"Y=0 after glTF export","weights":weights,"bones":[item["name"] for item in profile["bones"]],"clips":{name:list(value.frame_range) for name,value in clips.items()},"locomotion":profile["locomotion"],"gait_measurements":gait_metrics,"materials":materials,"evidence":evidence,"locomotion_footage":footage,"hand_deformation_evidence":hand_deformation_evidence,"editable":"explorer-rig.blend","glb":{"file":"model.glb","sha256":base.sha256(glb),"bytes":glb.stat().st_size},"roundtrip":roundtrip,"runtime_descriptor_candidate":{"path":"assets/models/explorer/model.glb","scale":1,"pivot":{"x":0,"y":0,"z":0},"clips":{"idle":"Idle","walk":"Walk","run":"Run","sneak":"Sneak","jump":"Jump","fall":"Fall","dodge":"Dodge","climb":"Climb","mantle":"Mantle","attack":"Attack","hurt":"Hurt"},"locomotion":profile["runtime_locomotion"]}}
    (output / "rig-report.json").write_text(json.dumps(report,indent=2),encoding="utf-8"); print(json.dumps(report,indent=2))

if __name__ == "__main__": main()
