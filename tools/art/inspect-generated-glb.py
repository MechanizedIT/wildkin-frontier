"""Render and inventory a generated GLB for visual review in Blender.

Run with Blender in background mode, for example:

  "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b \
    --python tools/art/inspect-generated-glb.py -- \
    --input C:\\absolute\\path\\to\\asset.glb \
    --output-dir C:\\absolute\\path\\to\\review

The source GLB is never written.  The output directory receives review renders,
an editable inspection.blend, and inspection.json.  Materials used by the review
scene are copies of imported materials with metallic/reflection settings removed;
their image texture nodes remain connected so the asset's authored texture can be
judged without a glossy studio treatment.
"""

from __future__ import annotations

import argparse
import bmesh
import json
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


DEFAULT_RESOLUTION = 768
VIEW_DEFINITIONS = (
    ("front", 0.0),
    ("three-quarter", math.radians(35.0)),
    ("rear", math.pi),
)


def parse_arguments() -> argparse.Namespace:
    """Parse only arguments supplied after Blender's `--` separator."""
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Absolute path to a .glb file.")
    parser.add_argument("--output-dir", required=True, help="Absolute review directory.")
    parser.add_argument(
        "--resolution",
        type=int,
        default=DEFAULT_RESOLUTION,
        help="Square render size in pixels (default: %(default)s).",
    )
    parser.add_argument(
        "--front-yaw-degrees",
        type=float,
        default=0.0,
        help="Yaw regarded as the front of the source GLB; adjust after first review.",
    )
    parser.add_argument(
        "--frame-bounds",
        default="",
        help="Optional six comma-separated min/max values to reuse a reference camera/light scale.",
    )
    parser.add_argument(
        "--shading-mode",
        choices=("matte", "unlit-base-color"),
        default="matte",
        help="Review with the matte studio material or an unlit Base Color diagnostic.",
    )
    return parser.parse_args(arguments)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)


def require_absolute_path(value: str, label: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        raise ValueError(f"{label} must be an absolute path: {value}")
    return path.resolve()


def parse_frame_bounds(value: str) -> tuple[Vector, Vector] | None:
    if not value:
        return None
    values = [float(item.strip()) for item in value.split(",")]
    if len(values) != 6:
        raise ValueError("--frame-bounds needs min-x,min-y,min-z,max-x,max-y,max-z")
    minimum = Vector(values[:3])
    maximum = Vector(values[3:])
    if any(maximum[index] <= minimum[index] for index in range(3)):
        raise ValueError("--frame-bounds maximum must exceed minimum on every axis")
    return minimum, maximum


def import_glb(source_path: Path) -> list[bpy.types.Object]:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(source_path))
    imported = [item for item in bpy.context.scene.objects if item not in before]
    if not imported:
        raise RuntimeError(f"Blender imported no scene objects from {source_path}")
    return imported


def make_matte_review_material(material: bpy.types.Material | None, cache: dict, shading_mode: str) -> bpy.types.Material:
    """Copy a material and remove reflectivity while retaining connected textures."""
    key = (material.name if material else "__missing_material__", shading_mode)
    if key in cache:
        return cache[key]
    if material is None:
        review = bpy.data.materials.new("Review Matte Neutral")
        review.diffuse_color = (0.62, 0.58, 0.46, 1.0)
    else:
        review = material.copy()
        review.name = f"Review Matte | {material.name}"
    review.use_nodes = True
    if review.node_tree:
        for node in review.node_tree.nodes:
            if node.type != "BSDF_PRINCIPLED":
                continue
            # Socket names differ slightly between Blender releases.  Values are
            # set only when a matching Principled input exists.
            for socket_name, value in (
                ("Metallic", 0.0),
                ("Roughness", 0.88),
                ("Specular IOR Level", 0.12),
                ("Coat Weight", 0.0),
                ("Coat Roughness", 1.0),
            ):
                socket = node.inputs.get(socket_name)
                if socket:
                    # Generated assets sometimes drive these properties with
                    # packed texture channels.  Disconnect only reflective
                    # controls; base-color and normal image links remain.
                    for link in list(socket.links):
                        review.node_tree.links.remove(link)
                    socket.default_value = value
        if shading_mode == "unlit-base-color":
            principled = next((node for node in review.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
            output = next((node for node in review.node_tree.nodes if node.type == "OUTPUT_MATERIAL"), None)
            if principled and output:
                emission = review.node_tree.nodes.new("ShaderNodeEmission")
                emission.name = "Inspection unlit Base Color"
                base_color = principled.inputs.get("Base Color")
                if base_color:
                    emission.inputs["Color"].default_value = base_color.default_value
                    for link in list(base_color.links):
                        review.node_tree.links.new(link.from_socket, emission.inputs["Color"])
                for link in list(output.inputs["Surface"].links):
                    review.node_tree.links.remove(link)
                review.node_tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])
    review.metallic = 0.0
    review.roughness = 0.88
    cache[key] = review
    return review


