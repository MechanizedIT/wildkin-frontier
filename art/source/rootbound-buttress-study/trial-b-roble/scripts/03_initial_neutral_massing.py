import bpy
import math
from mathutils import Vector
from pathlib import Path

OUT = Path(r"C:/Users/cwood/Documents/mobile-rpg/art/source/rootbound-buttress-study/trial-b-roble/output")
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "renders").mkdir(exist_ok=True)

COL = bpy.data.collections.new("TrialB_Massing")
bpy.context.scene.collection.children.link(COL)

def link(obj):
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    COL.objects.link(obj)

def add_loft(name, centers, radii, sides=8):
    """Closed tapered section loft with each ring oriented to its path tangent."""
    points = [Vector(p) for p in centers]
    verts, faces = [], []
    for i, point in enumerate(points):
        tangent = (points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]).normalized()
        reference = Vector((0, 0, 1)) if abs(tangent.z) < 0.92 else Vector((0, 1, 0))
        axis_a = tangent.cross(reference).normalized()
        axis_b = axis_a.cross(tangent).normalized()
        rx, ry = radii[i]
        for j in range(sides):
            angle = 2 * math.pi * j / sides + (i % 2) * math.radians(9)
            verts.append(point + axis_a * (math.cos(angle) * rx) + axis_b * (math.sin(angle) * ry))
    for i in range(len(points) - 1):
        for j in range(sides):
            a = i * sides + j
            b = i * sides + (j + 1) % sides
            c = (i + 1) * sides + (j + 1) % sides
            d = (i + 1) * sides + j
            faces.append((a, b, c, d))
    faces.append(tuple(range(sides - 1, -1, -1)))
    last = (len(points) - 1) * sides
    faces.append(tuple(last + j for j in range(sides)))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    COL.objects.link(obj)
    return obj

# The observed trunk core moves right through its visible fork bands. These
# deliberately readable offsets, plus local ring rotation, avoid a bulky
# straight cylinder while staying inside the approved compact envelope.
wood = []
wood.append(add_loft("GEO_B_Trunk", [
    (-0.06,0.00,0.45), (0.00,0.02,1.20), (0.12,0.03,1.90),
    (0.25,0.02,2.50), (0.22,0.02,2.88)],
    [(0.725,0.625), (0.55,0.49), (0.40,0.35), (0.33,0.29), (0.29,0.26)]))

# Five unequal buttress trajectories begin inside the collar. Their depth and
# downward curves must remain apparent in a side view, not read as flat fins.
root_specs = [
    ("GEO_B_Root_FrontLeft", [(-0.35,0.28,1.20),(-0.85,0.55,0.90),(-1.55,0.75,0.42),(-2.15,0.85,0.08)], [(0.36,0.21),(0.335,0.17),(0.29,0.145),(0.23,0.12)]),
    ("GEO_B_Root_FrontCenterRight", [(0.35,0.30,1.28),(0.78,0.55,0.92),(1.55,0.65,0.46),(2.20,0.45,0.08)], [(0.39,0.23),(0.36,0.19),(0.305,0.16),(0.25,0.135)]),
    ("GEO_B_Root_RearLeft", [(-0.48,-0.35,1.15),(-0.95,-0.72,0.75),(-1.55,-1.20,0.30),(-1.85,-1.35,0.06)], [(0.31,0.195),(0.285,0.165),(0.245,0.135),(0.20,0.12)]),
    ("GEO_B_Root_RearRight", [(0.48,-0.32,1.05),(0.90,-0.68,0.72),(1.40,-1.20,0.30),(1.75,-1.35,0.06)], [(0.30,0.19),(0.27,0.16),(0.23,0.135),(0.195,0.12)]),
    ("GEO_B_Root_RearCenter", [(0.00,-0.52,1.05),(0.10,-1.00,0.72),(-0.05,-1.45,0.30),(-0.20,-1.75,0.06)], [(0.29,0.185),(0.265,0.155),(0.225,0.135),(0.19,0.12)]),
]
for name, path, radii in root_specs:
    wood.append(add_loft(name, path, radii))

# Major paths are built from shared-neck overlap and tangent-oriented sections.
# Each retains a shallow elbow and Y displacement for side-view evidence.
wood.append(add_loft("GEO_B_LeftLimb", [
    (0.22,0.02,2.88),(-0.18,0.05,3.05),(-0.68,0.12,3.23),(-1.08,0.08,3.55),(-1.28,0.01,3.78)],
    [(0.29,0.26),(0.24,0.215),(0.195,0.175),(0.155,0.14),(0.13,0.12)]))
