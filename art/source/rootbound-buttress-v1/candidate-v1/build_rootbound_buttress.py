"""Build the first manual Rootbound buttress candidate from reviewed reference.

Private source for this one asset. It produces an editable Blend, a one-material
GLB, measured bounds, collider proposal and neutral/game-scale renders. It does
not alter the game's registry, runtime, or shared art tools.
"""
from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def args():
    raw = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(raw) != 1:
        raise SystemExit("usage: blender --background --python build_rootbound_buttress.py -- <output-dir>")
    target = Path(raw[0]).resolve()
    if target.exists() and any(target.iterdir()):
        raise SystemExit(f"refusing to reuse non-empty output directory: {target}")
    target.mkdir(parents=True, exist_ok=True)
    return target


OUT = args()
RENDER = OUT / "renders"
RENDER.mkdir()

for item in list(bpy.data.objects):
    bpy.data.objects.remove(item, do_unlink=True)


def palette_material():
    mat = bpy.data.materials.new("RootboundPalette")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Roughness"].default_value = 1.0
    attr = nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    mat.node_tree.links.new(attr.outputs["Color"], shader.inputs["Base Color"])
    mat.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return mat


MAT = palette_material()
BARK = (0.34, 0.13, 0.045, 1.0)
BARK_LIT = (0.55, 0.25, 0.075, 1.0)
LEAF_DARK = (0.035, 0.16, 0.09, 1.0)
LEAF_MID = (0.08, 0.31, 0.13, 1.0)
LEAF_LIT = (0.31, 0.53, 0.08, 1.0)


def tint(obj, color):
    obj.data.materials.append(MAT)
    layer = obj.data.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    for datum in layer.data:
        datum.color = color


def cone(name, radius_a, radius_b, depth, loc, color, vertices=9):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius_a, radius2=radius_b, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    tint(obj, color)
    return obj


def align_between(obj, start, end):
    vector = Vector(end) - Vector(start)
    obj.location = (Vector(start) + Vector(end)) / 2
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(vector.normalized())
    obj.rotation_mode = "XYZ"


def branch(name, start, end, radius_a, radius_b, color):
    obj = cone(name, radius_a, radius_b, (Vector(end) - Vector(start)).length, (0, 0, 0), color)
    align_between(obj, start, end)
    return obj


def lobe(name, loc, scale, color):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    tint(obj, color)
    return obj


# Compact rooted lower mass: four closed buttresses, all grounded, with no arch gap.
trunk = cone("buttress_trunk", 1.05, 0.50, 3.35, (0, 1.675, 0), BARK, 10)
branch("buttress_root_front", (0.26, 0.52, 0.22), (1.85, 0.06, 1.55), 0.52, 0.18, BARK_LIT)
branch("buttress_root_left", (-0.38, 0.48, 0.10), (-2.28, 0.06, 0.64), 0.50, 0.17, BARK)
branch("buttress_root_right", (0.50, 0.44, -0.10), (2.12, 0.06, -0.82), 0.48, 0.17, BARK_LIT)
branch("buttress_root_back", (-0.12, 0.42, -0.42), (-1.20, 0.06, -1.96), 0.45, 0.15, BARK)

# Three branch windows and exactly three porous canopy lobes.
branch("branch_left", (-0.20, 2.85, 0.04), (-1.65, 4.25, 0.10), 0.38, 0.20, BARK)
branch("branch_top", (0.10, 3.08, 0.00), (0.32, 5.05, -0.08), 0.38, 0.18, BARK_LIT)
branch("branch_right", (0.23, 2.68, -0.03), (1.75, 4.02, -0.06), 0.36, 0.18, BARK)
lobe("canopy_left", (-1.75, 4.48, 0.06), (1.45, 1.05, 1.10), LEAF_MID)
lobe("canopy_top", (0.26, 5.38, -0.08), (1.24, 1.33, 1.04), LEAF_DARK)
lobe("canopy_right", (1.75, 4.25, -0.08), (1.34, 0.98, 1.04), LEAF_LIT)