def assign_matte_material_copies(imported: list[bpy.types.Object], shading_mode: str) -> None:
    cache: dict[str, bpy.types.Material] = {}
    for obj in imported:
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            slot.material = make_matte_review_material(slot.material, cache, shading_mode)
        if not obj.material_slots:
            obj.data.materials.append(make_matte_review_material(None, cache, shading_mode))


def scene_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points: list[Vector] = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        raise RuntimeError("The imported GLB has no mesh bounds to render.")
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return minimum, maximum


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_area_light(name: str, location: Vector, target: Vector, energy: float, size: float) -> None:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = location
    look_at(light, target)


def configure_studio(minimum: Vector, maximum: Vector, resolution: int) -> tuple[bpy.types.Object, Vector, float]:
    center = (minimum + maximum) * 0.5
    extent = maximum - minimum
    largest = max(extent.x, extent.y, extent.z, 0.01)
    target = Vector((center.x, center.y, minimum.z + extent.z * 0.52))

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.045, 0.05, 0.065)
    scene.view_settings.look = "AgX - Medium High Contrast"

    camera_data = bpy.data.cameras.new("Inspection Camera")
    camera_data.lens = 55
    camera = bpy.data.objects.new("Inspection Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera

    # A restrained three-light setup gives readable facets without reflections.
    add_area_light("Key Softbox", target + Vector((largest * 2.3, -largest * 2.7, largest * 2.5)), target, 950.0, largest * 2.8)
    add_area_light("Fill Softbox", target + Vector((-largest * 2.2, -largest * 1.7, largest * 1.2)), target, 350.0, largest * 2.2)
    add_area_light("Rim Softbox", target + Vector((largest * 0.3, largest * 2.5, largest * 2.1)), target, 550.0, largest * 1.8)

    plane_data = bpy.data.meshes.new("Matte Studio Floor")
    plane = bpy.data.objects.new("Matte Studio Floor", plane_data)
    bpy.context.collection.objects.link(plane)
    half = largest * 7.0
    z = minimum.z - max(largest * 0.006, 0.001)
    vertices = [(-half, -half, z), (half, -half, z), (half, half, z), (-half, half, z)]
    plane_data.from_pydata(vertices, [], [(0, 1, 2, 3)])
    floor = bpy.data.materials.new("Matte Studio Floor")
    floor.diffuse_color = (0.14, 0.15, 0.18, 1.0)
    floor.roughness = 1.0
    plane_data.materials.append(floor)
    return camera, target, largest


def render_views(output_dir: Path, camera: bpy.types.Object, target: Vector, largest: float, front_yaw: float) -> list[str]:
    scene = bpy.context.scene
    rendered: list[str] = []
    radius = largest * 2.55
    elevation = largest * 0.72
    for label, relative_yaw in VIEW_DEFINITIONS:
        yaw = front_yaw + relative_yaw
        camera.location = target + Vector((math.sin(yaw) * radius, -math.cos(yaw) * radius, elevation))
        look_at(camera, target)
        destination = output_dir / f"{label}.png"
        scene.render.filepath = str(destination)
        bpy.ops.render.render(write_still=True)
        rendered.append(destination.name)
    return rendered


def topology_facts(mesh: bpy.types.Mesh) -> dict:
    """Return bounded, raw-mesh topology facts without modifying the mesh.

    This deliberately uses the imported mesh's vertices and polygon rings rather
    than evaluated geometry.  A union-find pass over edges is linear for the
    small-to-medium generated meshes used by this review tool.
    """
    vertex_count = len(mesh.vertices)
    parent = list(range(vertex_count))
    component_size = [1] * vertex_count

    def find(vertex: int) -> int:
        while parent[vertex] != vertex:
            parent[vertex] = parent[parent[vertex]]
            vertex = parent[vertex]
        return vertex

    def union(left: int, right: int) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root == right_root:
            return
        if component_size[left_root] < component_size[right_root]:
            left_root, right_root = right_root, left_root
        parent[right_root] = left_root
        component_size[left_root] += component_size[right_root]

    # Face usage is independent from edge connectivity.  It distinguishes a
    # boundary opening (one face) from a non-manifold edge (three or more).
    face_use: dict[tuple[int, int], int] = {}
    connected_to_edge = [False] * vertex_count
    for edge in mesh.edges:
        first, second = edge.vertices[:]
        connected_to_edge[first] = True
        connected_to_edge[second] = True
        union(first, second)
    for polygon in mesh.polygons:
        vertices = polygon.vertices[:]
        for index, first in enumerate(vertices):
            second = vertices[(index + 1) % len(vertices)]
            key = (first, second) if first < second else (second, first)
            face_use[key] = face_use.get(key, 0) + 1

    component_sizes: dict[int, int] = {}
    for vertex in range(vertex_count):
        root = find(vertex)
        component_sizes[root] = component_sizes.get(root, 0) + 1
    return {
        "uv_layers": [layer.name for layer in mesh.uv_layers],
        "loose_vertices": sum(1 for attached in connected_to_edge if not attached),
        "connected_vertex_components": len(component_sizes),
        "largest_component_vertices": max(component_sizes.values(), default=0),
        "boundary_edges": sum(1 for count in face_use.values() if count == 1),
        "nonmanifold_edges": sum(1 for count in face_use.values() if count > 2),
        "wire_edges": sum(1 for edge in mesh.edges if tuple(sorted(edge.vertices[:])) not in face_use),
    }


def position_welded_diagnostic(mesh: bpy.types.Mesh) -> dict:
    """Measure position-connected topology on a disposable, welded mesh copy.

    GLB import commonly duplicates a geometric vertex at UV or normal seams. This
    diagnostic intentionally merges only coincident positions so its component
    and boundary counts can be compared with the raw imported topology. It does
    not describe texture seams or the mesh that will be rendered/exported.
    """
    if not mesh.vertices:
        return {
            "label": "diagnostic position-welded copy; raw mesh, UVs, and materials unchanged",
            "tolerance": 0.0,
            "vertices": 0,
            "triangles": 0,
            "topology": topology_facts(mesh),
        }
    coordinates = [vertex.co for vertex in mesh.vertices]
    minimum = Vector((min(point.x for point in coordinates), min(point.y for point in coordinates), min(point.z for point in coordinates)))
    maximum = Vector((max(point.x for point in coordinates), max(point.y for point in coordinates), max(point.z for point in coordinates)))
    tolerance = max(max(maximum - minimum) * 0.000001, 0.000000001)
    welded = bpy.data.meshes.new(f"__inspection_position_welded__{mesh.name}")
    bm = bmesh.new()
    try:
        bm.from_mesh(mesh)
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=tolerance)
        bm.to_mesh(welded)
        welded.calc_loop_triangles()
        return {
            "label": "diagnostic position-welded copy; raw mesh, UVs, and materials unchanged",
            "tolerance": tolerance,
            "vertices": len(welded.vertices),
            "triangles": len(welded.loop_triangles),
            "topology": topology_facts(welded),
        }
    finally:
        bm.free()
        bpy.data.meshes.remove(welded)


