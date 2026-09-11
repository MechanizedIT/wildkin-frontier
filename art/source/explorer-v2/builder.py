"""Build an Explorer animation candidate from reviewed Mixamo FBXs.

The supported `--auto-skin` mode deliberately keeps the uploaded Explorer
surface and its 25-bone Mixamo auto-weights together, then merges actions
downloaded for that same exact rig. It restores the admitted original color
texture byte-for-byte. The older direct 16-bone retarget remains isolated as
an experimental fallback only; it is not a valid admission path after visual
review found rest-axis deformation.

The target and Mixamo skeletons have different rest scales and Blender axes.
The FBX comes back Y-up while the game rig is Z-up / faces -Y.  The source
armature is rotated +90 degrees about X so its up/forward and bone directions
coincide with the target before world-space rotations are baked.  Root travel
is never copied: Mixamo FBXs can retain large hips translation channels even
when the web UI's In Place control is enabled, so their pelvis location is not
a reliable body-bob source. Pelvis rotation supplies the visible weight shift.

The safe same-25-bone auto-skin path is the default. Run with Blender:
  blender --background --python tools/art/retarget-mixamo.py -- \
    --input assets/models/explorer-v1/model.glb --jog Jogging.fbx \
    --run Running.fbx --texture prepared/texture-0.png \
    --output-dir .dream-loop/workflow-proof/.../candidate
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import shutil
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


TARGET_BONES = (
    "Hips", "Spine", "Chest", "Head",
    "RightUpperArm", "RightForeArm", "RightHand",
    "LeftUpperArm", "LeftForeArm", "LeftHand",
    "RightUpperLeg", "RightLowerLeg", "RightFoot",
    "LeftUpperLeg", "LeftLowerLeg", "LeftFoot",
)

SOURCE_MAP = {
    "Hips": "mixamorig:Hips",
    "Spine": "mixamorig:Spine",
    # Spine2 gives the Explorer's single Chest a useful, visible upper-body
    # counter-rotation.  Spine1 is intentionally skipped rather than doubled.
    "Chest": "mixamorig:Spine2",
    "Head": "mixamorig:Head",
    "RightUpperArm": "mixamorig:RightArm", "RightForeArm": "mixamorig:RightForeArm", "RightHand": "mixamorig:RightHand",
    "LeftUpperArm": "mixamorig:LeftArm", "LeftForeArm": "mixamorig:LeftForeArm", "LeftHand": "mixamorig:LeftHand",
    "RightUpperLeg": "mixamorig:RightUpLeg", "RightLowerLeg": "mixamorig:RightLeg", "RightFoot": "mixamorig:RightFoot",
    "LeftUpperLeg": "mixamorig:LeftUpLeg", "LeftLowerLeg": "mixamorig:LeftLeg", "LeftFoot": "mixamorig:LeftFoot",
}
KEEP_ACTIONS = ("Idle", "Sneak", "Jump", "Fall", "Dodge", "Climb", "Mantle", "Attack", "Hurt")


def arguments():
    supplied = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--jog", required=True, type=Path)
    parser.add_argument("--run", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--texture", type=Path, help="Original Explorer PNG to preserve in auto-skin mode.")
    parser.add_argument("--resolution", type=int, default=480)
    parser.add_argument("--auto-skin", action="store_true", default=True, help="Compatibility flag; same-rig Mixamo auto-skin is the safe default.")
    parser.add_argument("--clip", action="append", default=[], metavar="NAME=FBX[@START:END[:SECONDS]]", help="Extra same-auto-rig Mixamo action. Optional source-frame crop and output duration resample preserve runtime timing contracts.")
    parser.add_argument("--experimental-retarget", action="store_true", help="Run the known-rejected direct 16-bone retarget experiment; never use for admission.")
    parser.add_argument("--legacy-actions", action="store_true", help="Only with --experimental-retarget; rejected legacy action transfer evidence.")
    return parser.parse_args(supplied)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.actions, bpy.data.armatures, bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def bounds(objects):
    points = [obj.matrix_world @ point.co for obj in objects for point in obj.data.vertices]
    if not points:
        raise RuntimeError("No mesh vertices found")
    return Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points))), Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))


def find_armature(objects):
    rigs = [item for item in objects if item.type == "ARMATURE"]
    if len(rigs) != 1:
        raise RuntimeError(f"Expected one armature, found {[item.name for item in rigs]}")
    return rigs[0]


def import_target(path):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = [item for item in bpy.context.scene.objects if item not in before]
    rig = find_armature(imported)
    mesh = next((item for item in imported if item.type == "MESH" and item.modifiers.get("Armature")), None)
    if not mesh:
        raise RuntimeError("Target GLB did not import an armature-bound mesh")
    missing = [bone for bone in TARGET_BONES if bone not in rig.data.bones]
    if missing:
        raise RuntimeError(f"Target Explorer rig is not the expected fitted rig: {missing}")
    actions = {action.name: action for action in bpy.data.actions if action.name in set(KEEP_ACTIONS) | {"Walk", "Run"}}
    if set(actions) != set(KEEP_ACTIONS) | {"Walk", "Run"}:
        raise RuntimeError(f"Target has wrong action set: {sorted(actions)}")
    return rig, mesh, actions


def import_mixamo(path):
    before_objects = set(bpy.context.scene.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=str(path), use_anim=True)
    imported = [item for item in bpy.context.scene.objects if item not in before_objects]
    rig = find_armature(imported)
    actions = [item for item in bpy.data.actions if item not in before_actions]
    if len(actions) != 1:
        raise RuntimeError(f"Expected one Mixamo action in {path.name}, found {[item.name for item in actions]}")
    action = actions[0]
    missing = [source for source in SOURCE_MAP.values() if source not in rig.data.bones]
    if missing:
        raise RuntimeError(f"Mixamo FBX lacks required biped bones: {sorted(set(missing))}")
    source_meshes = [item for item in imported if item.type == "MESH"]
    # Mixamo action packs commonly contain one WITH SKIN rest file and
    # skeleton-only clips. A same-rig clip needs no duplicate mesh; only the
    # primary auto-skin import needs a surface to export.
    mesh_height = None
    if source_meshes:
        low, high = bounds(source_meshes)
        mesh_height = high.y - low.y
    # The downloaded WITH SKIN FBX is retained in the editable proof file for
    # audit, but its duplicate surface must never appear in review renders or
    # leak into a candidate preview beside the target Explorer.
    for item in source_meshes:
        item.hide_render = True
        item.hide_viewport = True
    # FBX from Mixamo is Y-up.  This maps +Y -> +Z and +Z -> -Y, matching
    # Explorer's upright, -Y-facing authored rest surface.
    rig.rotation_euler = (math.pi / 2.0, 0.0, 0.0)
    return rig, action, mesh_height, imported


def action_frame_range(action):
    start, end = action.frame_range
    return int(math.floor(start + 1e-4)), int(math.ceil(end - 1e-4))


def clear_target_pose(rig):
    for bone in rig.pose.bones:
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = (1, 0, 0, 0)
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)


def bake_mixamo_motion(target_rig, source_rig, source_action, name):
    """Bake world rotation matching, preserving target rest scale/weights."""
    if target_rig.animation_data is None:
        target_rig.animation_data_create()
    target_rig.animation_data.action = None
    clear_target_pose(target_rig)
    source_rig.animation_data_create()
    source_rig.animation_data.action = source_action
    start, end = action_frame_range(source_action)
    fps = 30
    bpy.context.scene.render.fps = fps

    constraints = []
    for target_name, source_name in SOURCE_MAP.items():
        target = target_rig.pose.bones[target_name]
        constraint = target.constraints.new("COPY_ROTATION")
        constraint.name = f"Mixamo {source_name}"
        constraint.target = source_rig
        constraint.subtarget = source_name
        constraint.owner_space = "WORLD"
        constraint.target_space = "WORLD"
        constraints.append((target, constraint))

    bpy.context.scene.frame_set(start)
    bpy.context.view_layer.update()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    target_rig.animation_data.action = action
    # Bake the evaluated constraints, not the untouched local channels. A
    # direct keyframe_insert on rotation_quaternion would record identity while
    # Copy Rotation only changed the evaluated visual pose. NLA bake writes
    # portable local transforms and removes the temporary constraints.
    bpy.ops.object.select_all(action="DESELECT")
    target_rig.select_set(True)
    bpy.context.view_layer.objects.active = target_rig
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.nla.bake(
        frame_start=start, frame_end=end, step=1, only_selected=False,
        visual_keying=True, clear_constraints=True, clear_parents=False,
        use_current_action=True, bake_types={"POSE"},
    )
    bpy.ops.object.mode_set(mode="OBJECT")
    # Source starts at frame 1. Shift to zero so Three.js starts the loop on
    # real motion rather than a one-frame frozen lead-in.
    for curve in action.fcurves:
        for point in curve.keyframe_points:
            point.co.x -= start
            point.handle_left.x -= start
            point.handle_right.x -= start
    for curve in action.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"
    # Blender/glTF exporter sees 0 as first timestamp.  Preserve one complete
    # cycle by leaving the final repeated input pose in the action.
    return action, {"input_frames": [start, end], "output_frames": [0, end - start], "fps": fps, "duration_seconds": (end - start) / fps, "root_translation": "excluded; game parent supplies locomotion"}


def make_camera(scene, mesh, resolution):
    low, high = bounds([mesh])
    center = (low + high) * .5
    extent = high - low
    largest = max(extent.x, extent.y, extent.z, .01)
    bpy.ops.object.camera_add(location=center + Vector((largest * 1.9, -largest * 2.4, largest * .75)))
    camera = bpy.context.object
    scene.camera = camera
    direction = center - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.light_add(type="AREA", location=center + Vector((largest * -.8, -largest * 1.2, largest * 1.5)))
    bpy.context.object.data.energy = 900
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = largest * 2
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (.055, .055, .07)
    return camera


def render_cycle_samples(rig, mesh, action, output, label, resolution):
    scene = bpy.context.scene
    camera = make_camera(scene, mesh, resolution)
    rig.animation_data.action = action
    start, end = action_frame_range(action)
    evidence = []
    for index, source_frame in enumerate(range(start, end + 1, max(1, (end - start) // 7))):
        scene.frame_set(source_frame)
        destination = output / f"{label.lower()}-phase-{index:02d}.png"
        scene.render.filepath = str(destination)
        bpy.ops.render.render(write_still=True)
        evidence.append(destination.name)
    bpy.data.objects.remove(camera, do_unlink=True)
    return evidence


def export(target_rig, target_mesh, output, animation_mode="ACTIONS"):
    bpy.ops.object.select_all(action="DESELECT")
    target_rig.select_set(True)
    target_mesh.select_set(True)
    bpy.context.view_layer.objects.active = target_rig
    glb = output / "model.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(glb), export_format="GLB", use_selection=True,
        export_materials="EXPORT", export_normals=True, export_texcoords=True,
        export_attributes=True, export_animations=True,
        export_animation_mode=animation_mode, export_nla_strips=False,
        export_anim_slide_to_zero=True,
    )
    return glb


def normalize_root_translation(action, preserve_vertical=True):
    """Remove authored world travel without discarding useful body motion.

    Imported Mixamo uses local +Y as up before the armature's +90-degree X
    conversion to game Z-up. Its In Place setting retains a non-zero bind
    offset and useful Y-axis compression/extension. Cyclic locomotion needs
    that Y motion for weight transfer, so it holds only local X/Z at frame
    one. Physics-driven one-shots hold all pelvis translation at frame one:
    game physics owns the jump/fall root trajectory while the action keeps
    its crouch, extension, and limb rotations.
    """
    needle = 'pose.bones["mixamorig:Hips"].location'
    for curve in action.fcurves:
        if curve.data_path != needle:
            continue
        if preserve_vertical and curve.array_index == 1:
            continue
        baseline = curve.keyframe_points[0].co.y
        for point in curve.keyframe_points:
            point.co.y = baseline
            point.handle_left.y = baseline
            point.handle_right.y = baseline


def normalize_mixamo_object_units(rig, action):
    """Bake Mixamo's 0.01 armature object scale into a one-metre rig.

    Applying the armature scale also resolves its inverse 100x skinned-mesh
    child scale while preserving the world surface. Pose-location keys are
    object-unit values, so scale them by the former armature scale to keep
    pelvis/body translation physically unchanged. This avoids a 100x local
    hand anchor in the runtime without adding a special game-side exception.
    """
    scale = float(rig.scale.x)
    if abs(scale - 1.0) < 1e-6:
        return
    if not (abs(rig.scale.y - scale) < 1e-6 and abs(rig.scale.z - scale) < 1e-6):
        raise RuntimeError(f"Mixamo armature has non-uniform object scale: {tuple(rig.scale)}")
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for curve in action.fcurves:
        if not curve.data_path.endswith(".location"):
            continue
        for point in curve.keyframe_points:
            point.co.y *= scale
            point.handle_left.y *= scale
            point.handle_right.y *= scale


def parse_clip_spec(supplied):
    """Parse NAME=FBX with an optional unambiguous @start:end[:seconds] tail."""
    if "=" not in supplied:
        raise ValueError(f"--clip must be NAME=FBX, received {supplied!r}")
    clip_name, raw_path = supplied.split("=", 1)
    clip_name = clip_name.strip()
    crop = None
    match = re.search(r"@(\d+):(\d+)(?::([0-9]+(?:\.[0-9]+)?))?$", raw_path)
    if match:
        crop = (int(match.group(1)), int(match.group(2)), float(match.group(3)) if match.group(3) else None)
        raw_path = raw_path[:match.start()]
    return clip_name, Path(raw_path).expanduser().resolve(), crop


def crop_and_resample_action(action, crop):
    """Keep a source frame segment and retime it to a runtime contract.

    Mixamo action packs can contain anticipation or landing that is longer
    than a gameplay state. Sampling each source frame retains all animated
    bones while emitting a deterministic 30fps clip beginning at time zero.
    """
    if not crop:
        return None
    start, end, seconds = crop
    source_start, source_end = action_frame_range(action)
    if start < source_start or end > source_end or end <= start:
        raise ValueError(f"Invalid crop {start}:{end} for {action.name} frames {source_start}:{source_end}")
    # FBX sources and the gameplay state machine are 30fps. Quantize an
    # explicit seconds request to a whole source-rate frame so Blender's GLB
    # exporter cannot silently trim a fractional final key.
    output_end = float(round(seconds * 30.0)) if seconds is not None else float(end - start)
    if output_end <= 0:
        raise ValueError(f"Invalid non-positive output duration for {action.name}")
    sample_frames = list(range(start, end + 1))
    divisor = max(1, len(sample_frames) - 1)
    for curve in action.fcurves:
        values = [curve.evaluate(frame) for frame in sample_frames]
        curve.keyframe_points.clear()
        for index, value in enumerate(values):
            point = curve.keyframe_points.insert(output_end * index / divisor, value)
            point.interpolation = "LINEAR"
    return {"source_frames": [start, end], "output_duration_seconds": output_end / 30.0}


def prepare_auto_material(mesh, texture_path):
    """Keep the supplied Explorer color/UV texture while making it matte."""
    recorded = []
    for slot in mesh.material_slots:
        material = slot.material
        if not material or not material.node_tree:
            continue
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        principled = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
        if not principled:
            continue
        # Mixamo's FBX re-import duplicates image nodes and can add a normal
        # node even though the approved Explorer ships one matte base-color
        # map. Rebuild that small material graph from the exact original PNG.
        for node in list(nodes):
            if node.type in {"TEX_IMAGE", "NORMAL_MAP"}:
                nodes.remove(node)
        image = bpy.data.images.load(str(texture_path), check_existing=False)
        image.name = "ExplorerOriginalBaseColor"
        texture = nodes.new("ShaderNodeTexImage")
        texture.image = image
        links.new(texture.outputs["Color"], principled.inputs["Base Color"])
        for node in nodes:
            if node.type != "BSDF_PRINCIPLED":
                continue
            for name, value in (("Metallic", 0.0), ("Roughness", 0.9), ("Specular IOR Level", 0.0), ("Coat Weight", 0.0)):
                socket = node.inputs.get(name)
                if socket:
                    socket.default_value = value
        images = [node.image.name for node in material.node_tree.nodes if node.type == "TEX_IMAGE" and node.image]
        recorded.append({"material": material.name, "images": images})
    return recorded


def bake_legacy_action(auto_rig, legacy_rig, source_action, name):
    """Transfer one old game action by evaluated world bone orientation.

    This is intentionally separate from the rejected locomotion retarget:
    locomotion needs accurate foot contact, while the legacy clips are short
    poses used for action/state continuity. Each result remains a candidate
    and needs visual review before it can replace an admitted action.
    """
    legacy_rig.animation_data.action = source_action
    start, end = action_frame_range(source_action)
    auto_rig.animation_data.action = None
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    auto_rig.animation_data.action = action
    for old_name, mixamo_name in SOURCE_MAP.items():
        target = auto_rig.pose.bones[mixamo_name]
        constraint = target.constraints.new("COPY_ROTATION")
        constraint.target = legacy_rig
        constraint.subtarget = old_name
        constraint.owner_space = "WORLD"
        constraint.target_space = "WORLD"
    bpy.ops.object.select_all(action="DESELECT")
    auto_rig.select_set(True)
    bpy.context.view_layer.objects.active = auto_rig
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.nla.bake(frame_start=start, frame_end=end, step=1, only_selected=False,
                     visual_keying=True, clear_constraints=True, clear_parents=False,
                     use_current_action=True, bake_types={"POSE"})
    bpy.ops.object.mode_set(mode="OBJECT")
    for curve in action.fcurves:
        for point in curve.keyframe_points:
            point.co.x -= start
            point.handle_left.x -= start
            point.handle_right.x -= start
            point.interpolation = "LINEAR"
    legacy_rig.animation_data.action = None
    return action


def auto_skin_candidate(options, output):
    """Export real Mixamo skin/weights with its two exact locomotion clips."""
    texture_path = options.texture.resolve() if options.texture else None
    if not texture_path or not texture_path.is_file():
        raise ValueError("--auto-skin requires --texture pointing at the reviewed original PNG")
    primary_rig, jogging, _, imported = import_mixamo(options.jog.resolve())
    normalize_mixamo_object_units(primary_rig, jogging)
    primary_mesh = next((item for item in imported if item.type == "MESH" and item.modifiers.get("Armature")), None)
    if not primary_mesh:
        raise RuntimeError("Mixamo Jogging FBX lacks an armature-bound Explorer mesh")
    primary_mesh.hide_render = False
    primary_mesh.hide_viewport = False
    jogging.name = "Walk"
    jogging.use_fake_user = True
    normalize_root_translation(jogging, preserve_vertical=True)
    primary_rig.animation_data.action = jogging

    run_rig, running, _, run_imported = import_mixamo(options.run.resolve())
    normalize_mixamo_object_units(run_rig, running)
    running.name = "Run"
    running.use_fake_user = True
    normalize_root_translation(running, preserve_vertical=True)
    # The two uploaded FBXs have the same 25-bone auto-rig and this action's
    # paths name those exact bones, so the secondary source rig is not needed
    # for the output. The action remains portable on primary_rig.
    for item in run_imported:
        bpy.data.objects.remove(item, do_unlink=True)
    bpy.context.scene.frame_set(1)
    primary_rig.animation_data.action = jogging
    materials = prepare_auto_material(primary_mesh, texture_path)
    samples = []
    samples.extend(render_cycle_samples(primary_rig, primary_mesh, jogging, output, "Walk", options.resolution))
    samples.extend(render_cycle_samples(primary_rig, primary_mesh, running, output, "Run", options.resolution))
    actions = [jogging, running]
    clip_sources = {
        "Walk": {"source": options.jog.name, "sha256": sha256(options.jog.resolve()), "root_translation": "horizontal held at bind-relative baseline; vertical hips retained"},
        "Run": {"source": options.run.name, "sha256": sha256(options.run.resolve()), "root_translation": "horizontal held at bind-relative baseline; vertical hips retained"},
    }
    clip_paths = {"Walk": options.jog.resolve(), "Run": options.run.resolve()}
    reserved = {"Walk", "Run"}
    for supplied in options.clip:
        clip_name, source_path, crop = parse_clip_spec(supplied)
        if not clip_name or not source_path.is_file() or clip_name in reserved:
            raise ValueError(f"Invalid extra clip {supplied!r}")
        extra_rig, extra_action, _, extra_objects = import_mixamo(source_path)
        normalize_mixamo_object_units(extra_rig, extra_action)
        if [bone.name for bone in extra_rig.data.bones] != [bone.name for bone in primary_rig.data.bones]:
            raise RuntimeError(f"{clip_name} does not use the identical reviewed Mixamo auto-rig")
        extra_action.name = clip_name
        extra_action.use_fake_user = True
        crop_detail = crop_and_resample_action(extra_action, crop)
        preserve_vertical = clip_name in {"Idle", "Walk", "Run", "Sneak"}
        normalize_root_translation(extra_action, preserve_vertical=preserve_vertical)
        for item in extra_objects:
            bpy.data.objects.remove(item, do_unlink=True)
        actions.append(extra_action)
        reserved.add(clip_name)
        clip_sources[clip_name] = {
            "source": source_path.name,
            "sha256": sha256(source_path),
            "root_translation": (
                "horizontal held at bind-relative baseline; vertical hips retained"
                if preserve_vertical else
                "all hips translation held at bind-relative baseline; game physics owns root trajectory"
            ),
        }
        if crop_detail:
            clip_sources[clip_name]["crop"] = crop_detail
        clip_paths[clip_name] = source_path
    legacy_result = {"enabled": False}
    if options.legacy_actions:
        legacy_rig, legacy_mesh, legacy_actions = import_target(options.input.resolve())
        legacy_mesh.hide_render = True
        legacy_mesh.hide_viewport = True
        legacy_result = {"enabled": True, "clips": []}
        for clip in KEEP_ACTIONS:
            source_action = legacy_actions[clip]
            source_action.name = f"LegacySource_{clip}"
            transferred = bake_legacy_action(primary_rig, legacy_rig, source_action, clip)
            actions.append(transferred)
            legacy_result["clips"].append({"name": clip, "source": source_action.name, "duration_frames": list(transferred.frame_range)})
            bpy.data.actions.remove(source_action)
        # One pose evidence is enough for this transfer experiment; full game
        # review must inspect every state before admission.
        attack = bpy.data.actions["Attack"]
        primary_rig.animation_data.action = attack
        bpy.context.scene.frame_set(int(round(sum(attack.frame_range) * .5)))
        samples.extend(render_cycle_samples(primary_rig, primary_mesh, attack, output, "Attack", options.resolution)[:1])
    # Explicit one-strip tracks avoid Blender 4.5's action-export heuristic,
    # which otherwise emitted only one of two compatible global actions.
    primary_rig.animation_data.action = None
    for action in actions:
        track = primary_rig.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, 0, action)
        strip.action_frame_start, strip.action_frame_end = action.frame_range
    bpy.ops.wm.save_as_mainfile(filepath=str(output / "explorer-mixamo-auto-locomotion.blend"))
    glb = export(primary_rig, primary_mesh, output, animation_mode="NLA_TRACKS")
    for clip_name, source_path in clip_paths.items():
        shutil.copy2(source_path, output / f"input-{clip_name.lower()}.fbx")
    report = {
        "tool": "retarget-mixamo.py", "mode": "mixamo-auto-skin-same-rig-action-merge",
        "status": "candidate only; independent full-motion and game integration review required",
        "input_explorer": {"path": str(options.input.resolve()), "sha256": sha256(options.input.resolve())},
        "output": {"glb": "model.glb", "sha256": sha256(glb), "bytes": glb.stat().st_size, "blend": "explorer-mixamo-auto-locomotion.blend"},
        "skeleton": {"bones": [bone.name for bone in primary_rig.data.bones], "count": len(primary_rig.data.bones), "right_hand": "mixamorig:RightHand"},
        "clips": clip_sources,
        "materials": materials, "original_texture": {"path": str(texture_path), "sha256": sha256(texture_path)}, "sample_images": samples,
        "legacy_action_transfer": legacy_result,
        "runtime_note": "The runtime hand anchor must map to mixamorig:RightHand if this candidate is admitted. Each direct Mixamo action remains subject to state-timing and game-motion review. Legacy actions, when present, are separately experimental.",
    }
    (output / "retarget-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


def main():
    options = arguments()
    paths = [options.input.resolve(), options.jog.resolve(), options.run.resolve()]
    if any(not path.is_file() for path in paths):
        raise ValueError(f"Required input missing: {[str(path) for path in paths if not path.is_file()]}")
    output = options.output_dir.resolve()
    if output.exists() and any(output.iterdir()):
        raise ValueError(f"Output directory must be fresh: {output}")
    output.mkdir(parents=True, exist_ok=True)
    reset_scene()
    if not options.experimental_retarget:
        if options.legacy_actions:
            raise ValueError("--legacy-actions is rejected outside --experimental-retarget; use same-rig Mixamo clips instead")
        auto_skin_candidate(options, output)
        return
    target_rig, target_mesh, old_actions = import_target(options.input.resolve())
    target_low, target_high = bounds([target_mesh])
    target_height = target_high.z - target_low.z
    audits, details = {}, {}
    for clip_name, source_path in (("Walk", options.jog.resolve()), ("Run", options.run.resolve())):
        source_rig, source_action, source_height, imported = import_mixamo(source_path)
        audits[clip_name] = {
            "path": str(source_path), "sha256": sha256(source_path), "action": source_action.name,
            "bones": [bone.name for bone in source_rig.data.bones], "mesh_height": source_height,
            "frame_range": list(source_action.frame_range),
        }
        old = bpy.data.actions.get(clip_name)
        if old:
            bpy.data.actions.remove(old)
        action, detail = bake_mixamo_motion(target_rig, source_rig, source_action, clip_name)
        details[clip_name] = detail
        # The copied FBX is retained beside the candidate as immutable audit
        # input.  Remove its action from this Blender scene after baking:
        # Blender otherwise emits a second, unusable Mixamo-named animation
        # into the selected target GLB merely because it remains globally
        # registered in bpy.data.actions.
        source_rig.animation_data.action = None
        bpy.data.actions.remove(source_action)
        bpy.context.scene.frame_set(0)

    # Keep runtime state naming exact: nine original actions plus two retargets.
    expected = set(KEEP_ACTIONS) | {"Walk", "Run"}
    for action in bpy.data.actions:
        if action.name in expected:
            action.use_fake_user = True
    actual = {action.name for action in bpy.data.actions if action.name in expected}
    if actual != expected:
        raise RuntimeError(f"Action merge failed; expected {sorted(expected)}, got {sorted(actual)}")
    sample_images = []
    sample_images.extend(render_cycle_samples(target_rig, target_mesh, bpy.data.actions["Walk"], output, "Walk", options.resolution))
    sample_images.extend(render_cycle_samples(target_rig, target_mesh, bpy.data.actions["Run"], output, "Run", options.resolution))
    bpy.ops.wm.save_as_mainfile(filepath=str(output / "explorer-mixamo-retarget.blend"))
    glb = export(target_rig, target_mesh, output)
    shutil.copy2(options.jog.resolve(), output / "input-jogging.fbx")
    shutil.copy2(options.run.resolve(), output / "input-running.fbx")
    report = {
        "tool": "retarget-mixamo.py", "status": "candidate only; independent full-motion/game review required",
        "input": {"path": str(options.input.resolve()), "sha256": sha256(options.input.resolve())},
        "output": {"glb": "model.glb", "sha256": sha256(glb), "bytes": glb.stat().st_size, "blend": "explorer-mixamo-retarget.blend"},
        "preserved_actions": list(KEEP_ACTIONS), "retargeted_actions": details,
        "target": {"bones": list(TARGET_BONES), "height": target_height, "forward": "+Z runtime after GLB export", "root": "in place; gameplay parent supplies translation"},
        "mixamo_inputs": audits, "source_axis_transform": "+90 degrees X: FBX +Y up -> game +Z up; FBX +Z -> game -Y face",
        "sample_images": sample_images,
    }
    (output / "retarget-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
