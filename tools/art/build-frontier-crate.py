"""Build a low-poly crate from the independently reviewed v3 reference."""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

def arg(name):
    values = sys.argv[sys.argv.index("--") + 1:]
    return values[values.index(name) + 1]

out = Path(arg("--output-dir")).resolve()
if out.exists():
    raise ValueError('Use a new crate source-output directory')
out.mkdir(parents=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

image = bpy.data.images.new("crate-base-color", width=256, height=256, alpha=False)
pixels = []
for y in range(256):
    for x in range(256):
        if x < 192:
            band = ((y // 18) % 3) * 7 + ((x // 42) % 2) * 3
            grain = 5 if (x * 13 + y * 7) % 37 == 0 else 0
            rgb = (130 + band + grain, 68 + band // 2, 26 + band // 3)
        elif x < 224:
            rgb = (31, 39, 45)
        else:
            rgb = (84, 93, 101)
        # This generated PNG path stores these channels directly (verified by
        # decoding its bytes); do not apply an additional gamma conversion.
        color = (*[channel / 255 for channel in rgb], 1)
        pixels.extend(color)
image.pixels.foreach_set(pixels)
image.filepath_raw = str(out / "crate-atlas.png")
image.file_format = "PNG"
image.save()

def material(name, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0
    bsdf.inputs["Specular IOR Level"].default_value = 0
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    uv = nodes.new("ShaderNodeUVMap")
    links.new(uv.outputs["UV"], tex.inputs["Vector"])
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat

crate_material = material("crate-matte", 0.88)

def cube(name, loc, dims, atlas_offset=0.0, atlas_scale=0.75, bevel=0.018):
    # Design coordinates are X/right, Y/up, Z/depth. Blender's export scene is
    # X/right, Y/depth, Z/up, which lets the normalizer ground the intended Y.
    blender_loc = (loc[0], loc[2], loc[1])
    blender_dims = (dims[0], dims[2], dims[1])
    bpy.ops.mesh.primitive_cube_add(location=blender_loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = blender_dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(crate_material)
    if bevel:
        modifier = obj.modifiers.new("small faceted bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    uv_layer = obj.data.uv_layers.active
    for uv in uv_layer.data:
        uv.uv.x = atlas_offset + atlas_scale * uv.uv.x
    return obj

def brace(name, x1, y1, x2, y2, z):
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy)
    obj = cube(name, ((x1 + x2) / 2, (y1 + y2) / 2, z), (0.115, length, 0.075), 0.0, 0.75, 0.012)
    obj.rotation_euler[1] = math.atan2(dx, dy)
    return obj

def bolt(loc, normal):
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=.034, depth=.014,
                                      location=(loc[0], loc[2], loc[1]))
    obj = bpy.context.object
    obj.name = 'corner-guard-hex-bolt'
    obj.rotation_euler = Vector((normal[0], normal[2], normal[1])).to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(crate_material)
    for uv in obj.data.uv_layers.active.data:
        uv.uv = (.9375, .5)

cube("crate-core", (0, 0.54, 0), (0.82, 0.92, 0.82), 0.0, 0.75, 0.01)
for x in (-0.48, 0.48):
    for z in (-0.48, 0.48):
        cube("wooden-corner-post", (x, 0.55, z), (0.16, 1.0, 0.16))
for y in (0.08, 1.02):
    for z in (-0.49, 0.49):
        cube("front-back-rail", (0, y, z), (1.08, 0.13, 0.12))
    for x in (-0.49, 0.49):
        cube("side-rail", (x, y, 0), (0.12, 0.13, 1.08))
for z in (-0.535, 0.535):
    brace("cross-brace", -0.36, 0.25, 0.36, 0.84, z)
    brace("cross-brace", -0.36, 0.84, 0.36, 0.25, z)
for x in (-0.49, 0.49):
    for z in (-0.49, 0.49):
        for y in (0.08, 1.02):
            cube("metal-corner-cap", (x, y, z), (0.25, 0.24, 0.25), 0.751, 0.12, 0.035)
            bolt((x, y, math.copysign(.621, z)), (0, 0, math.copysign(1, z)))
            bolt((math.copysign(.621, x), y, z), (math.copysign(1, x), 0, 0))
for x in (-0.25, 0, 0.25):
    cube("top-plank", (x, 1.075, 0), (0.21, 0.055, 0.83), 0.0, 0.75, 0.012)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.wm.save_as_mainfile(filepath=str(out / "crate-editable.blend"))
# The editable scene deliberately keeps named components. The runtime export is
# one mesh, which is the static-normalizer contract and avoids per-piece draws.
bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
bpy.ops.object.join()
bpy.context.object.name = "camp-crate-replay"
bpy.ops.export_scene.gltf(filepath=str(out / "crate-handbuilt.glb"), export_format="GLB", export_materials="EXPORT", export_image_format="AUTO", export_yup=True)