def inventory(imported: list[bpy.types.Object], minimum: Vector, maximum: Vector) -> dict:
    mesh_objects = [obj for obj in imported if obj.type == "MESH"]
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    unique_materials = {slot.material.name for obj in mesh_objects for slot in obj.material_slots if slot.material}
    referenced_images: dict[int, bpy.types.Image] = {}
    for obj in mesh_objects:
        for slot in obj.material_slots:
            material = slot.material
            if not material or not material.use_nodes or not material.node_tree:
                continue
            for node in material.node_tree.nodes:
                if node.type == "TEX_IMAGE" and node.image:
                    referenced_images[node.image.as_pointer()] = node.image
    images = [
        {"name": image.name, "width": image.size[0], "height": image.size[1], "filepath": image.filepath}
        for image in referenced_images.values()
        if image.size[0] and image.size[1]
    ]
    meshes = []
    total_vertices = total_triangles = 0
    for obj in mesh_objects:
        mesh = obj.data
        mesh.calc_loop_triangles()
        vertices = len(mesh.vertices)
        triangles = len(mesh.loop_triangles)
        total_vertices += vertices
        total_triangles += triangles
        meshes.append({
            "object": obj.name,
            "mesh": mesh.name,
            "vertices": vertices,
            "triangles": triangles,
            "topology": topology_facts(mesh),
            "position_welded_diagnostic": position_welded_diagnostic(mesh),
        })
    return {
        "object_count": len(imported),
        "mesh_object_count": len(mesh_objects),
        "material_count": len(unique_materials),
        "vertices": total_vertices,
        "triangles": total_triangles,
        "bounds": {"min": list(minimum), "max": list(maximum), "size": list(maximum - minimum)},
        "meshes": meshes,
        "textures": images,
        "armatures": [{"object": item.name, "bones": len(item.data.bones)} for item in armatures],
        "actions": [{"name": action.name, "frame_range": list(action.frame_range)} for action in bpy.data.actions],
    }