wood.append(add_loft("GEO_B_RightLimb", [
    (0.25,0.02,2.50),(0.55,-0.05,2.80),(1.05,-0.15,3.00),(1.40,-0.12,3.28),(1.56,-0.05,3.55)],
    [(0.33,0.29),(0.265,0.23),(0.20,0.175),(0.15,0.135),(0.12,0.11)]))
wood.append(add_loft("GEO_B_UpperLeader", [
    (0.22,0.02,2.88),(0.36,-0.05,3.28),(0.38,-0.14,3.65),(0.28,-0.20,4.05),(0.18,-0.18,4.25)],
    [(0.29,0.26),(0.235,0.205),(0.18,0.16),(0.14,0.125),(0.115,0.105)]))

def canopy(name, center, scale, seed):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=center)
    obj = bpy.context.active_object
    obj.name = name
    link(obj)
    for index, vert in enumerate(obj.data.vertices):
        wobble = 0.82 + ((index * 17 + seed * 13) % 19) / 60
        vert.co.x *= scale[0] * wobble
        vert.co.y *= scale[1] * (0.90 + ((index * 7 + seed) % 11) / 55)
        vert.co.z *= scale[2] * wobble
    return obj

# Separate, genuinely deep faceted hull groups; no leaf cards or fused shell.
canopies = [
    canopy("GEO_B_CanopyLeft", (-1.48,0.04,4.03), (1.12,0.78,0.66), 1),
    canopy("GEO_B_CanopyHigh", (0.28,-0.08,4.86), (1.22,0.86,0.82), 2),
    canopy("GEO_B_CanopyRight", (1.52,-0.34,3.89), (1.04,0.74,0.64), 3),
]

neutral = bpy.data.materials.new("MAT_B_NeutralMassing")
neutral.diffuse_color = (0.52, 0.55, 0.58, 1.0)
for obj in wood + canopies:
    obj.data.materials.append(neutral)
    for poly in obj.data.polygons:
        poly.use_smooth = False

# Ground/contact visual aid only; excluded from mesh counts and later export.
bpy.ops.mesh.primitive_plane_add(size=18, location=(0,0,0))
ground = bpy.context.active_object
ground.name = "REF_B_Ground"
link(ground)
ground_mat = bpy.data.materials.new("MAT_B_Ground")
ground_mat.diffuse_color = (0.10, 0.11, 0.12, 1.0)
ground.data.materials.append(ground_mat)

# Neutral review camera/lights. Render paths are fresh Trial B evidence.
def look_at(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat('-Z', 'Y').to_euler()

bpy.ops.object.light_add(type='AREA', location=(4,-5,8))
key = bpy.context.active_object; key.name = "REF_B_Key"; link(key); key.data.energy = 900; key.data.shape = 'DISK'; key.data.size = 5
look_at(key, (0,0,2.5))
bpy.ops.object.light_add(type='AREA', location=(-5,2,5))
fill = bpy.context.active_object; fill.name = "REF_B_Fill"; link(fill); fill.data.energy = 500; fill.data.size = 4
look_at(fill, (0,0,2.4))
bpy.ops.object.camera_add()
cam = bpy.context.active_object; cam.name = "REF_B_Camera"; link(cam); bpy.context.scene.camera = cam; cam.data.lens = 52

views = {
    "front": (0,-12,4.0), "rear": (0,12,4.0), "left": (-12,0,4.0),
    "right": (12,0,4.0), "three_quarter": (9,-10,5.2)
}
for label, loc in views.items():
    cam.location = loc
    look_at(cam, (0.10, 0.0, 2.75))
    bpy.context.scene.render.filepath = str(OUT / "renders" / f"massing_{label}.png")
    bpy.ops.render.render(write_still=True)

bpy.context.view_layer.update()
mesh_objs = wood + canopies
triangles = sum(sum(len(poly.vertices) - 2 for poly in obj.data.polygons) for obj in mesh_objs)
coords = [obj.matrix_world @ vertex.co for obj in mesh_objs for vertex in obj.data.vertices]
bounds = {axis: [min(getattr(v, axis) for v in coords), max(getattr(v, axis) for v in coords)] for axis in ('x','y','z')}
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "trial-b-roble-massing.blend"))
print({"objects": [obj.name for obj in mesh_objs], "triangles": triangles, "bounds": bounds, "blend": str(OUT / "trial-b-roble-massing.blend")})
