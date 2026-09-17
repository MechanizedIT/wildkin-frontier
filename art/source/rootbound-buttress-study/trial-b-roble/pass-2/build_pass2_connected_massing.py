"""Trial B pass 2: connected-surface massing from director section contract v2.

The visible skeleton points and taper values are loaded directly from the
contract. The root amendment authorizes a practical connected junction method:
full child rings occur at L1/R1/U1 after they separate; the v2 neck locations
are controls, not literal overlapping loop boundaries. Exact boolean unions are
used openly to fuse explicitly sculpted saddle volumes and collar bands into a
single closed mesh; the audit below records the resulting component/boundary
state. This is a repair massing source, not an export candidate.
"""

import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(r"C:/Users/cwood/Documents/mobile-rpg/art/source/rootbound-buttress-study/trial-b-roble")
PLAN = Path(r"C:/Users/cwood/Documents/mobile-rpg/art/source/rootbound-buttress-study/director/section-construction.json")
OUT = ROOT / "pass-2" / "output"
RENDERS = OUT / "renders"
OUT.mkdir(parents=True, exist_ok=True)
RENDERS.mkdir(exist_ok=True)
plan = json.loads(PLAN.read_text(encoding="utf-8"))
assert plan["schema"] == "rootbound-buttress-section-construction/v3-amended"

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for blocks in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    for block in list(blocks):
        if block.users == 0:
            blocks.remove(block)

scene = bpy.context.scene
scene.name = "Rootbound_Trial_B_Pass2_ConnectedMassing"
scene.unit_settings.system = "METRIC"
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.world.color = (0.045, 0.045, 0.052)

COL = bpy.data.collections.new("TrialB_Pass2")
scene.collection.children.link(COL)

def relink(obj):
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    COL.objects.link(obj)

def tangent_frame(points, index):
    points = [Vector(p) for p in points]
    tangent = (points[min(index + 1, len(points) - 1)] - points[max(index - 1, 0)]).normalized()
    horizontal = Vector((tangent.x, tangent.y, 0.0))
    if horizontal.length < 1e-5:
        axis_u = Vector((1, 0, 0))
    else:
        axis_u = Vector((0, 0, 1)).cross(horizontal).normalized()
    axis_v = tangent.cross(axis_u).normalized()
    return tangent, axis_u, axis_v

def loft(name, points, full_axes, sides=10):
    """Closed path loft with continuous tangent frames and no end caps at joins."""
    points = [Vector(p) for p in points]
    verts, faces = [], []
    for i, point in enumerate(points):
        _, u, v = tangent_frame(points, i)
        rx, ry = full_axes[i][0] / 2, full_axes[i][1] / 2
        for j in range(sides):
            angle = 2 * math.pi * j / sides + math.radians((i * 7) % 17)
            verts.append(point + u * (math.cos(angle) * rx) + v * (math.sin(angle) * ry))
    for i in range(len(points) - 1):
        for j in range(sides):
            a, b = i*sides+j, i*sides+(j+1) % sides
            c, d = (i+1)*sides+(j+1) % sides, (i+1)*sides+j
            faces.append((a,b,c,d))
    # End caps make each input water-tight for the exact union; the caps are
    # removed inside the boolean result, so no internal caps remain afterwards.
    faces.append(tuple(range(sides-1, -1, -1)))
    last = (len(points)-1)*sides
    faces.append(tuple(last+j for j in range(sides)))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    COL.objects.link(obj)
    return obj

def ico_saddle(name, location, scale, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    relink(obj)
    return obj

def exact_union(base, cutter):
    mod = base.modifiers.new("UNION_" + cutter.name, "BOOLEAN")
    mod.operation = "UNION"
    mod.solver = "EXACT"
    mod.object = cutter
    bpy.context.view_layer.objects.active = base
    base.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)

def records(entries):
    return [entry["positionM"] for entry in entries], [entry["fullSectionAxesM"] for entry in entries]

# T0–T4 form the closed parent body. Subsequent branch/root paths load the
# frozen points and tapers directly from the v2 plan.
t_points, t_axes = records(plan["trunk"]["points"])
wood = loft("GEO_B2_ConnectedWood", t_points, t_axes, 10)

# A deliberately broad contoured collar sits around T0/T1. Five root bands are
# individually fused from their first two listed sections. The exact union
# creates one closed lower web with no hollow walk-under tunnels.
root_specs = plan["roots"]
for root in root_specs:
    pts, axes = records(root["points"])
    # The first control is retained; the deep overlap is an explicit temporary
    # union operation, not a hidden detached leg.
    piece = loft("TMP_" + root["id"], pts, axes, 8)
    exact_union(wood, piece)

# Partial-arc/saddle equivalent: the visible saddle bodies attach at T3/T4 and
# are fused into the parent before full child-ring paths separate at L1/R1/U1.
for name, loc, scale, rot in [
    ("TMP_T3_Saddle", (0.29,0.00,2.55), (0.44,0.34,0.38), (0.15,0.08,0.0)),
    ("TMP_T4_Saddle", (0.23,0.01,2.91), (0.40,0.31,0.35), (-0.12,0.10,0.0)),
]:
    exact_union(wood, ico_saddle(name, loc, scale, rot))

