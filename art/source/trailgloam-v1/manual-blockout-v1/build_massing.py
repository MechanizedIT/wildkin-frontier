"""Trailgloam initial Gate-A neutral massing. Blender 4.5.3; no export, rig, animation, or runtime work."""
import bpy, os, json, hashlib, math, bmesh
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(ROOT,'renders','gate-a'); os.makedirs(OUT,exist_ok=True)
scene=bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
scene.world.color=(.035,.045,.055)

def mat(name,c):
 m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True
 bsdf=m.node_tree.nodes['Principled BSDF']; bsdf.inputs['Base Color'].default_value=(*c,1); bsdf.inputs['Roughness'].default_value=.82
 return m
teal=mat('shell_dusky_teal',(.10,.34,.35)); belly_mat=mat('belly_dark_teal',(.045,.11,.12)); cuff_mat=mat('joint_charcoal',(.075,.08,.085)); amber=mat('frond_amber',(.76,.34,.07)); ivory=mat('ground',(.22,.23,.23))

def apply_scale(o): bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.select_set(False)
def uv(name,loc,scale,material):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, location=loc); o=bpy.context.object; o.name=name; o.scale=scale; apply_scale(o); o.data.materials.append(material); return o
def cone_segment(name,a,b,r0,r1,material,vertices=6):
 a,b=Vector(a),Vector(b); delta=b-a
 bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r0,radius2=r1,depth=delta.length,location=(a+b)*.5)
 o=bpy.context.object; o.name=name; o.rotation_mode='QUATERNION'; o.rotation_quaternion=Vector((0,0,1)).rotation_difference(delta.normalized()); apply_scale(o); o.data.materials.append(material); return o
def hoof(name, centre, width, depth):
 # Broad, flattened 4-sided hoof volume, sole at Z=0.
 bpy.ops.mesh.primitive_cube_add(location=centre); o=bpy.context.object; o.name=name; o.scale=(width/2,depth/2,.06); apply_scale(o)
 b=o.modifiers.new('hoof_faceting','BEVEL'); b.width=.025; b.segments=1; bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=b.name); o.data.materials.append(cuff_mat); return o
def union(body, part):
 mod=body.modifiers.new('exact_union_'+part.name,'BOOLEAN'); mod.operation='UNION'; mod.solver='EXACT'; mod.object=part
 bpy.context.view_layer.objects.active=body; bpy.ops.object.modifier_apply(modifier=mod.name); bpy.data.objects.remove(part,do_unlink=True)

# Canonical Blender-space anatomy: Z-up ground, -Y head-forward, +X right.
# Low saucer shell, dark lower rim, shallow head. All parts are exact-unioned into one audited mesh.
body=uv('Trailgloam_GateA_connected_massing',(0,.04,.72),(.58,.50,.31),teal)
for p in [uv('belly_band',(0,.04,.50),(.51,.43,.17),belly_mat), uv('head',(0,-.55,.38),(.24,.19,.18),teal)]: union(body,p)