def main() -> None:
    options = parse_arguments()
    source = require_absolute_path(options.input, "--input")
    destination = require_absolute_path(options.output_dir, "--output-dir")
    if source.suffix.lower() != ".glb" or not source.is_file():
        raise ValueError(f"--input must name an existing .glb file: {source}")
    destination.mkdir(parents=True, exist_ok=True)

    clear_scene()
    imported = import_glb(source)
    minimum, maximum = scene_bounds(imported)
    requested_frame = parse_frame_bounds(options.frame_bounds)
    framing_minimum, framing_maximum = requested_frame or (minimum, maximum)
    raw_inventory = inventory(imported, minimum, maximum)
    assign_matte_material_copies(imported, options.shading_mode)
    camera, target, largest = configure_studio(framing_minimum, framing_maximum, options.resolution)
    renders = render_views(destination, camera, target, largest, math.radians(options.front_yaw_degrees))
    raw_inventory.update({
        "source_glb": str(source),
        "review_renders": renders,
        "review_material_policy": "Copied imported materials; retained texture nodes; metallic 0 and roughness 0.88 for review only." if options.shading_mode == "matte" else "Copied imported materials; Base Color routed to an unlit emission shader for a texture/UV diagnostic.",
        "review_shading_mode": options.shading_mode,
        "review_frame_bounds": {"min": list(framing_minimum), "max": list(framing_maximum), "source": "--frame-bounds" if requested_frame else "imported bounds"},
        "front_yaw_degrees": options.front_yaw_degrees,
    })
    with (destination / "inspection.json").open("w", encoding="utf-8") as handle:
        json.dump(raw_inventory, handle, indent=2)
    bpy.ops.wm.save_as_mainfile(filepath=str(destination / "inspection.blend"))
    print(json.dumps(raw_inventory, indent=2))


if __name__ == "__main__":
    main()