# A few low-cost facets retain an alien layered canopy read without leaf-card clutter.
lobe("canopy_left_cap", (-2.12, 4.86, 0.14), (0.72, 0.58, 0.62), LEAF_LIT)
lobe("canopy_top_cap", (0.04, 5.86, -0.12), (0.62, 0.54, 0.56), LEAF_LIT)
lobe("canopy_right_cap", (2.03, 4.61, -0.08), (0.68, 0.52, 0.62), LEAF_DARK)

objects = [item for item in bpy.context.scene.objects if item.type == "MESH"]

# Apply transforms, then join under a single material and shared vertex-color palette.
bpy.context.view_layer.objects.active = trunk
for obj in objects:
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = trunk
bpy.ops.object.join()
tree = bpy.context.object
tree.name = "rootbound_buttress_canopy_v1"

# Ground exact lowest point at Z=0.
minimum = min((tree.matrix_world @ Vector(corner) for corner in tree.bound_box), key=lambda v: v.z).z
tree.location.z -= minimum
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.world.color = (0.94, 0.94, 0.94)

bpy.ops.object.light_add(type="AREA", location=(4, -4, 8))
key = bpy.context.object
key.data.energy = 1000
key.data.shape = "DISK"
key.data.size = 5
bpy.ops.object.light_add(type="AREA", location=(-4, 2, 5))
fill = bpy.context.object
fill.data.energy = 600
fill.data.size = 4

bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -0.01))
floor = bpy.context.object
floor.name = "render_ground_only"
floor.data.materials.append(MAT)
layer = floor.data.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
for datum in layer.data:
    datum.color = (0.93, 0.93, 0.91, 1.0)

bpy.ops.object.camera_add()
camera = bpy.context.object
scene.camera = camera
camera.data.type = "ORTHO"
camera.data.ortho_scale = 7.5


def point_camera(position, target=(0, 3.0, 0)):
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render(name, position, size=512):
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    point_camera(position)
    scene.render.filepath = str(RENDER / f"{name}.png")
    bpy.ops.render.render(write_still=True)


render("front", (0, -11, 4.2))
render("rear", (0, 11, 4.2))
render("left", (-11, 0, 4.2))
render("right", (11, 0, 4.2))
render("three_quarter", (8.2, -8.2, 5.0))
render("game_96", (8.2, -8.2, 5.0), 96)
render("game_48", (8.2, -8.2, 5.0), 48)

# Hide render-only floor before export.
floor.hide_render = True
floor.hide_viewport = True

bounds = [tree.matrix_world @ Vector(corner) for corner in tree.bound_box]
mins = [min(point[i] for point in bounds) for i in range(3)]
maxs = [max(point[i] for point in bounds) for i in range(3)]
dimensions = [maxs[i] - mins[i] for i in range(3)]
triangles = sum(len(poly.vertices) - 2 for poly in tree.data.polygons)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "rootbound-buttress-v1.blend"))
bpy.context.view_layer.objects.active = tree
tree.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / "rootbound-buttress-v1.glb"), export_format="GLB", use_selection=True,
    export_materials="EXPORT", export_normals=True, export_tangents=False, export_yup=True)

glb = OUT / "rootbound-buttress-v1.glb"
payload = {
    "method": "manual-blender-construction-after-conservative-early-stop-of-owned-trellis-cold-start-before-readiness",
    "reference": "../reference/target-v1.png",
    "mesh": {"triangles": triangles, "materials": 1, "bounds": {"min": mins, "max": maxs, "dimensions": dimensions}, "grounded": abs(mins[2]) < 0.0001},
    "colliderProposal": {"type": "box", "dimensions": [2.8, 2.2, 2.6], "offset": [0.0, 1.1, 0.0], "scope": "lower trunk/root core only; buttress tips and canopy are non-solid"},
    "glb": {"file": glb.name, "sha256": hashlib.sha256(glb.read_bytes()).hexdigest(), "bytes": glb.stat().st_size},
}
(OUT / "candidate-manifest.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
(OUT / "collider.json").write_text(json.dumps(payload["colliderProposal"], indent=2) + "\n", encoding="utf-8")
