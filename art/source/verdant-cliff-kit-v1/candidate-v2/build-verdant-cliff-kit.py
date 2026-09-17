"""Build the Verdant scenic-cliff family from explicit low-poly rock masses.

Blender source coordinates are metres, Z-up, with every base at Z=0.  The
three GLBs deliberately remain static and use one packed opaque palette each.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


parser = argparse.ArgumentParser()
parser.add_argument("--output-dir", required=True)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
OUT = Path(args.output_dir).resolve()
if OUT.exists():
    raise RuntimeError("Use a fresh candidate directory; preserve earlier art studies.")
OUT.mkdir(parents=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

# Warm Verdant-gray planes with only a restrained olive recess swatch.  The
# image is packed into every exported GLB, so no runtime texture request is
# introduced.
PALETTE = [
    (67, 70, 70), (84, 86, 84), (101, 100, 95), (122, 117, 108),
    (74, 77, 76), (92, 91, 86), (111, 107, 99), (139, 130, 117),
    (53, 57, 55), (64, 67, 63), (77, 78, 70), (91, 90, 76),
    (57, 62, 52), (69, 73, 57), (81, 84, 61), (96, 95, 67),
]


atlas = bpy.data.images.new("Verdant cliff matte palette", width=256, height=256, alpha=False)
pixels = []
for y in range(256):
    for x in range(256):
        # Generated Blender images are encoded as sRGB PNGs on save.  Feeding
        # raw normalized swatches avoids an extra linearization on the later
        # texture decode; the packed GLB then keeps the exact source palette.
        pixels.extend([c / 255 for c in PALETTE[(y // 64) * 4 + x // 64]] + [1])
atlas.pixels.foreach_set(pixels)
atlas.filepath_raw = str(OUT / "verdant-cliff-palette.png")
atlas.file_format = "PNG"
atlas.save()
atlas.pack()

material = bpy.data.materials.new("Verdant cliff matte stone")
material.use_nodes = True
bsdf = material.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Roughness"].default_value = 1.0
bsdf.inputs["Metallic"].default_value = 0.0
bsdf.inputs["Specular IOR Level"].default_value = 0.0
tex = material.node_tree.nodes.new("ShaderNodeTexImage")
tex.image = atlas
tex.interpolation = "Closest"
material.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])


def palette_uv(index):
    return ((index % 4 + .5) / 4, (index // 4 + .5) / 4)


def tone_from_normal(normal, dark=False):
    if dark:
        return 12 + (1 if normal.z > .35 else 0)
    if normal.z > .73:
        return 7
    if normal.z > .32:
        return 6
    if normal.y < -.35:
        return 1
    if normal.x > .35:
        return 3
    return 5


def mesh_object(name, verts, faces, dark_faces=()):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(material)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = False
    uv = mesh.uv_layers.new(name="Palette")
    for i, polygon in enumerate(mesh.polygons):
        index = tone_from_normal(polygon.normal, i in dark_faces)
        for loop in polygon.loop_indices:
            uv.data[loop].uv = palette_uv(index)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def faceted_chunk(name, center, rings, phase=0.0):
    """An explicitly stepped seven-sided rock mass, not a smoothed primitive."""
    angles = [phase + a for a in (0.00, .83, 1.72, 2.58, 3.45, 4.42, 5.41)]
    verts = []
    for z, rx, ry, dx, dy in rings:
        for i, angle in enumerate(angles):
            wobble = 1 + (.07 if i in (1, 4) else -.045 if i in (2, 6) else 0)
            verts.append((center[0] + dx + math.cos(angle) * rx * wobble,
                          center[1] + dy + math.sin(angle) * ry * wobble,
                          z))
    count = len(angles)
    faces = []
    for ring in range(len(rings) - 1):
        for i in range(count):
            a, b = ring * count + i, ring * count + (i + 1) % count
            c, d = (ring + 1) * count + (i + 1) % count, (ring + 1) * count + i
            # Split alternating diagonals into substantial plane facets.
            faces.extend(((a, b, d), (b, c, d)) if (i + ring) % 2 else ((a, b, c), (a, c, d)))
    faces.extend(tuple(range(count - 1, -1, -1)) for _ in [0])
    top = (len(rings) - 1) * count
    faces.extend((top, top + i, top + i + 1) for i in range(1, count - 1))
    return mesh_object(name, verts, faces), verts


def crack_strip(name, points, width=.07):
    """A recessed olive ribbon placed only along a supported overlapping seam."""
    verts = []
    for x, y, z in points:
        verts.extend(((x - width, y - .012, z), (x + width, y - .012, z)))
    faces = []
    for i in range(len(points) - 1):
        faces.extend(((i * 2, i * 2 + 1, i * 2 + 3), (i * 2, i * 2 + 3, i * 2 + 2)))
    return mesh_object(name, verts, faces, range(len(faces)))


def hull_descriptor(vertices):
    bm = bmesh.new()
    for vertex in vertices:
        bm.verts.new(vertex)
    bm.verts.ensure_lookup_table()
    bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
    used = {vertex for face in bm.faces for vertex in face.verts}
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if vertex not in used], context="VERTS")
    bmesh.ops.triangulate(bm, faces=list(bm.faces), quad_method="BEAUTY", ngon_method="BEAUTY")
    bm.verts.ensure_lookup_table()
    bm.verts.index_update()
    # Blender (x, y, z) -> glTF/world (x, y, z) with export_yup's Y-up swap.
    # This matches prior project source receipts: (x, z, -y).
    result = {
        "shape": "convexHull",
        "offset": {"x": 0, "y": 0, "z": 0},
        "vertices": [round(value, 6) for vertex in bm.verts for value in (vertex.co.x, vertex.co.z, -vertex.co.y)],
        "indices": [vertex.index for face in bm.faces for vertex in face.verts],
    }
    bm.free()
    return result


def join_model(name, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    model = bpy.context.object
    model.name = name
    model.data.name = name + " mesh"
    model.location = (0, 0, 0)
    return model


def build_toe():
    parts, hulls = [], []
    obj, points = faceted_chunk("Toe broad core", (0, .04), [
        (0, 1.78, .92, 0, 0), (.28, 1.75, .90, -.05, .02), (.92, 1.34, .78, -.14, -.03), (1.34, .76, .57, -.30, -.04)], .16)
    parts.append(obj); hulls.append(hull_descriptor(points))
    obj, points = faceted_chunk("Toe shoulder", (.83, -.10), [
        (0, 1.02, .75, 0, 0), (.30, .98, .72, .02, .03), (.92, .71, .56, -.04, -.01), (1.18, .42, .39, -.16, -.02)], .46)
    parts.append(obj); hulls.append(hull_descriptor(points))
    parts.append(crack_strip("Toe restrained lichen", [(-.12, -.86, .18), (-.02, -.93, .50), (.12, -.89, .76), (.22, -.80, .98)], .055))
    return join_model("verdant-cliff-toe", parts), hulls


def build_buttress():
    parts, hulls = [], []
    specifications = [
        ("Buttress planted base", (-.12, .03), [(0,1.55,.86,0,0),(.55,1.48,.82,-.02,0),(1.25,1.24,.70,-.14,.02),(1.62,.91,.52,-.26,.04)], .12),
        # Broad near-vertical upper rings keep the split as a blunt rock face,
        # with a distinct left shelf rather than a uniformly tapered cone.
        ("Buttress right tower", (.58,.12), [(0,1.04,.72,0,0),(.72,.97,.68,.03,.02),(2.08,.92,.62,.08,.00),(3.18,.91,.59,.00,.02),(3.88,.88,.56,-.10,.03)], .42),
        ("Buttress left shelf", (-.73,-.10), [(0,.86,.66,0,0),(.48,.85,.64,-.02,0),(1.35,.79,.60,.06,.03),(2.35,.69,.47,.16,.02),(2.72,.66,.42,.22,.03)], -.16),
        ("Buttress forward stratum", (-.15,-.62), [(0,1.22,.42,0,0),(.32,1.16,.41,.02,0),(.82,1.19,.43,.08,.00),(1.02,1.03,.37,-.04,.00),(1.43,.66,.30,-.19,.01)], .20),
    ]
    for name, center, rings, phase in specifications:
        obj, points = faceted_chunk(name, center, rings, phase)
        parts.append(obj); hulls.append(hull_descriptor(points))
    # Both strips live in overlapping stone seams; there are no loose moss parts.
    parts.append(crack_strip("Buttress central split", [(-.12,-.83,.30), (-.03,-.86,.92), (.08,-.80,1.62), (.16,-.72,2.38), (.18,-.61,3.20)], .060))
    parts.append(crack_strip("Buttress low recess lichen", [(-.88,-.78,.18), (-.76,-.82,.56), (-.69,-.76,.82)], .045))
    return join_model("verdant-cliff-buttress", parts), hulls


def build_ledge():
    parts, hulls = [], []
    specifications = [
        ("Ledge grounded plinth", (.05,.12), [(0,1.62,.82,0,0),(.48,1.56,.79,0,.02),(1.06,1.42,.70,-.02,.04),(1.38,1.08,.57,-.10,.04)], .20),
        ("Ledge broad cap", (-.20,-.24), [(1.02,1.84,.78,0,0),(1.30,1.79,.76,-.04,-.04),(1.86,1.50,.66,-.14,-.08),(2.28,1.14,.51,-.25,-.08)], .04),
        ("Ledge rear crown", (.98,.32), [(1.18,.82,.56,0,0),(1.53,.78,.52,.02,0),(2.08,.58,.42,-.06,.01),(2.32,.35,.28,-.15,.02)], .52),
        ("Ledge right buttress", (1.12,.32), [(0,.72,.62,0,0),(.42,.69,.58,0,0),(1.28,.52,.45,-.03,.01),(1.76,.34,.31,-.13,.03)], -.20),
    ]
    for name, center, rings, phase in specifications:
        obj, points = faceted_chunk(name, center, rings, phase)
        parts.append(obj); hulls.append(hull_descriptor(points))
    parts.append(crack_strip("Ledge sheltered lichen", [(.52,-.73,.22), (.45,-.77,.60), (.50,-.75,.92), (.70,-.71,1.20)], .052))
    return join_model("verdant-cliff-ledge", parts), hulls


BUILDERS = [("verdant-cliff-toe", build_toe), ("verdant-cliff-buttress", build_buttress), ("verdant-cliff-ledge", build_ledge)]
records = []
for name, builder in BUILDERS:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    model, hulls = builder()
    bpy.context.view_layer.update()
    model.select_set(True)
    bpy.context.view_layer.objects.active = model
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f"{name}-editable.blend"))
    glb = OUT / f"{name}.glb"
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True,
                              export_yup=True, export_materials="EXPORT", export_animations=False)
    model.data.calc_loop_triangles()
    points = [model.matrix_world @ vertex.co for vertex in model.data.vertices]
    low = [min(point[i] for point in points) for i in range(3)]
    high = [max(point[i] for point in points) for i in range(3)]
    record = {
        "name": name,
        "file": glb.name,
        "sha256": hashlib.sha256(glb.read_bytes()).hexdigest(),
        "bytes": glb.stat().st_size,
        "triangles": len(model.data.loop_triangles),
        "meshCount": 1,
        "materialCount": 1,
        "texture": {"embedded": True, "opaque": True, "size": [256, 256]},
        "roughness": 1, "metalness": 0,
        "boundsBlenderMeters": {"min": [round(v, 5) for v in low], "max": [round(v, 5) for v in high],
                                  "size": [round(high[i] - low[i], 5) for i in range(3)]},
        "collisionRecommendation": {"method": "place no more than four rock-chunk convex hulls; do not replace the concave silhouette with one broad box", "hulls": hulls},
    }
    (OUT / f"{name}-colliders.json").write_text(json.dumps(record["collisionRecommendation"], indent=2), encoding="utf-8")
    records.append(record)

total = sum(record["triangles"] for record in records)
if total > 1900:
    raise RuntimeError(f"Triangle budget exceeded: {total}")

manifest = {
    "assetFamily": "verdant-cliff-kit-v1 candidate-v2",
    "reference": "art/targets/verdant-cliff-kit-v1/target.png",
    "referenceSHA256": hashlib.sha256((Path.cwd() / "art/targets/verdant-cliff-kit-v1/target.png").read_bytes()).hexdigest(),
    "targetReview": "independent target PASS 8.4; exact exported models remain PENDING independent review",
    "orientation": "ground origin in Blender metres, Z-up; GLB exported Y-up",
    "constraints": "static scenic geology only; no crystals, gold, hardware, pointed spires, glow, reflection, or material bake",
    "totalTriangles": total,
    "assets": records,
}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def look(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def imported_model(path, location):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [obj for obj in bpy.data.objects if obj not in before and obj.parent is None]
    for obj in new:
        obj.location += Vector(location)
    return new


def render_scene(objects, filename, position, target, scale=11.5):
    cam.location = position
    cam.data.ortho_scale = scale
    look(cam, target)
    scene.render.filepath = str(OUT / filename)
    bpy.ops.render.render(write_still=True)


# Fresh-GLB, neutral CPU evidence: no Blender source geometry is rendered.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 10
scene.cycles.use_denoising = True
scene.render.threads_mode = "FIXED"
scene.render.threads = 2
scene.render.resolution_x = 640
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.view_settings.look = "None"
world = bpy.data.worlds.new("Neutral cliff review")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (.47, .49, .50, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = .65
scene.world = world
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -.015))
floor = bpy.context.object
floor_mat = bpy.data.materials.new("Review floor")
floor_mat.use_nodes = True
floor_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.32, .34, .33, 1)
floor_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1
floor.data.materials.append(floor_mat)
for label, pos, energy, size in [("Key", (-5, -7, 9), 850, 5), ("Fill", (5, -2, 6), 280, 4)]:
    bpy.ops.object.light_add(type="AREA", location=pos)
    light = bpy.context.object
    light.name = label
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    look(light, (0, 0, 1.2))
bpy.ops.object.camera_add()
cam = bpy.context.object
scene.camera = cam
cam.data.type = "ORTHO"

family = []
for record, position in zip(records, [(-4.2, 0, 0), (0, 0, 0), (4.25, 0, 0)]):
    family.extend(imported_model(OUT / record["file"], position))
render_scene(family, "family-front3q.png", (8, -14, 8), (0, 0, 1.7), 12.2)
render_scene(family, "family-front.png", (0, -15, 5.2), (0, 0, 1.65), 11.7)
render_scene(family, "family-back3q.png", (-8, 13, 7), (0, 0, 1.6), 12.2)
render_scene(family, "family-orthographic.png", (0, -20, 4), (0, 0, 1.55), 11.5)

for record in records:
    for obj in family:
        obj.hide_render = True
    current = imported_model(OUT / record["file"], (0, 0, 0))
    render_scene(current, f"{record['name']}-front.png", (6, -9, 4.4), (0, 0, 1.2), 5.4)
    render_scene(current, f"{record['name']}-back.png", (-5.5, 8.5, 3.8), (0, 0, 1.2), 5.4)
    for obj in current:
        bpy.data.objects.remove(obj, do_unlink=True)

render_evidence = {
    "source": "fresh exported GLBs imported into a neutral Blender review scene",
    "engine": "Cycles CPU", "threads": 2, "samples": 10, "resolution": [640, 512],
    "views": ["family-front3q.png", "family-front.png", "family-back3q.png", "family-orthographic.png"] + [
        f"{record['name']}-{side}.png" for record in records for side in ("front", "back")],
    "review": "PENDING independent exact-export visual review; implementer did not self-admit",
}
(OUT / "render-evidence.json").write_text(json.dumps(render_evidence, indent=2), encoding="utf-8")
print(json.dumps(manifest, indent=2), flush=True)
