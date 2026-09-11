"""Build a profile-driven, direct-deform GLB character proof in Blender.

This tool deliberately targets a supplied character profile; it does not claim
that arbitrary generated creatures can be automatically rigged. It preserves
the input UV map and Base Color image, creates a direct deform skeleton,
generates five in-place clips, writes an editable .blend, exports a GLB, and
round-trips the exported file for machine-readable checks.

Run through Blender, for example:

  & 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' --background \
    --python tools/art/rig-character.py -- \
    --input C:/absolute/mossling-textured-20000.glb \
    --profile C:/absolute/tools/art/rigs/mossling.json \
    --output-dir C:/absolute/.dream-loop/workflow-proof/rigging/mossling-20k
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import struct
import sys
from collections import defaultdict
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


EXPECTED_CLIPS = ("Idle", "Walk", "Run", "Attack", "Hurt")


def arguments() -> argparse.Namespace:
    supplied = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Existing textured source GLB.")
    parser.add_argument("--profile", required=True, type=Path, help="Mossling direct-rig profile JSON.")
    parser.add_argument("--output-dir", required=True, type=Path, help="Fresh or empty proof-output directory.")
    parser.add_argument("--allow-existing", action="store_true")
    parser.add_argument("--resolution", type=int, default=640)
    return parser.parse_args(supplied)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def require_file(path: Path, label: str) -> Path:
    resolved = path.expanduser().resolve()
    if not resolved.is_file():
        raise ValueError(f"{label} must be an existing file: {resolved}")
    return resolved


def reset_scene() -> None:
    # Clear explicitly instead of using `read_factory_settings`: that operator
    # can rebuild a background session partway through a script and prevent the
    # later round-trip import from registering its objects.
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def import_one_mesh(path: Path) -> bpy.types.Object:
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected exactly one mesh in {path.name}; imported {len(meshes)}")
    return meshes[0]


def local_bounds(mesh: bpy.types.Mesh) -> tuple[Vector, Vector]:
    if not mesh.vertices:
        raise RuntimeError("Input mesh has no vertices")
    minimum = Vector((min(vertex.co.x for vertex in mesh.vertices), min(vertex.co.y for vertex in mesh.vertices), min(vertex.co.z for vertex in mesh.vertices)))
    maximum = Vector((max(vertex.co.x for vertex in mesh.vertices), max(vertex.co.y for vertex in mesh.vertices), max(vertex.co.z for vertex in mesh.vertices)))
    return minimum, maximum


def prepare_material(mesh_object: bpy.types.Object) -> list[dict]:
    """Keep Base Color image/UV links and remove reflective material inputs."""
    recorded = []
    for slot in mesh_object.material_slots:
        material = slot.material
        if not material:
            continue
        material.use_nodes = True
        if material.node_tree:
            for node in material.node_tree.nodes:
                if node.type != "BSDF_PRINCIPLED":
                    continue
                for socket_name, value in (("Metallic", 0.0), ("Roughness", 0.9), ("Specular IOR Level", 0.0), ("Coat Weight", 0.0)):
                    socket = node.inputs.get(socket_name)
                    if socket:
                        for link in list(socket.links):
                            material.node_tree.links.remove(link)
                        socket.default_value = value
        textures = []
        if material.node_tree:
            for node in material.node_tree.nodes:
                if node.type == "TEX_IMAGE" and node.image:
                    textures.append({"name": node.image.name, "size": list(node.image.size)})
        recorded.append({"name": material.name, "base_color_images": textures})
    return recorded


def profile_transform(profile: dict, raw_minimum: Vector, raw_maximum: Vector) -> tuple[Matrix, float]:
    height = raw_maximum.z - raw_minimum.z
    if height <= 0:
        raise RuntimeError("Input mesh has no positive Z height")
    target_height = float(profile["runtime_height_meters"])
    scale = target_height / height
    degrees = float(profile["source_axes"]["blender_rotation_z_degrees"])
    rotation = Matrix.Rotation(math.radians(degrees), 4, "Z")
    scale_matrix = Matrix.Diagonal((scale, scale, scale, 1.0))
    ground = Matrix.Translation((0.0, 0.0, -raw_minimum.z * scale))
    return ground @ scale_matrix @ rotation, scale


def transform_point(matrix: Matrix, values: list[float]) -> Vector:
    return matrix @ Vector((float(values[0]), float(values[1]), float(values[2]), 1.0)).to_3d()


def make_armature(profile: dict, matrix: Matrix) -> bpy.types.Object:
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    rig = bpy.context.object
    rig.name = "MosslingDirectRig"
    rig.data.name = "MosslingDirectRig"
    edit_bones = rig.data.edit_bones
    edit_bones.remove(edit_bones[0])
    for item in profile["bones"]:
        bone = edit_bones.new(item["name"])
        bone.head = transform_point(matrix, item["head"])
        bone.tail = transform_point(matrix, item["tail"])
        parent_name = item.get("parent")
        if parent_name:
            bone.parent = edit_bones[parent_name]
            bone.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    for bone in rig.pose.bones:
        bone.rotation_mode = "XYZ"
    return rig


def distance_to_segment(point: Vector, start: Vector, end: Vector) -> float:
    direction = end - start
    length_squared = direction.length_squared
    if length_squared <= 1e-12:
        return (point - start).length
    position = max(0.0, min(1.0, (point - start).dot(direction) / length_squared))
    return (point - (start + direction * position)).length


class UnionFind:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))
        self.size = [1] * size

    def find(self, item: int) -> int:
        while self.parent[item] != item:
            self.parent[item] = self.parent[self.parent[item]]
            item = self.parent[item]
        return item

    def union(self, first: int, second: int) -> None:
        first = self.find(first)
        second = self.find(second)
        if first == second:
            return
        if self.size[first] < self.size[second]:
            first, second = second, first
        self.parent[second] = first
        self.size[first] += self.size[second]


def welded_components(mesh: bpy.types.Mesh, tolerance: float) -> tuple[dict[int, list[int]], list[int]]:
    """Find physical shells without modifying source mesh, UVs, or indices."""
    dsu = UnionFind(len(mesh.vertices))
    position_owner: dict[tuple[int, int, int], int] = {}
    for vertex in mesh.vertices:
        point = vertex.co
        key = (round(point.x / tolerance), round(point.y / tolerance), round(point.z / tolerance))
        existing = position_owner.get(key)
        if existing is None:
            position_owner[key] = vertex.index
        else:
            dsu.union(vertex.index, existing)
    for edge in mesh.edges:
        left, right = edge.vertices[:]
        dsu.union(left, right)
    components: dict[int, list[int]] = defaultdict(list)
    roots = []
    for vertex in mesh.vertices:
        root = dsu.find(vertex.index)
        roots.append(root)
        components[root].append(vertex.index)
    return components, roots


def assign_weights(mesh_object: bpy.types.Object, rig: bpy.types.Object, profile: dict) -> dict:
    mesh = mesh_object.data
    settings = profile["weighting"]
    max_influences = int(settings["max_influences"])
    soft_radius = float(settings["soft_radius"])
    tolerance = max(max((vertex.co.x for vertex in mesh.vertices), default=0.0) - min((vertex.co.x for vertex in mesh.vertices), default=0.0), 1.0) * 1e-6
    components, roots = welded_components(mesh, tolerance)
    component_sizes = {root: len(vertices) for root, vertices in components.items()}
    rigid_limit = int(settings["rigid_component_max_vertices"])
    groups = {bone.name: mesh_object.vertex_groups.new(name=bone.name) for bone in rig.data.bones}
    segments = [(bone.name, bone.head_local.copy(), bone.tail_local.copy()) for bone in rig.data.bones]

    rigid_vertices = 0
    for vertex in mesh.vertices:
        point = vertex.co
        distances = sorted((distance_to_segment(point, start, end), name) for name, start, end in segments)
        if component_sizes[roots[vertex.index]] <= rigid_limit:
            groups[distances[0][1]].add([vertex.index], 1.0, "REPLACE")
            rigid_vertices += 1
            continue
        candidates = distances[:max_influences]
        scores = [math.exp(-((distance / soft_radius) ** 2)) for distance, _ in candidates]
        total = sum(scores)
        if total <= 1e-12:
            groups[candidates[0][1]].add([vertex.index], 1.0, "REPLACE")
            continue
        for score, (_, name) in zip(scores, candidates):
            if score / total > 1e-5:
                groups[name].add([vertex.index], score / total, "REPLACE")

    # `vertex_group_limit_total` is run explicitly to guarantee the exported
    # skin can be represented by a single glTF JOINTS_0 / WEIGHTS_0 pair.
    bpy.context.view_layer.objects.active = mesh_object
    mesh_object.select_set(True)
    bpy.ops.object.vertex_group_limit_total(limit=max_influences)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    # The source glTF object transform was baked before this stage, so ordinary
    # armature parenting is identity-safe and produces the canonical skin
    # relationship expected by Blender's glTF exporter.
    mesh_object.parent = rig
    mesh_object.matrix_parent_inverse = rig.matrix_world.inverted()
    modifier = mesh_object.modifiers.new("Mossling Direct Skin", "ARMATURE")
    modifier.object = rig

    counts = []
    weight_totals = []
    for vertex in mesh.vertices:
        active = [entry.weight for entry in vertex.groups if entry.weight > 1e-6]
        counts.append(len(active))
        weight_totals.append(sum(active))
    return {
        "component_count": len(components),
        "largest_component_vertices": max(component_sizes.values(), default=0),
        "rigid_component_max_vertices": rigid_limit,
        "rigid_vertices": rigid_vertices,
        "max_influences": max(counts, default=0),
        "zero_weight_vertices": sum(1 for count in counts if count == 0),
        "weight_sum_min": min(weight_totals, default=0.0),
        "weight_sum_max": max(weight_totals, default=0.0),
    }


def set_rotation(pose_bone: bpy.types.PoseBone, x: float = 0.0, y: float = 0.0, z: float = 0.0) -> None:
    pose_bone.rotation_mode = "XYZ"
    pose_bone.rotation_euler = (x, y, z)


def key_pose(rig: bpy.types.Object, frame: int, values: dict[str, tuple[float, float, float]], locations: dict[str, tuple[float, float, float]] | None = None) -> None:
    bpy.context.scene.frame_set(frame)
    for bone in rig.pose.bones:
        set_rotation(bone)
        bone.location = (0.0, 0.0, 0.0)
    for name, rotation in values.items():
        set_rotation(rig.pose.bones[name], *rotation)
    for name, location in (locations or {}).items():
        rig.pose.bones[name].location = location
    for bone in rig.pose.bones:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
        if locations and bone.name in locations:
            bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
    # Root location remains zero in every clip; runtime movement owns translation.
    root = rig.pose.bones["root"]
    root.location = (0.0, 0.0, 0.0)
    root.keyframe_insert(data_path="location", frame=frame, group="root")


def new_action(rig: bpy.types.Object, name: str) -> bpy.types.Action:
    if not rig.animation_data:
        rig.animation_data_create()
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    return action


def make_actions(rig: bpy.types.Object) -> dict[str, list[int]]:
    created: dict[str, list[int]] = {}
    idle = new_action(rig, "Idle")
    for frame, values in (
        (1, {"spine": (0.02, 0, 0), "neck": (-0.04, 0, 0), "head": (0.03, 0, 0), "tail_01": (0, 0, 0.04), "tail_02": (0, 0, 0.07), "tail_03": (0, 0, 0.10)}),
        (13, {"spine": (-0.02, 0, 0), "neck": (0.04, 0, 0), "head": (-0.03, 0, 0), "tail_01": (0, 0, -0.04), "tail_02": (0, 0, -0.07), "tail_03": (0, 0, -0.10)}),
        (25, {"spine": (0.02, 0, 0), "neck": (-0.04, 0, 0), "head": (0.03, 0, 0), "tail_01": (0, 0, 0.04), "tail_02": (0, 0, 0.07), "tail_03": (0, 0, 0.10)}),
    ):
        key_pose(rig, frame, values)
    created[idle.name] = [1, 25]

    walk = new_action(rig, "Walk")
    # A full walk is deliberately a short, in-place 0.5 s cycle.  At the
    # representative 0.98 m/s Mossling wander pace that is a 0.49 m stride:
    # each diagonal pair has about 0.245 m of body travel to cancel while it
    # is planted.  The previous one-second cycle asked a short-legged creature
    # to cancel over a metre and visibly skated in the exported GLB.
    #
    # The imported creature is vertical in Blender Z and faces Blender -Y.
    # Blender X rotations provide both lift/flex and fore/aft travel in the
    # glTF runtime's +Z forward direction.
    # Keep the low stance half moving rearward in local space as the actor
    # moves forward; the lifted half returns forward with a tucked knee.
    for frame, phase in ((1, 1.0), (3, 0.5), (5, 0.0), (7, -1.0), (9, -0.5), (11, 0.0), (13, 1.0)):
        values: dict[str, tuple[float, float, float]] = {"spine": (0.018 * phase, 0, 0), "neck": (-0.026 * phase, 0, 0), "head": (-0.018 * phase, 0, 0), "tail_01": (0, 0, 0.035 * phase), "tail_02": (0, 0, 0.06 * phase), "tail_03": (0, 0, 0.085 * phase)}
        for upper, lower, paw, sign in (
            ("front_upper.L", "front_lower.L", "front_paw.L", 1.0),
            ("rear_upper.R", "rear_lower.R", "rear_paw.R", 1.0),
            ("front_upper.R", "front_lower.R", "front_paw.R", -1.0),
            ("rear_upper.L", "rear_lower.L", "rear_paw.L", -1.0),
        ):
            swing = phase * sign
            # `swing > 0`: planted and extended.  The upper/lower pair
            # sweeps the paw back ~0.25 m over the stance; `swing < 0`:
            # tuck, lift, then bring it forward for the next contact.
            stance = max(swing, 0.0)
            lift = max(-swing, 0.0)
            values[upper] = (0.56 * swing + 0.18 * lift, 0, 0)
            values[lower] = (-0.52 * stance - 0.42 * lift, 0, 0)
            values[paw] = (0.34 * lift, 0, 0)
        # Blender Y becomes glTF -Z after export.  Translate the final paw
        # joint through the planted half-stride on that axis; this is the
        # direct positional part of the foot-lock solve while the upper/lower
        # rotations retain the visible knee and swing arc.
        paw_locations = {}
        for _upper, _lower, paw, sign in (
            ("front_upper.L", "front_lower.L", "front_paw.L", 1.0),
            ("rear_upper.R", "rear_lower.R", "rear_paw.R", 1.0),
            ("front_upper.R", "front_lower.R", "front_paw.R", -1.0),
            ("rear_upper.L", "rear_lower.L", "rear_paw.L", -1.0),
        ):
            swing = phase * sign
            paw_locations[paw] = (0.0, 0.30 * swing, 0.0)
        key_pose(rig, frame, values, paw_locations)
    created[walk.name] = [1, 13]

    # Flee is a bounding trot, not a playback-accelerated walk.  The short
    # 10-frame (0.4167 s) cycle is authored for roughly 4 m/s, with two brief
    # flight poses.  This keeps ground support intentionally short enough for
    # the Mossling's compact legs and gives the silhouette a readable sprint
    # rhythm at the runtime's normal one-times clip rate.
    run = new_action(rig, "Run")
    run_poses = (
        # Gather: rear pair drives, fore pair prepares to reach.
        (1,  {"spine": (-0.055, 0, 0), "neck": (-0.08, 0, 0), "head": (-0.05, 0, 0), "front_upper.L": (0.52, 0, 0), "front_lower.L": (-0.60, 0, 0), "front_paw.L": (0.28, 0, 0), "front_upper.R": (0.52, 0, 0), "front_lower.R": (-0.60, 0, 0), "front_paw.R": (0.28, 0, 0), "rear_upper.L": (-0.46, 0, 0), "rear_lower.L": (0.34, 0, 0), "rear_paw.L": (-0.10, 0, 0), "rear_upper.R": (-0.46, 0, 0), "rear_lower.R": (0.34, 0, 0), "rear_paw.R": (-0.10, 0, 0), "tail_01": (0, 0, -0.08), "tail_02": (0, 0, -0.13), "tail_03": (0, 0, -0.18)}),
        # Rear contact / forward reach.
        (3,  {"spine": (0.025, 0, 0), "neck": (0.035, 0, 0), "head": (0.025, 0, 0), "front_upper.L": (0.66, 0, 0), "front_lower.L": (-0.72, 0, 0), "front_paw.L": (0.36, 0, 0), "front_upper.R": (0.66, 0, 0), "front_lower.R": (-0.72, 0, 0), "front_paw.R": (0.36, 0, 0), "rear_upper.L": (-0.20, 0, 0), "rear_lower.L": (-0.22, 0, 0), "rear_upper.R": (-0.20, 0, 0), "rear_lower.R": (-0.22, 0, 0), "tail_01": (0, 0, 0.04), "tail_02": (0, 0, 0.07), "tail_03": (0, 0, 0.10)}),
        # Flight: all paws tucked beneath the leaf mantle.
        (5,  {"spine": (0.07, 0, 0), "neck": (0.10, 0, 0), "head": (0.06, 0, 0), "front_upper.L": (0.18, 0, 0), "front_lower.L": (-0.78, 0, 0), "front_paw.L": (0.52, 0, 0), "front_upper.R": (0.18, 0, 0), "front_lower.R": (-0.78, 0, 0), "front_paw.R": (0.52, 0, 0), "rear_upper.L": (0.34, 0, 0), "rear_lower.L": (-0.76, 0, 0), "rear_paw.L": (0.48, 0, 0), "rear_upper.R": (0.34, 0, 0), "rear_lower.R": (-0.76, 0, 0), "rear_paw.R": (0.48, 0, 0), "tail_01": (0, 0, 0.10), "tail_02": (0, 0, 0.16), "tail_03": (0, 0, 0.22)}),
        # Fore contact; rear pair cycles forward for the next bound.
        (7,  {"spine": (-0.02, 0, 0), "neck": (-0.04, 0, 0), "head": (-0.02, 0, 0), "front_upper.L": (0.05, 0, 0), "front_lower.L": (-0.24, 0, 0), "front_paw.L": (0.04, 0, 0), "front_upper.R": (0.05, 0, 0), "front_lower.R": (-0.24, 0, 0), "front_paw.R": (0.04, 0, 0), "rear_upper.L": (0.68, 0, 0), "rear_lower.L": (-0.70, 0, 0), "rear_paw.L": (0.38, 0, 0), "rear_upper.R": (0.68, 0, 0), "rear_lower.R": (-0.70, 0, 0), "rear_paw.R": (0.38, 0, 0), "tail_01": (0, 0, -0.03), "tail_02": (0, 0, -0.06), "tail_03": (0, 0, -0.09)}),
        # Second short flight returns cleanly to gather.
        (9,  {"spine": (-0.07, 0, 0), "neck": (-0.10, 0, 0), "head": (-0.06, 0, 0), "front_upper.L": (0.38, 0, 0), "front_lower.L": (-0.76, 0, 0), "front_paw.L": (0.46, 0, 0), "front_upper.R": (0.38, 0, 0), "front_lower.R": (-0.76, 0, 0), "front_paw.R": (0.46, 0, 0), "rear_upper.L": (0.18, 0, 0), "rear_lower.L": (-0.78, 0, 0), "rear_paw.L": (0.52, 0, 0), "rear_upper.R": (0.18, 0, 0), "rear_lower.R": (-0.78, 0, 0), "rear_paw.R": (0.52, 0, 0), "tail_01": (0, 0, -0.10), "tail_02": (0, 0, -0.16), "tail_03": (0, 0, -0.22)}),
        (11, {"spine": (-0.055, 0, 0), "neck": (-0.08, 0, 0), "head": (-0.05, 0, 0), "front_upper.L": (0.52, 0, 0), "front_lower.L": (-0.60, 0, 0), "front_paw.L": (0.28, 0, 0), "front_upper.R": (0.52, 0, 0), "front_lower.R": (-0.60, 0, 0), "front_paw.R": (0.28, 0, 0), "rear_upper.L": (-0.46, 0, 0), "rear_lower.L": (0.34, 0, 0), "rear_paw.L": (-0.10, 0, 0), "rear_upper.R": (-0.46, 0, 0), "rear_lower.R": (0.34, 0, 0), "rear_paw.R": (-0.10, 0, 0), "tail_01": (0, 0, -0.08), "tail_02": (0, 0, -0.13), "tail_03": (0, 0, -0.18)}),
    )
    for frame, values in run_poses:
        key_pose(rig, frame, values)
    created[run.name] = [1, 11]

    attack = new_action(rig, "Attack")
    for frame, values in (
        (1, {}),
        (6, {"spine": (-0.08, 0, 0), "neck": (-0.16, 0, 0), "head": (-0.18, 0, 0), "front_upper.L": (0.10, 0, 0), "front_upper.R": (0.10, 0, 0), "tail_01": (0, 0, -0.08), "tail_02": (0, 0, -0.12), "tail_03": (0, 0, -0.16)}),
        (11, {"spine": (0.16, 0, 0), "neck": (0.34, 0, 0), "head": (0.40, 0, 0), "front_upper.L": (-0.26, 0, 0), "front_upper.R": (-0.26, 0, 0), "front_lower.L": (0.18, 0, 0), "front_lower.R": (0.18, 0, 0), "tail_01": (0, 0, 0.15), "tail_02": (0, 0, 0.22), "tail_03": (0, 0, 0.28)}),
        (18, {}),
    ):
        key_pose(rig, frame, values)
    created[attack.name] = [1, 18]

    hurt = new_action(rig, "Hurt")
    for frame, values in (
        (1, {}),
        (5, {"spine": (-0.13, 0, 0), "neck": (-0.23, 0, 0), "head": (-0.28, 0, 0), "front_upper.L": (0.13, 0, 0), "front_upper.R": (0.13, 0, 0), "tail_01": (0, 0, -0.12), "tail_02": (0, 0, -0.18), "tail_03": (0, 0, -0.24)}),
        (12, {}),
    ):
        key_pose(rig, frame, values)
    created[hurt.name] = [1, 12]
    return created


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def setup_review(mesh_object: bpy.types.Object, resolution: int) -> bpy.types.Object:
    minimum, maximum = local_bounds(mesh_object.data)
    extent = maximum - minimum
    largest = max(extent.x, extent.y, extent.z, 0.01)
    target = Vector(((minimum.x + maximum.x) * 0.5, (minimum.y + maximum.y) * 0.5, minimum.z + extent.z * 0.52))
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Proof World")
    scene.world.color = (0.04, 0.045, 0.06)
    scene.view_settings.look = "AgX - Medium High Contrast"
    camera_data = bpy.data.cameras.new("Proof Camera")
    camera_data.lens = 55
    camera = bpy.data.objects.new("Proof Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera.location = target + Vector((largest * 0.75, -largest * 2.4, largest * 0.72))
    look_at(camera, target)
    for name, offset, energy, size in (
        ("Proof Key", (2.2, -2.4, 2.4), 850.0, 2.8),
        ("Proof Fill", (-2.0, -1.6, 1.2), 280.0, 2.4),
        ("Proof Rim", (0.4, 2.3, 2.0), 450.0, 2.0),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = largest * size
        light = bpy.data.objects.new(name, light_data)
        bpy.context.collection.objects.link(light)
        light.location = target + Vector(tuple(value * largest for value in offset))
        look_at(light, target)
    plane_data = bpy.data.meshes.new("Proof Floor")
    plane = bpy.data.objects.new("Proof Floor", plane_data)
    bpy.context.collection.objects.link(plane)
    half = largest * 6
    plane_data.from_pydata([(-half, -half, 0), (half, -half, 0), (half, half, 0), (-half, half, 0)], [], [(0, 1, 2, 3)])
    floor = bpy.data.materials.new("Proof Floor")
    floor.diffuse_color = (0.12, 0.13, 0.15, 1)
    floor.roughness = 1.0
    plane_data.materials.append(floor)
    return camera


def render_proof(rig: bpy.types.Object, output: Path) -> list[str]:
    scene = bpy.context.scene
    renders = []
    requested = (("idle", "Idle", 13), ("walk-contact-a", "Walk", 1), ("walk-contact-b", "Walk", 13), ("run-gather", "Run", 1), ("run-flight", "Run", 5), ("run-fore-contact", "Run", 7), ("attack-peak", "Attack", 11), ("hurt-peak", "Hurt", 5))
    for label, action_name, frame in requested:
        rig.animation_data.action = bpy.data.actions[action_name]
        scene.frame_set(frame)
        destination = output / f"{label}.png"
        scene.render.filepath = str(destination)
        bpy.ops.render.render(write_still=True)
        renders.append(destination.name)
    return renders


def glb_joint_shapes(path: Path) -> dict:
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise RuntimeError("Output is not a binary glTF file")
    json_length, chunk_type = struct.unpack_from("<I4s", data, 12)
    if chunk_type != b"JSON":
        raise RuntimeError("Output GLB has no leading JSON chunk")
    document = json.loads(data[20 : 20 + json_length].decode("utf-8"))
    shapes = []
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            attributes = primitive.get("attributes", {})
            for key in ("JOINTS_0", "WEIGHTS_0"):
                if key in attributes:
                    accessor = document["accessors"][attributes[key]]
                    shapes.append({"attribute": key, "type": accessor.get("type"), "count": accessor.get("count")})
    return {"skin_count": len(document.get("skins", [])), "joint_weight_accessors": shapes}


def roundtrip_validate(path: Path, expected_bones: list[str]) -> dict:
    before_import = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    # Blender's glTF importer creates a tiny `Icosphere` bone-display helper
    # for this direct armature. It is not a mesh node in the exported GLB
    # document; select the actual skinned mesh by its vertex groups.
    imported_meshes = [item for item in bpy.context.scene.objects if item not in before_import and item.type == "MESH"]
    candidates = [item for item in imported_meshes if item.vertex_groups]
    if len(candidates) != 1:
        raise RuntimeError(f"Roundtrip expected one skinned mesh; found {len(candidates)} among {len(imported_meshes)} meshes")
    imported = candidates[0]
    rigs = [item for item in bpy.context.scene.objects if item.type == "ARMATURE"]
    if len(rigs) != 1:
        raise RuntimeError(f"Roundtrip expected one armature; found {len(rigs)}")
    rig = rigs[0]
    counts = []
    totals = []
    for vertex in imported.data.vertices:
        active = [entry.weight for entry in vertex.groups if entry.weight > 1e-6]
        counts.append(len(active))
        totals.append(sum(active))
    action_data = [{"name": action.name, "frame_range": [float(value) for value in action.frame_range]} for action in bpy.data.actions]
    return {
        "bones": [bone.name for bone in rig.data.bones],
        "missing_expected_bones": sorted(set(expected_bones) - {bone.name for bone in rig.data.bones}),
        "actions": action_data,
        "max_influences": max(counts, default=0),
        "zero_weight_vertices": sum(1 for count in counts if count == 0),
        "weight_sum_min": min(totals, default=0.0),
        "weight_sum_max": max(totals, default=0.0),
        "blender_import_auxiliary_meshes": [item.name for item in imported_meshes if item != imported],
        "bounds": {"min": list(local_bounds(imported.data)[0]), "max": list(local_bounds(imported.data)[1])},
        "glb_structure": glb_joint_shapes(path),
    }


def run_roundtrip_worker(path: Path, expected_bones: list[str], output: Path) -> dict:
    """Use a fresh Blender process: exporting then importing in one process is
    not reliable after Blender's glTF exporter rebuilds temporary datablocks."""
    command = [
        bpy.app.binary_path,
        "--background",
        "--factory-startup",
        "--python",
        str(Path(__file__).resolve()),
        "--",
        "--roundtrip-worker",
        "--input",
        str(path),
        "--roundtrip-output",
        str(output),
        "--expected-bones-json",
        json.dumps(expected_bones),
    ]
    subprocess.run(command, check=True)
    return json.loads(output.read_text(encoding="utf-8"))


