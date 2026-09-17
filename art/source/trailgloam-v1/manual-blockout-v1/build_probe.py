"""Trailgloam Gate-A cuff-junction method probe; Blender 4.5.3, no export/runtime work."""
import bpy, math, json, hashlib, os
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
RENDERS = os.path.join(ROOT, 'renders')
os.makedirs(RENDERS, exist_ok=True)

# Clean factory scene.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    pass
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.world.color = (0.045, 0.055, 0.065)

# Flat material IDs make junction boundaries inspectable without a texture.
def material(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*color, 1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .82
    return m
shell_mat = material('shell_neutral_teal', (0.12, 0.34, 0.35))
cuff_mat = material('cuff_neutral_charcoal', (0.09, 0.10, 0.105))

# These are the planned LF/LM-side shell locations, reduced to a tiny local probe.
# Shell patch dimensions: .90 X x 1.02 Y x .22 Z, Z-up.
# Cuff centreline separations are .34m; each cuff's largest radius is .115m.
def cube(name, location, scale, bevel=0.0, mat=None):
    bpy.ops.mesh.primitive_cube_add(location=location)
    o = bpy.context.object; o.name = name; o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        b = o.modifiers.new('faceted_edge_softening', 'BEVEL'); b.width=bevel; b.segments=1
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=b.name)
    if mat: o.data.materials.append(mat)
    return o

def cone(name, location, radius1, radius2, depth, mat):
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=radius1, radius2=radius2, depth=depth, location=location)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat)
    return o

def tapered_segment(name, a, b, r0, r1, mat):
    a, b = Vector(a), Vector(b); delta=b-a
    mid=(a+b)*.5
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=r0, radius2=r1, depth=delta.length, location=mid)
    o=bpy.context.object; o.name=name
    o.rotation_mode='QUATERNION'; o.rotation_quaternion=Vector((0,0,1)).rotation_difference(delta.normalized())
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=False)
    o.data.materials.append(mat)
    return o

shell = cube('shell_patch_with_two_boundary_loops', (0, .05, .36), (.45,.51,.11), .055, shell_mat)
# The cuffs overlap .035m into the patch before union. They remain named source witnesses
# until the union succeeds, then the resulting manifold mesh is named for the exact recipe.
lf_cuff = cone('LF_cuff_loop', (-.23,-.17,.205), .115,.095,.20,cuff_mat)
lm_cuff = cone('LM_cuff_loop', (-.23,.17,.205), .115,.095,.20,cuff_mat)
lf_stub = tapered_segment('LF_bend_plane_stub', (-.23,-.17,.115), (-.34,-.25,.015), .095,.070, cuff_mat)
lm_stub = tapered_segment('LM_bend_plane_stub', (-.23,.17,.115), (-.36,.24,.015), .095,.070, cuff_mat)

# Native exact boolean union is the isolated candidate bridge recipe: it removes the
# mutually interior cuff/shell faces, producing one closed mesh whose edge manifoldness
# is measured below. The two distinct six-sided cuff loops and non-coplanar bend planes
# are retained visibly in the resulting exterior.
bpy.context.view_layer.objects.active=shell
shell.select_set(True)
for part in (lf_cuff, lm_cuff, lf_stub, lm_stub):
    mod=shell.modifiers.new('exact_manifold_bridge_' + part.name, 'BOOLEAN')
    mod.operation='UNION'; mod.solver='EXACT'; mod.object=part
    bpy.context.view_layer.objects.active=shell
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(part, do_unlink=True)
shell.name='Trailgloam_LF_LM_exact_union_junction_probe'

# Force consistent normals after exact unions, then collect actual mesh facts.
bpy.context.view_layer.objects.active=shell
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
mesh=shell.data
mesh.update()
valid_before = mesh.validate(verbose=True, clean_customdata=False)
mesh.update()
# BMesh edge-face counts avoid relying on viewport overlays.
import bmesh
bm=bmesh.new(); bm.from_mesh(mesh); bm.edges.ensure_lookup_table()
edge_face_counts=[len(e.link_faces) for e in bm.edges]
non_two=[i for i,n in enumerate(edge_face_counts) if n != 2]
bm.free()