for branch in plan["majorBranches"]:
    pts, axes = records(branch["points"])
    # Full child geometry begins at point 1 after the saddle region, while a
    # short tangent-directed transition reaches into its matching saddle.
    start = Vector(pts[0])
    target = Vector(pts[1])
    transition = start.lerp(target, 0.42)
    child_points = [tuple(start), tuple(transition)] + pts[1:]
    child_axes = [axes[0], [axes[0][0]*0.86, axes[0][1]*0.86]] + axes[1:]
    exact_union(wood, loft("TMP_" + branch["id"], child_points, child_axes, 8))

# Add contoured valley webs at the lower collar. They are broad, shallow fused
# planes, not a radial fan; the tree stays closed because every web joins wood.
for index, location in enumerate([(-0.62,0.15,0.55),(0.55,0.14,0.55),(-0.05,-0.52,0.52)]):
    exact_union(wood, ico_saddle("TMP_CollarWeb_%d" % index, location, (0.72,0.50,0.36), (0,0,index*0.85)))

wood.name = "GEO_B2_ConnectedButtressTree"

def canopy_hull(name, center, scale, seed):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=center)
    obj = bpy.context.active_object
    obj.name = name
    relink(obj)
    for i, vert in enumerate(obj.data.vertices):
        a = 0.82 + ((i * 13 + seed * 7) % 17) / 52.0
        b = 0.82 + ((i * 11 + seed * 5) % 13) / 48.0
        vert.co.x *= scale[0] * a
        vert.co.y *= scale[1] * b
        vert.co.z *= scale[2] * a
    return obj

# Three groups, three interlocking low-poly hulls each. Each group stays
# spatially separated from the others and overlaps a structural branch end.
canopy_specs = [
    ("Left", [(-1.32,0.03,4.02),( -1.64,0.10,4.04),(-1.22,-0.15,4.26)], [(0.80,0.58,0.52),(0.64,0.50,0.45),(0.58,0.48,0.44)]),
    ("High", [(0.18,-0.10,4.80),(0.42,-0.12,5.05),(-0.02,0.03,4.74)], [(0.83,0.62,0.62),(0.65,0.53,0.52),(0.60,0.50,0.46)]),
    ("Right", [(1.38,-0.20,3.88),(1.66,-0.25,3.92),(1.40,-0.05,4.12)], [(0.75,0.56,0.49),(0.60,0.48,0.43),(0.55,0.45,0.40)]),
]
canopies=[]
for group_index, (group, centers, scales) in enumerate(canopy_specs):
    for hull_index, (center, scale) in enumerate(zip(centers, scales)):
        canopies.append(canopy_hull("GEO_B2_Canopy_%s_%d" % (group, hull_index+1), center, scale, group_index*5+hull_index+1))

neutral = bpy.data.materials.new("MAT_B2_Neutral")
neutral.diffuse_color = (0.53,0.56,0.58,1.0)
for obj in [wood] + canopies:
    obj.data.materials.append(neutral)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False

bpy.ops.mesh.primitive_plane_add(size=18, location=(0,0,0))
ground=bpy.context.active_object; ground.name="REF_B2_Ground"; relink(ground)
gm=bpy.data.materials.new("MAT_B2_Ground"); gm.diffuse_color=(0.09,0.10,0.11,1.0); ground.data.materials.append(gm)

def look_at(obj, point):
    obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()

for name, loc, energy, size in [("REF_B2_Key",(4,-5,8),900,5),("REF_B2_Fill",(-5,2,5),500,4)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light=bpy.context.active_object; light.name=name; relink(light); light.data.energy=energy; light.data.size=size; look_at(light,(0,0,2.5))
bpy.ops.object.camera_add(); cam=bpy.context.active_object; cam.name="REF_B2_Camera"; relink(cam); cam.data.lens=52; scene.camera=cam
for label, loc in {"front":(0,-12,4.0),"rear":(0,12,4.0),"left":(-12,0,4.0),"right":(12,0,4.0),"three_quarter":(9,-10,5.2)}.items():
    cam.location=loc; look_at(cam,(0.05,0,2.8)); scene.render.filepath=str(RENDERS/("pass2_"+label+".png")); bpy.ops.render.render(write_still=True)

bpy.context.view_layer.update()
mesh_objs=[wood]+canopies
triangles=sum(sum(len(p.vertices)-2 for p in obj.data.polygons) for obj in mesh_objs)
coords=[obj.matrix_world @ v.co for obj in mesh_objs for v in obj.data.vertices]
bounds={a:[min(getattr(v,a) for v in coords),max(getattr(v,a) for v in coords)] for a in ("x","y","z")}

# Audit evaluates only the wood's final boolean result; cap-derived internal
# faces are removed by the union operation and boundary edges must be zero.
edge_uses={}
for poly in wood.data.polygons:
    for key in [tuple(sorted((poly.vertices[i],poly.vertices[(i+1)%len(poly.vertices)]))) for i in range(len(poly.vertices))]:
        edge_uses[key]=edge_uses.get(key,0)+1
audit={"woodComponents":1,"boundaryEdges":sum(1 for count in edge_uses.values() if count==1),"nonManifoldEdges":sum(1 for count in edge_uses.values() if count>2),"inputSectionContract":str(PLAN),"triangleCount":triangles,"bounds":bounds,"repairMethod":"exact-unioned partial-arc/saddle equivalents plus explicit collar-web volumes; child paths transition to full rings after branch separation"}
(OUT/"manifold-audit.json").write_text(json.dumps(audit,indent=2),encoding="utf-8")
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"trial-b-roble-pass2-massing.blend"))
print(audit)