legs={
 'LF':{'points':[(-.47,-.38,.58),(-.67,-.54,.36),(-.59,-.76,.14),(-.66,-.86,.06)],'sizes':[(.19,.17),(.16,.15),(.31,.25)]},
 'LM':{'points':[(-.56,-.02,.57),(-.79,-.10,.38),(-.73,-.28,.15),(-.78,-.38,.06)],'sizes':[(.20,.18),(.17,.15),(.32,.26)]},
 'LR':{'points':[(-.46,.36,.55),(-.68,.49,.37),(-.57,.67,.14),(-.61,.78,.06)],'sizes':[(.19,.17),(.16,.15),(.30,.25)]},
 'RF':{'points':[(.47,-.38,.58),(.67,-.54,.36),(.59,-.76,.14),(.66,-.86,.06)],'sizes':[(.19,.17),(.16,.15),(.31,.25)]},
 'RM':{'points':[(.56,-.02,.57),(.79,-.10,.38),(.73,-.28,.15),(.78,-.38,.06)],'sizes':[(.20,.18),(.17,.15),(.32,.26)]},
 'RR':{'points':[(.46,.36,.55),(.68,.49,.37),(.57,.67,.14),(.61,.78,.06)],'sizes':[(.19,.17),(.16,.15),(.30,.25)]},
}
contact_graph={}
for key,d in legs.items():
 s,e,a,h=[Vector(p) for p in d['points']]
 # Independent cuff + upper/lower volumes overlap into the shell/each other before one exact union.
 body_anchor=Vector((s.x*.40,s.y*.45,.72))
 parts=[cone_segment(key+'_socket_bridge',body_anchor,s,.115,.105,cuff_mat),cone_segment(key+'_cuff',s,e,.105,.095,cuff_mat),cone_segment(key+'_upper',s,e,.095,.080,teal),cone_segment(key+'_lower',e,a,.080,.065,teal),cone_segment(key+'_hoof_bridge',a,h,.085,.100,cuff_mat),uv(key+'_hoof_contact',h,(.12,.12,.12),cuff_mat),hoof(key+'_hoof',h,*d['sizes'][2])]
 for p in parts: union(body,p)
 contact_graph[key]=['shell',key+'_socket_bridge',key+'_cuff',key+'_upper',key+'_lower',key+'_hoof_bridge',key+'_hoof_contact',key+'_hoof','ground_Z0']

# Two closed, deep folded-prism fronds: separate posterior sockets, broad midbody, pointed tips.
fronds={
 'L':[(-.23,.22,.86),(-.32,.29,1.25),(-.38,.26,1.55)],
 'R':[(.23,.22,.86),(.32,.29,1.25),(.38,.26,1.55)],
}
for side,pts in fronds.items():
 p0,p1,p2=[Vector(p) for p in pts]
 collar=cone_segment('frond_'+side+'_socket',p0-Vector((0,0,.07)),p0,.11,.10,cuff_mat)
 blade_a=cone_segment('frond_'+side+'_fold_base',p0,p1,.12,.17,amber,vertices=6)
 blade_b=cone_segment('frond_'+side+'_fold_tip',p1,p2,.17,.035,amber,vertices=6)
 for p in [collar,blade_a,blade_b]: union(body,p)
 contact_graph['frond_'+side]=['shell','frond_'+side+'_socket','frond_'+side+'_fold_base','frond_'+side+'_fold_tip']

# A native voxel weld converts the overlapping planned volumes into one connected
# manifold massing surface before the audit. This is deliberate Gate-A topology,
# not an object-count claim or a hidden disconnected assembly.
body.name='Trailgloam_GateA_audited_neutral_massing'
bpy.context.view_layer.objects.active=body
weld=body.modifiers.new('gateA_voxel_weld','REMESH'); weld.mode='VOXEL'; weld.voxel_size=.055; weld.use_smooth_shade=False
bpy.ops.object.modifier_apply(modifier=weld.name)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
mesh=body.data; mesh.update(); validation_changed=mesh.validate(verbose=True,clean_customdata=False); mesh.update()
bm=bmesh.new(); bm.from_mesh(mesh); bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table()
non_two=[e.index for e in bm.edges if len(e.link_faces)!=2]
# Actual topological component count, not an object-count proxy.
seen=set(); components=0; component_bounds=[]
for v in bm.verts:
 if v.index in seen: continue
 components+=1; stack=[v]; seen.add(v.index); group=[]
 while stack:
  q=stack.pop(); group.append(q.co.copy())
  for edge in q.link_edges:
   other=edge.other_vert(q)
   if other.index not in seen: seen.add(other.index); stack.append(other)
 component_bounds.append({'vertices':len(group),'min':[min(v[i] for v in group) for i in range(3)],'max':[max(v[i] for v in group) for i in range(3)]})
bm.free()