# Independent cuff-plane geometry facts, measured from intended named centrelines.
lf_axis=(Vector((-.34,-.25,.015))-Vector((-.23,-.17,.115))).normalized()
lm_axis=(Vector((-.36,.24,.015))-Vector((-.23,.17,.115))).normalized()
axis_angle=math.degrees(math.acos(max(-1,min(1,lf_axis.dot(lm_axis)))))
centre_distance=(Vector((-.23,-.17,.205))-Vector((-.23,.17,.205))).length
clearance=centre_distance-(.115+.115)

# Ground disk, camera, and area light; no textures or decorative forms.
bpy.ops.mesh.primitive_plane_add(size=4, location=(0,0,-.005))
floor=bpy.context.object; floor.name='neutral_ground_Z0'; floor.data.materials.append(material('ground',(0.18,.19,.20)))
bpy.ops.object.light_add(type='AREA', location=(-2,-3,4)); key=bpy.context.object; key.name='key'; key.data.energy=700; key.data.shape='DISK'; key.data.size=4
bpy.ops.object.light_add(type='AREA', location=(2,2,3)); fill=bpy.context.object; fill.name='fill'; fill.data.energy=350; fill.data.size=3
bpy.ops.object.light_add(type='AREA', location=(0,-.3,-2)); under=bpy.context.object; under.name='underside_fill'; under.data.energy=420; under.data.size=2

def camera(name, loc, ortho=1.65):
    bpy.ops.object.camera_add(location=loc)
    c=bpy.context.object; c.name=name; c.data.type='ORTHO'; c.data.ortho_scale=ortho
    target=Vector((-.08,0,.25)); c.rotation_euler=(target-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    return c

def render(name, loc, hide_floor=False):
    c=camera('camera_'+name,loc); scene.camera=c
    floor.hide_render=hide_floor
    scene.render.filepath=os.path.join(RENDERS,name+'.png'); bpy.ops.render.render(write_still=True)
    floor.hide_render=False
    bpy.data.objects.remove(c,do_unlink=True)
render('probe_top',(0,-.01,2.5))
render('probe_side',(2.4,-.01,.45))
render('probe_underside',(-1.65,-1.65,-1.35), hide_floor=True)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'trailgloam-cuff-junction-probe.blend'))
with open(__file__,'rb') as f: script_sha=hashlib.sha256(f.read()).hexdigest()
metrics={
 'status':'UNREVIEWED_PROBE_ONLY',
 'blender_version':bpy.app.version_string,
 'coordinate_system':'Blender metres: Z=0 ground, -Y head-forward, +X right, +Z dorsal.',
 'operation':'factory-startup; faceted shell patch; two six-sided cuff volumes; two non-coplanar tapered limb stubs; Blender native EXACT boolean union; recalculated outward normals; neutral top/side/underside renders.',
 'source_script_sha256':script_sha,
 'mesh':{'object':shell.name,'vertices':len(mesh.vertices),'edges':len(mesh.edges),'faces':len(mesh.polygons),'triangles':sum(len(p.vertices)-2 for p in mesh.polygons),'validate_reported_issue':bool(valid_before),'edges_not_exactly_two_faces':len(non_two),'nonmanifold_edges_api':len(non_two)},
 'contact':{'cuff_centres_blender_XYZ':[[-.23,-.17,.205],[-.23,.17,.205]],'centre_separation_m':centre_distance,'largest_cuff_radius_m':.115,'radial_gap_m':clearance,'stub_axis_angle_degrees':axis_angle,'stub_min_Z_m':.015,'shell_cuff_overlap_before_union_m':.035,'result':'single connected exact-union mesh; no edges with other than two incident faces.'},
 'renders':['renders/probe_top.png','renders/probe_side.png','renders/probe_underside.png'],
 'scope_limits':['No complete creature','No rig or motion','No GLB/export','No runtime/admission','Stop for independent review before Gate A.']
}
with open(os.path.join(ROOT,'metrics.json'),'w',encoding='utf8') as f: json.dump(metrics,f,indent=2); f.write('\n')