def roundtrip_worker() -> None:
    supplied = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--roundtrip-worker", action="store_true")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--roundtrip-output", required=True, type=Path)
    parser.add_argument("--expected-bones-json", required=True)
    options = parser.parse_args(supplied)
    result = roundtrip_validate(options.input.resolve(), json.loads(options.expected_bones_json))
    options.roundtrip_output.resolve().write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


def main() -> None:
    options = arguments()
    source = require_file(options.input, "--input")
    profile_path = require_file(options.profile, "--profile")
    output = options.output_dir.expanduser().resolve()
    if output.exists() and any(output.iterdir()) and not options.allow_existing:
        raise ValueError(f"--output-dir must be fresh or empty: {output}")
    output.mkdir(parents=True, exist_ok=True)
    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    if [item["name"] for item in profile["bones"]] != list(dict.fromkeys(item["name"] for item in profile["bones"])):
        raise ValueError("Profile bone names must be unique")
    if tuple(profile["clips"].keys()) != EXPECTED_CLIPS:
        raise ValueError(f"Profile clips must be exactly {EXPECTED_CLIPS}")

    reset_scene()
    mesh_object = import_one_mesh(source)
    # Blender's glTF importer applies the source Y-up conversion to the object
    # transform. Bake that conversion into vertex space before reading bounds or
    # landmarks, so the profile consistently sees X=face, Y=lateral, Z=up.
    mesh_object.data.transform(mesh_object.matrix_world)
    mesh_object.matrix_world = Matrix.Identity(4)
    raw_minimum, raw_maximum = local_bounds(mesh_object.data)
    materials = prepare_material(mesh_object)
    matrix, scale = profile_transform(profile, raw_minimum, raw_maximum)
    mesh_object.data.transform(matrix)
    mesh_object.data.update()
    rig = make_armature(profile, matrix)
    weights = assign_weights(mesh_object, rig, profile)
    if weights["zero_weight_vertices"] or weights["max_influences"] > int(profile["weighting"]["max_influences"]):
        raise RuntimeError(f"Weight validation failed before export: {weights}")
    clips = make_actions(rig)
    bpy.context.scene.render.fps = 24
    setup_review(mesh_object, options.resolution)
    renders = render_proof(rig, output)
    blend_path = output / "mossling-rig.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    output_glb = output / "model.glb"
    bpy.ops.object.select_all(action="DESELECT")
    mesh_object.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_normals=True,
        export_texcoords=True,
        export_attributes=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_anim_slide_to_zero=True,
        export_nla_strips=False,
    )
    roundtrip = run_roundtrip_worker(output_glb, [item["name"] for item in profile["bones"]], output / "roundtrip-import.json")
    action_names = {item["name"] for item in roundtrip["actions"]}
    glb_shapes = roundtrip["glb_structure"]["joint_weight_accessors"]
    shape_types = {item["attribute"]: item["type"] for item in glb_shapes}
    if roundtrip["missing_expected_bones"] or roundtrip["zero_weight_vertices"] or roundtrip["max_influences"] > 4:
        raise RuntimeError(f"Roundtrip skin validation failed: {roundtrip}")
    if not set(EXPECTED_CLIPS).issubset(action_names):
        raise RuntimeError(f"Roundtrip missing clips: expected {EXPECTED_CLIPS}, found {sorted(action_names)}")
    if shape_types.get("JOINTS_0") != "VEC4" or shape_types.get("WEIGHTS_0") != "VEC4":
        raise RuntimeError(f"Roundtrip GLB is not four-weight skinning: {glb_shapes}")
    normalized_minimum, normalized_maximum = local_bounds(mesh_object.data)
    report = {
        "tool": "tools/art/rig-character.py",
        "profile": {"path": str(profile_path), "name": profile["profile"]},
        "input": {"path": str(source), "sha256": sha256(source), "raw_bounds": {"min": list(raw_minimum), "max": list(raw_maximum)}},
        "normalization": {
            "source_face_axis": profile["source_axes"]["face"],
            "blender_rotation_z_degrees": profile["source_axes"]["blender_rotation_z_degrees"],
            "glTF_up": "+Y",
            "runtime_forward": "+Z",
            "scale": scale,
            "ground": "source minimum Z is transformed to Blender Z=0 before glTF Y-up export",
            "chosen_height_meters": profile["runtime_height_meters"],
            "normalized_blender_bounds": {"min": list(normalized_minimum), "max": list(normalized_maximum)},
        },
        "materials": materials,
        "weights_before_export": weights,
        "clips": clips,
        "editable_blend": blend_path.name,
        "export_glb": {"path": output_glb.name, "sha256": sha256(output_glb), "bytes": output_glb.stat().st_size},
        "review_renders": renders,
        "roundtrip": roundtrip,
        "runtime_descriptor_candidate": {"path": "assets/models/mossling/model.glb", "scale": 1, "pivot": {"x": 0, "y": 0, "z": 0}, "clips": {"idle": "Idle", "walk": "Walk", "run": "Run", "attack": "Attack", "hurt": "Hurt"}, "locomotion": {"walk": 0.98, "run": 4.0}},
    }
    (output / "rig-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    if "--roundtrip-worker" in sys.argv:
        roundtrip_worker()
    else:
        main()