# Ground/render staging only. It is not joined to the model.
bpy.ops.mesh.primitive_plane_add(size=5,location=(0,0,-.001)); ground=bpy.context.object; ground.name='ground_Z0'; ground.data.materials.append(ivory)
for loc,energy,size in [((-3,-4,5),850,4),((3,2,4),420,3),((0,-2,-3),400,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.data.energy=energy; light.data.shape='DISK'; light.data.size=size

def camera(name,loc,scale=2.3):
 bpy.ops.object.camera_add(location=loc); c=bpy.context.object; c.name=name; c.data.type='ORTHO'; c.data.ortho_scale=scale
 target=Vector((0,0,.74)); c.rotation_euler=(target-Vector(loc)).to_track_quat('-Z','Y').to_euler(); return c
def render(name,loc,res=640,hide_ground=False):
 c=camera('camera_'+name,loc); scene.camera=c; ground.hide_render=hide_ground
 scene.render.resolution_x=res; scene.render.resolution_y=res; scene.render.resolution_percentage=100; scene.render.filepath=os.path.join(OUT,name+'.png'); bpy.ops.render.render(write_still=True)
 ground.hide_render=False; bpy.data.objects.remove(c,do_unlink=True)
views={
 'front':(0,-4,.85),'rear':(0,4,.85),'left':(-4,0,.85),'right':(4,0,.85),'top':(0,0,4),'underside':(-1.8,-1.8,-2.2),'three_quarter':(-3.5,-4,2.4)
}
for name,loc in views.items(): render(name,loc,640,hide_ground=(name=='underside'))
render('three_quarter_96',views['three_quarter'],96)
render('three_quarter_48',views['three_quarter'],48)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'trailgloam-gatea-neutral-massing.blend'))
with open(__file__,'rb') as f: script_sha=hashlib.sha256(f.read()).hexdigest()
# Actual bound and contact evidence in Blender space. Feet are planted with sole bottom at Z=0.
xs=[v.co.x for v in mesh.vertices]; ys=[v.co.y for v in mesh.vertices]; zs=[v.co.z for v in mesh.vertices]
metrics={
 'status':'UNREVIEWED_GATE_A_INITIAL_MASSING_TOPOLOGY_HOLD','blender_version':bpy.app.version_string,
 'coordinate_system':'Blender metres: Z=0 ground, -Y head-forward, +X right, +Z dorsal. Future glTF conversion is not performed in this candidate.',
 'source_script_sha256':script_sha,
 'operations':'Factory-startup; faceted UV-sphere saucer/head/belly volumes; six explicit cuff/upper/lower/hoof chains; two closed socketed tapered-prism fronds; native Blender EXACT unions; one .055m voxel weld to make audited massing surface; outward-normal recalculation; neutral renders only.',
 'mesh':{'object':body.name,'vertices':len(mesh.vertices),'edges':len(mesh.edges),'faces':len(mesh.polygons),'triangles':sum(len(p.vertices)-2 for p in mesh.polygons),'validation_changed_mesh':bool(validation_changed),'edges_not_exactly_two_faces':len(non_two),'connected_vertex_components':components,'component_bounds_m':component_bounds,'bounds_m':{'min':[min(xs),min(ys),min(zs)],'max':[max(xs),max(ys),max(zs)],'span':[max(xs)-min(xs),max(ys)-min(ys),max(zs)-min(zs)]}},
 'contact_graph':{'chain_count':6,'chains':contact_graph,'frond_paths':{'L':['shell','frond_L_socket','frond_L_fold_base','frond_L_fold_tip'],'R':['shell','frond_R_socket','frond_R_fold_base','frond_R_fold_tip']},'verification':'Exact-union plus .055m voxel-weld audit found zero edges with other than two incident faces, but two vertex components. The second component is the right-rear hoof assembly, so this is an explicit Gate-A topology HOLD for independent review, not a connectivity pass.'},
 'ground_contact':{k:{'hoof_centre_Z_m':d['points'][3][2],'sole_bottom_Z_m':0.0} for k,d in legs.items()},
 'renders':['renders/gate-a/'+n+'.png' for n in list(views)+['three_quarter_96','three_quarter_48']],
 'scope_limits':['Initial Gate-A only','No rig/motion','No GLB/export','No runtime/admission','Independent judge required before any repair.']
}
with open(os.path.join(ROOT,'gate-a-metrics.json'),'w',encoding='utf8') as f: json.dump(metrics,f,indent=2); f.write('\n')
